Baseline: NEW-FAILURES (1)

Exactly one requested suite invocation per fresh detached clone; the shared PM environment and package inventory were unchanged between runs. No retries, new tests, fixes, merge, installation, PR-branch pushes, or live gateway changes.

| Tree | Pinned commit | Files | Passed | Failed | Skipped | Xfailed | Suite exit | Wall time |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Upstream base | `4dcef215cfe41bd2d02c2d1dad6e257a18101216` | 1969 | 14843 | 11 | 335 | 1 | 1 | 713.7s |
| PR head | `c1f9fcc309daea44a59e6212921d8da9f4a1884f` | 1970 | 14843 | 12 | 335 | 1 | 1 | 719.9s |

Each skipped count comprises 333 test IDs and two module-level skips. Collection errors, incomplete sessions and interpreter crashes: zero. The runner normalizes the two no-test/module-skip file exits (5) to success; the six/seven failing-file exits were 1.

**Head-fail/base-pass: 1**

`tests/gateway/test_replace_ownership_guard.py::TestStampDurability::test_refusal_stamp_reaches_disk_before_the_hard_exit`

- Base: passed (call 5.594s). Head: failed (call 5.498s).
- [Failing assertion, line 486](https://github.com/hteo1337/hermes-agent/blob/c1f9fcc309daea44a59e6212921d8da9f4a1884f/tests/gateway/test_replace_ownership_guard.py#L486): `AssertionError: assert 'running' == 'startup_failed'`. The child exited 1, but `gateway_state.json` retained `running`; the refusal stamp was absent at the first state assertion.
- PR touch scope: the test file, `gateway/status.py`, and `gateway/run_bootstrap.py::_start_gateway_replace_existing_instance` are identical between pins (hash/source comparison recorded). PR #2 changes the exercised surrounding startup path: `gateway/run.py` and `gateway/run_bootstrap.py`, adding `observe_default_executor()` at head lines 755–756. Thus this failure is in an unchanged refusal-write operation reached through a changed startup path.
- Causality remains unproven: the unchanged child writer sleeps 5.0s and refusal persistence waits at most 5.0s. This is an observed differential failure under the requested definition; these capped runs cannot establish whether the PR caused it or whether timing explains it. No rerun was performed, and it is not dismissed as a flake.

**Base-fail/head-pass: 0 — none.** Eleven failing IDs are shared. The only head-only test, `tests/gateway/test_executor_starvation.py::test_ticket_and_rpc_ping_survive_default_executor_saturation`, passed; it offsets the newly lost pass in the aggregate pass count. No other status changes, removed tests, unmatched failing tests, or additional nonzero-file regressions were observed.

<details>
<summary>The 11 failure IDs shared by both runs</summary>

- `tests/gateway/test_config_policy_recovery.py::test_a_changed_fallback_secret_removes_that_fallback[literal]`
- `tests/gateway/test_config_policy_recovery.py::test_a_changed_fallback_secret_removes_that_fallback[named]`
- `tests/gateway/test_config_policy_recovery.py::test_a_changed_fallback_secret_removes_that_fallback[reference]`
- `tests/gateway/test_config_secret_scope.py::test_a_moved_route_never_sends_its_frozen_key_to_the_new_endpoint[fallback_providers_dict]`
- `tests/gateway/test_model_confirmation_clients.py::test_acp_set_session_model_asks_through_request_permission`
- `tests/gateway/test_session_client_env.py::test_configured_toolchain_names_a_local_client_omitted_never_leak_from_the_daemon`
- `tests/gateway/test_session_client_env.py::test_host_values_apply_only_over_a_gateway_proven_local_attach`
- `tests/gateway/test_session_edit_policy.py::test_a_branch_of_a_dont_ask_session_starts_at_ask`
- `tests/gateway/test_session_edit_policy.py::test_edit_policy_is_a_durable_session_setting_every_viewer_reads`
- `tests/gateway/test_session_policy_refusal_fields.py::test_an_unusable_server_spec_never_echoes_its_values`
- `tests/gateway/test_session_policy_refusal_fields.py::test_every_create_check_names_the_field_it_read[extra25-editor.mcp_servers]`

</details>

Exact command, run once in each clone:

```sh
HERMES_PYTHON=/Users/hteo/.paseo/worktrees/th1-1839-env-9d69f1fe/venv/bin/python HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh tests/gateway/ tests/tui_gateway/ -j 6
```

Working directories: `/Users/hteo/.paseo/worktrees/th1-1839-baseline-9d69f1fe` and `/Users/hteo/.paseo/worktrees/th1-1839-head-9d69f1fe`. Dependencies were built with the repository's `pm.build_env`, groups `dev` and `test`, plus its declared `messaging` extra; actual interpreter Python 3.14.9, pytest 9.1.1. The same observational pytest plugin captured every test's phases, unittest subreports, file exits and code origins without changing suite flags. Recorded imports confirm base code in the base run and head code (including executor pools, control socket and WebSocket modules) in the head run. No competing test processes existed between runs or after completion.

The earlier 2,252-failure result was not reproduced in this fresh paired environment; these exact counts replace it for this comparison. Both suites remain red, and the approved no-new-failures condition is unmet. CI is not assessed by this verification. Cleanup of both clones and the disposable environment follows; per-test evidence, commands and source-scope hashes are preserved under `handoffs/TH1-1839/` on review branch `review/TH1-1839-6350225a2a5d`.
