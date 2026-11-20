import asyncio
import gc
import json
import os
import shutil
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace
import psutil
from gateway.config import GatewayConfig
from gateway.session import SessionStore
from gateway.session_authority import initialize_session_authority
from gateway.session_contract import Principal
from gateway.session_local import create_local_session
from gateway import run
from hermes_state_keys import local_identity
from hermes_state_local import POLICY_PREFIX
from hermes_state import SessionDB

def runner(store):
    return SimpleNamespace(session_store=store, _session_db=store._db, adapters={}, _draining=False)


async def initialize(store, home, instance):
    return await initialize_session_authority(runner(store), profile_id=str(home), instance_id=instance)


def seed(home, root, store):
    authority = asyncio.run(initialize(store, home, 'seed'))
    profile = str(home)
    actor = Principal('benchmark', profile, frozenset({'session:create'}), 'fixture')
    ref = create_local_session(authority, actor, {
        'request_id': 'seed', 'source': 'gui', 'cwd': str(home), 'model': 'fixture-model', 'toolsets': [],
    })
    db = store._db
    receipt = json.loads(db.get_meta(POLICY_PREFIX + ref.session_id))
    payload = 'x' * 120_000
    total = 0
    for group in range(0, 10_000, 100):
        def batch(conn):
            nonlocal total
            for number in range(group, group + 100):
                request = f'fixture-{number:05d}'
                sid = local_identity(profile, actor.subject, request)
                raw = json.dumps(receipt).replace(ref.session_id, sid)
                doc = json.loads(raw)
                doc.update(request_id=request)
                doc['policy']['request_json'] = json.dumps({'request_id': request, 'padding': payload})
                full = json.dumps(doc)
                total += len(full)
                entry = doc['entry']
                conn.execute("INSERT INTO sessions(id,source,user_id,session_key,chat_id,chat_type,started_at,ended_at) VALUES(?,?,?,?,?,'dm',?,?)",
                             (sid,'gui',actor.subject,doc['route'],sid,100,101))
                conn.execute("INSERT INTO gateway_routing(scope,session_key,entry_json,updated_at) VALUES('',?,?,?)", (doc['route'],json.dumps(entry),100))
                conn.execute("INSERT INTO state_meta(key,value) VALUES(?,?)", (POLICY_PREFIX + sid,full))
        db._execute_write(batch)
    db.close()
    shutil.copyfile(home / 'state.db', root / 'seed.db')
    print(f'fixture_receipts=10000 synthetic_json_bytes={total}', flush=True)

def elapsed(fn):
    t = time.perf_counter()
    result = fn()
    return result, (time.perf_counter() - t)*1000

async def measure(home, store):
    db = store._db
    rss = lambda: psutil.Process().memory_info().rss // 1024**2
    listing = lambda: db.list_sessions_rich(include_children=False, limit=20)
    count = lambda: db.session_count(exclude_children=True)
    print(f'initial_rss_mib={rss()} initial_rows={db.session_count()}', flush=True)
    print(f'list_ms={elapsed(listing)[1]:.2f} count_ms={elapsed(count)[1]:.2f}', flush=True)
    lock_acquired = threading.Event()
    barrier = threading.Barrier(11)
    def run_listing():
        barrier.wait()
        return elapsed(listing)[1]
    class ObserveLock:
        def __init__(self, lock):
            self.lock = lock
        def __enter__(self):
            self.lock.__enter__()
            if threading.current_thread().name.startswith('fixture-list'):
                lock_acquired.set()
        def __exit__(self, *args):
            return self.lock.__exit__(*args)
    original = db._lock
    db._lock = ObserveLock(original)
    loop = asyncio.get_running_loop()
    with ThreadPoolExecutor(10, thread_name_prefix='fixture-list') as pool:
        futures = [loop.run_in_executor(pool, run_listing) for _ in range(10)]
        barrier.wait()
        fallback = await asyncio.to_thread(lock_acquired.wait, .5)
        writer_wait = 0
        if fallback:
            _, writer_wait = elapsed(lambda: db.set_meta('fixture.probe', 'ran'))
        times = await asyncio.gather(*futures)
    db._lock = original
    print(f'concurrent_listings=10 writer_fallback={fallback} loop_sync_writer_ms={writer_wait:.2f} max_list_ms={max(times):.2f}', flush=True)
    done = asyncio.Event()
    async def tick():
        worst = 0
        then = loop.time()
        while not done.is_set():
            await asyncio.sleep(.01)
            now = loop.time()
            worst = max(worst, now-then-.01)
            then = now
        return worst * 1000
    ticker = asyncio.create_task(tick())
    t = time.perf_counter()
    authority = await initialize(store, home, 'measure')
    await asyncio.sleep(.01)
    done.set()
    print(f'authority_start_ms={(time.perf_counter()-t)*1000:.2f} max_loop_lag_ms={await ticker:.2f} mounted={len(authority.sessions)} rss_mib={rss()} full_gc_ms={elapsed(gc.collect)[1]:.2f}', flush=True)

def main():
    home = Path(os.environ['HERMES_HOME']).resolve()
    root = Path(os.environ['HOME']).resolve()
    assert root.name.startswith('hermes-th1-2642.') and home.parent == root
    store = SessionStore(home / 'sessions', GatewayConfig())
    run._load_gateway_config = lambda: {'platform_toolsets': {'cli': []}}
    if os.environ.get('SEED_FIXTURE'):
        seed(home, root, store)
    else:
        asyncio.run(measure(home, store))


if __name__ == '__main__':
    main()
