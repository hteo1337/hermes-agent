# D5 packaged Envoy egress probe — 2026-10-10

**Result: finding.** The signed packaged app attempted outbound connections to six upstream hosts. The local proxy refused all 43 app-originated CONNECT requests with HTTP 502, so this run establishes attempted egress, not completed upstream delivery. It does **not** establish the requested no-upstream-host claim. No application code was changed.

## Artifact and setup

- Tested `/Users/hteo/.paseo/worktrees/1so5obpm/envoy-final/apps/desktop/release/mac-arm64/Envoy Agent.app`, not a rebuilt app. `codesign -dv --verbose=2` reported Developer ID Application signature, identifier `app.envoy.envoy-bundled`, team `6B77N69ATU`. A separate strict deep verification was attempted but did not complete; signature metadata is the signed-app evidence here.
- Fresh isolated root: `/private/tmp/envoy-egress-probe-xskqtG`; `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and `HERMES_DESKTOP_USER_DATA_DIR` were set under it. The app process had `HERMES_DESKTOP_IGNORE_EXISTING=1`, upper/lowercase `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY` pointing to `127.0.0.1:64173`, `NO_PROXY=localhost,127.0.0.1,::1`, and Chromium `--proxy-server=http://127.0.0.1:64173`. The provider config pointed to an isolated OpenAI-compatible mock at `127.0.0.1:56021`.
- A localhost `ThreadingHTTPServer` recorded timestamp, CONNECT/HTTP method, host:port, and request line in [`egress-proxy.jsonl`](egress-proxy.jsonl). It answered every request with 502 and had no forwarding implementation. The mock was the only intended local destination. Controls: `curl` via the proxy to `http://example.invalid/positive-control` returned 502 and logged a GET; HTTPS to `example.invalid` logged a CONNECT and returned 502. A GET to the mock with `NO_PROXY=127.0.0.1` returned 200 while proxy log count stayed 47 before/after. Four control records are excluded from the host table.
- App PID 90465 launched a bundled Python backend PID 91028. The isolated desktop log recorded `Using bundled payload`, `HERMES_BACKEND_READY port=56043`, and `Hermes backend is ready`. The UI showed `Backend ready` and the mock model. The mock recorded seven inference prompts, including one chat and the HUD goal's automatic continuations.

## Hosts attempted by the app

| Host:port | CONNECT count | Observed phase / feature attribution |
|---|---:|---|
| `api.individual.githubcopilot.com:443` | 16 | First during boot/provider discovery; retries while Settings/About and Capabilities/Providers were open. The exact retry trigger is not separable from background provider probing. |
| `api.githubcopilot.com:443` | 8 | Same boot/provider-discovery and later retry phases. |
| `api.github.com:443` | 8 | Same boot/provider-discovery and later retry phases. **Finding: GitHub host.** |
| `telemetry.individual.githubcopilot.com:443` | 8 | Same boot/provider-discovery and later retry phases. **Finding: telemetry host.** |
| `fonts.googleapis.com:443` | 2 | One at boot; one around the model-picker/HUD transition. |
| `models.dev:443` | 1 | Boot/model-catalog discovery. |
| **Total** | **43** | Six distinct upstream hosts; all refused locally. |

The 43 requests divide by observation window into 12 before backend-ready UI inspection, 10 while Settings/About was open, 20 while Capabilities/Providers was open, and one around the model-picker/HUD transition. These are temporal associations; no per-request call stack was captured. The specifically named `nousresearch`, `nous`, `hermes-agent`, `raw.githubusercontent`, `huggingface`, `sentry`, and `posthog` hosts had zero proxy records. GitHub-related hosts did have records. There were no non-CONNECT app requests in the proxy log.

## Feature coverage and idle

- Boot and backend ready: observed in bundled desktop log and UI.
- Settings and About: opened. About → Version & updates displayed **“Updates are managed outside the app”** and exposed no check-for-updates action in this build, so a manual update request could not be initiated from About.
- Skills Hub/Capabilities: opened; the UI displayed 57 Skills and 24 Tools, including available-to-install entries. Providers → Accounts and the model picker were opened. The model picker displayed the local free-model offer (“Run locally · free, private”). No Portal/free-tier remote action was present to invoke with the shipped disabled Portal configuration; no login was started.
- Chat: sent one D5 prompt, saw the mock reply. HUD: sent `/goal Verify packaged Envoy reaches only the local mock, then finish.`; mock continuations appeared and the main window showed `Goal paused · Turn 3/20`.
- Idle: from 2026-10-10 01:07:34 UTC to 01:12:45 UTC, **311.3 seconds**, with the goal paused and no UI actions. Zero new proxy requests and zero new mock prompts occurred during that interval.

## Direct-traffic and DNS checks

A once-per-second process-tree sampler ran `lsof -nP -a -p <pid> -i` for the app and descendants. It captured **3,162 socket rows** across app PID 90465, helper PID 90555, and bundled backend PID 91028; all observed addresses were loopback or wildcard, with **zero sampled non-loopback sockets**. `sudo tcpdump` on `en0` and `lo0` with `port 53 or port 853` captured **zero packets** on each interface and reported zero kernel drops. The app, backend, proxy, mock, sampler, and both capture processes were stopped after the idle interval; PID 90465 and backend PID 91028 were absent afterward, and nothing listened on proxy port 64173.

Limits: a 502 CONNECT proves an attempted host contact through the local proxy, not a successful remote TLS connection. `lsof` sampling can miss short-lived direct sockets and cannot attribute a proxy record to a particular child PID. DNS capture covered `en0`/`lo0` and ports 53/853, not every interface or DNS over HTTPS; it is therefore supporting evidence, not a complete DNS proof. The About update action and remote Portal action were unavailable in this packaged configuration. No full suite, CI gate, or independent review was run for this read-only runtime probe.
