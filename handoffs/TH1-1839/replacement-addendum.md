---

### Addendum — approved standalone replacement suite (2026-10-25)

The lead approved this **one replacement invocation**, excluding the contaminated attempt from the cap. This result resolves the pending suite-comparison gate above. No product code, tests or PR-branch changes; no further reruns.

Exact tested head: `221080c47f67347f821773fdcf67a7f7fcb133d5`. Standalone clone: `/Users/hteo/.paseo/worktrees/th1-1839-replacement-9f8ecdef`; its entire Git directory was inside that clone, with no object alternates/reference clone. PM environment: groups `dev`, `test`, extra `messaging`; same Python 3.14.9 and package versions as the earlier paired runs.

```sh
HERMES_PYTHON=/Users/hteo/.paseo/worktrees/th1-1839-replacement-env-9f8ecdef/venv/bin/python HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh tests/gateway/ tests/tui_gateway/ -j 6
```

**Exit 1; 1970 files; 14844 passed / 11 failed / 335 skipped; 100% complete in 716.9s, 6 workers.**

- Final failing IDs equal **all 11 baseline failing IDs**.
- Added failing IDs (`final - base`): **`[]`**.
- Missing baseline failing IDs (`base - final`): **`[]`**.
- `test_ticket_and_rpc_ping_survive_default_executor_saturation`: **passed** (`test_executor_starvation.py`: 1 passed, 0.9s).
- Refusal-stamp durability target: **passed** (`test_replace_ownership_guard.py`: 15 passed, 7.2s). No additional refusal-stamp failure in this run; the earlier base/head race evidence remains pre-existing.
- Setup/collection error IDs and real-home guard violations: **0**. No competing test processes before or after.

The suite remains red on the 11 known baseline failures; this is a local result, not a CI-green claim. The standalone clone and PM venv/runtime/cache were inspected and removed; tracked source remained unchanged. One generated `owned/SOUL.md` persona artifact was read and removed with the clone. PR head remains 221080c47f, ready/unmerged, with 0 handoff paths in its diff; no merge, install or running-gateway changes.

[Exact failure-ID comparison](https://github.com/hteo1337/hermes-agent/blob/review/TH1-1839-regression-9f8ecdef/handoffs/TH1-1839/replacement-comparison.json) and full log, manifest, environment and cleanup receipt are on `review/TH1-1839-regression-9f8ecdef` under `handoffs/TH1-1839/`.
