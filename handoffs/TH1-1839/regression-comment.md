Regression: PRE-EXISTING

The unchanged upstream base reproduces the identical refusal-stamp failure. No product code or test was changed, skipped, weakened or retimed.

| Pin | Target invocations | Passed | Failed | Pass rate | Exit codes |
| --- | ---: | ---: | ---: | ---: | --- |
| Base `4dcef215cf` | 40 | 37 | 3 | 92.5% | 37×0, 3×1 |
| Original PR head `c1f9fcc309` | 40 | 38 | 2 | 95% | 38×0, 2×1 |

All five failures are `tests/gateway/test_replace_ownership_guard.py:486`, `running` instead of `startup_failed`, in the requested target. Base failed rounds 36/37/39; head failed 4/37. First 20 runs were base 20/20 and head 19/20; the sample was extended to a fixed 40 per pin to investigate that inconclusive difference, alternating base/head order. The final rates are comparable, **not exactly equal or statistical proof of independence**; there is no observed head increase. PR #2 is not necessary for this failure.

Command for every repetition (same PM interpreter, retries disabled):

```sh
HERMES_PYTHON=/Users/hteo/.paseo/worktrees/th1-1839-env-9f8ecdef/venv/bin/python HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh tests/gateway/test_replace_ownership_guard.py -k test_refusal_stamp_reaches_disk_before_the_hard_exit -j 1
```

The test, status writer and refusal function are identical across the pins. The independent daemon writer sleeps 5.0s before the actual atomic write; the caller waits at most 5.0s, ignores a false result, returns False and eventually hard-exits. This unchanged deadline boundary explains how a pending stamp can die; **that mechanism is inferred from source, not a captured failing-child wait-return**. Both separately instrumented children persisted the stamp and exited1 as expected. On head, `observe_default_executor()` took 29.9µs **before** refusal; zero work was submitted to the observed executor. The stamp uses its own writer thread. Head adds an unused-executor shutdown helper after refusal; no refusal write was routed through that executor. Other changed workload/runner paths are beyond the early refusal return. A small indirect scheduling effect is not excluded by this sample.

**Final full-suite comparison is NOT established.** I made an isolation mistake: the fresh linked worktrees still shared Git metadata under the live checkout. HomeIOGuard rejected metadata access (`.git/worktrees/.../hermes-update-pull`). I stopped that contaminated invocation; outer exit143 (SIGTERM), incomplete last progress 605 passed/99 failed plus setup errors, 86 completed-file reports. These are not final suite counts and cannot be compared with baseline 11. No guard was bypassed.

```sh
HERMES_PYTHON=/Users/hteo/.paseo/worktrees/th1-1839-env-9f8ecdef/venv/bin/python HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh tests/gateway/ tests/tui_gateway/ -j 6
```

A standalone checkout at the same final head was then verified with Git metadata entirely under `~/.paseo/worktrees`; PM dev/test/messaging dependencies were rebuilt there. `python scripts/check --base 4dcef215cfe41bd2d02c2d1dad6e257a18101216`: **12 checks OK, exit 0**. A structured question requests an exception for one replacement suite; none has run without approval because of the explicit once-only cap. Final failure-set equality and a current-head executor-starvation test pass remain unverified.

Cleanup-only final head: `221080c47f67347f821773fdcf67a7f7fcb133d5`, pushed to the actual PR branch `th1-1839-gateway-executor-starvation` (`dispatch/TH1-1839` does not exist). Diff outside `handoffs/` versus c1f9fcc309 is empty; GitHub confirms zero handoff files in the PR diff. Prior review artifacts remain preserved on the evidence branch. PR remains ready and unmerged; lead owns exact-head confirmation and CI (observed queued, not green). No install or running-gateway changes. The two linked worktrees, standalone clone and PM test environment/runtime/cache were removed; current review worktree retained.

Evidence: [TH1-1839 review-branch handoff](https://github.com/hteo1337/hermes-agent/blob/review/TH1-1839-regression-9f8ecdef/handoffs/TH1-1839/STATUS.md), including all 80 invocation logs, exact exits, hashes, traces, invalid-suite output and cleanup receipts.
