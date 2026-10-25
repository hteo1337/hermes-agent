"""Observe the unchanged durability child with function-level timestamps; no sleeps added."""
import ast
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
ENV = Path('/Users/hteo/.paseo/worktrees/th1-1839-env-9f8ecdef')
PYTHON = str(ENV / 'venv/bin/python')
for label in ('base', 'head'):
    tree = Path(f'/Users/hteo/.paseo/worktrees/th1-1839-{label}-9f8ecdef')
    parsed = ast.parse((tree / 'tests/gateway/test_replace_ownership_guard.py').read_text())
    script = next(ast.literal_eval(node.value) for node in parsed.body if isinstance(node, ast.Assign)
                  and any(isinstance(target, ast.Name) and target.id == '_CHILD_SCRIPT' for target in node.targets))
    home = ENV / f'trace-{label}'
    home.mkdir()
    (home / 'gateway_state.json').write_text(json.dumps({'gateway_state': 'running', 'pid': 424242}))
    trace_path = ROOT / f'trace-{label}.jsonl'
    prefix = '''import os, sys, threading, time, json
_fd = os.open(@@TRACE@@, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
_started = time.monotonic()
_names = {'observe_default_executor', '_start_gateway_replace_existing_instance', 'write_runtime_status',
          '_emit_runtime_status_transition', 'wait', 'submit', '_slow_write', '_write_json_file',
          '_exit_after_graceful_shutdown', 'shutdown_default_executor', '_do_shutdown', '_run'}
def _profile(frame, event, arg):
    name = frame.f_code.co_name
    module = frame.f_globals.get('__name__', '')
    selected = (name in _names and (module.startswith(('gateway.', 'asyncio.')) or name == '_slow_write'))
    hard_exit = event == 'c_call' and name == '_exit_after_graceful_shutdown' and getattr(arg, '__name__', '') == '_exit'
    if (selected and event in ('call', 'return')) or hard_exit:
        row = dict(seconds=time.monotonic()-_started, thread=threading.current_thread().name,
                   module=module, function=name, event='hard_exit' if hard_exit else event)
        if event == 'return' and type(arg) in (bool, int, type(None)):
            row['returned'] = arg
        os.write(_fd, (json.dumps(row)+'\\n').encode())
sys.setprofile(_profile)
threading.setprofile(_profile)
'''.replace('@@TRACE@@', repr(str(trace_path)))
    child = ENV / f'trace-{label}.py'
    child.write_text(prefix + script.replace('@@REPO@@', str(tree)))
    env = {'PATH': os.environ['PATH'], 'HOME': os.environ['HOME'], 'HERMES_HOME': str(home),
           'HERMES_RUNTIME_DIR': str(home / 'runtime'), 'TZ': 'UTC', 'LANG': 'C.UTF-8', 'PYTHONHASHSEED': '0'}
    proc = subprocess.run([PYTHON, str(child)], cwd=tree, env=env, capture_output=True, text=True, timeout=120, check=False)
    (ROOT / f'trace-{label}-stderr.txt').write_text(proc.stderr)
    result = dict(label=label, exit=proc.returncode, state=json.loads((home / 'gateway_state.json').read_text()))
    (ROOT / f'trace-{label}-result.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result), flush=True)
