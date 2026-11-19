<!-- continuity-seed: 76ce55252aa20c8165a11b915000908b620a64ee2c0747b2d12b26c2ae2519b8 -->
# TH1-2642 · Hermes Desktop gateway stalls

- Issue and project https://linear.app/th1337/issue/TH1-2642/hermes-gateway-stop-loop-stalls-from-receipt-recovery-and-full-gcs · paseo-ops
- Delivery branch `dispatch/TH1-2642` on `hteo1337/hermes-agent`, base `base/th1-1839-upstream-4dcef215cf` at `57499e996fb`. Draft security PR https://github.com/hteo1337/hermes-agent/pull/4.
- Done. Local policies restore on demand except for pending work and persisted closes. The early control listener, SQLite metadata index, loop-first dumps, non-glibc trim guard, Desktop retry, and opt-in ended-cron retention are in the branch.
- Verification. 502 Python and 54 Desktop tests passed in their one suite run each. Final retention test passed, and its base control failed for the missing batch option. An isolated gateway answered in 8.68 s and was ready in 11.23 s at 190 MiB. Exact commands and limitations are in VERIFICATION.md.
- Next. Teo owns merge after CI and exact-head verification. Keep the draft and remove continuity-only files before merge. Ordinary Sol and adversarial Sol reviewed the prior product head. After security review, scheduled retention covers SQLite rows and receipts and preserves standalone transcript and debug files. The final targeted case passed. See the PR for final confirmation.
- Open. CI verdict and production rollout are unverified. Stable-port dry runs found six m5 and four m4 conflicts. That port needs its own release base. No live state, service, or installation was touched.

```dispatch-outcome
{"accomplished":"partial","evidence":{"artifacts":["https://github.com/hteo1337/hermes-agent/pull/4","handoffs/TH1-2642/VERIFICATION.md"],"commands":["scripts/run_tests.sh -j 1 --tb=short","npm test -- --maxWorkers=1 electron/local-gateway"]},"blocker_category":"none","remaining_work":["Record exact-head review confirmation on draft PR","Verify CI on final PR head","Resolve separate stable release port"]}
```
