"""Replace an older or startup-stalled gateway on this install's own home.

After an upgrade the old daemon keeps answering the home's control socket, but its ``identify`` has
no ``runtime_protocol`` (it predates the session-authority runtime). Every client of this version
ensures through :func:`hermes_cli.gateway_runtime.ensure_gateway_runtime` (the TUI bootstrap,
Desktop's ``hermes gateway ensure``, ``hermes chat``), so ensure replaces that owner once, exactly as
``hermes gateway stop`` would stop it (a planned-stop marker in the owner's home, then SIGTERM; a
bounded wait; a start-time-guarded force kill), and then starts the current one the normal way.

Refused, never stopped:
- a gateway that speaks a NEWER runtime protocol than this client (a downgrade must not kill it);
- a gateway of another install: its home resolves outside this install's root (a profile symlinked
  into another HERMES root), or the process serves another home than the socket that answered;
- anything whose ``identify`` cannot be pinned to one live process (pid/start time disagree, our
  own process, not a gateway).
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from time import monotonic
from typing import Any

from hermes_startup_watchdog import DEFAULT_STARTUP_WATCHDOG_TIMEOUT_S, STATE_DB_SCHEMA_PHASE_S

# Graceful drain before the guarded force kill; an idle old gateway exits in well under a second.
_GRACEFUL_STOP_SECONDS = 10.0
_FORCED_STOP_SECONDS = 5.0

# One line each, short enough for the TUI's activity row after its "gateway incompatible: " prefix.
REFUSAL_DETAIL = {
    "owner_newer": "a newer Hermes's gateway owns this profile; update Hermes or run: hermes gateway stop",
    "foreign_install": "another Hermes install's gateway owns this profile; stop it there: hermes gateway stop",
    "owner_unverified": "an older Hermes gateway owns this profile and was not verified; run: hermes gateway stop",
    "owner_did_not_exit": "an older Hermes gateway owns this profile and did not stop; run: hermes gateway stop",
    "owner_unreachable": "an older Hermes gateway owns this profile; run: hermes gateway stop",
}


def _install_root() -> Path:
    from hermes_constants import get_default_hermes_root
    return Path(get_default_hermes_root()).resolve()


def _identify(home: Path, timeout: float) -> tuple[Path, dict] | None:
    """``(control_home, identify payload)`` of the process answering for *home*: its own socket, or
    the default multiplexer's for a served named profile (the same order discovery uses)."""
    from hermes_cli.gateway_runtime_discovery import query_identify
    from hermes_cli.gateway_runtime_multiplex import multiplexer_root_for
    for control in (home, multiplexer_root_for(home)):
        if control is None:
            continue
        try:
            return control, query_identify(control, timeout=timeout)
        except (FileNotFoundError, ConnectionRefusedError):
            continue
    return None


def _same(a: Any, b: Path) -> bool:
    try:
        return os.path.normcase(str(Path(a).resolve())) == os.path.normcase(str(b.resolve()))
    except (OSError, TypeError, ValueError):
        return False


def _within_install(home: Path, root: Path) -> bool:
    home = home.resolve()
    return home == root or (home.parent == root / "profiles")


def starting_payload(payload: dict) -> bool:
    protocol = payload.get("runtime_protocol")
    return payload.get("state") == "starting" and (
        "runtime_protocol" not in payload or (type(protocol) is int and protocol == 1))


def startup_progress_is_fresh(payload: dict) -> bool:
    now = monotonic()
    phase = payload.get("startup_schema_phase_at")
    # A SQLite opcode can run for minutes without invoking its VM progress handler.
    # Cap an open phase even if it continues to invoke the handler.
    if type(phase) in {float, int} and 0 < phase <= now:
        return now - phase < STATE_DB_SCHEMA_PHASE_S
    stamp = payload.get("startup_progress_at")
    if type(stamp) in {float, int} and 0 < stamp <= now:
        return now - stamp < DEFAULT_STARTUP_WATCHDOG_TIMEOUT_S
    # Legacy owners have no monotonic age evidence. A wall-clock correction must
    # never turn an unstamped starting reply into permission to stop the process.
    pid = payload.get("pid")
    return type(pid) is int and pid > 1


def _verified_owner(control: Path, payload: dict, *, stalled: bool) -> tuple[int, Any] | str:
    from gateway.status import _GATEWAY_KIND, _pid_exists, get_process_start_time, start_time_fingerprints_match
    protocol = payload.get("runtime_protocol")
    if type(protocol) is int and protocol > 1:
        return "owner_newer"
    if not _within_install(control, _install_root()) or not _same(payload.get("hermes_home"), control):
        return "foreign_install"
    # A different owner can bind between discovery and this identity check.
    if not stalled and ((type(protocol) is int and protocol == 1)
                        or (starting_payload(payload) and startup_progress_is_fresh(payload))):
        return "owner_changed"
    pid, recorded = payload.get("pid"), payload.get("start_time")
    if (payload.get("kind") != _GATEWAY_KIND or type(pid) is not int or pid <= 1
            or pid in {os.getpid(), os.getppid()} or recorded is None or not _pid_exists(pid)):
        return "owner_unverified"
    current = get_process_start_time(pid)
    try:
        if current is None or not start_time_fingerprints_match(recorded, current):
            return "owner_unverified"
    except (TypeError, ValueError):
        return "owner_unverified"
    return pid, current


def _write_planned_stop(control: Path, pid: int, start_time: Any) -> None:
    """The marker ``hermes gateway stop`` writes, in the OWNER's home (it reads its own), so the old
    gateway exits as a planned stop: clean exit, ``stopped`` persisted, no supervisor revival."""
    from gateway.status import _PLANNED_STOP_MARKER_FILENAME, _utc_now_iso, _write_marker
    _write_marker(control / _PLANNED_STOP_MARKER_FILENAME, {
        "target_pid": pid, "target_start_time": start_time,
        "stopper_pid": os.getpid(), "written_at": _utc_now_iso(),
    })


def _wait_gone(pid: int, seconds: float) -> bool:
    from gateway.status import _pid_exists
    end = time.monotonic() + max(seconds, 0.0)
    while _pid_exists(pid):
        if time.monotonic() >= end:
            return False
        time.sleep(0.1)
    return True


def replace_incompatible_owner(home: Path, *, deadline: float, stalled: bool = False) -> str | None:
    """Stop the older or startup-stalled gateway for *home*; None once gone, else a refusal code
    (see :data:`REFUSAL_DETAIL`). Never starts anything: the caller's ensure loop does that."""
    from gateway.status import get_process_start_time
    budget = deadline - time.monotonic()
    if budget <= 0:
        return "owner_unreachable"
    try:
        found = _identify(home, timeout=min(2.0, budget))
    except (OSError, ValueError, TypeError):  # timeout, refused/denied peer, malformed reply
        return "owner_unreachable"
    if found is None:
        return None  # it is already gone: nothing to replace
    control, payload = found
    verdict = _verified_owner(control, payload, stalled=stalled)
    if isinstance(verdict, str):
        return verdict
    pid, start_time = verdict
    if stalled:
        return _replace_stalled_owner(home, found, verdict, deadline)
    if get_process_start_time(pid) != start_time:
        return "owner_changed"
    return _stop_owner(control, pid, start_time, deadline)


def _replace_stalled_owner(home: Path, found: tuple[Path, dict], owner: tuple[int, Any],
                           deadline: float) -> str | None:
    from gateway.runtime_ownership import _LOCK_FLAGS, _open_checked, _still_names
    from gateway.status import _try_acquire_file_lock, get_process_start_time
    from hermes_cli.gateway_runtime import _endpoint
    from hermes_cli.gateway_runtime_service import remaining

    control, payload = found
    pid, start_time = owner
    # Use the answering home so a multiplexer and its named-profile clients
    # contend on the same inode. Keep it after release, as with gateway.lock.
    path = control.resolve() / ".gateway-startup-stop.lock"
    fd = _open_checked(path, _LOCK_FLAGS)
    with os.fdopen(fd, "r+", encoding="utf-8") as claim:
        while not _try_acquire_file_lock(claim):
            time.sleep(min(0.05, remaining(deadline)))
        if not _still_names(path, fd) or os.fstat(fd).st_nlink != 1:
            return "owner_unverified"
        if _endpoint(payload, home, control_home=None if control == home else control).reason_code != "startup_stalled":
            return "owner_changed"
        target = json.dumps(owner)
        claim.seek(0)
        already_attempted = claim.read(len(target) + 1) == target
        if get_process_start_time(pid) != start_time:
            return "owner_changed"

        # Re-read under the stop claim and after the OS identity check. Even an
        # advanced stamp that is already stale invalidates this stop decision.
        budget = remaining(deadline)
        try:
            latest = _identify(home, timeout=min(2.0, budget))
        except (OSError, ValueError, TypeError):
            return "owner_unreachable"
        if latest is None:
            return None
        latest_control, current = latest
        keys = ("hermes_home", "kind", "pid", "start_time", "startup_progress_at", "startup_schema_phase_at")
        if (latest_control != control
                or any(current.get(key) != payload.get(key) for key in keys)
                or _endpoint(current, home, control_home=None if control == home else control).reason_code
                != "startup_stalled"):
            return "owner_changed"

        # Record the attempted owner so a waiter cannot send another stop if
        # the first attempt fails to terminate it.
        if already_attempted:
            return "owner_did_not_exit"
        claim.seek(0)
        claim.write(target)
        claim.truncate()
        claim.flush()
        return _stop_owner(control, pid, start_time, deadline)


def _stop_owner(control: Path, pid: int, start_time: Any, deadline: float) -> str | None:
    from gateway.status import terminate_pid

    _write_planned_stop(control, pid, start_time)
    graceful = min(_GRACEFUL_STOP_SECONDS, max(deadline - time.monotonic() - _FORCED_STOP_SECONDS, 1.0))
    try:
        if os.name != "nt":
            # Windows has no SIGTERM for an asyncio loop: the marker watcher IS its graceful stop.
            terminate_pid(pid, expected_start_time=start_time)
        if _wait_gone(pid, graceful):
            return None
        terminate_pid(pid, force=True, expected_start_time=start_time)
    except ProcessLookupError:
        return None
    except (PermissionError, OSError):
        return "owner_did_not_exit" if not _wait_gone(pid, 0) else None
    return None if _wait_gone(pid, _FORCED_STOP_SECONDS) else "owner_did_not_exit"
