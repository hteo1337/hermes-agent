# Hermes Agent

Personal AI agent with a Python core shared by CLI, messaging gateway, terminal UI and desktop.

Read [AGENTS.md](AGENTS.md) first; it is the authoritative development contract.
Read the area's AGENTS.md before changing files there. This file complements that routing guide.

## Stack

Python core with OpenAI-compatible providers and pytest; TypeScript/React UI,
Ink terminal UI, Electron desktop and Docusaurus documentation.
Node dependencies are npm workspaces; root tsconfig.json is absent (configs live in workspaces).

## Commands

- Build isolated Python test dependencies: `python -m pm.build_env --source . --out .venv --group dev --group test`.
- Python tests: `scripts/run_tests.sh [tests/path/]`; see tests/AGENTS.md for isolation and retries.
- Python blocking lint/health checks: `python scripts/check`.
- Workspace checks: `npm run check`; workspace build: `npm run build --workspace ui-tui` (or web/apps/desktop).
- Workspace tests: `npm run test --workspace ui-tui` (or web/apps/desktop).

## Layout and conventions

- agent/, run_agent.py: model turn processing; gateway/: platform adapters and sessions.
- tui_gateway/, ui-tui/: Python RPC backend and Ink frontend; apps/desktop/: Electron client.
- hermes_cli/, tools/, plugins/, skills/: CLI and capability extensions.
- pm/, hermes_platform/: managed environments and host abstraction.
- tests/, tests-js/: Python and JavaScript tests; website/: documentation.
- Follow AGENTS.md for facade/sibling boundaries, profile scopes, caching and dependency policy.
- Keep commits conventional and changes narrowly scoped.

## CI

GitHub Actions uses scripts/run_tests.sh for Python suites and scripts/check for blocking checks.
UI lanes build/check relevant npm workspaces. Inspect .github/workflows/ for lane-specific setup.
