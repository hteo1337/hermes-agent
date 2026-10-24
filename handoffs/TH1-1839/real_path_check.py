"""One isolated normal-gateway run with default-pool occupancy injected after READY.

No application handlers/authentication are mocked. Tickets stay in memory and are never printed.
Run from the repository with .venv/bin/python handoffs/TH1-1839/real_path_check.py.
"""
import asyncio
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time

from websockets.asyncio.client import connect

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tests.gateway.test_normal_runtime_boot import control

CHILD = r'''
import asyncio
from contextvars import ContextVar, copy_context
import json
from pathlib import Path
import threading
import sys
import gateway.run_runtime as runtime
from gateway import run

root = Path(sys.argv[1])
sys.argv = sys.argv[:1]
original = runtime.publish_gateway_runtime_ready
async def occupy(runner):
    loop = asyncio.get_running_loop()
    pool = loop._default_executor
    count = pool._max_workers  # This host has 32; saturate every worker, not just 22.
    release = threading.Event()
    started = [asyncio.Event() for _ in range(count)]
    def hold(event):
        loop.call_soon_threadsafe(event.set)
        release.wait()
    holders = [loop.run_in_executor(None, hold, event) for event in started]
    try:
        await asyncio.wait_for(asyncio.gather(*(event.wait() for event in started)), 5)
        probe = loop.run_in_executor(None, lambda: 'released')
        # Check context propagation and independent workload occupancy without a provider call.
        from gateway.executor_pools import submit_workload, MCP_DISCOVERY_EXECUTOR
        marker = ContextVar('probe_profile', default='unbound')
        token = marker.set('isolated-profile')
        try:
            compression, summary, mcp = await asyncio.gather(
                submit_workload(runner, 'compression', marker.get),
                submit_workload(runner, 'summary', marker.get),
                loop.run_in_executor(MCP_DISCOVERY_EXECUTOR, copy_context().run, marker.get))
            assert compression == summary == mcp == 'isolated-profile'
        finally:
            marker.reset(token)
        (root / 'saturated.json').write_text(json.dumps({'holders': count, 'workers': pool._max_workers,
                                                       'context_preserved': True}))
        while not (root / 'release').exists():
            assert not probe.done(), 'default pool lost saturation'
            await asyncio.sleep(.05)
    finally:
        release.set()
        await asyncio.gather(*holders)
        await probe
        (root / 'released').touch()

def ready(runner):
    original(runner)
    asyncio.create_task(occupy(runner))
runtime.publish_gateway_runtime_ready = ready
run.main()
'''

async def check_ws(home, descriptor):
    url = descriptor['api_origin'].replace('http:', 'ws:') + '/api/ws'
    params = {'profile_id': str(home.resolve()), 'instance_id': descriptor['instance_id'],
              'purpose': 'interactive'}
    start = time.monotonic()
    grant = control(home, 'session-ticket', params)
    minted = time.monotonic()
    protocols = ['hermes-gateway-v1', 'hermes-gateway-ticket.' + grant['ticket']]
    async with connect(url, subprotocols=protocols, open_timeout=5) as ws:
        async with asyncio.timeout(5):
            while True:
                frame = json.loads(await ws.recv())
                if frame.get('params', {}).get('type') == 'gateway.ready':
                    break
            ready_at = time.monotonic()
            await ws.send(json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'ping', 'params': {}}))
            while True:
                frame = json.loads(await ws.recv())
                if frame.get('id') == 1:
                    assert frame.get('result') == {'pong': True}
                    break
            pinged = time.monotonic()
            # A legacy fallback also crosses the RPC pool with the authenticated actor intact.
            await ws.send(json.dumps({'jsonrpc': '2.0', 'id': 2, 'method': 'gateway.capabilities', 'params': {}}))
            while True:
                frame = json.loads(await ws.recv())
                if frame.get('id') == 2:
                    assert frame.get('result', {}).get('per_session_exclusive_submit') is True
                    break
    for override in ({'instance_id': 'wrong-instance'}, {'purpose': 'invalid-purpose'}):
        try:
            control(home, 'session-ticket', {**params, **override})
            raise RuntimeError('invalid ticket request accepted')
        except AssertionError:
            pass  # the real control handler refused the invalid binding
    assert pinged - start < 5
    return {'ticket_ms': round((minted-start)*1000, 2), 'ready_ms': round((ready_at-minted)*1000, 2),
            'ping_ms': round((pinged-ready_at)*1000, 2), 'legacy_fallback': 'passed',
            'invalid_ticket_bindings': 'refused'}

def main():
    with tempfile.TemporaryDirectory(prefix='gateway-starvation-') as name:
        scratch = Path(name)
        home, user = scratch / 'state', scratch / 'user'
        home.mkdir(mode=0o700)
        user.mkdir()
        (home / 'config.yaml').write_text(json.dumps({
            'gateway': {'multiplex_profiles': False},
            'model': {'provider': 'custom', 'default': 'local-probe', 'base_url': 'http://127.0.0.1:1/v1'},
            'agent': {'environment_probe': False}, 'auxiliary': {'title_generation': {'enabled': False}},
        }))
        child = scratch / 'child.py'
        child.write_text(CHILD)
        env = {k: os.environ[k] for k in ('PATH', 'LANG', 'TZ') if k in os.environ}
        env.update(HOME=str(user), USERPROFILE=str(user), HERMES_HOME=str(home),
                   HERMES_RUNTIME_DIR=str(scratch / 'runtime'), PYTHONPATH=str(ROOT), PYTHONUNBUFFERED='1')
        logpath = ROOT / 'handoffs/TH1-1839/real-gateway.log'
        with logpath.open('w') as log:
            proc = subprocess.Popen([sys.executable, str(child), str(scratch)], cwd=ROOT, env=env,
                                    stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT)
            try:
                deadline = time.monotonic() + 60
                while not (scratch / 'saturated.json').exists():
                    assert proc.poll() is None, 'gateway exited; inspect real-gateway.log'
                    assert time.monotonic() < deadline, 'gateway did not saturate; inspect real-gateway.log'
                    time.sleep(.1)
                descriptor = control(home, 'identify')
                assert descriptor['state'] == 'ready'
                result = json.loads((scratch / 'saturated.json').read_text())
                result.update(asyncio.run(check_ws(home, descriptor)))
                # Ensure the queued probe measures >1s at release (no provider/model call).
                time.sleep(1.1)
                (scratch / 'release').touch()
                deadline = time.monotonic() + 10
                while not (scratch / 'released').exists():
                    assert time.monotonic() < deadline
                    time.sleep(.05)
                proc.send_signal(signal.SIGINT)
                result['exit_code'] = proc.wait(timeout=25)
                assert result['exit_code'] == 0
                text = logpath.read_text()
                result['queue_warning'] = 'Default executor queue wait=' in text
                assert result['queue_warning']
                print(json.dumps(result, sort_keys=True))
            finally:
                (scratch / 'release').touch()
                if proc.poll() is None:
                    proc.terminate()
                    try:
                        proc.wait(timeout=20)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                        proc.wait(timeout=5)

if __name__ == '__main__':
    main()
