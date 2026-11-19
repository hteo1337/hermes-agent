<!-- continuity-seed: 76ce55252aa20c8165a11b915000908b620a64ee2c0747b2d12b26c2ae2519b8 -->
# TH1-2642 · Hermes Desktop gateway stalls

- Issue [TH1-2642](https://linear.app/th1337/issue/TH1-2642/hermes-gateway-stop-loop-stalls-from-receipt-recovery-and-full-gcs), project paseo-ops. Security draft [PR #4](https://github.com/hteo1337/hermes-agent/pull/4) uses `hteo1337/hermes-agent` branch `dispatch/TH1-2642` and base `57499e996fb`.
- Done. Three commits on product and test head `c1ad939943dfd68acb57a4cadeab3e583f04825e` protect the starting owner, redial after a definitive pre-mint stale refusal, and reject mirror imports whose session row is gone.
- Verification. All three controls failed on `c6119975e99` for the expected reasons. Python reported 592 passes and 17 platform skips across 30 files, including the secondary-profile follow-up. Desktop reported 56 passes and one Windows-only skip. Commands, environment recovery and the adversarial pass are in `VERIFICATION.md`.
- Next. The same Sol reviewer should confirm the delivered draft head. The security lane requires independent adversarial review and a read-only security audit. Check GitHub CI on the delivered head. Teo owns merge and the continuity-file cleanup at that boundary.
- Open. Exact-head GitHub CI and Windows native pipe runtime evidence remain outstanding. The separate stable port is recorded in `BLOCKED.md`.
- Continuity launch ID `95ec632f30984586b8456d7803a2d79d:c0a66ee269924732bff3f6e9f3c70874`.

```dispatch-outcome
{"accomplished":"partial","head":"c1ad939943dfd68acb57a4cadeab3e583f04825e","evidence":{"artifacts":["https://github.com/hteo1337/hermes-agent/pull/4","handoffs/TH1-2642/VERIFICATION.md"],"commands":["scripts/run_tests.sh -j 1 --tb=short","npm test -- --maxWorkers=1 electron/local-gateway","../../node_modules/.bin/tsc -p tsconfig.electron.json --noEmit","python scripts/check --only health --base 57499e996fb --commit c1ad939943dfd68acb57a4cadeab3e583f04825e"]},"blocker_category":"none","remaining_work":["Confirm the delivered draft with the same Sol reviewer","Complete independent adversarial review and read-only security audit","Verify GitHub CI on the delivered draft head"]}
```
