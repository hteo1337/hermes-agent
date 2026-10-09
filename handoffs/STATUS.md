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

Not run: full desktop or repository suite (explicitly excluded for this overloaded host), packaged build or real-app checks, CI, independent review, Linux/Windows host checks. These are separate PLAN-FINISH stages and not established by the integration gates.
