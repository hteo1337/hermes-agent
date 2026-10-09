# D3b checklist

`PASEO_AGENT_ID` was unset in this shell, so its first eight characters are empty.

- [x] Identify the inherited 14-file gate. (Command read from adjacent D3 merge STATUS.md; this branch has no STATUS.md.)
- [x] Remove active upstream defaults and omit disabled links, with focused behavior tests. (27-file gate: 747 passed, 0 failed, 2 skipped; audit: 65 classified residual hits.)
- [x] Run touched tests and inherited gate with isolated Hermes state; run Ruff and project checks. (27 files: 747 passed, 0 failed, 2 skipped; scripts/check: Ruff passed, health failed on 10 untouched Desktop findings.)
- [x] Regenerate URL audit with a reason for each residual hit and inspect the bounded diff. (65 classified rows; git diff --check clean; no Desktop, LICENSE, or NOTICE diff.)
- [x] Commit locally and report exact evidence and residual risk. (Local commit created; gate and check outputs recorded in STATUS.md.)
