# TH1-1839 refusal-stamp diagnosis (PASEO_AGENT_ID unset; dispatched task prefix)
- [x] Inspect issue, exact PR/base, paired baseline artifacts and build isolated PM environment in fresh Paseo worktrees.
- [x] Run unchanged target 40 times per base/head and trace refusal/exit ordering with recorded counts.
- [x] Product decision: unchanged base reproduces same failure (37/40 vs head38/40); no product/test change warranted; final suite includes executor-starvation test.
- [ ] In progress: run gateway and tui_gateway suites once on final head at -j 6, compare exact failure set to baseline 11.
- [ ] Deliver handoff-free PR branch, review-branch evidence and one regression comment; record remaining gates and clean created trees/environment.
