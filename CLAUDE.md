# Hermes Agent

Personal AI agent with a Python CLI and messaging gateway, an Ink terminal UI,
and a React web dashboard.

Read [AGENTS.md](AGENTS.md) before implementation; it owns architecture,
profile isolation, prompt caching, testing and contribution conventions.

## Stack

- Python 3.11+, asyncio, provider SDKs, FastAPI and pytest.
- TypeScript, React 19, Ink 6, nanostores; Vite and Tailwind for `web/`.
- Node 20+; root npm dependencies provide browser automation.
- TypeScript settings are local to each frontend; no root `tsconfig.json`.

## Commands

- Python tests: `scripts/run_tests.sh tests/gateway/ tests/tui_gateway/`.
  See AGENTS.md for environment setup and isolation requirements.
- TUI: `cd ui-tui`; `npm run build`, `npm run type-check`,
  `npm run lint`, `npm test`; format with `npm run fmt`.
- Dashboard: `cd web`; `npm run build`, `npm run lint`, `npm run dev`.
- Documentation: `cd website`; `npm run lint:diagrams`, `npm run build`.
- Root `package.json` has no build, lint or test script on this revision.

## Layout

- `run_agent.py`, `agent/`: conversation engine and model integrations.
- `cli.py`, `hermes_cli/`: interactive CLI, configuration and dashboard server.
- `gateway/`: messaging runner, sessions and platform adapters.
- `tui_gateway/`, `ui-tui/`: Python JSON-RPC backend and Ink frontend.
- `web/`: React dashboard; `website/`: Docusaurus documentation.
- `tools/`, `plugins/`, `skills/`: capabilities and extensions.
- `tests/`, `scripts/`: verification and maintenance commands.

## Working conventions

Keep agent behavior in Python and renderer state in the frontend. Follow
AGENTS.md for profile-aware paths and extension boundaries. Preserve the
per-conversation cached prompt; consult its cache rules before changing context.

## CI

`.github/workflows/tests.yml` runs Python 3.11 pytest and a separate E2E job.
`docs-site-checks.yml` builds the documentation and checks diagrams. Other
workflows cover Nix, supply-chain auditing, containers and site publishing.
Use the repository test wrapper locally even where CI invokes pytest directly.
