# TH1-1839 — Hermes gateway executor starvation
- Issue: https://linear.app/th1337/issue/TH1-1839 (Agent Fleet); branch: th1-1839-gateway-executor-starvation; remote: fork (hteo1337/hermes-agent).
- Done: read issue/contracts; fetched fork/main and reset the initially clean source tree to b6322901664; added required 47-line CLAUDE.md.
- Blocked: fork/main is dated 2026-05-04 and lacks gateway/control_socket.py, apps/desktop, run_profile_reconcile.py and session_mutation_compress.py; see BLOCKED.md.
- Verification: git ls-remote confirms the base SHA; git ls-tree and git grep confirm missing paths/symbols; git diff --check exit 0; exact receipts in base-validation.txt.
- Not run: regression, existing suites, real-path ticket mint, Sol reviews; CI checks auto-queued, result unverified; there is no ticket-mint path on the mandated base and no implementation is PR-ready.
- decided: preserve base and stop at the source blocker — importing the newer platform would exceed this executor fix; live install/service untouched.
- Next: lead updates fork/main with the intended gateway source or authorizes the correct base; resume this branch, implement pools, run capped verification and exact-head reviews; never merge as worker.
- Open question: which corrected source base should supply the desktop/control-socket implementation? draft PR https://github.com/hteo1337/hermes-agent/pull/2 linked in Linear; no ready/merge claim.
