# TH1-1839 — Hermes gateway executor starvation
- Issue: https://linear.app/th1337/issue/TH1-1839 (Agent Fleet); branch: th1-1839-gateway-executor-starvation; remote: fork (hteo1337/hermes-agent).
- Done: read issue/contracts; fetched fork/main and reset the initially clean source tree to b6322901664; added required 47-line CLAUDE.md.
- Blocked: fork/main is dated 2026-05-04 and lacks gateway/control_socket.py, apps/desktop, run_profile_reconcile.py and session_mutation_compress.py; see BLOCKED.md.
- Verification: continuation re-fetched fork/main (exit 0): still b6322901664; git ls-tree again returned no required paths (exit 0). Linear has no corrective instruction; receipts in base-validation.txt.
- Not run: regression, existing suites, real-path ticket mint, Sol reviews; CI checks auto-queued, result unverified; there is no ticket-mint path on the mandated base and no implementation is PR-ready.
- decided: preserve base and stop at the source blocker — importing the newer platform would exceed this executor fix; live install/service untouched.
- decided (lead, 2026-10-24): base is bf0203a794a, the commit installed in ~/.hermes/hermes-agent and an ancestor of upstream main; fork/main (b6322901664) was a stale lead mistake. Merged into this branch; PR #2 now targets fork branch base/th1-1839-install-bf0203a.
- Next: implement fixes 1-4 from the issue on this branch, run the regression (fail on bf0203a794a, pass here), suites and real-path controls; open PR ready-for-review against base/th1-1839-install-bf0203a; never merge.
