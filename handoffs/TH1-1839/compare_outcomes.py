"""Summarize recorded pytest reports; never executes a test."""
import collections
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BAD = {'failed', 'error', 'incomplete'}


def load_run(label):
    raw_files = sorted((ROOT / 'outcomes' / label).glob('*.jsonl'))
    archived = ROOT / f'{label}-outcomes.json.gz'
    if not raw_files and archived.exists():
        with gzip.open(archived, 'rt') as stream:
            return json.load(stream)
    nodes = {}
    sessions = []
    collection_errors = []
    for path in raw_files:
        session = {'artifact': path.name, 'finish': None, 'collected': []}
        for line in path.read_text().splitlines():
            entry = json.loads(line)
            event = entry['event']
            if event == 'session':
                session.update(entry)
            elif event == 'finish':
                session['finish'] = entry
            elif event == 'collected':
                session['collected'] = entry['nodes']
                for node in entry['nodes']:
                    if node in nodes:
                        raise RuntimeError(f'Duplicate test session: {label}: {node}')
                    nodes[node] = {'phases': {}, 'subreports': []}
            elif event == 'collection_error':
                collection_errors.append(entry)
            elif event == 'report':
                record = nodes.setdefault(entry['nodeid'], {'phases': {}, 'subreports': []})
                phases = record['phases']
                # unittest.subTest emits extra call reports under its parent node ID.
                if entry['phase'] in phases:
                    record['subreports'].append(phases[entry['phase']])
                phases[entry['phase']] = entry
        sessions.append(session)
    counts = collections.Counter()
    report_counts = collections.Counter()
    for node, record in nodes.items():
        phases = record['phases']
        failures = [v for v in [*phases.values(), *record['subreports']] if v['outcome'] == 'failed']
        skipped = [v for v in phases.values() if v['outcome'] == 'skipped']
        call = phases.get('call', {})
        if any(v['phase'] != 'call' for v in failures):
            status = 'error'
        elif failures:
            status = 'failed'
        elif skipped:
            status = 'xfailed' if any('wasxfail' in v for v in skipped) else 'skipped'
        elif call.get('outcome') == 'passed':
            status = 'xpassed' if 'wasxfail' in call else 'passed'
        else:
            status = 'incomplete'
        record['status'] = status
        record['errors'] = [{'phase': v['phase'], 'error': v.get('error', '')} for v in failures]
        counts[status] += 1
        for phase in phases.values():
            if phase['outcome'] == 'failed':
                report_counts['failed' if phase['phase'] == 'call' else 'errors'] += 1
            elif phase['outcome'] == 'skipped':
                report_counts['xfailed' if 'wasxfail' in phase else 'skipped'] += 1
            elif phase['phase'] == 'call':
                report_counts['xpassed' if 'wasxfail' in phase else 'passed'] += 1
    origins = collections.defaultdict(set)
    for session in sessions:
        for name, path in (session['finish'] or {}).get('imports', {}).items():
            origins[name].add(path)
    log = (ROOT / f'{label}-suite.log').read_text() if (ROOT / f'{label}-suite.log').exists() else ''
    summary_line = next((line for line in log.splitlines() if line.startswith('=== Summary:')), None)
    runner_summary = {}
    if summary_line:
        for field, pattern in {'files': r'(\d+) files,', 'passed': r'(\d+) tests passed', 'failed': r'(\d+) failed', 'skipped': r'(\d+) skipped', 'wall_seconds': r'in ([\d.]+)s', 'workers': r'\((\d+) workers\)'}.items():
            m = re.search(pattern, summary_line)
            runner_summary[field] = (float(m[1]) if field == 'wall_seconds' else int(m[1])) if m else 0
    result = {'counts': dict(counts), 'runner_summary': runner_summary, 'runner_summary_line': summary_line, 'pytest_report_counts': dict(report_counts),
              'total_nodes': len(nodes), 'files': len(sessions),
              'unfinished_sessions': [s['file'] for s in sessions if s['finish'] is None],
              'file_exit_counts': dict(collections.Counter(str(s['finish']['exitstatus']) if s['finish'] else 'unfinished' for s in sessions)),
              'collection_errors': collection_errors,
              'import_origins': {k: sorted(v) for k, v in origins.items()},
              'suite_exit': int((ROOT / f'{label}-exit.txt').read_text()) if (ROOT / f'{label}-exit.txt').exists() else None,
              'nodes': nodes, 'sessions': sessions}
    (ROOT / f'{label}-outcomes.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def main():
    runs = {label: load_run(label) for label in ('base', 'head')}
    if not all(r['suite_exit'] is not None for r in runs.values()):
        print(json.dumps({k: {field: v[field] for field in ('counts', 'total_nodes', 'files', 'suite_exit', 'unfinished_sessions')} for k,v in runs.items()}, indent=2))
        return
    base, head = (runs[label]['nodes'] for label in ('base', 'head'))
    shared = set(base) & set(head)
    regressions = sorted(n for n in shared if base[n]['status'] == 'passed' and head[n]['status'] in BAD)
    improvements = sorted(n for n in shared if head[n]['status'] == 'passed' and base[n]['status'] in BAD)
    new_nodes, removed = sorted(set(head) - set(base)), sorted(set(base) - set(head))
    base_files = {s['file']: s['finish']['exitstatus'] if s['finish'] else None for s in runs['base']['sessions']}
    head_files = {s['file']: s['finish']['exitstatus'] if s['finish'] else None for s in runs['head']['sessions']}
    comparison = {
        'new_nonzero_file_exits': {f: {'base': base_files.get(f), 'head': rc} for f, rc in head_files.items() if rc not in (0, 5) and base_files.get(f) in (0, 5)},
        'regressions': regressions, 'improvements': improvements,
        'shared_bad': sorted(n for n in shared if head[n]['status'] in BAD and base[n]['status'] in BAD),
        'head_only': {n: head[n]['status'] for n in new_nodes},
        'head_bad_without_base_pass': {n: {'base': base.get(n, {}).get('status', 'absent'), 'head': head[n]['status']} for n in sorted(head) if head[n]['status'] in BAD and base.get(n, {}).get('status') != 'passed' and base.get(n, {}).get('status') not in BAD},
        'base_only': {n: base[n]['status'] for n in removed},
        'other_status_changes': {n: {'base':base[n]['status'], 'head':head[n]['status']} for n in sorted(shared) if base[n]['status'] != head[n]['status'] and n not in regressions and n not in improvements},
        'runs': {label: {k:v for k,v in run.items() if k not in ('nodes', 'sessions')} for label, run in runs.items()},
    }
    (ROOT / 'comparison.json').write_text(json.dumps(comparison, indent=2) + '\n')
    print(json.dumps(comparison, indent=2))


if __name__ == '__main__':
    main()
