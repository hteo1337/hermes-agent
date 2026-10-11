# Plan: full rebrand and decoupling from upstream servers

Scope: the Envoy fork (`apps/desktop` plus the Python backend in this monorepo).
Goal: a build that contacts no Nous Research host, repository or update channel
unless the user configures one. Branding follows [PLAN-REBRAND.md](PLAN-REBRAND.md);
this plan covers what that one left out: network egress and update channels.

## Assumptions (recorded, change if wrong)
- Private use. No public distribution, so no trademark clearance is needed yet.
- MIT stays satisfied: `LICENSE` and `NOTICE.md` keep the Nous Research copyright.
- Nous stays selectable as one inference provider, never the default and never
  signed in automatically. Removing it is a separate, later decision.
- The user's installed Hermes (`~/.hermes`, its checkout and CLI) is never touched.
  Every run and test uses an isolated `HERMES_HOME`.
- Protocol names stay: `HERMES_HOME`, `hermes_cli`, RPC method names.

## Inventory (measured 2026-10-09, non-test, non-locale)
| Area | Where | Contact |
| --- | --- | --- |
| Portal login, billing, agents, terms, privacy, help | `src/app/settings/billing/*`, `gateway-settings.tsx`, `shell/terms-butterbar.tsx`, `send-diagnostics-dialog.tsx`, `boot-failure-overlay.tsx`, `pet-generate/*`, `electron/portal-session.ts`, `electron/backend-health.ts` | `portal.nousresearch.com` |
| Skills hub iframe and docs | `electron/hub-iframe-policy.ts`, `src/plugins/hermes-bots/skills-hub.tsx`, `capabilities/skills/embedded-hub-picker.tsx`, `src/lib/plugin-catalog.ts` | `hermes-agent.nousresearch.com`, `nousresearch.github.io` |
| Installer bootstrap | `electron/bootstrap-runner.ts` | `raw.githubusercontent.com/NousResearch/hermes-agent` |
| Shared metrics, docs links | `src/store/shared-metrics.ts`, `components/update-status.tsx`, `chat/sidebar/section-states.tsx`, i18n `install.sh` hint | `hermes-agent.nousresearch.com` |
| Desktop update channel | `electron/updater/*`, `electron/app-updater.ts`, `electron-builder.config.cjs` | GitHub `NousResearch/hermes-agent` releases, `hermes-assets.nousresearch.com`, R2 feed |
| Backend self-update | `hermes_cli/update_cmd_git.py` (`OFFICIAL_REPO_URL`, upstream remote) | GitHub `NousResearch/hermes-agent` |
| Backend skills and plugins | `tools/skills_hub_official.py`, `tools/skills_hub_search.py`, `plugin-catalog/*.yaml` | GitHub org repos, `skills-index.json` |
| Backend services | `tools/managed_tool_gateway.py`, `hermes_cli/models_pricing.py`, `hermes_cli/anon_auth.py` | `*.nousresearch.com`, `inference-api`, `welcome-api` |
| Outbound identity | `agent/anthropic_adapter.py`, `tools/discord_tool.py`, `gateway/relay/media.py` | Referer, X-Title, User-Agent strings naming Hermes |

Kept on purpose: `huggingface.co/settings/tokens` (third-party provider help link).

## Design
One source of truth: an `endpoints` block in `apps/desktop/brand.json`, mirrored
by `hermes_cli/endpoints.py` (reads the same file or env overrides). Every key
defaults to empty. An empty endpoint hides the feature, it never falls back to
an upstream URL. A grep-based egress audit gates this, as `brand-audit` does for
text.

## Phases
Each phase ends with its gate. Run the gate, quote the real output.

### D0. Egress audit (guard first)
- `scripts/egress-audit.mjs` counts upstream hosts and repos in code, with a
  baseline file and a ratchet, excluding tests and locales.
- Gate: `node scripts/egress-audit.mjs --check` passes at today's baseline and
  fails when a new upstream host is added.

### D1. Desktop features behind empty endpoints
- Add `endpoints` to `brand.json` and a typed `endpoints.ts` for renderer and
  main. Move every host in the inventory behind it.
- Portal login, billing, agents, terms butterbar, diagnostics help link, boot
  failure link and pet generation: hidden when `portal` is empty.
- Skills hub iframe and docs links: hidden when `hubUrl` or `docsUrl` is empty.
  `hub-iframe-policy.ts` allowlists only configured origins.
- `shared-metrics.ts`: already off with `telemetry: false`; delete the relay doc link.
- Bootstrap: `bootstrap-runner.ts` reads scripts from the bundled payload, not
  from `raw.githubusercontent.com`.
- Gate: typecheck, eslint, existing tests that touch these files, and the
  updated assertions for hidden states. Screenshot of Settings with no portal.

### D2. Own update channel, or none
- Default is no feed: no check runs, no `ENOENT app-update.yml` in the log, and
  the update UI reads "Updates are managed outside the app".
- With a configured generic feed (`updateFeedUrl`), `electron-updater` works as
  before. `channel-strategy.ts` and `checkout-source.ts` stop reading
  `NousResearch/hermes-agent` and `hermes-assets.nousresearch.com`; the
  repository comes from `updateRepository`.
- Release provenance (tag, channel, stamp) stays but takes the repository from
  brand. Unsigned local builds stay allowed.
- Gate: unit tests for "no feed" and "generic feed"; packaged app log has no
  updater error on boot.

### D3. Backend decoupling (separate lane, Python)
- `update_cmd_git.py`: `OFFICIAL_REPO_URL` and the upstream remote hint come
  from `endpoints.py`. Empty means `update` reports "no update source".
- `skills_hub_official.py`, `skills_hub_search.py`: official repo and index URL
  from `endpoints.py`; empty disables remote hub search, local skills still load.
- `managed_tool_gateway.py`, `anon_auth.py`, `models_pricing.py`: no default
  domain; Nous inference stays a provider the user adds by hand.
- Outbound identity: Referer, X-Title and User-Agent use the brand name and no
  upstream URL.
- `plugin-catalog/`: ship empty by default; keep the YAML schema and loader.
- Gate: pytest on the touched modules only, then a packaged run with an isolated
  `HERMES_HOME`. Keep the existing 13 failing desktop test files out of scope.

### D4. Rebrand remainder
- Strings the audit still counts: theme label "Classic Hermes", About
  checkout path, Windows HUD helper label, backend prompt text
  (`agent/prompt_builder.py`), README and CONTRIBUTING, `website/` and `docs/`.
- Optional and last: identifier rename (`hermesDesktop` and similar, about 1200
  sites). Only after D1 to D3 are merged; it is invisible to users.
- Gate: `brand-audit --check`, and one visual pass in dark and light.

### D5. Egress proof
- Run the packaged bundled app and the backend for 10 minutes through a local
  logging proxy (`HTTPS_PROXY` for Python, `--proxy-server` for Electron) with an
  isolated `HERMES_HOME`, doing: boot, onboarding, open Settings, HUD, one goal.
- Gate: the proxy log lists no `*.nousresearch.com`, no `NousResearch` GitHub
  path, no `r2.dev`, no `raw.githubusercontent.com`. Anything listed is a bug.

## Risks
- Tests assert upstream strings: update them with the code, never weaken them.
- Merging upstream gets harder with each phase: pin to a tag and stop merging.
- A hidden feature can strand a flow (for example pet generation needs the
  portal): each hidden state needs an explicit message, not a blank panel.
- Nous provider keeps working only if the user adds the endpoint by hand.

## Order and ownership
D0, D1 and D2 run in the desktop lane. D3 runs in the backend lane. D4 follows
both. D5 closes the work. Review the D2 and D3 diffs with Sol (update channel and
network defaults are risky); D1 and D4 need no review.
