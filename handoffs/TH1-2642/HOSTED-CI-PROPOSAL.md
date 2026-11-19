# Supplemental fork-only hosted lane (offline proposal)

Base and hard-pinned tested implementation: `d19a727ef8e49bedb757c15b8571c1d365a79815`.
The workflow itself lives on a separate `moth/th1-2642-hosted-test-lane` branch.
No existing workflow, runner label, permission, branch protection or implementation file changes.

## Scope and trust

- GitHub-hosted `ubuntu-24.04`, one bounded 45-minute job, fork identity guard.
- Triggers only a push of this exact dedicated branch or explicit workflow_dispatch. No PR trigger, pull_request_target, schedule, release, deployment or publish step.
- Explicit `contents: read`; checkout credentials not persisted; no secrets or environment grants. No cache writes/reads and no artifact publication.
- Official checkout uses an existing repository SHA pin. Checkout explicitly selects the implementation SHA above, not the workflow commit or PR merge ref, and asserts HEAD before executing repository code.
- PM setup action is from that exact checked-out source, with `pm/lock.json`, `uv.lock`, `pyproject.toml` and isolated dev/test environment; Node/npm also come from PM pins. JS install uses `npm ci` and the existing `package-lock.json`. All four input hashes are printed before setup. No lock edits/upgrades.
- Existing setup/test code and dependency lifecycle scripts execute as unprivileged CI code without supplied credentials. This is not an offline/network sandbox: dependency/tool downloads are necessary. No new package-manager installer or sysctl/host-security changes added.
- 26 relevant Python files via canonical `scripts/run_tests.sh -j 2 --tb=short`, zero file retries; Desktop local-gateway Vitest contracts and Electron TypeScript check. Exact commands are inline in the workflow.
- This is Linux targeted evidence, not the full CI matrix or macOS/Windows proof. No inferred CI pass until the actual job succeeds. It does not validate the original live-incident cause.

## Publishing implications (not performed)

Pushing this dedicated branch will trigger the NEW test workflow. It does not alter PR #4's head and must NOT be pushed to the owner's PR branch. A passing run is attached to the CI-branch commit while its summary names the exact implementation SHA; it must not be represented as PR #4's required `all-checks-pass` result. No API permissions are added to synthesize such a check.

At the reviewed source snapshot, existing push workflows select `main`, `v*` tags, or `wine2e*` branches; none select this branch. Existing workflow_run listeners name CI/Deploy Site/Stable Release/Install & Update E2E, not this new workflow. Thus a standalone branch push with no PR should not trigger those existing workflows **at this snapshot**. Remote/default-branch workflow state must be checked read-only before any publication; this preparation was deliberately offline.

Opening a PR for this lane WOULD trigger the existing pull_request workflows (including Blacksmith); do not do that as a workaround. Merging it to main WOULD trigger existing main workflows and is not part of this proposal. Manual workflow_dispatch may require the workflow to exist on the default branch; the exact-branch push trigger avoids requiring such a merge.

The lane is supplemental while Blacksmith is queued, not a permissions/gates bypass or automatic runner replacement. Publishing/running remains a separate authorized action.

## Offline checks

YAML parsed with PyYAML BaseLoader (preserves the `on` key), exact triggers/permissions/runner/action pins asserted; 26 test paths exist at the pinned revision. Inline Bash scripts syntax-checked. All original tracked source/workflows remain byte-identical to the base. No hosted execution, dependency installation, push, PR or dispatch occurred.
