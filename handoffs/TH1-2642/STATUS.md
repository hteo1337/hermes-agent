<!-- continuity-seed: 76ce55252aa20c8165a11b915000908b620a64ee2c0747b2d12b26c2ae2519b8 -->
# TH1-2642 · Hermes Desktop gateway stalls

- Issue [TH1-2642](https://linear.app/th1337/issue/TH1-2642/hermes-gateway-stop-loop-stalls-from-receipt-recovery-and-full-gcs), project paseo-ops. Security draft [PR #4](https://github.com/hteo1337/hermes-agent/pull/4), `hteo1337/hermes-agent`, branch `dispatch/TH1-2642`, base `57499e996fb`.
- Done. Round four publishes bounded 600-second SQLite phase protection through identify, rechecks progress and readiness immediately before stopping, and uses one cross-process stop claim per answering owner. Unstamped starting owners retain protection across wall-clock corrections. Explicitly older protocols retain verified upgrade replacement.
- Product and test head `d591e1410b098b9b4e056d0ed7864f7502b7bc54`. The following delivery commit updates only these handoffs. The reviewed head was `fa96f66028752b4fbb87de5d43fe897a2b9eb5f4`.
- Verification. Python 592 passed and 17 skipped across 30 files. Desktop 56 passed and one skipped across 12 files. Both reviewed-head controls failed as expected. The isolated gateway reached ready in 5.514 s after both schema gates and index builds. See [VERIFICATION.md](VERIFICATION.md) for the exact commands and results.
- Next. Same Sol reviewer confirmation on the pushed draft head, one independent adversarial Sol review, a read-only security audit, and exact-head GitHub CI. Teo owns merge and handoff cleanup.
- Open. Windows native pipe execution still needs its native lane. The separate stable port remains in [BLOCKED.md](BLOCKED.md). The draft scope stays on startup-owner expiry. Scheduled cron retention remains deferred.
- Continuity launch ID `f56bbeb830ce43558e2742a868549bd6:00fa8ff7c04649bfb39fc0fc12b235ec`.
