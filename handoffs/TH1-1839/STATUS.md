TH1-1839 — Baseline: NEW-FAILURES (1); classify Hermes PR #2 gateway-suite failures.
Issue: https://linear.app/th1337/issue/TH1-1839 ; project: Agent Fleet; state: In Review.
Review branch: review/TH1-1839-6350225a2a5d; PR source c1f9fcc309daea44a59e6212921d8da9f4a1884f vs upstream 4dcef215cfe41bd2d02c2d1dad6e257a18101216.
Done: one exact suite run per fresh clone, same PM venv/flags, retries 0; per-test archives replay to identical comparison; both clones and complete venv/runtime/cache root removed.
Verification: base 1969 files, 14843 passed / 11 failed / 335 skipped / 1 xfailed, exit 1 (713.7s); head 1970 files, 14843 passed / 12 failed / 335 skipped / 1 xfailed, exit 1 (719.9s).
Regression: tests/gateway/test_replace_ownership_guard.py::TestStampDurability::test_refusal_stamp_reaches_disk_before_the_hard_exit — line 486, running instead of startup_failed; base passed/head failed. 11 shared failures; 0 improvements; new executor-starvation test passes.
Scope: test/refusal function/status.py unchanged; surrounding startup files changed. Equal 5s delayed-write/wait boundaries make causality unproven; no rerun or flake dismissal. No collection errors, incomplete sessions or changed package inventory.
Comment verified: https://github.com/hteo1337/hermes-agent/pull/2#issuecomment-6391686607 ; evidence: comparison.json, *-outcomes.json.gz, *-suite.log.gz, run-manifest.json, regression-source-scope.json, cleanup-receipt.json.
Next: publish this review checkpoint; lead handles new differential before any merge/install. No fixes, new tests, merge, PR-branch push, install or live gateway changes; CI not assessed.
Open questions: whether the observed differential is caused by PR code or the unchanged timing boundary. Pre-cleanup empty-status check found owned/ output; it did not certify clone cleanliness (pre-cleanup-state.json); requested scratch removal verified.
