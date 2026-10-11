# Five files changed on both lines

- `CLAUDE.md`: keep A. Its fork instructions and CI description are more complete; B adds no endpoint closure.
- `agent/auxiliary_client.py`: keep A's removal of Nous from automatic fallback and its provider behavior. Add B's early endpoint gate and route resolution so saved URLs cannot reopen an unconfigured service.
- `hermes_cli/local_runtime/catalog.py`: keep A. Its opt-in remote catalog includes source-switch and stale-response protection absent from B.
- `tests/agent/test_auxiliary_client.py`: keep A tests of the revised auto fallback; change only if needed to pin the endpoint closure.
- `tests/hermes_cli/test_catalog_json.py`: keep A. Its tests cover empty URL, source changes and concurrent response ordering; B only configures a URL for older refresh tests.
