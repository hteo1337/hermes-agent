"""Alternate the unchanged refusal durability test on exact base/head worktrees."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
PYTHON = '/Users/hteo/.paseo/worktrees/th1-1839-env-9f8ecdef/venv/bin/python'
TREES = {label: Path(f'/Users/hteo/.paseo/worktrees/th1-1839-{label}-9f8ecdef') for label in ('base', 'head')}
TARGET = 'test_refusal_stamp_reaches_disk_before_the_hard_exit'
parser = argparse.ArgumentParser()
parser.add_argument('--start', type=int, default=1)
parser.add_argument('--stop', type=int, default=20)
args = parser.parse_args()
results = json.loads((ROOT / 'repeat-results.json').read_text()) if args.start > 1 else []
for round_number in range(args.start, args.stop + 1):
    for label in (('base', 'head') if round_number % 2 else ('head', 'base')):
        cwd = TREES[label]
        cmd = ['scripts/run_tests.sh', 'tests/gateway/test_replace_ownership_guard.py', '-k', TARGET, '-j', '1']
        env = {**os.environ, 'HERMES_PYTHON': PYTHON, 'HERMES_TEST_FILE_RETRIES': '0'}
        start = time.monotonic()
        proc = subprocess.run(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False, timeout=180)
        log = ROOT / f'repeat-{label}-{round_number:02d}.log'
        log.write_text(proc.stdout)
        result = dict(label=label, round=round_number, exit=proc.returncode, seconds=round(time.monotonic()-start, 3), command=cmd,
                      sha=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=cwd, text=True).strip(), log=log.name)
        results.append(result)
        (ROOT / 'repeat-results.json').write_text(json.dumps(results, indent=2)+'\n')
        print(json.dumps(result), flush=True)
