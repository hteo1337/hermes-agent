# Remaining upstream host hits in `hermes_cli` and `agent`

Command: `rg -n 'nousresearch\.com|raw\.githubusercontent\.com' hermes_cli agent`

95 hits. These remain after the merge; each is outside the requested endpoint closures.

| Hit | Reason |
|---|---|
| `agent/usage_pricing.py:17` | Nous pricing host recognition and an upstream fallback base URL; remaining default outside the two branch changes. |
| `agent/usage_pricing.py:416` | Nous pricing host recognition and an upstream fallback base URL; remaining default outside the two branch changes. |
| `agent/agent_runtime_helpers.py:1818` | Recognizes Nous host for runtime provider behavior; no URL selection. |
| `agent/proxy_sources/iron_proxy.py:50` | Proxy host allowlist and key-to-host mapping; no default connection. |
| `agent/proxy_sources/iron_proxy.py:58` | Proxy host allowlist and key-to-host mapping; no default connection. |
| `agent/prompt_builder.py:176` | Upstream documentation link embedded in prompt copy; may direct users upstream. |
| `agent/prompt_builder.py:186` | Upstream documentation link embedded in prompt copy; may direct users upstream. |
| `hermes_cli/setup_whatsapp_cloud.py:377` | Setup documentation link upstream. |
| `agent/conversation_loop.py:524` | Recognizes the Nous inference host for provider-specific handling; no URL selection. |
| `hermes_cli/update_cmd_maint.py:39` | Manual reinstall and documentation copy links upstream. |
| `hermes_cli/update_cmd_maint.py:40` | Manual reinstall and documentation copy links upstream. |
| `hermes_cli/update_cmd_maint.py:105` | Manual reinstall and documentation copy links upstream. |
| `hermes_cli/auth.py:1796` | Portal host allowlist for network-provided URLs; no default endpoint selection. |
| `agent/anthropic_adapter.py:564` | Comment naming an upstream host; no route. |
| `agent/model_metadata.py:449` | Maps known inference host to provider identity; no URL selection. |
| `agent/billing_links.py:66` | Detects Nous host and supplies a billing link; the link still points upstream. |
| `agent/billing_links.py:75` | Detects Nous host and supplies a billing link; the link still points upstream. |
| `hermes_cli/diagnostics_upload.py:13` | Diagnostics upload still has an upstream Portal fallback; residual outbound default outside this merge. |
| `agent/reasoning_params.py:92` | Detects Nous host for request shaping; no default route. |
| `agent/subscription_view.py:246` | Development billing fixture URL; no default route. |
| `agent/turn_recovery.py:349` | Account recovery guidance linking to upstream Portal. |
| `agent/turn_recovery.py:920` | Account recovery guidance linking to upstream Portal. |
| `agent/anthropic_endpoints.py:109` | Checks the known Nous inference host for Anthropic wire compatibility; no default route. |
| `agent/anthropic_endpoints.py:112` | Checks the known Nous inference host for Anthropic wire compatibility; no default route. |
| `agent/auxiliary_client.py:3656` | Recognizes Nous host in provider, model and error handling; auxiliary route now comes from current configuration. |
| `agent/auxiliary_client.py:3661` | Recognizes Nous host in provider, model and error handling; auxiliary route now comes from current configuration. |
| `agent/auxiliary_client.py:7974` | Recognizes Nous host in provider, model and error handling; auxiliary route now comes from current configuration. |
| `hermes_cli/main_desktop.py:1655` | Desktop-install help text links upstream. |
| `agent/billing_view.py:320` | Billing top-up link to upstream Portal; explicit billing action. |
| `agent/chat_completion_helpers.py:1519` | Detects Nous host for request handling; no default route. |
| `hermes_cli/nous_account.py:154` | Account-management code retains upstream Portal fallbacks; residual outbound default. |
| `hermes_cli/nous_account.py:484` | Account-management code retains upstream Portal fallbacks; residual outbound default. |
| `hermes_cli/plugin_catalog.py:46` | Allows raw GitHub as an image host for catalog items; catalog itself stays fork controlled. |
| `hermes_cli/model_setup_flows_common.py:186` | Comment naming a Portal host. |
| `hermes_cli/setup_quick.py:64` | Subscription sign-up links to upstream Portal. |
| `hermes_cli/setup_quick.py:99` | Subscription sign-up links to upstream Portal. |
| `hermes_cli/proxy/adapters/base.py:15` | Example inference URL in a type comment. |
| `hermes_cli/proxy/adapters/nous_portal.py:28` | Comment describing known Nous inference host. |
| `hermes_cli/web_server_oauth.py:147` | OAuth/provider documentation links upstream. |
| `hermes_cli/web_server_oauth.py:161` | OAuth/provider documentation links upstream. |
| `hermes_cli/web_routers/status.py:776` | Subscription link exposed to the UI, still upstream. |
| `hermes_cli/dashboard_auth/login_page.py:382` | Dashboard documentation link upstream. |
| `hermes_cli/models.py:406` | Model and Portal helpers retain upstream Portal fallbacks; residual outbound default. |
| `hermes_cli/models.py:443` | Model and Portal helpers retain upstream Portal fallbacks; residual outbound default. |
| `hermes_cli/fallback_cmd.py:138` | Documentation link upstream. |
| `hermes_cli/kanban_parser.py:465` | Kanban documentation link upstream. |
| `hermes_cli/update_cmd_zip.py:608` | Manual reinstall guidance links upstream. |
| `hermes_cli/subcommands/secrets.py:13` | Documentation link upstream. |
| `hermes_cli/plugin_catalog_presence.py:43` | Constructs raw GitHub URL for a selected repository and SHA; no upstream fixed repository. |
| `hermes_cli/subcommands/fallback.py:15` | Documentation link upstream. |
| `hermes_cli/config_defaults.py:1829` | Configuration still includes upstream Portal billing and telemetry URLs or a host example; residual defaults. |
| `hermes_cli/config_defaults.py:2338` | Configuration still includes upstream Portal billing and telemetry URLs or a host example; residual defaults. |
| `hermes_cli/config_defaults.py:2900` | Configuration still includes upstream Portal billing and telemetry URLs or a host example; residual defaults. |
| `hermes_cli/web_server_messaging.py:76` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:102` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:123` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:147` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:154` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:158` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:162` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:166` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:170` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:174` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:183` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:193` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:199` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:205` | Messaging setup documentation links upstream. |
| `hermes_cli/web_server_messaging.py:370` | Messaging setup documentation links upstream. |
| `hermes_cli/subcommands/egress.py:15` | Documentation link upstream. |
| `hermes_cli/subcommands/worktree.py:14` | Documentation link upstream. |
| `hermes_cli/setup_platforms.py:236` | Messaging setup documentation links upstream. |
| `hermes_cli/setup_platforms.py:249` | Messaging setup documentation links upstream. |
| `hermes_cli/setup.py:35` | Setup documentation base URL points upstream. |
| `hermes_cli/auth_constants.py:109` | OAuth and integration documentation links upstream. |
| `hermes_cli/auth_constants.py:118` | OAuth and integration documentation links upstream. |
| `hermes_cli/observability/shared_metrics_send_config.py:15` | Telemetry endpoint defaults upstream; opt-in telemetry path remains outside this merge. |
| `hermes_cli/main_dashboard.py:658` | Dashboard documentation link upstream. |
| `hermes_cli/uninstall.py:1146` | Manual reinstall guidance links upstream. |
| `hermes_cli/uninstall.py:1147` | Manual reinstall guidance links upstream. |
| `hermes_cli/observability/shared_metrics_consent.py:32` | Telemetry consent documentation link upstream. |
| `hermes_cli/portal_cli.py:10` | Portal CLI still defaults to upstream Portal and subscription/docs URLs; residual outbound default. |
| `hermes_cli/portal_cli.py:11` | Portal CLI still defaults to upstream Portal and subscription/docs URLs; residual outbound default. |
| `hermes_cli/portal_cli.py:12` | Portal CLI still defaults to upstream Portal and subscription/docs URLs; residual outbound default. |
| `hermes_cli/tools_config.py:1082` | Tool documentation link upstream. |
| `hermes_cli/steward.py:44` | Documentation link upstream. |
| `hermes_cli/debug.py:611` | Support link upstream. |
| `hermes_cli/auth_nous.py:78` | Host allowlist, stale-host recognition or display fallback; routing now uses configured endpoints. |
| `hermes_cli/auth_nous.py:112` | Host allowlist, stale-host recognition or display fallback; routing now uses configured endpoints. |
| `hermes_cli/auth_nous.py:114` | Host allowlist, stale-host recognition or display fallback; routing now uses configured endpoints. |
| `hermes_cli/auth_nous.py:1645` | Host allowlist, stale-host recognition or display fallback; routing now uses configured endpoints. |
| `hermes_cli/nous_billing.py:19` | Billing code retains upstream Portal default; residual outbound default. |
| `hermes_cli/dashboard_register.py:20` | Dashboard registration still defaults to upstream Portal; residual outbound default. |
| `hermes_cli/auth_error_copy.py:97` | Portal host used in error copy. |
| `hermes_cli/telegram_managed_bot.py:17` | Managed bot setup still has upstream default URL; residual outbound default. |
| `hermes_cli/auth_codex.py:317` | Provider documentation link upstream. |
