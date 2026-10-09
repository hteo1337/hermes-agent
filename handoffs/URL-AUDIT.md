# Remaining upstream host hits in `hermes_cli` and `agent`

Command: `rg -n 'nousresearch\.com|raw\.githubusercontent\.com' hermes_cli agent`

65 hits after D3b. Active fixed upstream endpoint defaults in this scope were removed; the residual links below are user-facing legacy guidance, not automatic egress.

| Hit | Reason |
|---|---|
| `agent/agent_runtime_helpers.py:1818` | Classifies the configured base URL as a Nous Portal route; no URL selection or connection. |
| `agent/anthropic_adapter.py:564` | Comment showing a host identifier; no executable URL. |
| `agent/anthropic_endpoints.py:109` | Classifies the configured inference host for wire compatibility; no URL selection or connection. |
| `agent/anthropic_endpoints.py:112` | Classifies the configured inference host for wire compatibility; no URL selection or connection. |
| `agent/auxiliary_client.py:3656` | Classifies configured provider, model, or error hosts; no default URL selection or connection. |
| `agent/auxiliary_client.py:3661` | Classifies configured provider, model, or error hosts; no default URL selection or connection. |
| `agent/auxiliary_client.py:7974` | Classifies configured provider, model, or error hosts; no default URL selection or connection. |
| `agent/billing_links.py:66` | Classifies the failing configured inference route for billing guidance; no URL selection or connection. |
| `agent/chat_completion_helpers.py:1519` | Classifies the configured request host; no URL selection or connection. |
| `agent/conversation_loop.py:524` | Classifies the configured inference route; no URL selection or connection. |
| `agent/model_metadata.py:449` | Maps a known host to provider identity; no URL selection or connection. |
| `agent/proxy_sources/iron_proxy.py:50` | Maps a configured proxy/key host for request handling; no default URL selection or connection. |
| `agent/proxy_sources/iron_proxy.py:58` | Maps a configured proxy/key host for request handling; no default URL selection or connection. |
| `agent/reasoning_params.py:92` | Classifies the configured host for request parameters; no URL selection or connection. |
| `agent/subscription_view.py:246` | Development billing fixture URL; no default network route. |
| `agent/usage_pricing.py:415` | Classifies the configured billing route; its base URL is kept unchanged, with no upstream fallback or connection. |
| `hermes_cli/auth.py:1796` | Allows a host already present in a network-provided OAuth URL; no default URL selection or connection. |
| `hermes_cli/auth_codex.py:317` | Provider documentation link in auth guidance; user navigation only. |
| `hermes_cli/auth_constants.py:109` | Provider/OAuth documentation link; user navigation only. |
| `hermes_cli/auth_constants.py:118` | Provider/OAuth documentation link; user navigation only. |
| `hermes_cli/auth_error_copy.py:97` | Default host name in error copy only; no URL selection or connection. |
| `hermes_cli/auth_nous.py:78` | Recognizes stale or configured Nous hosts, or names the host in display text; no default URL selection or connection. |
| `hermes_cli/auth_nous.py:112` | Recognizes stale or configured Nous hosts, or names the host in display text; no default URL selection or connection. |
| `hermes_cli/auth_nous.py:114` | Recognizes stale or configured Nous hosts, or names the host in display text; no default URL selection or connection. |
| `hermes_cli/auth_nous.py:1645` | Recognizes stale or configured Nous hosts, or names the host in display text; no default URL selection or connection. |
| `hermes_cli/config_defaults.py:2900` | Example of an optional tool-gateway domain suffix; no configured default. |
| `hermes_cli/dashboard_auth/login_page.py:382` | Dashboard authentication documentation link; user navigation only. |
| `hermes_cli/debug.py:611` | Support link printed by debug command; user navigation only. |
| `hermes_cli/fallback_cmd.py:138` | Fallback-provider documentation link printed by CLI; user navigation only. |
| `hermes_cli/kanban_parser.py:465` | Kanban documentation link in parser guidance; user navigation only. |
| `hermes_cli/main_dashboard.py:658` | Dashboard documentation link; user navigation only. |
| `hermes_cli/model_setup_flows_common.py:186` | Comment naming the Portal host; no executable route. |
| `hermes_cli/observability/shared_metrics_consent.py:32` | Telemetry consent documentation link; telemetry endpoint now defaults empty. |
| `hermes_cli/plugin_catalog.py:46` | Image-host allowlist for selected catalog images; no fixed upstream catalog route. |
| `hermes_cli/plugin_catalog_presence.py:43` | Builds a raw GitHub URL from a selected repository and SHA; no fixed upstream repository. |
| `hermes_cli/proxy/adapters/base.py:15` | Example inference URL in a type comment; no executable route. |
| `hermes_cli/proxy/adapters/nous_portal.py:28` | Comment describing an inference host; no executable route. |
| `hermes_cli/setup.py:35` | Setup documentation base used in user-facing guidance; no automatic request. |
| `hermes_cli/setup_platforms.py:236` | Messaging setup documentation link; user navigation only. |
| `hermes_cli/setup_platforms.py:249` | Messaging setup documentation link; user navigation only. |
| `hermes_cli/steward.py:44` | Source migration documentation link; user navigation only. |
| `hermes_cli/subcommands/egress.py:15` | Egress documentation link; user navigation only. |
| `hermes_cli/subcommands/fallback.py:15` | Fallback-provider documentation link; user navigation only. |
| `hermes_cli/subcommands/secrets.py:13` | Secrets documentation link; user navigation only. |
| `hermes_cli/subcommands/worktree.py:14` | Worktree documentation link; user navigation only. |
| `hermes_cli/tools_config.py:1082` | Tool configuration guide link; user navigation only. |
| `hermes_cli/uninstall.py:1146` | Manual reinstall command shown after uninstall; no automatic request. |
| `hermes_cli/uninstall.py:1147` | Manual reinstall command shown after uninstall; no automatic request. |
| `hermes_cli/update_cmd_zip.py:608` | Manual reinstall guidance after update failure; no automatic request. |
| `hermes_cli/web_server_messaging.py:77` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:103` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:124` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:148` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:155` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:159` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:163` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:167` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:171` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:175` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:184` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:194` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:200` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_messaging.py:206` | Messaging setup documentation link exposed to the dashboard; user navigation only. |
| `hermes_cli/web_server_oauth.py:147` | Provider documentation link shown by OAuth setup; user navigation only. |
| `hermes_cli/web_server_oauth.py:161` | Provider documentation link shown by OAuth setup; user navigation only. |
