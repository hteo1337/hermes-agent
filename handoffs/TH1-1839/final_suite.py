"""Run the authorized final suite once and compare its exact failing IDs."""
import json
import os
from pathlib import Path
import re
import subprocess
import time

ROOT = Path(__file__).resolve().parent
TREE = Path('/Users/hteo/.paseo/worktrees/th1-1839-standalone-9f8ecdef')
PYTHON = '/Users/hteo/.paseo/worktrees/th1-1839-env-9f8ecdef/venv/bin/python'
BASELINE = Path('/Users/hteo/.paseo/worktrees/15xx6i9l/a98676de0c32/handoffs/TH1-1839/comparison.json')

def processes():
    lines = subprocess.check_output(['ps', '-axo', 'pid,ppid,etime,args'], text=True).splitlines()
    return [line for line in lines if re.search(r'(?:-m pytest|scripts/run_tests_parallel.py|refusal_child.py| -m compileall)', line)]

before = processes()
(ROOT / 'before-final-processes.json').write_text(json.dumps(before, indent=2)+'\n')
if before:
    raise RuntimeError('Competing test processes present; suite not started')
cmd = ['scripts/run_tests.sh', 'tests/gateway/', 'tests/tui_gateway/', '-j', '6']
env = {**os.environ, 'HERMES_PYTHON': PYTHON, 'HERMES_TEST_FILE_RETRIES': '0'}
common = subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], cwd=TREE, text=True).strip()
if str(Path(common).resolve()).startswith(str(Path.home() / '.hermes')):
    raise RuntimeError('Git metadata is under real Hermes home; refusing suite')
sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=TREE, text=True).strip()
started = time.monotonic()
with (ROOT / 'final-suite.log').open('w') as log:
    proc = subprocess.run(cmd, cwd=TREE, env=env, stdout=log, stderr=subprocess.STDOUT, check=False, timeout=2400)
seconds = time.monotonic() - started
text = (ROOT / 'final-suite.log').read_text()
failed = sorted(set(re.findall(r'FAILED (tests/\S+)', text)))
baseline = set(json.loads(BASELINE.read_text())['shared_bad'])
summary = re.search(r'=== Summary: (\d+) files, (\d+) tests passed, (\d+) failed(?:, (\d+) skipped)?.*', text)
after = processes()
result = dict(sha=sha, command=cmd, env={'HERMES_PYTHON':PYTHON,'HERMES_TEST_FILE_RETRIES':'0'}, exit=proc.returncode, seconds=seconds,
              summary=summary.group(0) if summary else None, failed_ids=failed, baseline_failed_ids=sorted(baseline),
              new_failures=sorted(set(failed)-baseline), absent_baseline_failures=sorted(baseline-set(failed)),
              equals_baseline_11=(set(failed)==baseline and len(failed)==11), processes_after=after)
(ROOT / 'after-final-processes.json').write_text(json.dumps(after,indent=2)+'\n')
(ROOT / 'final-comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2), flush=True)
