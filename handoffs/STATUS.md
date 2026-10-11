# D3 backend handoff

Branch `envoy/decouple-backend`; commits `96e764cecccc1c3ab2e219b852c7fa8ee670045d` (`feat(envoy): decouple Python backend from upstream services`), `eda9c6296b` (`test(envoy): replace credential-shaped Anthropic fixtures`), `7e1af1b6bf` (`docs(envoy): document fork development commands`), `4f7d907fdb` (`fix(envoy): disable remaining upstream backend fallbacks`), `164795b37e` (`fix(envoy): honor configured source switches`), and `e3c893d672` (`fix(envoy): fence stale catalog refresh responses`). No push or remote change. `apps/desktop`, `LICENSE` and `NOTICE.md` were not changed. The code worktree is clean; these handoff notes are untracked. Root `CLAUDE.md` is 27 lines; documentation pre-commit and all D3 fix pre-commit Ruff gates passed.

Empty endpoint values disable update, release-channel, skills-hub, managed-gateway, anonymous-auth, pricing and catalog network defaults. The Git updater checks its configured remote, including SSH equivalents; ZIP and passive checks cannot select an upstream fallback. Outbound Referer, X-Title and User-Agent carry Envoy identity. The bundled plugin catalog has no installable entries (509 entries removed; README and `removed.yaml` retained). Nous inference remains an explicit provider choice.

## Gates and output

All commands below used isolated temporary homes. The run-tests script used the project-managed test environment, never a real Hermes profile. Their paths are historical execution evidence.

<!-- no-tmp: ok — historical isolated test command evidence -->
`HERMES_HOME=/tmp/envoy-d3-home-gate2 HERMES_RUNTIME_DIR=/tmp/envoy-d3-home-gate2/runtime scripts/run_tests.sh tests/hermes_cli/test_endpoints.py tests/hermes_cli/test_auth_nous_provider.py tests/hermes_cli/test_anon_failure_modes.py tests/hermes_cli/test_sale_pricing.py tests/hermes_cli/test_inventory_pricing.py tests/hermes_cli/test_nous_picker_cached_only_key.py tests/hermes_cli/test_nous_policy_surfaces.py tests/hermes_cli/test_update_fork_sync_identity.py tests/hermes_cli/test_plugin_catalog.py tests/hermes_cli/test_plugins_hub_live_catalog.py tests/hermes_cli/test_copilot_auth.py tests/hermes_cli/test_fireworks_provider.py tests/hermes_cli/test_gmi_provider.py tests/tools/test_managed_tool_gateway.py tests/tools/test_skills_hub.py tests/tools/test_discord_tool.py tests/agent/test_anthropic_adapter.py tests/agent/test_provider_attribution_headers.py tests/agent/test_codex_cloudflare_headers.py tests/agent/test_codex_usage_attribution.py tests/agent/test_switch_model_reapplies_headers.py tests/gateway/relay/test_relay_media.py -q`

Output: 22 files, 481 passed, 0 failed, 2 skipped in 84.8s. After the pre-commit lint change, `tests/hermes_cli/test_endpoints.py` was rerun: 2 passed, 0 failed.

<!-- no-tmp: ok — historical isolated test command evidence -->
`HERMES_HOME=/tmp/envoy-d3-home-gate2 HERMES_RUNTIME_DIR=/tmp/envoy-d3-home-gate2/runtime scripts/run_tests.sh tests/hermes_cli/test_source_check.py tests/hermes_cli/test_source_channel_integration.py tests/hermes_cli/test_update_zip_completion.py tests/hermes_cli/test_update_zip_symlink_reject.py tests/hermes_cli/test_update_completion_routing.py tests/hermes_cli/test_update_zip_sync_failure.py tests/hermes_cli/test_update_fork_sync_identity.py -q`

Output: 7 files, 137 passed, 0 failed in 70.2s. Empty/mismatched update sources had zero HTTP requests; matching Git/SSH sources and configured ZIP source were positive controls.

<!-- no-tmp: ok — historical isolated test command evidence -->
`HERMES_HOME=/tmp/envoy-d3-home-gate2 HERMES_RUNTIME_DIR=/tmp/envoy-d3-home-gate2/runtime scripts/run_tests.sh tests/tools/test_x_search_tool.py tests/tools/test_web_tools_perplexity.py tests/plugins/model_providers/test_fireworks_profile.py tests/tools/test_mcp_oauth_user_agent.py tests/tools/test_mcp_oauth_discovery_requests.py tests/tools/test_mcp_oauth_cold_load_expiry.py -q`

Output: 6 files, 42 passed, 0 failed.

<!-- no-tmp: ok — historical isolated test command evidence -->
`HERMES_HOME=/tmp/envoy-d3-home-gate2 HERMES_RUNTIME_DIR=/tmp/envoy-d3-home-gate2/runtime scripts/run_tests.sh tests/plugins/video_gen/test_openrouter.py tests/plugins/video_gen/test_xai_plugin.py tests/plugins/image_gen/test_openrouter_compat_provider.py tests/plugins/image_gen/test_xai_provider.py tests/tools/test_osv_check.py tests/tools/test_kanban_tools.py tests/hermes_cli/test_azure_detect.py tests/hermes_cli/test_peer_cmd.py tests/gateway/test_slack.py tests/gateway/test_teams.py tests/gateway/test_wecom.py tests/gateway/test_feishu.py -q`

<!-- no-tmp: ok — historical isolated test command evidence -->
Output: 12 files, 564 passed, 1 failed, 8 skipped. The single failure asserted the old xAI User-Agent. After changing that assertion to the new contract, `HERMES_HOME=/tmp/envoy-d3-home-gate2 HERMES_RUNTIME_DIR=/tmp/envoy-d3-home-gate2/runtime scripts/run_tests.sh tests/plugins/image_gen/test_xai_provider.py -q` passed 24, failed 0. The other 11 files from that sweep had no failures.

<!-- no-tmp: ok — historical isolated smoke command evidence -->
`HERMES_HOME=/tmp/envoy-d3-smoke-home HERMES_RUNTIME_DIR=/tmp/envoy-d3-smoke-home/runtime scripts/run-in-hermes-env python -m hermes_cli.main update --check`

Output: `No update source configured.` Exit 0.

<!-- no-tmp: ok — historical isolated test command evidence -->
`HERMES_HOME=/tmp/envoy-d3-home-gate2 HERMES_RUNTIME_DIR=/tmp/envoy-d3-home-gate2/runtime scripts/run_tests.sh tests/agent/test_anthropic_adapter.py -q`

Output: 1 file, 94 passed, 0 failed in 21.2s after replacing credential-shaped fixtures. The exact `sol-review-gate.sh` credential regex no longer matches that file; pre-commit Ruff passed. The stop-time external review may now dispatch.

<!-- no-tmp: ok — historical isolated check command evidence -->
`HERMES_HOME=/tmp/envoy-d3-home-gate2 HERMES_RUNTIME_DIR=/tmp/envoy-d3-home-gate2/runtime scripts/run-in-hermes-env python scripts/check`

Output: 11 checks, failed `health` with 10 findings, all in untouched `apps/desktop` files; exit 1. The pre-commit `ruff check --config ./ruff.strict.toml {staged_files}` passed after two test stubs were corrected. `git diff --check` and the staged diff check passed before commit. Independent review found nothing further after its Git/ZIP findings were fixed.

## Read-only review and fix gate

Paseo reviewer `00877f14-6776-495f-856f-f9992c76dd96` inspected the committed D3 diff without editing. It found three P2 gaps: auxiliary Nous fallback and automatic selection, upstream local-model catalog refresh, and plugin-catalog cache reuse after source change. Commit `4f7d907fdb` removes the fallback and automatic selection, disables local catalog refresh without an endpoint, and binds plugin catalog cache data and retry suppression to the configured source.

The first follow-up review found two P2 source-switching gaps: stored Nous URL outranked the environment override, and local-model refresh throttled a newly configured source after another source failed. Commit `164795b37e` gives the override precedence and keys the local catalog cooldown by source. The next review found an in-flight response race; commit `e3c893d672` fences stale publications, and a deterministic actual-thread regression passes. The final read-only review found nothing further in that race scope; it proved the regression red on the parent and green on the fix with intercepted transports.

<!-- no-tmp: ok — historical isolated baseline command evidence -->
`HERMES_HOME=/tmp/envoy-d3-review-baseline HERMES_RUNTIME_DIR=/tmp/envoy-d3-review-baseline/runtime scripts/run_tests.sh tests/agent/test_auxiliary_client.py tests/agent/test_provider_parity.py -q`

Before the reviewer fix: 279 passed, 0 failed. After the fix and expected assertion updates: 281 passed, 0 failed in 126.4s. The first fix attempt returned 279 passed, 2 failed because two tests still asserted automatic Nous fallback; both were inverted to pin the new selection contract, then the full file passed.

<!-- no-tmp: ok — historical isolated scoped command evidence -->
`HERMES_HOME=/tmp/envoy-d3-review-baseline HERMES_RUNTIME_DIR=/tmp/envoy-d3-review-baseline/runtime scripts/run_tests.sh tests/agent/test_auxiliary_nous_endpoint.py -q`

Output: 2 passed, 0 failed. Empty endpoint did not refresh authentication or construct a client; explicit endpoint selected its configured URL even when runtime credentials reported a different URL.

<!-- no-tmp: ok — historical isolated catalog command evidence -->
`HERMES_HOME=/tmp/envoy-d3-catalog-gate HERMES_RUNTIME_DIR=/tmp/envoy-d3-catalog-gate/runtime scripts/run_tests.sh tests/hermes_cli/test_plugin_catalog.py tests/hermes_cli/test_plugins_hub_live_catalog.py tests/hermes_cli/test_catalog_json.py -q`

Output: 25 passed, 0 failed. The switched-source test was retaken separately after changing its control to configure the endpoint through the brand endpoint reader: 14 passed, 0 failed in `test_plugin_catalog.py`.

<!-- no-tmp: ok — historical isolated check command evidence -->
`HERMES_HOME=/tmp/envoy-d3-review-baseline HERMES_RUNTIME_DIR=/tmp/envoy-d3-review-baseline/runtime scripts/run-in-hermes-env python scripts/check`

Output after the fix: 11 checks, only `health` failed with the same 10 findings in untouched `apps/desktop` files. An earlier attempt also found two new line-count ratchet findings and path literals in these notes; the ratchet findings were fixed by moving new tests into a separate 60-line file and reducing the existing module, and the historical command paths were marked as evidence. The final check reported no Python or path findings. The first commit attempt was blocked because `ruff` was absent from the shell `PATH`; the project-managed Ruff check and the final pre-commit hook both passed when its test environment executable was placed on `PATH`.

<!-- no-tmp: ok — historical isolated final gate command evidence -->
`HERMES_HOME=/tmp/envoy-d3-review-baseline HERMES_RUNTIME_DIR=/tmp/envoy-d3-review-baseline/runtime scripts/run_tests.sh tests/agent/test_auxiliary_client.py tests/agent/test_auxiliary_nous_endpoint.py tests/agent/test_provider_parity.py tests/hermes_cli/test_catalog_json.py tests/hermes_cli/test_plugin_catalog.py tests/hermes_cli/test_plugins_hub_live_catalog.py -q`

Output after `164795b37e`: 6 files, 309 passed, 0 failed in 80.4s. After `e3c893d672`, the same exact command passed 310, failed 0 in 89.0s. A separate scoped run of `test_auxiliary_nous_endpoint.py` and `test_catalog_json.py` passed 12, failed 0; after the race fix `test_catalog_json.py` passed 9, failed 0. The last `scripts/check` retake again ran 11 checks and reported only 10 existing health findings in untouched desktop files.

## Not run and residual risk

No packaged Desktop artifact exists in this worktree, so a packaged runtime and native Windows ZIP execution were not run. The full suite and the 13 known failing desktop test files were not run for this Python-only phase. CODEOWNERS review and CI have not occurred; this is a local commit only. The reviewer also observed existing Hermes values in the Codex `originator` header and Nous provider body tags; changing those provider compatibility identifiers was outside the requested Referer, X-Title and User-Agent scope, and their third-party acceptance was not live-verified.
