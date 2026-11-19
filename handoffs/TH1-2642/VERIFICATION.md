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

## Final measurements and security follow-up

The pushed-head authority repeat measured list/count at 27.04/7.48 ms, longest concurrent list at 81.08 ms and writer fallback delay at 30.02 ms. Authority initialization took 70.08 ms at 121 MiB RSS with 0 mounted sessions, 9.32 ms maximum init lag, and a 73.15 ms diagnostic full collection. Both explicit GC samples are synthetic.

`python scripts/check --only health --base 57499e996fb --commit HEAD` passed on the reviewed head. The existing retention regression was extended after the audit to verify cleanup confinement and rerun once. It passed against the final code. The two full suites were already complete and were not repeated.

Release-port dry runs used `git merge-tree --write-tree --merge-base=4dcef215cfe 3b4215785882 57499e996fb` and `git merge-tree --write-tree --merge-base=f8108e2e71e^ 3b4215785882 f8108e2e71e`. They found six m5 conflicts and four m4 conflicts. Do not rebase this issue branch onto the stable release base.

The final artifact-ownership follow-up reran the same targeted retention case with one worker. It passed in 3.4 s. It checked removal of correctly named cron files and preservation of differently spelled, nested, reserved, and unrelated dump files. Older dump names that lack the writer's timestamp shape are retained by the scheduled sweep. Code health reported zero findings after the follow-up.

The final defense changed scheduled batches to SQLite-only cleanup because standalone diagnostic names do not reliably encode ownership. The same targeted retention case passed in 2.7 s on that code. It removes eligible ended rows and their receipts, preserves whole-lineage and active-work guards, and leaves all standalone fixture files untouched. The separate manual cleanup path retains its existing behavior for valid transcript basenames.

## Blocking review follow-up

Control `d19a727ef8e49bedb757c15b8571c1d365a79815`. Product and test head `94522fee5707e1f07a0425281439830d64b77eeb`. The first Python and Desktop suite invocations used `f6d2924c7cbd74a2495794ffdc41336980754db2`. The only subsequent code-tree change was to the Desktop linked-profile test fixture, which now expects one successful mint while exercising the same profile identity checks.

### Controls

| Finding | Reviewed head | Repaired head |
| --- | --- | --- |
| 1. Cancelled viewer close | Recovery armed the snapshotted close after compare-and-delete | Recovery skipped the cancelled record and still armed a current record |
| 2. First store open | No identify reply during either schema open. First identify 4,905.40 ms, ready 9,648.39 ms, RSS 208 MiB | Identify replied during both launch and secondary schema opens. First identify 1,150.22 ms, ready 5,957.15 ms, RSS 194 MiB |
| 5. Lost ticket reply | Six submitted requests, one endpoint forget | One submitted request, zero endpoint forgets |
| 6a. Retry floor | A one-day setting deleted the two-day-old session | The two-day-old session survived and the eight-day-old session was deleted |
| 6b. Sweep artifacts | Last-reference spill archive was removed and sessions.json changed | Spill archive and sessions.json survived. The committed SQLite route and the live route were retired |
| 7. Cleanup failure | The injected post-commit SQLite exception left the live session mounted | The operator still received the exception and the owner retired the committed session |

Both boot runs used the real gateway entry point in separate, synthetic homes. Each launch and secondary DB was cloned from the same 1,263,828,992-byte fixture. The probe verified that neither DB had the expression index at schema entry and both had it at readiness. A gate at each schema entry held the open until identify answered or 1.5 seconds elapsed. The timings include this gate and measure the controlled runs. The gateway children had no external adapters and were the only processes stopped by the probe.

The SQLite fixture used real SessionDB writes and owner retirement. It set up a present then cancelled durable close, two ended cron sessions, a spill file referenced by the older session, a populated SQLite route and mirror, and a separate ended CLI session for the injected failure. The injected failure occurred at explicit prune's media collection after transaction commit. The scheduled sweep records retirement candidates in SQLite for subsequent artifact cleanup. It skips file cleanup, the legacy mirror writer and the deletion hook.

### Commands and counts

Scratch logs and paired probes are under `/private/tmp/hermes-th1-2642.review-fix.YokSFh`. The tested shell had an empty inherited environment except for explicitly supplied paths, a temporary HOME, HERMES_HOME and HERMES_RUNTIME_DIR, and the existing disposable Python 3.14 interpreter at `/private/tmp/hermes-th1-2642.xcDJeO/venv/bin/python`. The socket capability check bound, connected and transferred bytes over AF_UNIX before the suites.

```sh
scratch=/private/tmp/hermes-th1-2642.review-fix.YokSFh
bash "$scratch/state_pair.sh" "$scratch"
bash "$scratch/boot_pair.sh" "$scratch"
python scripts/check --only health --base 57499e996fb --commit 94522fee5707e1f07a0425281439830d64b77eeb
git diff --check 57499e996fb...HEAD
```

The Python command and all 26 file arguments are in **Commands** above. It completed 21 files with 162 passes, 13 skips and zero reported failures before the dispatcher interruption stopped the runner during `test_hermes_state.py`. The continuation ran only the five files without a result. No completed Python test file was repeated.

```sh
PYTHON_CPU_COUNT=1 HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh -j 1 --tb=short \
  tests/hermes_state/test_hermes_state.py tests/hermes_state/test_prune_activity_recency.py \
  tests/hermes_state/test_reset_lineage_delete_queued_work.py tests/hermes_state/test_terminal_retirement.py \
  tests/hermes_state/test_hermes_state_readonly_preflight.py
```

The continuation reported 340 passed and zero failed in 178.2 seconds on one worker. Combined with the completed files from the interrupted invocation, the focused Python selection covered 26 files with 502 passes, zero failures and 13 platform skips.

Run from `apps/desktop`. The archived reviewed head received only the new lost-reply test for its control. Existing dependencies were available through the checkout. Set both `HERMES_PYTHON` and `HERMES_TEST_PYTHON` to the existing 3.14 interpreter when using a host whose default `python3` is 3.9. The exact initial invocations omitted the latter variable.

```sh
# Reviewed head. Expected red.
npm test -- --maxWorkers=1 electron/local-gateway.test.ts -t 'a lost mint reply stops the dial after one submission'
npm test -- --maxWorkers=1 electron/local-gateway-python.test.ts electron/local-gateway-python-bundled.test.ts

# Repaired head. The complete selection ran once.
npm test -- --maxWorkers=1 electron/local-gateway
# Follow-up for the three failed files, with both Python variables set.
npm test -- --maxWorkers=1 electron/local-gateway-python.test.ts electron/local-gateway-python-bundled.test.ts electron/local-gateway-ticket-identity.test.ts
tsc -p tsconfig.electron.json --noEmit
GOMAXPROCS=1 node scripts/bundle-electron-main.mjs --dev --out "$HOME/electron-bundle"
```

The new regression failed on the reviewed head with `[6, 1]` versus `[1, 0]` and passed in the full Desktop selection. That selection reported 52 passed, 3 failed, and 1 skipped across 12 files. The linked-profile fixture had expected a resend after submission and was updated for the new contract. The two Python bridge fixtures failed with the same bootstrap error on the reviewed head under the same default Python 3.9.6, which lacks `-P`. All four tests in the three follow-up files passed using the pinned Python 3.14 interpreter, resolving every failure from the complete selection. The combined coverage is 55 passing tests and one platform skip. TypeScript and the Electron development bundle exited 0. Code health found zero blocking and advisory findings. A preliminary targeted Desktop invocation started provisioning tooling in a disposable HOME before interruption. The subsequent runs used the existing interpreter. Live Hermes state, services and the running gateway were outside these probes.

## Round-two blocking repairs

The prior review head was `c6119975e992aff85f711b7d620949e8d7a8d97f`. The product and test head is `c1ad939943dfd68acb57a4cadeab3e583f04825e`. The following handoff commit changes Markdown only.

| Finding | Reviewed-head control | Repaired product and test head |
| --- | --- | --- |
| A. Startup and ensure | Real early control listener and normal discovery sent ensure to replacement. A sentinel intercepted the stop path. | Ensure read the early `starting` payload from the bound listener and waited to its deadline without replacing or starting an owner. |
| B. Control socket rebind | After binding the same UNIX socket to the new instance, the logical dial stopped at `Invalid gateway ticket response`. | The rebind fixture observed `old, old, new` across the initial mint and redial. The dial invalidated the cached descriptor once, called ensure twice, and obtained the new owner's grant. The existing lost-reply fixture still observed one submission and zero invalidations. |
| C. Route import after expiry | The scheduled sweep removed the old SQLite row and left the mirror byte-identical. After a second sweep past the retry horizon removed the fence, a fresh SessionDB and SessionStore reimported the old route. | With the same expired-fence condition, the fresh store imported the live mirror route and rejected the deleted one. |

The controls used a scratch archive of the reviewed head with only the three regression cases copied in. They each failed at the expected assertion. The startup test on the treatment also records the actual identify payload states. The Python runner reported two failed tests in two files in the control. The Desktop filtered control reported one failed and 32 filtered tests in one file.

```sh
scripts/run_tests.sh -j 1 --tb=short \
  tests/gateway/test_runtime_bootstrap_lifecycle.py tests/hermes_state/test_prune_activity_recency.py \
  -k 'test_ensure_waits_for_the_early_gateway_control_listener or test_cron_prune_cannot_restore_routes_from_mirror_after_fence_expiry'
cd apps/desktop
npm test -- --maxWorkers=1 electron/local-gateway.test.ts -t 'a rebound control socket'
```

### Final checks

Both suites used sanitized, separate temporary homes and runtimes. `HERMES_PYTHON` and `HERMES_TEST_PYTHON` both pointed to `/private/tmp/hermes-th1-2642.xcDJeO/venv/bin/python` (3.14.9). An AF_UNIX bind, connect, and data transfer succeeded. Both suites used one worker.

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
  tests/gateway/test_multiplex_hot_serve.py tests/gateway/test_hosted_group_members.py \
  tests/hermes_cli/test_gateway_runtime_replace_incompatible.py \
  tests/gateway/test_session.py tests/gateway/test_secondary_route_fence_scope.py \
  tests/gateway/test_session_db_recovery.py
```

Run the Desktop commands from `apps/desktop`.

```sh
npm test -- --maxWorkers=1 electron/local-gateway
../../node_modules/.bin/tsc -p tsconfig.electron.json --noEmit
GOMAXPROCS=1 node scripts/bundle-electron-main.mjs --dev --out /private/tmp/th12642-r2.ZW30PU/electron-bundle
```

Desktop reported 56 passed, one Windows-only skip, 12 files, 8.42 seconds. Electron typecheck and the development bundle exited zero. The first typecheck command looked for `tsc` in the Desktop package's bin directory. The actual workspace binary at the root passed.

```sh
python scripts/check --only health --base 57499e996fb --commit c1ad939943dfd68acb57a4cadeab3e583f04825e
git diff --check c6119975e99..c1ad939943dfd68acb57a4cadeab3e583f04825e
```

Code health reported zero blocking and advisory findings. The whitespace check exited zero. Commit lint ran with the pinned environment on PATH. Ruff passed and Desktop ESLint reported only padding warnings.

### Adversarial pass

- The early identify reply announces protocol 1 and carries no attachable endpoint. An early older-format `starting` reply is accepted only when the reported owner home matches its verified control route. Named profiles without a published match fall through to the existing multiplexer reservation logic. An incompatible ready reply still takes the upgrade path. The replacement-time identify check also protects a current or starting owner that appears after the first probe.
- A retry requires the matching request ID, protocol and complete stale refusal with no result. The server emits that refusal before reaching the mint call. An incomplete response or any other complete refusal remains final after submission. The Python bridge maps only specific pre-submission discovery errors and the stale-instance refusal to redial. Main's scoped HTTP retry keeps its request routing options, so a pooled mutation invalidates that same pool entry and reuses the profile route. Windows native pipe execution was skipped on macOS.
- The import checks the profile that owns the routing key. A secondary cannot borrow the launch DB's same-ID row. Existing SQLite routes keep precedence, valid mirror-only rows still import, and the existing DB-unavailable JSON fallback remains. The scheduled job stays SQLite-only.
- Semif evaluated the product diff and delivery plan and returned `required` for the independent adversarial review. Same-reviewer confirmation, the security audit, and GitHub CI are downstream of this handoff.

### Secondary-profile suite environment

The additional `test_secondary_route_fence_scope.py` collected zero tests with the first disposable interpreter because it lacks `aiohttp`. The reviewed head reproduced that collection error with the same interpreter and command. The file then ran once with the existing isolated 3.14.9 test environment that already had `aiohttp` 3.14.5. Its 16 tests passed in 27.8 seconds. No test from the other 29 files was repeated.

```sh
suite_python=/private/tmp/hermes-th1-2642.xcDJeO/home/installs/f8c5a4c3d2dab087/test-environment/gen-800ac08a6555459ca821d81d230c1833/venv/bin/python
HERMES_PYTHON="$suite_python" HERMES_TEST_PYTHON="$suite_python" \
  PYTHON_CPU_COUNT=1 HERMES_TEST_FILE_RETRIES=0 scripts/run_tests.sh -j 1 --tb=short \
  tests/gateway/test_secondary_route_fence_scope.py
```

Logs and the sanitized environment launcher are in `/private/tmp/th12642-r2.ZW30PU`.

The primary Python invocation completed the original 26-file selection and three added seam files continuously. It reported 576 passes and 17 skips in 503.6 seconds and exited 1 for the optional secondary-profile collection error above. Including that file's successful focused run, total coverage was 592 passes and 17 skips across 30 files, with zero test assertion failures. Both regression tests A and C passed in the primary invocation.
