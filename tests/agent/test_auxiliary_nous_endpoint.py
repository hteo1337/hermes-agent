"""Auxiliary Nous selection requires an explicitly configured inference endpoint."""

import base64
import json
import time
from types import SimpleNamespace
from unittest.mock import patch

from agent.auxiliary_client import _NOUS_MODEL, _read_nous_auth, _try_nous


def _jwt_with_claims(claims: dict) -> str:
    header = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    return f"{header}.{payload}.sig"


def test_try_nous_refreshes_stale_pool_entry(monkeypatch):
    configured = lambda name: {
        "portal": "https://portal.pool.example",
        "nousInferenceUrl": "https://configured.pool.example/v1",
    }.get(name, "")
    monkeypatch.setattr("agent.auxiliary_client.endpoint", configured)
    monkeypatch.setattr("hermes_cli.endpoints.endpoint", configured)
    stale_token = _jwt_with_claims({
        "scope": "inference:invoke",
        "exp": int(time.time() - 60),
    })
    fresh_token = _jwt_with_claims({
        "scope": "inference:invoke",
        "exp": int(time.time() + 3600),
    })

    class _Entry:
        def __init__(self, token):
            self.access_token = "pooled-access-token"
            self.agent_key = token
            self.agent_key_expires_at = "2099-01-01T00:00:00+00:00"
            self.scope = "inference:invoke"
            self.inference_base_url = "https://inference.pool.example/v1"

    class _Pool:
        refreshed = False

        def has_credentials(self):
            return True

        def select(self):
            return _Entry(stale_token)

        def try_refresh_current(self):
            self.refreshed = True
            return _Entry(fresh_token)

    pool = _Pool()
    with (
        patch("agent.auxiliary_client.load_pool", return_value=pool),
        patch("agent.auxiliary_client.OpenAI") as mock_openai,
        patch("hermes_cli.models.get_nous_recommended_aux_model", return_value=None),
    ):
        client, model = _try_nous()

    assert pool.refreshed is True
    assert client is not None
    assert model == _NOUS_MODEL
    assert mock_openai.call_args.kwargs["api_key"] == fresh_token
    assert mock_openai.call_args.kwargs["base_url"] == "https://configured.pool.example/v1"


def test_empty_nous_endpoint_skips_auth_and_client():
    with (
        patch("agent.auxiliary_client._read_nous_auth", return_value={"access_token": "fixture-token"}),
        patch("agent.auxiliary_client._scoped_key_env", return_value=""),
        patch("agent.auxiliary_client.endpoint", return_value=""),
        patch("agent.auxiliary_client._resolve_nous_runtime_api") as resolve,
        patch("agent.auxiliary_client._create_openai_client") as create,
    ):
        assert _try_nous() == (None, None)
    resolve.assert_not_called()
    create.assert_not_called()


def test_configured_nous_endpoint_overrides_saved_and_runtime_urls(monkeypatch):
    client = object()
    configured = lambda name: {
        "portal": "https://portal.example.invalid",
        "nousInferenceUrl": "https://chosen.example.invalid/v1",
    }.get(name, "")
    monkeypatch.setattr("agent.auxiliary_client.endpoint", configured)
    monkeypatch.setattr("hermes_cli.endpoints.endpoint", configured)
    with (
        patch("agent.auxiliary_client._read_nous_auth", return_value={
            "inference_base_url": "https://stored.example.invalid/v1",
        }),
        patch("agent.auxiliary_client._resolve_nous_runtime_api", return_value=(
            "fixture-token", "https://unselected.example.invalid/v1")),
        patch("agent.auxiliary_client._create_openai_client", return_value=client) as create,
        patch("hermes_cli.models.get_nous_recommended_aux_model", return_value=None),
    ):
        selected, _ = _try_nous()
    assert selected is client
    assert create.call_args.kwargs["base_url"] == "https://chosen.example.invalid/v1"


def test_environment_override_wins_over_stored_nous_url(monkeypatch):
    monkeypatch.setenv("HERMES_PORTAL_BASE_URL", "https://portal.example.invalid")
    monkeypatch.setenv("NOUS_INFERENCE_BASE_URL", "https://override.example.invalid/v1")
    with (
        patch("agent.auxiliary_client._read_nous_auth", return_value={
            "inference_base_url": "https://stored.example.invalid/v1",
        }),
        patch("agent.auxiliary_client._scoped_key_env", return_value="https://override.example.invalid/v1"),
        patch("agent.auxiliary_client._resolve_nous_runtime_api", return_value=(
            "fixture-token", "https://override.example.invalid/v1")),
        patch("agent.auxiliary_client._create_openai_client", return_value=object()) as create,
        patch("hermes_cli.models.get_nous_recommended_aux_model", return_value=None),
    ):
        _try_nous()
    assert create.call_args.kwargs["base_url"] == "https://override.example.invalid/v1"


def test_pool_auth_reader_preserves_environment_override():
    entry = SimpleNamespace(inference_base_url="https://stored.example.invalid/v1")
    with (
        patch("agent.auxiliary_client._select_pool_entry", return_value=(True, entry)),
        patch("agent.auxiliary_client._scoped_key_env", return_value="https://override.example.invalid/v1"),
    ):
        auth = _read_nous_auth()
    assert auth["inference_base_url"] == "https://override.example.invalid/v1"
