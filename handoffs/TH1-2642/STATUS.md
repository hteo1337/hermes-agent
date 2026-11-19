<!-- continuity-seed: 76ce55252aa20c8165a11b915000908b620a64ee2c0747b2d12b26c2ae2519b8 -->
# TH1-2642 · Hermes Desktop gateway stalls

- Issue [TH1-2642](https://linear.app/th1337/issue/TH1-2642/hermes-gateway-stop-loop-stalls-from-receipt-recovery-and-full-gcs), project paseo-ops. Security draft [PR #4](https://github.com/hteo1337/hermes-agent/pull/4), `hteo1337/hermes-agent`, branch `dispatch/TH1-2642`, base `57499e996fb`.
- Done. Removed scheduled ended-cron retention and restored the mirror importer to base. Scheduled retention is deferred to a separate issue. Manual `hermes sessions prune` remains available and reports committed IDs before optional cleanup.
- Done. A stalled startup now expires across ensure invocations. Completed SQLite work renews protection. Explicitly older protocols take the verified upgrade path immediately. Product and test head `e07b61a5c6bd5494d3b5e276a5536c2357ee14af`. The delivery commit changes only handoff Markdown.
- Verification. Python 591 passed and 17 skipped across 30 files after resuming the interrupted invocation and correcting the new test fixture. Desktop 56 passed and one skipped. The old-head control failed at the stuck-owner assertion and the repaired case passed. See [VERIFICATION.md](VERIFICATION.md) for exact commands, paired rollback, real boot measurements and the base diff.
- Next. Same Sol reviewer confirmation on the delivered draft head, independent adversarial Sol review, read-only security audit, and exact-head GitHub CI. Teo owns merge and handoff-file cleanup.
- Open. GitHub CI and Windows native-pipe runtime remain outstanding. The separate stable release port is recorded in [BLOCKED.md](BLOCKED.md). No live Hermes state or service was used.
- Continuity launch ID `e8dd869fff5b4a35b19b6f0462c2d665:34abab9996e44aeeaf18e1ec7190075b`.

```dispatch-outcome
{"accomplished":"partial","head":"e07b61a5c6bd5494d3b5e276a5536c2357ee14af","head_scope":"product_and_test","evidence":{"artifacts":["https://github.com/hteo1337/hermes-agent/pull/4","handoffs/TH1-2642/VERIFICATION.md"],"commands":["scripts/run_tests.sh -j 1 --tb=short","npm test -- --maxWorkers=1 electron/local-gateway","python scripts/check --only health --base 57499e996fb --commit e07b61a5c6b","git diff 57499e996fb..HEAD -- gateway/session_persistence.py gateway/session_prune.py"]},"blocker_category":"none","remaining_work":["Confirm the draft with the same Sol reviewer","Complete independent adversarial review and read-only security audit","Verify exact-head GitHub CI"]}
```
