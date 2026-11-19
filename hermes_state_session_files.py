"""Match scheduled transcript cleanup against actual directory entries."""

import re
from pathlib import Path

_DUMP = re.compile(r"request_dump_(.+)_[0-9]{8}_[0-9]{6}_[0-9]{6}\.json")


def safe_session_file_id(session_id: str) -> bool:
    name = session_id.casefold()
    return (bool(name) and name not in {".", "..", "sessions"}
            and not name.startswith(("session_", "request_dump_"))
            and not any(char in name for char in "/\\:\x00"))


def remove_batch_session_files(sessions_dir: Path | None, session_ids: list[str]) -> None:
    """Use the on-disk spelling and the dump writer's exact timestamp suffix."""
    owners = {sid for sid in session_ids if safe_session_file_id(sid)}
    if sessions_dir is None or not owners:
        return
    transcripts = {name for sid in owners for name in (f"{sid}.json", f"{sid}.jsonl", f"session_{sid}.json")}
    try:
        for path in sessions_dir.iterdir():
            dump = _DUMP.fullmatch(path.name)
            if path.name in transcripts or (dump is not None and dump[1] in owners):
                try:
                    path.unlink(missing_ok=True)
                except OSError:
                    continue
    except OSError:
        return
