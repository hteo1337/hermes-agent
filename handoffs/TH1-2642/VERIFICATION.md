# TH1-2642 verification

The probes use a temporary HOME whose name starts with `hermes-th1-2642.` and an isolated Hermes runtime. They generate their own rows using a dummy actor and policy. The authority probe uses 10,000 generated receipts and one template receipt, with 1,235,260,000 bytes of generated JSON. Reset the synthetic DB from `seed.db` between measurements. Keep the same fixture path for both revisions because local identities include the profile path.

## Commands

In a new temporary directory under the system temp directory, create the `home` and `runtime` subdirs. Set `PYTHONPATH` to the source tree under test, `HOME` to the temporary directory, and `HERMES_HOME` and `HERMES_RUNTIME_DIR` to those subdirs. Provision only the disposable environment with `python3 -m pm.build_env --source . --out "$HOME/venv" --group dev --group test`. Run `SEED_FIXTURE=1 "$HOME/venv/bin/python" receipt_probe.py` on the unmodified base, then run `"$HOME/venv/bin/python" receipt_probe.py` for base and treatment. The initial fixture procedure had a bad parameter and was corrected before taking the 10,000-row baseline.

Actual gateway startup ran once with sanitized process environment, `HERMES_HOME="$HOME/gateway-home"`, its own `HERMES_GATEWAY_LOCK_DIR`, and `"$HOME/venv/bin/python" control_boot.py`. The probe creates the gateway home, copies the synthetic fixture, waits for its child's PID to answer identify, and shuts down that child only.

```sh
PYTHON_CPU_COUNT=1 HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh -j 1 --tb=short \
  tests/hermes_state/test_hermes_state.py tests/hermes_state/test_prune_activity_recency.py \
  tests/hermes_state/test_reset_lineage_delete_queued_work.py tests/hermes_state/test_terminal_retirement.py \
  tests/hermes_state/test_hermes_state_readonly_preflight.py tests/agent/test_deadline.py \
  tests/agent/test_deadline_fork_race.py tests/hermes_cli/test_mem_trim.py \
  tests/gateway/test_control_socket.py tests/gateway/test_control_socket_pause.py \
  tests/gateway/test_control_socket_peer_security.py tests/gateway/test_control_socket_forwarded_subject.py \
  tests/gateway/test_runtime_bootstrap_lifecycle.py tests/gateway/test_ticket_profile_scope.py \
  tests/gateway/test_local_session.py tests/gateway/test_local_session_recovery.py \
  tests/gateway/test_local_session_lineage.py tests/gateway/test_local_receipt_untracked_compression.py \
  tests/gateway/test_local_receipt_missing_profile.py tests/gateway/test_local_recovery_pre_profile_origin.py \
  tests/gateway/test_local_yolo_cold_restore.py tests/gateway/test_viewer_close_lifecycle.py \
  tests/gateway/test_run_runtime_hot_serve_cleanup.py tests/gateway/test_startup_recovery_parks_profile.py \
  tests/gateway/test_multiplex_hot_serve.py tests/gateway/test_hosted_group_members.py
npm test -- --maxWorkers=1 electron/local-gateway
tsc -p tsconfig.electron.json --noEmit
GOMAXPROCS=1 node scripts/bundle-electron-main.mjs --dev --out "$HOME/electron-bundle"
scripts/run_tests.sh -j 1 --tb=short tests/hermes_state/test_prune_activity_recency.py \
  -k test_cron_retention_limits_batches_and_keeps_whole_conversations
```

The Python suite passed 502 and skipped 13 across 26 files. The Desktop suite passed 54 and skipped 1. Both main suites ran once. After those runs, the bounded prune stopped repeating ledger checks for each member of a conversation and the retirement path started releasing adapter policy and source entries. The one new retention test passed on the adjusted code and failed on the original base with an unsupported batch argument. The full suite predates that follow-up. The Electron typecheck and bundle passed. In the actual control probe, identify first returned starting at 8,679.15 ms. The runtime reported ready at 11,234.85 ms and 190 MiB RSS.

## Audit notes

- The base's 20-row list and count took 1,271.39 and 814.24 ms. The patched authority probe measured 2.97 and 5.13 ms with the initial index column ordering. An instrumented ten-reader burst observed the writer-lock fallback in each run and delayed a synchronous write 5,256.03 versus 24.32 ms.
- Authority initialization took 11,319.46 versus 155.15 ms. Init loop lag was 11,255.42 versus 3.05 ms. Mounted sessions went from 10,001 to 0 and RSS from 1,488 to 111 MiB. Explicit diagnostic full GC took 74.36 versus 35.21 ms. The synthetic object graph differs from the live runtime's and did not reproduce multi-second GC.
- The base restored local receipts both before the control socket and in post-connect recovery. The new runtime selects pending work and interrupted viewer closes from compact queries. Timeline validation stays separate from publication on the owner loop. The control server retains its private peer check.
- `groups.list` already dispatches room enumeration to a worker. Hosted-room `bindings` runs in the room service's execution path. The direct PID probes audited are in bootstrap/ownership, with control handlers using their dedicated request pool. The synthetic writer-lock convoy does not establish either path as the source of the recorded live freeze.
- Cron policy receipts contain frozen config, the full job snapshot and its extra prompt. Terminal results carry replay and current-turn data. The fixture used padding to match recorded sizes, so it cannot identify the size contribution of an individual live field.
- A release port is separate from this base. Stable `3b4215785882` is not an ancestor of `57499e996fb`. The selected base already carries `d9e89386c2b` and `57499e996fb`. The m4 variant `f8108e2e71e` is available on `origin/m4/TH1-2065-reply-port`.
