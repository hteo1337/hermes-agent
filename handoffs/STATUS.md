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
