# TH1-1839 — gateway executor starvation
- Issue: https://linear.app/th1337/issue/TH1-1839 (Agent Fleet); branch th1-1839-gateway-executor-starvation; PR https://github.com/hteo1337/hermes-agent/pull/2 (draft).
- Done: reconciled issue/comments, fetched fork and upstream main, inspected source; old source-base blocker resolved. Dispatcher reports one writer (7f8c2b71), no duplicates.
- decided: honor Teo’s newer 12:46Z Linear instruction to use upstream main; merge fetched 4dcef215cf into existing published branch (no rewrite), retarget same PR to a pinned upstream feature-base ref.
- Done: bounded control/RPC/MCP/compression/summary pools, profile-context propagation, runner shutdown drain, default queue/activity diagnostics implemented.
- Next: finish the single gateway+tui_gateway suite run, baseline a representative metadata-guard failure, run isolated saturated gateway, then required reviews.
- Verification: one new regression on unmodified upstream 4dcef215cf: 1 failed (5s TimeoutError); fix: 1 passed (0.7s runner wall). scripts/check: 12 checks ok. Existing install/service/credentials untouched.
- Open: suite hits HomeIOGuard on this worktree’s git metadata under the live install; baseline pending. No guard bypass or live-install edit. Linear shared-notes tool unavailable.
- Launch: task b134ad76f4d04da499a491a82e5225c2, run 3e391b5c61f6462ca8585824b5f53980; repo handoff is authoritative.
