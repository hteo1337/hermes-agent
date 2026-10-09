"""Envoy service endpoints are opt-in and never inherit upstream defaults."""

import json
from types import SimpleNamespace
import pytest

from hermes_cli import anon_auth, auth_nous, endpoints, plugin_catalog, update_cmd_git
from hermes_cli import models_pricing
from tools import managed_tool_gateway
from tools.skills_hub_search import _load_hermes_index, _search_one_source
from hermes_cli import providers


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
    with pytest.raises(SystemExit) as stopped:
        update_cmd_git._require_update_source()
    assert stopped.value.code == 0
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
    portal, stored, effective, _ = auth_nous._nous_effective_routing({
        "portal_base_url": "https://portal.nousresearch.com",
        "inference_base_url": "https://inference-api.nousresearch.com/v1"})
    assert (portal, stored, effective) == ("", "", "")
    monkeypatch.setattr(providers, "_models_dev_info", lambda *_args: SimpleNamespace(
        name="Nous", env=(), api="https://inference-api.nousresearch.com/v1", doc=""))
    assert providers.get_provider("nous").base_url == ""
    from agent import auxiliary_client
    monkeypatch.delenv("HERMES_PORTAL_BASE_URL", raising=False)
    monkeypatch.delenv("NOUS_PORTAL_BASE_URL", raising=False)
    monkeypatch.setattr(auxiliary_client, "_read_nous_auth", lambda: pytest.fail("saved auth read"))
    assert auxiliary_client._try_nous() == (None, None)


def test_configured_endpoints_are_used_without_upstream_fallback(tmp_path, monkeypatch):
    brand = tmp_path / "brand.json"
    brand.write_text(json.dumps({"name": "Envoy", "endpoints": {
        "updateRepository": "owner/fork", "toolGatewayDomain": "example.invalid",
        "skillsIndexUrl": "https://example.invalid/index.json",
        "portal": "https://portal.example.invalid",
        "nousInferenceUrl": "https://inference.example.invalid/v1",
        "nousWelcomeUrl": "https://welcome.example.invalid/v1",
    }}))
    monkeypatch.setattr(endpoints, "_BRAND_FILE", brand)
    monkeypatch.delenv("TOOL_GATEWAY_DOMAIN", raising=False)
    assert endpoints.endpoint("updateRepository") == "owner/fork"
    assert update_cmd_git._update_repository_url() == "https://github.com/owner/fork"
    assert managed_tool_gateway.build_vendor_gateway_url("firecrawl") == (
        "https://firecrawl-gateway.example.invalid"
    )
    monkeypatch.setenv("HERMES_GUEST_ONBOARDING", "1")
    monkeypatch.setattr("hermes_cli.auth_nous._nous_portal_env_override", lambda: None)
    monkeypatch.setattr("hermes_cli.config.load_config_readonly", dict)
    assert anon_auth.guest_enabled() is True
    monkeypatch.setattr(providers, "_models_dev_info", lambda *_args: SimpleNamespace(
        name="Nous", env=(), api="https://inference-api.nousresearch.com/v1", doc=""))
    assert providers.get_provider("nous").base_url == "https://inference.example.invalid/v1"
    monkeypatch.setattr(providers, "_models_dev_info", lambda *_args: None)
    assert providers.get_provider("nous").base_url == "https://inference.example.invalid/v1"
    portal, stored, effective, _ = auth_nous._nous_effective_routing({
        "portal_base_url": "https://portal.nousresearch.com",
        "inference_base_url": "https://inference-api.nousresearch.com/v1"})
    assert (portal, stored, effective) == (
        "https://portal.example.invalid", "https://inference.example.invalid/v1",
        "https://inference.example.invalid/v1")


def test_disabled_upstream_services_have_no_implicit_routes(tmp_path, monkeypatch):
    from hermes_cli import nous_account, models
    from hermes_cli.portal_cli import _subscription_url, _docs_url
    from unittest.mock import patch

    brand = tmp_path / "brand.json"
    brand.write_text(json.dumps({"name": "Envoy", "docsUrl": "", "endpoints": {}}))
    monkeypatch.setattr(endpoints, "_BRAND_FILE", brand)
    assert nous_account.nous_portal_billing_url() == ""
    assert nous_account.nous_portal_topup_url() == ""
    assert _subscription_url() == _docs_url() == ""
    with patch("hermes_cli.nous_account.urllib.request.urlopen") as opened:
        assert nous_account._fetch_nous_account_info("test-token") == {}
    opened.assert_not_called()
    with patch("hermes_cli.models._get_json") as fetched:
        assert models.fetch_nous_recommended_models(force_refresh=True) == {}
    fetched.assert_not_called()


def test_configured_portal_routes_use_manifest(tmp_path, monkeypatch):
    from hermes_cli import nous_account
    from hermes_cli.portal_cli import _subscription_url, _docs_url
    from unittest.mock import MagicMock, patch

    brand = tmp_path / "brand.json"
    brand.write_text(json.dumps({"name": "Envoy", "docsUrl": "https://docs.example.test", "endpoints": {
        "portal": "https://portal.example.test"}}))
    monkeypatch.setattr(endpoints, "_BRAND_FILE", brand)
    assert nous_account.nous_portal_billing_url() == "https://portal.example.test/billing"
    assert _subscription_url() == "https://portal.example.test/manage-subscription"
    assert _docs_url() == "https://docs.example.test/user-guide/features/tool-gateway"
    response = MagicMock()
    response.__enter__.return_value.read.return_value = b"{}"
    with patch("hermes_cli.nous_account.urllib.request.urlopen", return_value=response) as opened:
        assert nous_account._fetch_nous_account_info("test-token") == {}
    assert opened.call_args.args[0].full_url == "https://portal.example.test/api/oauth/account"


def test_recommendations_ignore_saved_portal_when_current_endpoint_changes(tmp_path, monkeypatch):
    from unittest.mock import patch
    from hermes_cli import auth, models

    brand = tmp_path / "brand.json"
    monkeypatch.setattr(endpoints, "_BRAND_FILE", brand)
    monkeypatch.setattr(auth, "get_provider_auth_state", lambda _provider: {
        "portal_base_url": "https://stale.example.test"})

    brand.write_text(json.dumps({"name": "Envoy", "endpoints": {}}))
    with patch("hermes_cli.models._get_json") as fetched:
        assert models.get_nous_recommended_aux_model(free_tier=False, force_refresh=True) is None
    fetched.assert_not_called()

    brand.write_text(json.dumps({"name": "Envoy", "endpoints": {
        "portal": "https://configured.example.test"}}))
    with patch("hermes_cli.models._get_json", return_value={
        "paidRecommendedCompactionModel": {"modelName": "configured-model"}}) as fetched:
        assert models.get_nous_recommended_aux_model(free_tier=False, force_refresh=True) == "configured-model"
    assert fetched.call_args.args[0] == (
        "https://configured.example.test" + models.NOUS_RECOMMENDED_MODELS_PATH)
