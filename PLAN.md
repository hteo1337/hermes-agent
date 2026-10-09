# D3 backend decoupling

Scope: Python backend only, plus repository guidance required by the session. Do not change `apps/desktop`, LICENSE or NOTICE.md. Preserve the local branch and never push.

Assumption: desktop `brand.json` is the endpoint source, with empty values disabling services. A user may explicitly configure Nous inference; it is never selected by default.

Architecture: `hermes_cli/endpoints.py` resolves the checked-in endpoint block and explicit overrides. Backend consumers avoid remote operations when an endpoint is empty. Git, ZIP, passive checks and release channels use the configured update source. Plugin catalog loads an empty shipped directory without changing its schema or loader.

Work: establish scoped baseline; add endpoint resolution; migrate updater, skills, managed gateway, anonymous auth and pricing; rebrand outbound headers; empty catalog; add focused behavior tests; verify and commit.

Acceptance: no implicit upstream network endpoint in D3 paths; explicit configured endpoints work; empty endpoints disable the feature; local skills still work; scoped tests pass; source backend starts with isolated `HERMES_HOME`. Record packaged Desktop runtime as unverified when no artifact exists.

Verification: `scripts/run_tests.sh <touched test files>` with isolated `HERMES_HOME`; `python scripts/check`; packaged backend smoke command determined from available build artifacts. Record any unavailable gate rather than claiming it ran.

Risk: preexisting tests may encode upstream defaults. Update behavior assertions without excluding files. Packaged Desktop may be outside this lane; do not edit it.
