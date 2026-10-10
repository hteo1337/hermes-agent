# D3b: upstream backend defaults disabled

Branch: `envoy/decouple-backend-d3b`. Work stayed in this worktree; no push or remote change.

The inherited gate came from `../envoy-decouple-backend-merge/handoffs/STATUS.md`: this branch had no `handoffs/STATUS.md` at start, contrary to the task prompt. The first baseline attempt was stopped because edits began while it ran; its output is not used as unmodified-tree evidence. The adjacent D3 merge reported 14 files, 445 passed and 1 skipped before D3b.

Changed diagnostics upload, account and model-catalog reads, dashboard registration, managed Telegram pairing, telemetry, Chronos, pricing, billing and recovery links, Portal CLI, and the named documentation copy to use configured endpoints or fail closed. Empty endpoints make no request and suppress the matching link. Explicit operator URLs still work. `apps/desktop/`, `LICENSE`, and `NOTICE.md` were untouched.

Gate command (with `HOME`, `HERMES_HOME`, and `HERMES_RUNTIME_DIR` set to `/private/tmp/envoy-d3b-gate.twJfNj` and `HERMES_PYTHON` set to that isolated test environment's `venv/bin/python`):

```
scripts/run_tests.sh -j 6 tests/hermes_cli/test_anon_auth_core.py tests/hermes_cli/test_auth_nous_provider.py tests/hermes_cli/test_endpoints.py tests/hermes_cli/test_model_catalog.py tests/hermes_cli/test_nous_inference_url_validation.py tests/hermes_cli/test_nous_portal_staging_allowlist.py tests/hermes_cli/test_resolve_token_memo.py tests/hermes_cli/test_skills_hub.py tests/agent/test_auxiliary_client.py tests/agent/test_auxiliary_nous_endpoint.py tests/agent/test_provider_parity.py tests/hermes_cli/test_catalog_json.py tests/hermes_cli/test_plugin_catalog.py tests/hermes_cli/test_plugins_hub_live_catalog.py tests/hermes_cli/test_diagnostics_upload.py tests/hermes_cli/test_nous_account.py tests/agent/test_usage_pricing.py tests/agent/test_billing_links.py tests/agent/test_billing_view.py tests/agent/test_prompt_builder.py tests/hermes_cli/test_shared_metrics_send_config.py tests/hermes_cli/test_dashboard_register.py tests/hermes_cli/test_telegram_managed_bot.py tests/hermes_cli/test_billing_portal_url.py tests/hermes_cli/test_models.py tests/hermes_cli/test_telegram_onboarding_endpoint.py tests/hermes_cli/test_update_sqlite_remediation.py -q
```

Output: **27 files, 747 passed, 0 failed, 2 skipped**, 212.2s, 6 workers. The skips are Linux and non-macOS cases. Full output: `handoffs/gate-verified.log`.

`python scripts/check` under the same isolated environment ran 11 checks; only health failed, with 10 findings entirely in untouched `apps/desktop/` files. Ruff passed. Full output: `handoffs/check-final.log`. `git diff --check` passed. `rg -n 'nousresearch\.com|raw\.githubusercontent\.com' hermes_cli agent` found **65** remaining hits; `handoffs/URL-AUDIT.md` lists and explains each.

Not run: full repository test suite, CI, Desktop build, Linux/Windows host-specific tests, independent provider review. Residual risk: user-facing legacy upstream documentation and support links remain outside D3b's named link set; they are catalogued in URL-AUDIT.md. Explicitly configured endpoints can still point at upstream hosts by operator choice. The unrelated Desktop health findings prevent a repository-wide green check.

## Sol review fixes (2026-10-09)

Code commit: `c9c5dcb8ec5a9ab5124d63314d497638d4ebb3b9` (`fix(envoy): close reviewed backend egress paths`). No push or merge.

- Account lookups ignore saved `portal_base_url`; bearer requests use only `endpoint("portal")`. An isolated intercepted probe with a saved attacker URL observed `https://configured.example.test/api/oauth/account` when configured and zero requests when the endpoint was empty. The probe printed only request URLs and whether an Authorization header existed.
- Docker, Singularity, Modal and Daytona default images are empty. Environment creation rejects an empty image with a `terminal.<backend>_image` configuration error before constructing a backend. First-time setup offers Full setup first and omits Nous quick setup when Portal is empty.
- Diagnostics rejects a returned `uploadUrl` outside the configured diagnostics origin before PUT. The consent notice names the configured destination and no longer promises Nous-only access or 14-day retention. Both diagnostics and paste requests use `Envoy/debug-share`; an isolated import probe printed `same_brand True`.
- One new regression test rejects a cross-host diagnostics upload. Existing setup and sandbox tests were updated to assert the disabled-default behavior. No test was excluded or weakened.

Focused suite, once, with `HOME=/private/tmp/envoy-d3b-gate.twJfNj`, `HERMES_HOME=/private/tmp/envoy-d3b-gate.twJfNj/hermes`, `HERMES_RUNTIME_DIR=/private/tmp/envoy-d3b-gate.twJfNj/runtime`, and `HERMES_PYTHON=/private/tmp/envoy-d3b-gate.twJfNj/hermes/installs/df33685e3cec15a2/test-environment/gen-39ef43284a4341b9a1ad3e6cd42bb431/venv/bin/python`:

```
scripts/run_tests.sh -j 5 tests/hermes_cli/test_endpoints.py tests/hermes_cli/test_auth_nous_provider.py tests/hermes_cli/test_diagnostics_upload.py tests/hermes_cli/test_nous_account.py tests/hermes_cli/test_debug.py tests/hermes_cli/test_setup_reconfigure.py tests/hermes_cli/test_setup_openclaw_migration.py tests/hermes_cli/test_sandbox_image_switch.py tests/hermes_cli/test_config_migration_48_sandbox_image.py tests/tui_gateway/test_display_methods.py tests/tools/test_terminal_sandbox_builder_dispatch.py tests/tools/test_managed_tool_gateway.py tests/tools/test_skills_hub.py tests/agent/test_provider_attribution_headers.py tests/hermes_cli/test_nous_inference_url_validation.py -q
=== Summary: 15 files, 226 tests passed, 4 failed, 2 skipped (100% complete) in 484.9s (5 workers) ===
```

The three affected files were rerun in full after correcting outdated setup/sandbox assertions. `test_debug.py` had reached the runner's default 300-second file timeout under five workers; it completed in 293.7 seconds under two workers. The rerun used the same isolated variables:

```
scripts/run_tests.sh -j 2 --file-timeout 600 tests/hermes_cli/test_debug.py tests/hermes_cli/test_setup_reconfigure.py tests/hermes_cli/test_sandbox_image_switch.py -q
=== Summary: 3 files, 68 tests passed, 0 failed (100% complete) in 298.5s (2 workers) ===
```

Ruff from the isolated test-environment venv: `All checks passed!`. The same Ruff lint ran in the commit hook and reported `All checks passed!`. `git diff --cached --check` produced no output. Not run for this review fix: the full repository suite, CI, Desktop build, live Portal request, or real container pull. A diagnostics service that returns a third-party presigned storage URL now needs a same-origin upload proxy. An explicitly configured legacy image remains an operator-selected image.

Final control check: the sandbox switch tests retain both paths. With the image default empty, no switch is offered; with an explicitly supplied image, a stale container produces an offer and approving it pins that image. After restoring this positive control, the full file ran again under the same isolated variables:

```
scripts/run_tests.sh -j 1 tests/hermes_cli/test_sandbox_image_switch.py -q
=== Summary: 1 files, 8 tests passed, 0 failed (100% complete) in 16.7s (1 workers) ===
```

## Local integration on `envoy/integration` — 2026-10-10

Base `envoy/main` at `f1a9444b40`. Merge commits, in requested order: `39edf7e643` (desktop `4f7ae33d6b`), `b2992e8ae1` (backend D3b `e670831ca4`), `202a8ab1fa` (pet morph `e452a95df3`). No push, remote action, or force operation.

### Merge decisions

- `apps/desktop/electron/main.ts`: Git auto-merged without conflict markers. Inspected result: `ENDPOINTS` gates update feed, hub, and portal; `persistWindowState()` refuses `isPetSized`; morph saves chat bounds before shrinking, serializes calls, restores minimum size and closes overlay on the return path. The branch-specific bootstrap and pet tests were retained unchanged by content comparison.
- `apps/desktop/electron/pet-overlay-ipc.ts`, `window-growth.ts`, and `src/store/pet-chips.test.ts`: no textual conflicts. Content matches the pet branch; strict rectangle validation, pet-size mark through maximize, and approval-chip tests remain. `hermes_cli/endpoints.py` and its selected backend tests match D3b.
- `CLAUDE.md` and `PLAN.md`: D3b tracked these, colliding with newly written untracked integration copies. Saved the copies, merged D3b, then set the root documents to the integration scope. D3b's plan remains in history and `handoffs/PLAN-D3B.md`.
- Added `apps/desktop/electron/local-pets.test.ts` because the pet branch had no test by that name. Positive valid-atlas and negative symlink-atlas cases passed in the focused run.
- `apps/desktop/scripts/brand-audit.mjs`: the pet branch's new `hermes:` IPC protocol strings increased the brand count. Added a quoted IPC-channel exemption. Direct control: `ipc: 0`, visible `Hermes:welcome: 1`, visible `Hermes assistant: 1`.

### Verification on this integration tree

Typecheck, audits, and Vitest used fresh temporary `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and `HERMES_DESKTOP_USER_DATA_DIR`; tests capped workers at 2. The Python core gate also used a fresh temporary `HOME`.

- `cd apps/desktop && npm run typecheck`: exit 0, all four TypeScript checks, no diagnostics (`handoffs/integration-typecheck-final.log`). Two earlier attempts failed due to incomplete borrowed dependency links (`electron` and `blobatar` unresolved); after linking both root and workspace `node_modules`, module resolution and typecheck passed.
- `cd apps/desktop && node scripts/egress-audit.mjs --check`: exit 0, `10 hits in 5 files` (`handoffs/integration-egress-final.log`).
- `cd apps/desktop && node scripts/brand-audit.mjs --check`: exit 0, `2128 hits in 710 files` after the IPC exemption (`handoffs/integration-brand-final.log`). The pre-fix run exited 1 with new counts in `main.ts`, `pet-overlay-ipc.ts`, and `preload.ts`; all added hits were new `hermes:` channel names.
- `cd apps/desktop && vitest run --maxWorkers=2` on bootstrap-quit, bootstrap-runner, pet-overlay, window-growth, local-pets, pet-chips, portal-session, feed-config, free-tier-offer, free-tier-sign-in, skills-hub-picker, and custom-endpoints-settings: exit 0, `12 files passed, 71 tests passed` (`handoffs/integration-focused-desktop.log`).
- ESLint on the new local-pets test: exit 0. Prettier: corrected the initial warning, then `--check` exit 0.
- Exact selected contract file content matches each source branch (`git diff --quiet` exit 0); `git diff --check` exit 0.

A 27-file D3b comparison run (`scripts/run_tests.sh -j 2 --file-timeout 600`) was stopped deliberately at exit 143 under host load above 250; its partial log reported 129 passed, 0 failed across completed files, and has no final gate count (`handoffs/integration-focused-python.log`). The narrower six-file backend endpoint/diagnostics/account/onboarding/sandbox/auth run used fresh temporary HOME and Hermes paths: exit 0, 71 passed, 0 failed, 1 Linux-only skip in 62.5s with 2 workers (`handoffs/integration-focused-python-core.log`).

Not run: full desktop or repository suite (explicitly excluded for this overloaded host), packaged build or real-app checks, CI, Linux/Windows host checks. These are separate PLAN-FINISH stages and not established by the integration gates.

### Independent review and repair

Read-only Astra review via Paseo agent `93097c9e` at `4653498b26` found three integration paths: a throw after hiding chat could discard its recovery bounds, the overlay's double-click/mail controls could reveal pet-sized chat, and a disconnected monitor could leave chat off-screen. A re-review found a fourth case: a connected external chat display was incorrectly sized to the pet overlay's laptop display. The narrow re-review reported nothing found for that mixed-display repair. The reviewer inspected source flow and tests; it did not boot the app. Subsequent direct backend and desktop review is recorded below.

Fixes: `main.ts` restores chat bounds/visibility after failed pet creation; failed reverse morph retains the overlay and saved bounds for retry, or recovers chat if the overlay is already gone. Partial overlay construction is destroyed on throw. Intentional close suppresses a duplicate pop-in. `pet-overlay-ipc.ts` routes morphed double-click/mail controls through chat restoration; renderer active state and mail navigation wait for success. `window-state.ts` preserves chat geometry on a connected display and centers it on the current display only after disconnection. New tests cover successful/failed rollback, show failure, IPC reveal with and without morph, failed renderer restore/retry, and both display states.

Final commands on the reviewed fix, all with fresh temporary `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and `HERMES_DESKTOP_USER_DATA_DIR`:

- `cd apps/desktop && vitest run --maxWorkers=2` on the 15 named desktop files (original 12 plus pet-overlay-ipc, window-state, renderer pet-overlay): exit 0, **15 files and 105 tests passed**, `handoffs/integration-focused-desktop-verified.log`. One preceding run failed the new connected-display control because its test rectangle extended beyond the display; the fixture was corrected and both the one-file rerun (27 passed) and final 15-file run passed.
- `cd apps/desktop && npm run typecheck`: exit 0, four checks, no diagnostics, `handoffs/integration-typecheck-verified.log`.
- `cd apps/desktop && node scripts/egress-audit.mjs --check`: exit 0, **10 hits in 5 files**, `handoffs/integration-egress-verified.log`.
- `cd apps/desktop && node scripts/brand-audit.mjs --check`: exit 0, **2128 hits in 710 files**, `handoffs/integration-brand-verified.log`.
- ESLint on changed desktop TypeScript files: exit 0; `git diff --check`: exit 0.

No packaged app or real Electron window was exercised after these fixes. The review's source-flow conclusion and focused tests do not establish live throw injection, monitor hot-unplug behavior, or screenshot/accessibility behavior. These remain for the separate packaged-app gate in PLAN-FINISH.

### Final integration repair and evidence

The same read-only Astra reviewer then inspected the backend endpoint callers, retained tests, brand audit, local-pet loader, and morph paths directly. Its actionable findings and resolutions:

- `hermes_cli/models.py`: saved Portal auth metadata could override a disabled or changed manifest Portal. Recommendations now use only the current endpoint; `tests/hermes_cli/test_endpoints.py` proves disabled and configured cases.
- `apps/desktop/electron/local-pets.ts`: unreadable/non-file atlases previously aborted scanning, and a header-only PNG and out-of-bounds animation rows were accepted. Scan now rejects individual invalid pets; PNG CRC, decoded rows, dimensions, and manifest layout are checked. A real atlas remains loadable alongside invalid neighbors.
- `apps/desktop/electron/local-pets.ts` and `main.ts`: the reviewer found a missing seventh Adam7 pass and an atlas IPC path reread after validation. The seventh pass is checked by complete/missing-pass controls. Atlas IPC now returns the same bounded buffer read through a checked no-follow file descriptor; a path-swap control proves the returned bytes differ from the replaced pathname. IPC also rejects non-string IDs.
- `apps/desktop/electron/pet-morph-window.ts`, `pet-overlay.ts`, and `main.ts`: chat restore now requires the disposable overlay to be destroyed successfully before clearing saved bounds and active state. A refused teardown returns failure and retains retry state. The morph controller was extracted from `main.ts` to keep the file at its existing health cap.

The reviewer rechecked the final three repairs and their positive/negative controls and reported **nothing found** in those paths. This was source review, not a live Electron run. Code commits after the three merges: `596664786c`, `6e7019de7b`, `243b54363f`, `c0cdce5a73`. No push, remote, or force action.

Final commands on the repaired tree, with fresh temporary `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and `HERMES_DESKTOP_USER_DATA_DIR` for tests:

- `cd apps/desktop && npm run typecheck`: exit 0, all four TypeScript commands, no diagnostics (`handoffs/integration-typecheck-final-110.log`).
- `cd apps/desktop && node scripts/egress-audit.mjs --check`: exit 0, **10 hits in 5 files** (`handoffs/integration-egress-final-head.log`).
- `cd apps/desktop && node scripts/brand-audit.mjs --check`: exit 0, **2128 hits in 710 files** (`handoffs/integration-brand-final-head.log`).
- `cd apps/desktop && vitest run --maxWorkers=2` on the 16 named bootstrap, pet/window, renderer, and decoupling files: exit 0, **16 files and 110 tests passed** (`handoffs/integration-focused-desktop-final-110.log`).
- `scripts/run_tests.sh -j 2` on the six named backend endpoint/diagnostics/account/onboarding/sandbox/auth files: exit 0, **6 files, 72 passed, 0 failed, 1 Linux-only skip** (`handoffs/integration-focused-python-final-verified.log`). Fresh temporary `HOME` was also used.
- Ruff on the changed backend files and the commit hook: exit 0, `All checks passed!`; desktop ESLint on changed files: exit 0, 0 errors and 6 formatting warnings; Prettier check: exit 0. `git diff --check envoy/main..HEAD`: exit 0.

An extra `scripts/check --only health --base envoy/main` was run: exit 1, **5 blocking findings** in `gateway-settings.tsx`, `boot-failure-overlay.tsx`, `update-status.tsx`, `version-details.tsx`, and `src/sdk/index.ts`; none is in the final integration repair. This check was not among the requested gates. Full suite, CI, packaged/live Electron behavior, and Linux/Windows checks were not run, as the requested scope and host-load constraint require. The separate PLAN-FINISH runtime gates remain unverified.

```dispatch-outcome
{"accomplished":"complete","evidence":{"artifacts":["envoy/integration merge commits 39edf7e643,b2992e8ae1,202a8ab1fa","handoffs/STATUS.md","handoffs/integration-focused-desktop-final-110.log","handoffs/integration-focused-python-final-verified.log","handoffs/integration-typecheck-final-110.log","handoffs/integration-egress-final-head.log","handoffs/integration-brand-final-head.log"],"commands":["git show -s --format=%P on three merges: requested heads in order","npm run typecheck: exit 0","egress-audit --check: exit 0, 10 hits/5 files","brand-audit --check: exit 0, 2128 hits/710 files","vitest run --maxWorkers=2 on 16 focused files: 110 passed","scripts/run_tests.sh -j 2 on 6 focused files: 72 passed, 1 skipped","git diff --check envoy/main..HEAD: exit 0"]},"blocker_category":"none","remaining_work":[]}
```

## Integration review fixes (2026-10-10)

Branch: `envoy/integration-fixes`, based on reviewed `envoy/integration` commit `6de9e1510e1e762eb1c94e769ff9e678017fd01c`. Code commits: `c2e09dd4f150e59987ea77da507c8824620b9095` (overlay recovery, manifest, stale approval, installers), `16af277e801a0f068eccd065ebec59e2bf92b67d` (all pet IPC sender checks), and `216a898c68b5050cf7e03e835f5ecb3a0e5a476a` (primary-only pet callers). These are local commits; nothing was pushed or merged.

The review at `../review-integration-1/handoffs/REVIEW-INTEGRATION.md` identified five fixes. Pet control IPC now checks the live overlay `webContents` for overlay-origin messages; main-origin open/close/morph/state messages check the live main `webContents`. The negative control rejects a foreign sender, while each intended sender is accepted. Overlay renderer crashes and failed loads use bounded reload; termination or exhausted load retries trigger native chat recovery and a renderer pop-in. Manifest reads now open `pet.json` with `O_NOFOLLOW`, then validate/read through its pinned descriptor. A backend `resolved: 0` now returns false without clearing the chip. Direct installers have no NousResearch repository default; a fresh checkout requires `HERMES_REPO_URL`, while an existing checkout retains its configured origin. The peer-window follow-up gates pet overlay bridge, restore, and Shift-click on the established `isMainWindow()` predicate so peers cannot clear the primary overlay preference after IPC rejection.

Verification on this branch, with fresh temporary `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and `HERMES_DESKTOP_USER_DATA_DIR` for test commands:

- Unmodified-tree baseline focused Vitest: **4 files, 32 tests passed**.
- Final focused Vitest `--maxWorkers=2` (pet IPC, local pets, morph, renderer lifecycle, pet chips, prompts, windows): **7 files, 80 tests passed, 0 failed**.
- `scripts/run_tests.sh tests/scripts/install/test_install_sh_repository_stage.py`: **1 file, 11 tests passed, 0 failed**. The missing-source test executes Bash and dot-sourced PowerShell repository stages. Direct probes separately observed Bash exit 1 and PowerShell exit 1 before a destination was created. The normal `pwsh -File ... -Stage repository` path was attempted but cannot run on macOS because it tries to launch a Windows Git installer; the dot-sourced stage probe is the PowerShell behavioral evidence.
- `npm run typecheck`: exit 0, all four TypeScript checks. Touched-file ESLint: exit 0, **0 errors, 0 warnings**. Prettier check: exit 0. Pinned Ruff 0.15.10 on the touched Python test and the pre-commit hook: passed. `bash -n scripts/install.sh` and `git diff --check`: exit 0.
- `npm run build`: exit 0; Vite reported built in **27.81s** on the final edited tree. `apps/desktop/dist/electron-main.mjs` was inspected for the recovery and IPC code, and the emitted artifact exists.
- `node scripts/brand-audit.mjs --check`: exit 0, **2,128 hits in 710 files**. `node scripts/egress-audit.mjs --check`: exit 0, **10 hits in 5 files**. These are audit match counts, not zero-match claims.

Independent Astra review of the first code commit found unauthenticated sibling pet IPC channels. Those were fixed in `16af277`; its re-review probed all nine channels and found the foreign sender, wrong-direction owner, and stale overlay rejected while intended owners worked. The same review found that peer windows still tried primary-owned pet actions; `216a898` fixes that caller mismatch. Final targeted Astra re-review found nothing remaining in the peer path: an executed callback control observed one bridge, focus listener, restore and pop-out call for the primary window and zero for peer, secondary, HUD, browser and watch windows. The reviewer used Git objects and isolated controls, not a live Electron app.

Residual risk: `O_NOFOLLOW` closes the requested leaf-file race but does not pin the containing pet directory. A local writer who swaps that directory to a symlink between checks and opens may still redirect both manifest and atlas reads. This is a separate pre-existing directory-ancestor race confirmed by review; portable directory-relative opens need a separate design. Full repository test suite, CI gate, packaged/live Electron crash, visual/responsive/accessibility checks, native Windows/Linux installer runs, and a formal CODEOWNERS review did not run. `scripts/install.sh` and `scripts/install.ps1` are owned by `@NousResearch/hermes-agent-core`; the independent Astra review is recorded above. No deployment, push, or merge was requested or performed.

## Envoy residual desktop rebrand — 2026-10-10 (`envoy/brand-residual`)

Started from `envoy/integration` at `6de9e1510e`; this worktree was clean. The requested step is PLAN-FINISH.md §7. The disabled portal is the shipped `brand.json` setting (`endpoints.portal: ""`). `PASEO_AGENT_ID` was unset, so this turn used the unique `handoffs/CHECKLIST-unset-01.md` fallback without touching other checklists.

Changes: the built-in gold preset is listed as **Classic Gold** while its `classic` ID and CLI skin protocol stay intact. Backend display boundaries brand provider names, errors, notifications, update messages, and dynamic skin labels through `src/i18n/brand-text.ts`; commands, paths, env vars and RPC names remain untouched. Portal OAuth choices and direct start actions are gated by `ENDPOINTS.portal`; free-tier reads, retries, acknowledgements, notices and routes are inert without it. Configured portal labels read **Envoy Portal**. Renderer About takes the MIT attribution holder/year/upstream/notice path from `brand.json`, while native macOS About takes its holder/year from the same file (matching `NOTICE.md`); version details no longer reveal the backend checkout path. `LICENSE` and `NOTICE.md` remain present and unmodified.

Verification at final source state (all exit 0):

- Before changes, `cd apps/desktop && node scripts/brand-audit.mjs --check`: **2128 hits in 710 files**. The old checked-in baseline totaled 2789. After changes, `cd apps/desktop && node scripts/brand-audit.mjs --write && node scripts/brand-audit.mjs --check`: **2120 hits in 710 files**. A JSON comparison against the pre-change `6de9e1510e:apps/desktop/brand-audit.baseline.json` reported **0 raised per-file entries**; total baseline **2789 → 2120**.
- `cd apps/desktop && node scripts/egress-audit.mjs --check`: **10 hits in 5 files**.
- `cd apps/desktop && npm run typecheck`: exit 0; all four TypeScript checks completed with no diagnostics.
- `cd apps/desktop && npx eslint <27 touched TypeScript files>`: exit 0, no diagnostics. `cd apps/desktop && npx prettier --check brand.json <10 touched files>`: exit 0, all matched. `git diff --check`: exit 0.
- `cd apps/desktop && test_root=$(mktemp -d); HERMES_HOME="$test_root/home" HERMES_RUNTIME_DIR="$test_root/runtime" HERMES_DESKTOP_USER_DATA_DIR="$test_root/desktop" npx vitest run --maxWorkers=2 src/i18n/brand-text.test.ts src/themes/classic-skin.test.tsx src/lib/desktop-remote-auth.test.ts src/components/boot-failure-reauth.test.ts src/lib/error-surface.test.ts src/components/update-status.test.tsx src/app/settings/about-settings.test.tsx src/components/onboarding/index.test.tsx src/components/onboarding/portal-disabled.test.ts src/app/settings/providers-settings.test.tsx src/lib/model-status-label.test.ts src/store/notifications.test.ts src/components/assistant-ui/thread/assistant-message.test.tsx src/store/onboarding.test.ts src/store/free-tier-setup-failure.test.ts src/store/free-tier-offer.test.ts src/store/free-tier-sign-in.test.ts`: **17 files passed, 221 tests passed**. Final output: `handoffs/residual-focused-final.log`. Configured portal fixture tests and disabled portal controls were both exercised.

Local code commits: `9def54a08c` (backend display and themes) and `88c9af597a` (portal, About, audit).

Unverified: full suite (explicitly prohibited for this host), packaged/native Electron visual pass, CI, and independent review (PLAN-FINISH.md §8 is a separate step). No push or remote action was taken.

```dispatch-outcome
{"accomplished":"complete","evidence":{"artifacts":["9def54a08c","88c9af597a","envoy/brand-residual","handoffs/STATUS.md","handoffs/residual-focused-final.log","apps/desktop/brand-audit.baseline.json"],"commands":["apps/desktop npm run typecheck: exit 0","apps/desktop egress-audit --check: 10 hits/5 files","apps/desktop brand-audit --check: 2120 hits/710 files; 0 raised per-file limits","apps/desktop focused vitest --maxWorkers=2 with isolated homes: 17 files, 221 tests passed","ESLint, Prettier, git diff --check: exit 0"]},"blocker_category":"none","remaining_work":[]}
```

## Final integration and packaged-app gate — 2026-10-10 (`envoy/final`)

This section supersedes earlier statements in this file that the two branches were unmerged or the packaged gate had not run. `envoy/integration-fixes` merged first as `1dc508179b`; `envoy/brand-residual` merged second as `b7b9f61e51` (parents `1dc508179b`, `8eeedf61a7`). The only textual conflict was this handoff; both records were retained. `main.ts` combined the IPC/window repairs and native About attribution automatically. The brand baseline was regenerated and checked: 2,120 hits in 710 files.

Post-merge gates in this session: `npm run typecheck` exit 0 after linking the existing shared root and workspace `node_modules` into this clean worktree; `brand-audit --check` exit 0, 2,120 hits/710 files; `egress-audit --check` exit 0, 10 hits/5 files; focused Vitest with fresh isolated `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and `HERMES_DESKTOP_USER_DATA_DIR`: 23 files and 277 tests passed, 0 failed. Logs: `final-typecheck.log`, `final-brand.log`, `final-egress.log`, `final-focused-vitest.log`. The first typecheck attempt failed from absent dependencies; a second still lacked workspace dependencies because its temporary symlink target was wrong; the corrected links produced the passing result. No source changes were made for those attempts.

The packaged result and live-app proof are recorded below. No push or other-branch merge was performed.

Packaged runtime proof (isolated root recorded in `final-package-root.path`; the path is local and disposable): the second `npm run dist:bundled` reached a signed `apps/desktop/release/mac-arm64/Envoy Agent.app` with bundled `agent-payload` and verified backend readiness parser. Distribution ZIP/DMG creation was still running when the app-level gate began. The app was launched from that bundle with `HERMES_DESKTOP_IGNORE_EXISTING=1`; desktop log reports `Using bundled payload`, `HERMES_BACKEND_READY port=65241`, and `Hermes backend is ready`. The UI displayed `Backend ready` and model `custom:mock: mock-model`. The mock server saw the chat prompt and HUD goal prompt; seven total inference prompts include the goal's automatic continuations. The main window displayed the canned mock reply. The HUD accepted `/goal Verify this packaged HUD can reach the local mock provider, then finish.` and displayed the same mock reply and standing-goal continuations. Returning to the main window showed `Goal paused · Turn 3/20`, expected because the canned mock answer does not explicitly mark the goal complete. Full-size captured images: `final-packaged-chat.png` (3520×2200) and `final-packaged-hud.png` (1240×640). The isolated app and mock server were stopped after capture.

The first `dist:bundled` attempt failed after payload and frontend builds because borrowed `node_modules` had an `app-builder-lib` version that did not match this worktree's lockfile. `npm ci` in this worktree exited 0. The post-install typecheck again exited 0; post-install focused Vitest again passed 23 files/277 tests/0 failed. The second `dist:bundled` used the locked installation and completed with exit 0, producing the ZIP and DMG recorded below. The build stamp says `[DIRTY]` because handoff evidence files were written during the build; `git status` showed no source file changes after the merge. Notarization was skipped because Apple notary credentials were not fully configured; no CI or full repository suite was run.

Final distribution result: `npm run dist:bundled` retry exit **0** (`final-dist-bundled-retry.exit`, `final-dist-bundled-retry.log`). Inspected artifacts: `release/EnvoyBundled-0.0.0-mac-arm64.dmg` **1,611,293,808 bytes**, `release/EnvoyBundled-0.0.0-mac-arm64.zip` **1,644,990,996 bytes**, and bundled `Envoy Agent.app/Contents/Resources/agent-payload/manifest.json` present. macOS notarization did not run: Apple notary credentials were not fully configured. Extra isolated pet overlay/window Vitest run passed **3 files/52 tests**, so final focused coverage was **26 files/329 tests**, 0 failures across two runs (logs `final-focused-vitest-locked.log` and `final-extra-vitest.log`). `git diff --check` exited 0 and no source files changed after merge. Full repository test suite, CI, DMG installation, and Windows/Linux package execution did not run.

## D5 default-off desktop egress — 2026-10-10

Code commits: `c454bef91e` (`fix(envoy): gate default desktop egress`) and `c5dba45881` (`fix(bundle): carry brand endpoints into sealed backend`) on `envoy/egress-fixes`. No push or merge. The packaged app was not rebuilt, as requested.

The prior packaged probe in `EGRESS-PROBE.md` recorded 43 refused CONNECTs to six hosts. The renderer's model picker calls `src/lib/model-options.ts::requestModelOptions` → `model.options` → `tui_gateway/methods_complete.py` → `hermes_cli/inventory.py` → `list_authenticated_providers`. Its REST twin uses the same inventory builder. The provider listing had overlay, canonical, and prefetch passes that could discover Copilot from ambient GitHub credentials. The current code gates all three passes (and the models.dev-mapped pass) to selected or explicitly configured Copilot. `hermes_cli/auth.py` no longer exchanges a token merely to render default Copilot auth status; `GH_TOKEN` and `GITHUB_TOKEN` are ambient rather than explicit Copilot configuration. `cached_provider_model_ids` does not warm Copilot or Copilot ACP for an unconfigured provider. The Copilot ACP CLI was the likely telemetry source, but the probe captured no per-request stack, so that attribution remains an inference.

`agent/models_dev.py` now reads `modelCatalogUrl` from `brand.json` through `hermes_cli.endpoints` when `HERMES_DESKTOP=1`. Empty (the shipped default) serves memory/disk cache without network; a configured URL fetches. The sealed Python payload used to exclude all of `apps/`, so a follow-up bundle fix stages only the selected Git revision's `apps/desktop/brand.json` after that exclusion. A focused snapshot control proved uncommitted brand changes do not leak into the bundle, and the native staging test checked the actual staged manifest. The existing curated lists supply offline picker content. `website/static/api/model-catalog.json` is a website catalog with a different schema, and `hermes_cli/local_runtime/catalog.json` lists local runtime models; neither is a models.dev registry snapshot. The Electron main process already stamps `HERMES_DESKTOP=1` for local and pooled backends; no new environment variable or backend RPC was added.

The built-in theme presets no longer inject Google Fonts stylesheets. Existing JetBrains Mono remains bundled. Courier Prime and IBM Plex Mono faces are bundled from the Google Fonts OFL directories; their OFL texts are copied into `dist/licenses/fonts/` by the renderer build. The font stacks are unchanged. The egress audit now scans CSS and `index.html`, and fails unconditionally on all six probed hosts in `src` or `electron`, regardless of its upstream baseline. A temporary CSS reference to each host, and a split string reference, made `--check` fail; restoring the file made it pass.

Verification in fresh temporary `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and `HERMES_DESKTOP_USER_DATA_DIR`:

- `scripts/run_tests.sh -j 2` on eight focused Python files: **194 passed, 0 failed, 1 Windows-only skipped**. `handoffs/python-egress-verified.log` records the run.
- `scripts/run_tests.sh -j 2` on bundle payload/native modules: **17 passed, 0 failed**. `handoffs/bundle-egress-final.log` records the run.
- `npx vitest run --maxWorkers=2` on seven focused desktop files: **121 passed in 7 files**. `handoffs/vitest-egress-isolated.log` records the run.
- `npm run typecheck`: exit 0. `npx eslint` on touched TS/MJS files: exit 0. `uvx ruff@0.15.10 check` on touched Python files: all checks passed. `node scripts/brand-audit.mjs --check`: 2,120 baseline hits in 710 files, exit 0. `node scripts/egress-audit.mjs --check`: 10 baseline hits in 5 files, zero forbidden-host hits, exit 0. `git diff --check`: exit 0.
- `npm run build`: exit 0, 15.51 seconds on the initial build; the final build emitted all five new local font assets and both OFL files. This was a renderer/backend source build, not a packaged-app rebuild.
- Broader `tests/hermes_cli/test_user_providers_model_switch.py`: **15 passed, 2 failed** on this branch. Both same tests failed on untouched `HEAD` in a scratch checkout (`handoffs/baseline-user-providers-egress.log`); no test was weakened or removed. The repository-wide `scripts/check --only health` reported **14 blocking findings in untouched files**; `handoffs/health-egress-final.log` records them. The touched-file Ruff check passed. These are not counted as passing gates.

Independent GPT-6 Astra review of the complete `07c5b49bd7..c5dba45881` diff reported **nothing found** in the requested scope after inspecting startup/provider paths, packaging and the static audit. The reviewer did not run a new build, test suite or packaged probe. It noted that dynamically computed hostnames are outside the literal-reference audit's guarantee; no such startup leak was demonstrated. The disposable review workspace was clean and archived.

Not run: fresh packaged-app egress probe (lead-owned rebuild), full repository test suite, CI, Linux/Windows host runs. The code and local controls support the default-off behavior; a packaged run is needed to establish the requested shipped result.
