# D5 packaged Envoy egress probe 2 — 2026-10-10

**Result: zero app-originated non-loopback hosts observed, but the strict pass criterion is not established.** The machine-wide DNS capture saw two non-loopback resolver IPs during the five-minute idle phase. It did not identify the originating process. The target app's 502 proxy saw zero requests, and its process-tree socket sampler saw zero non-loopback sockets. The probe stopped after the idle interval; no application code was changed.

## New artifact and gates

- Tested this branch's newly rebuilt `apps/desktop/release/mac-arm64/Envoy Agent.app` at source commit `0d1e8a1981c78f` (`envoy/release`), confirmed in About. `npm run dist:bundled` exited **0** using the prepared `HERMES_PYTHON`. The DMG is **1,794,057,339 bytes**, the ZIP **1,826,023,319 bytes**, and the embedded `agent-payload/manifest.json` **536 bytes**. `codesign -dv` reported Developer ID Application, identifier `app.envoy.envoy-bundled`, team `6B77N69ATU`. Notarization was skipped because the configured Apple credentials were incomplete.
- `npm ci` first exited **127** at the root `prepare` hook because `lefthook` was not found; `npm ci --ignore-scripts` then exited **0**. The first distribution attempt exited **1** for missing `HERMES_PYTHON`; the detached retry exited **0**. `npm run typecheck` exited **0**. `brand-audit --check` exited **0**, reporting **2,120 hits in 710 files**; `egress-audit --check` exited **0**, reporting **10 hits in 5 files**. These are baseline audit matches, not runtime egress.

## Method and controls

- Fresh root: path in `probe2-root.path`; `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and `HERMES_DESKTOP_USER_DATA_DIR` were under it. The packaged app PID was **53271**, with `HERMES_DESKTOP_IGNORE_EXISTING=1`. Upper/lowercase `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY` pointed to a loopback logging proxy on `127.0.0.1:54115`; `NO_PROXY=localhost,127.0.0.1,::1`; Chromium received `--proxy-server=http://127.0.0.1:54115`. Every CONNECT and HTTP request got **502** with no forwarding. An isolated OpenAI-compatible mock listened on `127.0.0.1:54114`.
- Before launch, an HTTP request for `example.invalid` through the proxy returned **502** and logged one GET; HTTPS logged one CONNECT. A direct mock `/v1/models` request returned **200** while the proxy count stayed **2 → 2**. Those two control records are excluded from the app count. The target backend log recorded `Using bundled payload`, `HERMES_BACKEND_READY port=54358`, and backend ready.
- A once-per-second process-tree `lsof -nP -a -p <pid> -i` sampler ran for **599 ticks**, recording **3,945 socket rows** for app PID **53271** (1,216 rows), helper PID **61363** (596), and bundled backend PID **63057** (2,133). All sampled endpoints were loopback; **zero** rows had a non-loopback endpoint. Passwordless `sudo -n` was available, so `tcpdump -i en0` and `-i lo0` captured ports **53/853**. Both reported **zero kernel drops**.
- UI automation briefly opened a second process for the same bundle ID with the user's existing profile. That process was stopped before isolated UI coverage. The UI was rebound to PID 53271's fresh window, which showed **No sessions yet**, `custom: mock-model`, and Backend ready. The target process, mock and proxy were stopped at the end; the two capture processes required a separate SIGINT and were also stopped. Nothing remained listening on proxy port 54115.

## Hosts and counts

| Destination | Observations | Phase / feature | Attribution |
|---|---:|---|---|
| App-originated upstream host via proxy | **0** | Boot through idle | No app request after the two controls. |
| App-process non-loopback socket | **0 / 3,945 sampled rows** | Boot through idle | Process-tree sampler. |
| `1.1.1.1:53` | **4 packets**: two outgoing DNS queries, two replies | Idle, 02:04:39 UTC; host resolver discovery (`local`, `_dns.resolver.arpa`) | Machine-wide `en0` capture; initiating process unknown. |
| `1.0.0.1:853` | **18 TCP packets** | Idle, 02:04:39 UTC; DNS-over-TLS exchange | Machine-wide `en0` capture; initiating process unknown. |
| `lo0` DNS ports 53/853 | **0 packets** | Entire capture | Machine-wide capture. |
| `example.invalid` | **1 GET + 1 CONNECT** | Prelaunch positive controls | Deliberate control, excluded from app count. |

The `en0` capture totaled **22 packets**, all during the idle interval. No app proxy record or sampled app socket matched those resolver IPs. The operator's requested zero-host pass cannot be certified from this capture because the DNS packets' process was not captured. The DNS observation was read from the capture after the 306-second idle interval, at which point the probe was stopped; it was not noticed at packet time.

## Feature coverage and idle

- Boot: backend ready; zero app proxy records.
- Settings and About: opened. About showed source commit `0d1e8a1981c78f`, local build origin, embedded runtime, and “Updates are managed outside the app”; no update check was available.
- Capabilities: opened; **57 Skills** and **24 Tools**. Providers → Accounts opened and showed Connect an account; no login was started.
- Model picker: opened on `custom: mock-model`; it offered “Run locally · free, private.”
- One chat: the mock received `D5 repeat: reply from the local mock only.` and the UI displayed its canned reply.
- One HUD goal: `/goal Verify packaged Envoy reaches only the local mock, then finish.` reached the mock. The main window displayed `Goal paused · Turn 3/20`. The mock recorded **7** completion calls total, including goal continuations.
- Idle: **2026-10-10 02:02:03–02:07:09 UTC, 306 seconds**, with no UI actions. Proxy count stayed **2 → 2** and mock completion count **7 → 7**. The resolver packets above occurred during this interval.

Limits: a refused CONNECT proves attempted proxy egress, not delivery; none occurred from the target app in this run. Proxy settings do not force every library to use the proxy. One-second `lsof` sampling can miss short-lived direct sockets. `tcpdump` was machine wide, covered only `en0`/`lo0` and ports 53/853, and cannot assign those packets to the app; it does not cover DNS over HTTPS or every interface. The second UI process was not part of the target's process-tree socket count. No full suite, CI gate, DMG installation, or other-platform run was performed.
