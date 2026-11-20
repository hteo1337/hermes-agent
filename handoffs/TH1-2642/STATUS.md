<!-- continuity-seed: 76ce55252aa20c8165a11b915000908b620a64ee2c0747b2d12b26c2ae2519b8 -->
# TH1-2642 · Hermes Desktop gateway stalls

- Issue [TH1-2642](https://linear.app/th1337/issue/TH1-2642/hermes-gateway-stop-loop-stalls-from-receipt-recovery-and-full-gcs), project paseo-ops. Security draft [PR #4](https://github.com/hteo1337/hermes-agent/pull/4), `hteo1337/hermes-agent`, branch `dispatch/TH1-2642`, base `57499e996fb`.
- Done. Round five removes client-side starting-owner stops, expiry, claim and published progress. Ensure returns `starting/deadline`. The verified protocol-0 upgrade path and previously reviewed startup, session, Desktop and manual prune fixes remain.
- Product and test head `de1eaed04f2e97bba6be6e802306b6409573a970`. The following delivery commit contains the issue handoff and verification only.
- Verification. The base no-listener probe returned `starting/deadline` with zero stops or launches. The round-five control hit the stop sentinel, and on the scope-cut head the isolated gateway answered during both SQLite builds, reached ready in 9.034 s and received zero stop requests from ensure. Python 591 passed and 17 skipped across 30 files. Desktop 56 passed and one skipped across 12 files. See [VERIFICATION.md](VERIFICATION.md).
- Next. Same Sol reviewer confirms the scope cut on the pushed draft. One independent adversarial Sol review, read-only security audit and exact-head GitHub CI follow. Teo owns merge and handoff cleanup.
- Open. Automatic hung-start recovery is deferred. With the unchanged in-process watchdog disabled, a hung start needs `hermes gateway restart`, as at base. The Windows native pipe case requires its native host. The separate stable port remains in [BLOCKED.md](BLOCKED.md). Scheduled cron retention remains deferred.
- Continuity task `0bf9b1eed37f45dd97d391fdb0676ef3`, runs `6323e172801d41d9a41dfab60070c189` and `17fb5bca2db94b72b3bcdfc4a65adb24`, workspace `wks_7a450413ce8752dd`.
