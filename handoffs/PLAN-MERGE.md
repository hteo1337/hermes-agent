# Envoy backend decoupling merge

## Scope
Port the backend default and persisted Nous endpoint protections from `envoy-decouple-backend` onto `envoy/decouple-backend`. Preserve A's plugin catalog, auxiliary-client and provider-parity changes. Keep the desktop tree, LICENSE and NOTICE.md intact.

## Assumptions
The current worktree's A head is the delivery branch. The B branch is reference material. The user requested local commits only, so no network publication follows.

## Architecture and order
1. Inspect B changes from the shared base, A changes, and the overlap files.
2. Apply the smallest backend changes, retaining A's routing and catalog behavior.
3. Adapt or add behavioral tests for both directions of the endpoint contract.
4. Run the required isolated tests, project checks, and inspect all remaining repository URL hits in `hermes_cli` and `agent`.
5. Review the diff, commit locally, and record evidence in `handoffs/STATUS.md`.

## Acceptance
A's behavior remains covered. Default catalog and provider URLs no longer silently select upstream. Empty Nous endpoint configuration fails closed despite persisted auth routes. Requested test files and checks execute with temporary Hermes state. Every residual URL hit is explained.

## Risks
The two branches may have changed a shared seam differently. The test environment may require a linked project venv. Verify behavior and the final diff before commit.

## Verification commands
`scripts/run_tests.sh <every touched test file> tests/agent/test_auxiliary_client.py tests/agent/test_auxiliary_nous_endpoint.py tests/agent/test_provider_parity.py tests/hermes_cli/test_catalog_json.py tests/hermes_cli/test_plugin_catalog.py tests/hermes_cli/test_plugins_hub_live_catalog.py -q`
`python scripts/check`
`rg -n 'nousresearch\.com|raw\.githubusercontent\.com' hermes_cli agent`
