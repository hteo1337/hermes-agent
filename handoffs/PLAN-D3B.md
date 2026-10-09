# D3b: disable upstream backend fallbacks

Scope: Hermes Python CLI and agent only. Keep Desktop, LICENSE and NOTICE unchanged. Use brand endpoints for optional services; an absent endpoint disables network and link affordances. Preserve recognition of already configured Nous hosts.

Assumptions: the D3 merge worktree's STATUS.md supplies the inherited 14-file gate because this branch has no STATUS.md. The current branch is the requested worktree, so no push or remote change.

Work: baseline the inherited gate; replace active upstream defaults and visible links; add behavior tests for absent and configured endpoints; run touched tests plus inherited gate, Ruff and project checks; regenerate URL-AUDIT and commit.

Acceptance: no implicit upstream request, diagnostics upload, billing, account, catalog, telemetry, registration or managed-bot route remains in the touched Python scope; empty endpoints are safe and visible links disappear; positive configured-route and negative disabled-route tests pass; audit accounts for every remaining host hit.

Verification: `scripts/run_tests.sh -j 4 <touched test files> <14 inherited files> -q`; test-venv Ruff; `python scripts/check`; `git diff --check`; `rg -n 'nousresearch\\.com|raw\\.githubusercontent\\.com' hermes_cli agent`.

Risk: old Nous-specific tests may assert the inherited upstream defaults; update them to assert the new disabled behavior without excluding files.
