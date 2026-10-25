# TH1-1839 refusal-stamp diagnosis (PASEO_AGENT_ID unset; dispatched task prefix)
- [x] Inspect issue, exact PR/base, paired baseline artifacts and build isolated PM environment in fresh Paseo worktrees.
- [x] Run unchanged target 40 times per base/head and trace refusal/exit ordering with recorded counts.
- [x] Product decision: unchanged base reproduces same failure (37/40 vs head38/40); no product/test change warranted; final suite remains required for executor-starvation confirmation.
- [ ] BLOCKED on explicit cap exception: first final-suite attempt invalid/aborted (143, metadata HomeIOGuard); replacement from standalone checkout required for baseline11 comparison.
- [x] Delivered handoff-free PR head221080c47f, pushed review evidence, posted/verified one PRE-EXISTING comment; recorded suite-cap blocker and removed created trees/env/runtime/cache.
