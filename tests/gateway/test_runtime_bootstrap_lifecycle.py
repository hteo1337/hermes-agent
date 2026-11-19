"""Live runtime HTTP lifecycle boundaries, with no provider inference."""
import asyncio
import json

import pytest
from websockets.asyncio.client import connect


@pytest.mark.platforms("posix")
@pytest.mark.asyncio
async def test_ensure_waits_for_the_early_gateway_control_listener(monkeypatch):
    from gateway.run_bootstrap import _start_gateway_start_control_socket
    from hermes_cli import gateway_runtime_discovery, gateway_runtime_replace, gateway_runtime_start
    from hermes_cli.gateway_runtime import ensure_gateway_runtime
    from hermes_constants import get_hermes_home

    def unexpected_replace(*args, **kwargs):
        pytest.fail("ensure tried to replace the gateway while it was starting")

    def unexpected_spawn(*args, **kwargs):
        pytest.fail("ensure tried to start another gateway while one was starting")

    home = get_hermes_home()
    home.chmod(0o700)
    observed = []
    query_identify = gateway_runtime_discovery.query_identify

    def observe(*args, **kwargs):
        payload = query_identify(*args, **kwargs)
        observed.append(payload["state"])
        return payload

    monkeypatch.setattr(gateway_runtime_discovery, "query_identify", observe)
    monkeypatch.setattr(gateway_runtime_replace, "replace_incompatible_owner", unexpected_replace)
    monkeypatch.setattr(gateway_runtime_start, "spawn_unmanaged_gateway", unexpected_spawn)
    server = await _start_gateway_start_control_socket()
    assert server is not None
    try:
        result = await asyncio.to_thread(ensure_gateway_runtime, home, timeout=1)
        assert (result.state, result.reason_code) == ("starting", "deadline")
        assert observed and set(observed) == {"starting"}
    finally:
        await server.stop()


@pytest.mark.platforms("posix")
@pytest.mark.asyncio
async def test_ensure_replaces_only_the_verified_stalled_startup(monkeypatch):
    import threading
    import time
    from types import SimpleNamespace

    from gateway import status
    from gateway.control_socket import GatewayControlServer
    from hermes_cli import gateway_runtime_replace as replace, gateway_runtime_start, process_identity
    from hermes_cli.gateway_runtime import ensure_gateway_runtime
    from hermes_constants import get_hermes_home

    home = get_hermes_home()
    home.chmod(0o700)
    pid = 900_001
    clock = 1000.0
    start_time = 100
    stopped = []
    observed = []
    payload = {"hermes_home": str(home), "kind": "hermes-gateway", "pid": pid,
               "start_time": start_time, "state": "starting", "runtime_protocol": 1,
               "startup_progress_at": clock, "served_profiles": []}

    def identify():
        observed.append(dict(payload))
        return dict(payload)

    def stop(target, *, expected_start_time):
        assert (target, expected_start_time) == (pid, start_time)
        stopped.append(target)
        payload.update(state="ready", runtime_protocol=1, pid=pid + 1, start_time=200,
                       instance_id="replacement", authority_epoch=1, supervisor="none",
                       api_origin="http://127.0.0.1:9001", capabilities=["session-authority-v1"],
                       served_profiles=[{"home": str(home), "profile_id": str(home)}])

    async def ensure(timeout=2):
        return await asyncio.to_thread(ensure_gateway_runtime, home, timeout=timeout)

    monkeypatch.setattr(replace, "monotonic", lambda: clock, raising=False)
    monkeypatch.setattr(replace, "_install_root", lambda: home)
    monkeypatch.setattr(replace, "_wait_gone", lambda target, seconds: target != payload["pid"])
    monkeypatch.setattr(status, "_pid_exists", lambda target: target == payload["pid"])
    monkeypatch.setattr(status, "get_process_start_time", lambda target: payload["start_time"])
    monkeypatch.setattr(status, "terminate_pid", stop)
    monkeypatch.setattr(gateway_runtime_start, "spawn_unmanaged_gateway",
                        lambda *a, **kw: pytest.fail("a second owner would be launched"))
    server = GatewayControlServer(verb_handlers={"identify": identify})
    assert await server.start()
    try:
        # Progress renews the lease even after the original timestamp is older than the lease.
        for _ in range(2):
            clock += 200
            verdicts = await asyncio.gather(ensure(0.5), ensure(0.5))
            assert all((result.state, result.reason_code) == ("starting", "deadline") for result in verdicts)
            payload["startup_progress_at"] = clock
        assert stopped == [] and len(observed) >= 4
        # Repeated identify replies with an unchanged timestamp do not renew it.
        for _ in range(2):
            clock += 100
            assert (await ensure(0.5)).state == "starting"
        clock += 101
        result = await ensure()
        assert result.state == "ready", result
        assert stopped == [pid]

        # A fresh owner can publish between the original observation and the stop path's reread.
        payload.update(state="starting", pid=pid, start_time=start_time, startup_progress_at=clock - 301)
        real_identify = replace._identify

        def restarted(home, timeout):
            payload.update(pid=pid + 1, start_time=200, startup_progress_at=clock)
            return real_identify(home, timeout)

        with monkeypatch.context() as race:
            race.setattr(replace, "_identify", restarted)
            assert (await ensure(0.5)).state == "starting"
        assert stopped == [pid]

        # A fresh timestamp cannot shield an explicitly older protocol.
        payload.update(runtime_protocol=0, pid=pid, start_time=start_time)
        result = await ensure()
        assert result.state == "ready", result
        assert stopped == [pid, pid]

        # A wall-clock step in either direction cannot expire an unstamped owner.
        legacy_states = []
        for wall_time in (10610.0, 9980.0):
            payload.update(state="starting", pid=pid, start_time=start_time)
            payload.pop("runtime_protocol", None)
            payload.pop("startup_progress_at", None)
            with monkeypatch.context() as wall:
                wall.setattr(process_identity, "_process_create_time", lambda _: 10000.0)
                wall.setattr(replace, "time", SimpleNamespace(
                    time=lambda: wall_time, monotonic=time.monotonic, sleep=time.sleep))
                legacy_states.append((await ensure(0.5)).state)

        # Complete a phase after replacement has read the expired reply, at
        # the process fingerprint check. The PID and fingerprint stay put.
        resumed_states = []
        for advance in (1, 700):
            pid += 10
            payload.update(state="starting", pid=pid, start_time=start_time, runtime_protocol=1,
                           startup_progress_at=clock - 900)
            verifies = 0

            def resume(target):
                nonlocal verifies
                verifies += 1
                if verifies == 2:
                    payload["startup_progress_at"] += advance
                    if advance == 700:
                        payload.update(state="ready", supervisor="none",
                                       served_profiles=[{"home": str(home), "profile_id": str(home)}])
                return start_time

            # Exercise the observed stop synchronously rather than allowing
            # a later ensure iteration to make a new expiry decision.
            with monkeypatch.context() as race:
                race.setattr(status, "get_process_start_time", resume)
                resumed_states.append(await asyncio.to_thread(
                    replace.replace_incompatible_owner, home, deadline=time.monotonic() + 5, stalled=True))

        # Hold the first graceful stop while a second ensure reaches the
        # same owner. Leave it alive to exercise the failed-stop outcome.
        pid += 10
        payload.update(state="starting", pid=pid, start_time=start_time, startup_progress_at=clock - 301)
        first_stop = threading.Event()
        contender = threading.Event()
        try_lock = status._try_acquire_file_lock
        concurrent_stops = []

        def record_stop(target, *, force=False, expected_start_time):
            assert (target, expected_start_time) == (pid, start_time)
            concurrent_stops.append(force)
            if len(concurrent_stops) == 1:
                first_stop.set()
                assert contender.wait(4)
            elif not force:
                contender.set()

        def record_contention(handle):
            acquired = try_lock(handle)
            if not acquired:
                contender.set()
            return acquired

        with monkeypatch.context() as race:
            race.setattr(status, "terminate_pid", record_stop)
            race.setattr(status, "_try_acquire_file_lock", record_contention)
            first = asyncio.create_task(ensure(8))
            assert await asyncio.to_thread(first_stop.wait, 6)
            results = await asyncio.gather(first, ensure(8))
        assert [result.state for result in results] == ["incompatible", "incompatible"]
        assert (legacy_states, resumed_states, concurrent_stops) == (
            ["starting", "starting"], ["owner_changed", "owner_changed"], [False, True])
    finally:
        await server.stop()


@pytest.mark.platforms("posix")
@pytest.mark.asyncio
async def test_ensure_protects_a_schema_phase_without_vm_callbacks(monkeypatch):
    import threading

    from gateway.run_bootstrap import _start_gateway_start_control_socket
    from hermes_cli import gateway_runtime_replace as replace
    from hermes_cli.gateway_runtime import discover_gateway_endpoint
    from hermes_cli.gateway_runtime_discovery import query_identify
    from hermes_constants import get_hermes_home
    from hermes_startup_watchdog import StartupProgress, startup_progress
    from hermes_state import SessionDB

    entered = threading.Event()
    release = threading.Event()
    original = SessionDB._reconcile_columns

    def hold_schema(db, cursor):
        entered.set()
        assert release.wait(10)
        return original(db, cursor)

    def open_store():
        SessionDB(home / "state.db").close()

    home = get_hermes_home()
    home.chmod(0o700)
    progress = StartupProgress()
    token = startup_progress.set(progress)
    monkeypatch.setattr(SessionDB, "_reconcile_columns", hold_schema)
    server = await _start_gateway_start_control_socket(progress=progress)
    assert server is not None
    worker = asyncio.create_task(asyncio.to_thread(open_store))
    try:
        assert await asyncio.to_thread(entered.wait, 6)
        before = await asyncio.to_thread(query_identify, home, timeout=2)
        stamp = before["startup_progress_at"]
        monkeypatch.setattr(replace, "monotonic", lambda: stamp + 301)
        protected = await asyncio.to_thread(discover_gateway_endpoint, home)
        during = await asyncio.to_thread(query_identify, home, timeout=2)
        assert during["startup_progress_at"] == stamp
        assert protected.state == "starting"
        monkeypatch.setattr(replace, "monotonic", lambda: before["startup_schema_phase_at"] + 600)
        expired = await asyncio.to_thread(discover_gateway_endpoint, home)
        assert expired.reason_code == "startup_stalled"
    finally:
        release.set()
        startup_progress.reset(token)
        try:
            await worker
        finally:
            await server.stop()


@pytest.mark.asyncio
async def test_runtime_preserves_browser_ticket_gate(tmp_path):
    from gateway.config import GatewayConfig
    from gateway.run import GatewayRunner
    from gateway.run_runtime import (initialize_gateway_runtime, start_gateway_runtime_api,
                                     publish_gateway_runtime_ready)
    from gateway.runtime_ownership import process_ownership
    from hermes_constants import get_hermes_home
    from hermes_cli.dashboard_auth import register_provider, clear_providers
    from hermes_cli.dashboard_auth.ws_tickets import mint_ticket
    from tests.hermes_cli.conftest_dashboard_auth import StubAuthProvider

    home = get_hermes_home()
    (home / 'config.yaml').write_text('dashboard:\n  public_url: https://gateway.example.test\n')
    register_provider(StubAuthProvider())
    process_ownership.reserve([home])
    runner = GatewayRunner(GatewayConfig())
    try:
        await initialize_gateway_runtime(runner)
        from gateway.control_socket import GatewayControlServer
        runner.session_control_server = GatewayControlServer()
        assert await runner.session_control_server.start()
        await start_gateway_runtime_api(runner)
        assert await runner.start()
        publish_gateway_runtime_ready(runner)
        ticket = mint_ticket(user_id='browser-owner', provider='stub')
        url = runner.session_api.api_origin.replace('http:', 'ws:') + '/api/ws'
        async with connect(url, origin='https://gateway.example.test', subprotocols=[
                'hermes-gateway-v1', 'hermes-gateway-ticket.' + ticket]) as ws:
            await ws.send(json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'gateway.ping'}))
            while True:
                reply = json.loads(await asyncio.wait_for(ws.recv(), 10))
                if reply.get('id') == 1:
                    break
            assert reply['result']['ok'] is True
    finally:
        await runner.stop()
        await runner.session_control_server.stop()
        process_ownership.close()
        clear_providers()


@pytest.mark.asyncio
async def test_drain_withdraws_native_admission_before_listener_close(tmp_path):
    from gateway.config import GatewayConfig, Platform, PlatformConfig
    from gateway.platforms.base import BasePlatformAdapter, SendResult
    from gateway.platforms.event import MessageEvent
    from gateway.run import GatewayRunner
    from gateway.run_runtime import initialize_gateway_runtime, drain_gateway_runtime
    from gateway.runtime_ownership import process_ownership
    from gateway.session import SessionSource
    from hermes_constants import get_hermes_home

    class LocalAdapter(BasePlatformAdapter):
        async def connect(self, *, is_reconnect=False):
            return True

        async def disconnect(self):
            pass

        async def get_chat_info(self, chat_id):
            return {'id': chat_id}

        async def send(self, *args, **kwargs):
            return SendResult(success=True)

    home = get_hermes_home()
    process_ownership.reserve([home])
    runner = GatewayRunner(GatewayConfig())
    adapter = LocalAdapter(PlatformConfig(enabled=True), Platform.TELEGRAM)
    handled = asyncio.Event()

    async def handler(event):
        handled.set()
        return 'local control'

    adapter.set_message_handler(handler)
    runner.adapters[Platform.TELEGRAM] = adapter
    source = SessionSource(platform=Platform.TELEGRAM, chat_id='owned', user_id='owned')
    try:
        await initialize_gateway_runtime(runner)
        first = MessageEvent(text='/status', source=source)
        await adapter.handle_message(first)
        await asyncio.wait_for(handled.wait(), 5)
        assert first._gateway_accepted
        await drain_gateway_runtime(runner)
        assert runner.session_runtime_descriptor['state'] == 'draining'
        later = MessageEvent(text='/status', source=SessionSource(
            platform=Platform.TELEGRAM, chat_id='another-owned-route', user_id='owned'))
        await adapter.handle_message(later)
        assert not later._gateway_accepted
    finally:
        await runner.stop()
        process_ownership.close()
