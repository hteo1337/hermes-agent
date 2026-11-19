<!-- continuity-seed: 76ce55252aa20c8165a11b915000908b620a64ee2c0747b2d12b26c2ae2519b8 -->
# TH1-2642 · Hermes Desktop gateway stalls

- Issue and project [TH1-2642](https://linear.app/th1337/issue/TH1-2642/hermes-gateway-stop-loop-stalls-from-receipt-recovery-and-full-gcs), paseo-ops. The security draft is [PR #4](https://github.com/hteo1337/hermes-agent/pull/4) in `hteo1337/hermes-agent` on `dispatch/TH1-2642`, based on `base/th1-1839-upstream-4dcef215cf` at `57499e996fb`.
- Done. The repairs for all six blocking findings from review of `d19a727ef8e49bedb757c15b8571c1d365a79815` are on product and test head `94522fee5707e1f07a0425281439830d64b77eeb`. Ticket retries stay within the pre-submission phase. Scheduled cron pruning has a seven-day floor and keeps artifact handling out of the sweep.
- Verified. The repaired gateway answered identify during both first store opens. The lost-reply fixture sent one request. The reviewed head sent six. The SQLite controls covered durable cancellation, the retention floor, spill archives, the routing mirror, and post-commit retirement. Local commands, counts and the interrupted-suite recovery are in `VERIFICATION.md`.
- Non-blocking review findings left open. The ticket store can admit a request for a secondary before failed startup recovery parks it. Duplicate JSON lineage keys can project differently in SQLite and Python. An hourly sweep can process an unbounded backlog of expired tombstones. The review also noted the absence of an owner epoch in the scheduled prune transaction.
- Next. The same Sol reviewer should confirm the delivered PR head and the lead should evaluate CI there. Keep the PR draft. Teo owns merge after review and CI, including removing continuity files at the merge boundary.
- Open. Live rollout and legacy mirror behavior after SQLite route fences expire remain unverified. The separate stable port remains blocked as recorded in `BLOCKED.md`.
- Dispatch continuity launch ID `b008847ce50b4326a5c6d6988ec2f1ec:cc8b2863948a4ec39d233e46d168b450`.

```dispatch-outcome
{"accomplished":"partial","head":"94522fee5707e1f07a0425281439830d64b77eeb","evidence":{"artifacts":["https://github.com/hteo1337/hermes-agent/pull/4","handoffs/TH1-2642/VERIFICATION.md"],"commands":["scripts/run_tests.sh -j 1 --tb=short","npm test -- --maxWorkers=1 electron/local-gateway","tsc -p tsconfig.electron.json --noEmit","bash boot_pair.sh","bash state_pair.sh"]},"blocker_category":"none","remaining_work":["Confirm the delivered draft head with the same Sol reviewer","Verify GitHub CI on the delivered draft head","Handle the separate stable release port"]}
```

Continuity stop ID: b008847ce50b4326a5c6d6988ec2f1ec:cc8b2863948a4ec39d233e46d168b450:f26c6fa7-2714-4293-8a97-210d525704c2
