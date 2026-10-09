"""Auxiliary Nous selection requires an explicitly configured inference endpoint."""

from types import SimpleNamespace
from unittest.mock import patch

from agent.auxiliary_client import _read_nous_auth, _try_nous


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


def test_explicit_nous_endpoint_overrides_runtime_fallback():
    client = object()
    with (
        patch("agent.auxiliary_client._read_nous_auth", return_value={
            "inference_base_url": "https://chosen.example.invalid/v1",
        }),
        patch("agent.auxiliary_client._resolve_nous_runtime_api", return_value=(
            "fixture-token", "https://unselected.example.invalid/v1")),
        patch("agent.auxiliary_client._create_openai_client", return_value=client) as create,
        patch("hermes_cli.models.get_nous_recommended_aux_model", return_value=None),
    ):
        selected, _ = _try_nous()
    assert selected is client
    assert create.call_args.kwargs["base_url"] == "https://chosen.example.invalid/v1"


def test_environment_override_wins_over_stored_nous_url():
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
