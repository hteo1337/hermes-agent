"""Envoy service endpoints are opt-in and never inherit upstream defaults."""

import json

from hermes_cli import anon_auth, endpoints, plugin_catalog
from hermes_cli import models_pricing
from tools import managed_tool_gateway
from tools.skills_hub_search import _load_hermes_index, _search_one_source


def test_empty_manifest_disables_remote_services(tmp_path, monkeypatch):
    brand = tmp_path / "brand.json"
    brand.write_text(json.dumps({"name": "Envoy", "endpoints": {}}))
    monkeypatch.setattr(endpoints, "_BRAND_FILE", brand)
    monkeypatch.delenv("TOOL_GATEWAY_DOMAIN", raising=False)
    monkeypatch.delenv("NOUS_INFERENCE_BASE_URL", raising=False)
    monkeypatch.setenv("HERMES_GUEST_ONBOARDING", "1")
    monkeypatch.setattr("hermes_cli.auth_nous._nous_portal_env_override", lambda: None)
    monkeypatch.setattr("hermes_cli.config.load_config_readonly", dict)
    assert endpoints.endpoint("updateRepository") == ""
    assert managed_tool_gateway.build_vendor_gateway_url("firecrawl") == ""
    assert _load_hermes_index() is None
    class RemoteSource:
        def source_id(self):
            return "github"

        def search(self, *_args, **_kwargs):
            raise AssertionError("remote search must stay disabled")

    assert _search_one_source(RemoteSource(), "sample", 10) == ("github", [])
    assert plugin_catalog.fetch_live_catalog() is None
    assert models_pricing._resolve_nous_pricing_credentials()[1] == ""
    assert anon_auth.guest_enabled() is False


def test_configured_endpoints_are_used_without_upstream_fallback(tmp_path, monkeypatch):
    brand = tmp_path / "brand.json"
    brand.write_text(json.dumps({"name": "Envoy", "endpoints": {
        "updateRepository": "owner/fork", "toolGatewayDomain": "example.invalid",
        "skillsIndexUrl": "https://example.invalid/index.json",
        "portal": "https://portal.example.invalid",
        "nousWelcomeUrl": "https://welcome.example.invalid/v1",
    }}))
    monkeypatch.setattr(endpoints, "_BRAND_FILE", brand)
    monkeypatch.delenv("TOOL_GATEWAY_DOMAIN", raising=False)
    assert endpoints.endpoint("updateRepository") == "owner/fork"
    assert managed_tool_gateway.build_vendor_gateway_url("firecrawl") == (
        "https://firecrawl-gateway.example.invalid"
    )
    monkeypatch.setenv("HERMES_GUEST_ONBOARDING", "1")
    monkeypatch.setattr("hermes_cli.auth_nous._nous_portal_env_override", lambda: None)
    monkeypatch.setattr("hermes_cli.config.load_config_readonly", dict)
    assert anon_auth.guest_enabled() is True
