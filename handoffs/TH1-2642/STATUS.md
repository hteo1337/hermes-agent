<!-- continuity-seed: 76ce55252aa20c8165a11b915000908b620a64ee2c0747b2d12b26c2ae2519b8 -->
# TH1-2642 · Hermes Desktop gateway stalls

- Issue and project https://linear.app/th1337/issue/TH1-2642/hermes-gateway-stop-loop-stalls-from-receipt-recovery-and-full-gcs · paseo-ops
- Delivery branch `dispatch/TH1-2642` on `hteo1337/hermes-agent`, base `base/th1-1839-upstream-4dcef215cf` at `57499e996fb`. Draft security PR https://github.com/hteo1337/hermes-agent/pull/4.
- Done. Local policies restore on demand except for pending work and persisted closes. The early control listener, SQLite metadata index, loop-first dumps, non-glibc trim guard, Desktop retry, and opt-in ended-cron retention are in the branch.
- Verification. 502 Python and 54 Desktop tests passed in their one suite run each. Final retention test passed, and its base control failed for the missing batch option. An isolated gateway answered in 8.68 s and was ready in 11.23 s at 190 MiB. Exact commands and limitations are in VERIFICATION.md.
- Next. Complete Sol review, Jev decision, adversarial Sol review and a read-only security audit against the draft head. Teo owns merge. Keep the draft and remove continuity-only files before merge.
- Open. CI verdict and production rollout are unverified. The optional stable release port must use a separate release base. No live state, service, or installation was touched.

```dispatch-outcome
{"accomplished":"partial","evidence":{"artifacts":["https://github.com/hteo1337/hermes-agent/pull/4","handoffs/TH1-2642/VERIFICATION.md"],"commands":["scripts/run_tests.sh -j 1 --tb=short","npm test -- --maxWorkers=1 electron/local-gateway"]},"blocker_category":"none","remaining_work":["Security review lane","Verify CI on final PR head","Separate stable release port"]}
```
