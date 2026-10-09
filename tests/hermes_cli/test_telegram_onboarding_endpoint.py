"""Dashboard Telegram onboarding uses only a configured service."""

from unittest.mock import patch

import pytest
from fastapi import HTTPException

from hermes_cli import web_server_messaging as messaging


def test_disabled_onboarding_makes_no_request(monkeypatch):
    monkeypatch.delenv("TELEGRAM_ONBOARDING_URL", raising=False)
    monkeypatch.setattr(messaging, "_TELEGRAM_ONBOARDING_DEFAULT_URL", "")
    with patch("httpx.Client") as client:
        with pytest.raises(HTTPException) as stopped:
            messaging._telegram_onboarding_request_sync("POST", "/v1/telegram/pairings")
    assert stopped.value.status_code == 503
    client.assert_not_called()


def test_configured_onboarding_uses_selected_host(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ONBOARDING_URL", "https://setup.example.test")
    response = type("Response", (), {"raise_for_status": lambda self: None, "json": lambda self: {"ok": True}})()
    with patch("httpx.Client") as client:
        client.return_value.__enter__.return_value.request.return_value = response
        assert messaging._telegram_onboarding_request_sync("POST", "/v1/telegram/pairings") == {"ok": True}
    assert client.return_value.__enter__.return_value.request.call_args.args[1] == (
        "https://setup.example.test/v1/telegram/pairings"
    )
