import json
import time
from contextlib import closing
from datetime import UTC, datetime
from types import SimpleNamespace
import pytest
from hermes_cli.sessions_cmd import _note_pinned_skipped
from hermes_state import SessionDB


@pytest.mark.asyncio
async def test_cron_prune_cannot_restore_routes_from_mirror_after_fence_expiry(tmp_path, monkeypatch):
    from gateway.config import GatewayConfig
    from gateway.session import SessionEntry, SessionStore
    from gateway.session_prune import prune_ended_cron_sessions
    from hermes_state_mutation_retirement import RETIRED_PREFIX, RETRY_HORIZON_S
    from hermes_state_runtime import begin_runtime_epoch

    config = GatewayConfig()
    sessions_dir = tmp_path / "sessions"
    store = SessionStore(sessions_dir, config)
    sessions_dir.mkdir(exist_ok=True)
    mirror = sessions_dir / "sessions.json"
    started_at = time.time() - RETRY_HORIZON_S - 3600
    stamp = datetime.fromtimestamp(started_at, UTC)
    retired = SessionEntry("agent:main:cron:old", "old", stamp, stamp)
    live = SessionEntry("agent:main:cron:live", "live", stamp, stamp)
    contents = json.dumps({entry.session_key: entry.to_dict() for entry in (retired, live)})
    mirror.write_text(contents)
    monkeypatch.setattr("hermes_cli.config.load_config_readonly",
                        lambda: {"sessions": {"cron_retention_days": 1}})

    db_path = tmp_path / "state.db"
    with closing(SessionDB(db_path)) as db:
        store._db = db
        epoch = begin_runtime_epoch(db, instance_id="retention")
        db.create_session("old", source="cron")
        db.create_session("live", source="cron")
        db._write_sql("UPDATE sessions SET started_at=?, last_activity_at=?, ended_at=?, "
                      "end_reason='done' WHERE id='old'", (started_at, started_at, started_at))
        db.save_gateway_routing_entry(retired.session_key, json.dumps(retired.to_dict()))
        runner = SimpleNamespace(session_store=store, adapters={})
        runner.session_authority = SimpleNamespace(
            runner=runner, db=db, epoch=epoch, instance_id="retention",
            profile_id=str(tmp_path), sessions={}, _require_admission_open=lambda: None,
        )
        await prune_ended_cron_sessions(runner)
        assert db.get_session("old") is None
        assert db.get_meta(RETIRED_PREFIX + "old") is not None
        assert retired.session_key not in db.load_gateway_routing_entries()
        later = time.time() + RETRY_HORIZON_S + 1
        with monkeypatch.context() as clock:
            clock.setattr("hermes_state_mutation_retirement.time", SimpleNamespace(time=lambda: later))
            await prune_ended_cron_sessions(runner)
        assert db.get_meta(RETIRED_PREFIX + "old") is None
        assert mirror.read_text() == contents

    with closing(SessionDB(db_path)) as db:
        restarted = SessionStore(sessions_dir, config)
        restarted._db = db
        restarted._ensure_loaded()
        assert db.get_session("old") is None
        assert set(restarted._entries) == {live.session_key}


def test_cron_retention_limits_batches_and_keeps_whole_conversations(tmp_path):
    from hermes_state_local import POLICY_PREFIX
    from hermes_state_runtime import admit_session_input, begin_runtime_epoch

    sessions_dir = tmp_path / "sessions"
    legacy_dir = sessions_dir / "legacy"
    legacy_dir.mkdir(parents=True)
    transcript = sessions_dir / "old.jsonl"
    own_dump = sessions_dir / "request_dump_old_20261119_140000_000000.json"
    neighbor_dump = sessions_dir / "request_dump_old_other_20261119_140000_000000.json"
    case_neighbor = sessions_dir / "Next.jsonl"
    nested_artifact = legacy_dir / "fragment.json"
    routing_mirror = sessions_dir / "sessions.json"
    for artifact in (transcript, own_dump, neighbor_dump, case_neighbor, nested_artifact, routing_mirror):
        artifact.write_text("{}")

    with closing(SessionDB(tmp_path / "state.db")) as db:
        epoch = begin_runtime_epoch(db, instance_id="retention")
        for sid in ("chain", "tip", "old", "next", "open", "recent", "pinned", "pending", "other"):
            db.create_session(sid, source="gui" if sid == "other" else "cron")
        db._write_sql("UPDATE sessions SET started_at=1, last_activity_at=1")
        db._write_sql("UPDATE sessions SET ended_at=2, end_reason='done' WHERE id != 'open'")
        db._write_sql("UPDATE sessions SET end_reason='compression' WHERE id='chain'")
        db._write_sql("UPDATE sessions SET parent_session_id='chain' WHERE id='tip'")
        db._write_sql("UPDATE sessions SET ended_at=20 WHERE id='recent'")
        db._write_sql("UPDATE sessions SET pinned=1 WHERE id='pinned'")
        db.set_meta(POLICY_PREFIX + "old", '{"session_id":"old","entry":{"session_id":"old"},"policy":{"source":"cron"}}')
        admit_session_input(db, epoch=epoch, principal_id="fixture", session_id="pending",
                            request_id="queue", payload={"text": "pending"})

        filters = dict(source="cron", ended_before=10, exclude_active_write_guards=True, sessions_dir=sessions_dir)
        assert db.prune_sessions(batch_size=1, **filters) == 1
        assert db.get_session("next") is None
        assert case_neighbor.read_text() == "{}"
        assert db.get_session("chain") and db.get_session("tip")
        assert db.prune_sessions(batch_size=1, **filters) == 1
        assert db.get_meta(POLICY_PREFIX + "old") is None
        assert db.get_session("old") is None
        assert db.prune_sessions(batch_size=2, **filters) == 2
        assert db.get_session("chain") is None and db.get_session("tip") is None
        assert db.prune_sessions(batch_size=256, **filters) == 0
        assert all(db.get_session(sid) for sid in ("open", "recent", "pinned", "pending", "other"))

        for sid in ("legacy/fragment", "sessions"):
            db.create_session(sid, source="cron")
            db._write_sql("UPDATE sessions SET started_at=1, last_activity_at=1, ended_at=2 WHERE id=?", (sid,))
        assert db.prune_sessions(batch_size=256, **filters) == 2
        assert all(artifact.read_text() == "{}" for artifact in (
            transcript, own_dump, neighbor_dump, case_neighbor, nested_artifact, routing_mirror))


def test_prune_sessions_respects_touch_session_activity(tmp_path):
    with closing(SessionDB(tmp_path / "state.db")) as db:
        now = time.time()
        old_time = now - 100 * 86400  # 100 days ago
        recent_time = now - 2 * 86400  # 2 days ago

        # Session with older messages and started_at, but recent heartbeat / activity
        db.create_session("active_by_heartbeat", source="cli")
        db.append_message("active_by_heartbeat", "user", "hello", timestamp=old_time)
        db.end_session("active_by_heartbeat", "done")
        db._conn.execute(
            "UPDATE sessions SET started_at = ?, ended_at = ? WHERE id = ?",
            (old_time, old_time, "active_by_heartbeat"),
        )
        db._conn.commit()
        db.touch_session_activity("active_by_heartbeat", ts=recent_time)

        # Truly old session
        db.create_session("truly_old", source="cli")
        db.append_message("truly_old", "user", "old message", timestamp=old_time)
        db.end_session("truly_old", "done")
        db._conn.execute(
            "UPDATE sessions SET started_at = ?, ended_at = ? WHERE id = ?",
            (old_time, old_time, "truly_old"),
        )
        db._conn.commit()

        # Check dry-run candidates
        candidates = db.list_prune_candidates(older_than_days=10)
        candidate_ids = [c["id"] for c in candidates]
        assert "active_by_heartbeat" not in candidate_ids
        assert "truly_old" in candidate_ids

        candidate_map = {c["id"]: c for c in db.list_prune_candidates(older_than_days=None)}
        assert candidate_map["active_by_heartbeat"]["last_active"] == pytest.approx(recent_time, abs=1.0)

        # Pruning sessions older than 10 days should spare active_by_heartbeat
        pruned = db.prune_sessions(older_than_days=10)
        assert pruned == 1
        assert db.get_session("truly_old") is None
        assert db.get_session("active_by_heartbeat") is not None


def test_prune_keeps_the_compressed_segments_of_a_chat_still_in_use(tmp_path, capsys):
    """A rotated conversation ages as one: its old compressed-away segments stay while a later segment
    is still in use, and go together once the whole chat is idle. The CLI/dashboard preview lists what prune deletes."""
    with closing(SessionDB(tmp_path / "state.db")) as db:
        old = time.time() - 120 * 86400

        def rotate(parent, child, at):
            db.publish_compression_child(parent_session_id=parent, child_session_id=child, source="cli",
                                         messages=[{"role": "user", "content": "[summary]", "timestamp": at}],
                                         require_compression_lease=False)
            db._conn.execute("UPDATE sessions SET ended_at = ? WHERE id = ?", (at, parent))
            db._conn.execute("UPDATE sessions SET started_at = ? WHERE id = ?", (at, child))
            db._conn.commit()

        for chat in ("live", "idle"):
            db.create_session(chat, source="cli")
            db.append_message(chat, "user", f"{chat} early detail", timestamp=old)
            db._conn.execute("UPDATE sessions SET started_at = ? WHERE id = ?", (old, chat))
            db._conn.commit()
            rotate(chat, f"{chat}-2", old + 60)
            rotate(f"{chat}-2", f"{chat}-3", old + 120)
        db.append_message("live-3", "user", "still talking today")
        db.end_session("idle-3", "done")
        db._conn.execute("UPDATE sessions SET ended_at = ? WHERE id = 'idle-3'", (old + 180,))
        db._conn.commit()

        idle = {"idle", "idle-2", "idle-3"}
        # The CLI pinned-skip note counts pinned rows, not the unpinned ancestors a pinned tip spares.
        db._conn.execute("UPDATE sessions SET pinned = 1 WHERE id = 'idle-3'")
        db._conn.commit()
        _note_pinned_skipped(db, {"older_than_days": 90, "lineage_tips_only": False}, "prune")
        assert "Note: 1 pinned session also match" in capsys.readouterr().out
        db._conn.execute("UPDATE sessions SET pinned = 0 WHERE id = 'idle-3'")
        db._conn.commit()
        assert {c["id"] for c in db.list_prune_candidates(older_than_days=90, whole_lineages=True)} == idle
        assert db.prune_sessions(older_than_days=90) == len(idle)
        assert db.get_compression_lineage("live-3") == ["live", "live-2", "live-3"]
        assert not any(db.get_session(sid) for sid in idle)
