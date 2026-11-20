"""SQLite-maintained metadata projection for private policy receipts."""
import json

POLICY_PREFIX = 'gateway.local_policy.v1:'
_INDEX = 'idx_state_meta_local_policy'
_POLICIES = f"key GLOB '{POLICY_PREFIX}*' AND json_valid(value)"
_LINEAGE_LENGTH = "json_array_length(value, '$.lineage')"
_SUMMARY = """json_object(
    'session_id', json_extract(value, '$.session_id'),
    'lineage', json_extract(value, '$.lineage'),
    'route', json_extract(value, '$.route'),
    'entry', json_object('session_id', json_extract(value, '$.entry.session_id')),
    'request_id', json_extract(value, '$.request_id'),
    'source', json_extract(value, '$.policy.source'))"""

# Existing stores build this index on their first writable open. SQLite keeps it in
# sync in the receipt's own transaction, including writes from older processes.
POLICY_INDEX_SQL = f"""
CREATE INDEX IF NOT EXISTS {_INDEX}
    ON state_meta (key, {_LINEAGE_LENGTH}, {_SUMMARY})
    WHERE {_POLICIES};
"""


def _indexed_meta(conn):
    has_index = conn.execute(
        "SELECT 1 FROM sqlite_schema WHERE type='index' AND name=?", (_INDEX,),
    ).fetchone()
    # A read-only caller may be the first process to open an old store.
    return f'state_meta INDEXED BY {_INDEX}' if has_index else 'state_meta'


def policy_summaries(conn, *, multi_segment=False):
    """Stream metadata without reading policy bodies on an upgraded store."""
    where = f'{_POLICIES} AND {_LINEAGE_LENGTH} > 1' if multi_segment else _POLICIES
    for key, raw in conn.execute(f'SELECT key, {_SUMMARY} FROM {_indexed_meta(conn)} WHERE {where}'):
        yield key, json.loads(raw)


def policy_summary(conn, session_id):
    row = conn.execute(f'SELECT {_SUMMARY} FROM {_indexed_meta(conn)} WHERE {_POLICIES} AND key=?',
                       (POLICY_PREFIX + session_id,)).fetchone()
    return json.loads(row[0]) if row is not None else {}
