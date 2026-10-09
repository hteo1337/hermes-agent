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
