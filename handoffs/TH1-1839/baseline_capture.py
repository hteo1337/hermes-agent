"""Observational pytest plugin for the two capped TH1-1839 baseline runs."""
import json
import os
import sys
from pathlib import Path

_write = os.write
_open = os.open
_close = os.close
_dumps = json.dumps
_pid = os.getpid()
_fd = None
_ROOT = Path('/Users/hteo/.paseo/worktrees/15xx6i9l/a98676de0c32/handoffs/TH1-1839/outcomes')
_RUNS = {
    '/Users/hteo/.paseo/worktrees/th1-1839-baseline-9d69f1fe': 'base',
    '/Users/hteo/.paseo/worktrees/th1-1839-head-9d69f1fe': 'head',
}


def _record(event):
    if _fd is not None:
        _write(_fd, (_dumps(event, ensure_ascii=True) + '\n').encode())


def pytest_configure(config):
    global _fd
    cwd = str(Path.cwd())
    label = _RUNS.get(cwd)
    args = list(config.args)
    if label is None or len(args) != 1:
        return
    source = Path(args[0])
    if not source.is_absolute():
        source = Path(cwd) / source
    try:
        relative = str(source.relative_to(cwd))
    except ValueError:
        return
    if not relative.startswith(('tests/gateway/', 'tests/tui_gateway/')):
        return
    target = _ROOT / label / (relative.replace('/', '__') + f'.{_pid}.jsonl')
    _fd = _open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    _record({'event': 'session', 'file': relative, 'cwd': cwd,
             'python': sys.executable, 'args': args, 'pid': _pid})


def pytest_collection_finish(session):
    _record({'event': 'collected', 'nodes': [item.nodeid for item in session.items]})


def pytest_collectreport(report):
    if report.failed:
        _record({'event': 'collection_error', 'nodeid': report.nodeid,
                 'error': str(report.longrepr)})


def pytest_runtest_logreport(report):
    event = {'event': 'report', 'nodeid': report.nodeid, 'phase': report.when,
             'outcome': report.outcome, 'duration': report.duration}
    if hasattr(report, 'wasxfail'):
        event['wasxfail'] = str(report.wasxfail)
    if report.failed:
        event['error'] = str(report.longrepr)
    _record(event)


def pytest_sessionfinish(session, exitstatus):
    global _fd
    imports = {name: str(getattr(module, '__file__', ''))
               for name, module in list(sys.modules.items())
               if name in ('gateway.run', 'gateway.control_socket', 'tui_gateway.ws',
                           'gateway.executor_pools')}
    _record({'event': 'finish', 'exitstatus': int(exitstatus), 'imports': imports})
    if _fd is not None:
        _close(_fd)
        _fd = None
