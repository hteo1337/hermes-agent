# TH1-1839 baseline verification
PASEO_AGENT_ID is unset; using dispatch task_id 9d69f1fe7a3c45a78380f195243446cb prefix.
- [x] Confirm pinned commits in two fresh detached clones and build one shared PM test venv. Evidence: full SHAs matched, PM build exit 0; pytest 9.1.1 and messaging imports verified.
- [x] Run the exact requested gateway/tui suites once per tree with per-test capture and saved exit codes. Evidence: base/head exit 1; 1969/1970 completed file sessions, no retries, per-test pass/fail reconciles with runner totals.
- [x] Compare per-test outcomes and classify each head-fail/base-pass case against the PR diff. Evidence: comparison.json; one new failure, zero improvements, 11 shared; regression-source-scope.json proves unchanged test/refusal writer and changed surrounding startup path.
- [x] Publish exactly one baseline PR comment with counts, commands and exit codes. Evidence: pr-comment-receipt.json; fetched posted body matches baseline-comment.md.
- [x] Remove both clones and shared venv; verify cleanup. Evidence: cleanup-receipt.json; all three roots absent; compressed artifacts verified and replayed to identical comparison. Pre-cleanup empty-status check found untracked owned/ output and did not certify cleanliness (recorded).
- [x] Update issue-specific handoff, commit and push only the review branch; verify publication. Evidence: publication-receipt.json; review checkpoint 536267f3fb571099e1bf7400b5e3aaae36901a1f matched fork remote; final documentation follow-up pushed separately.
