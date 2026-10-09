# Envoy fork development notes

This private MIT fork adapts the Hermes Python agent and Electron desktop into Envoy.

Read [AGENTS.md](AGENTS.md) and each area-specific `AGENTS.md` before editing; they define the working rules and architecture.

## Stack and commands

- Python backend and CLI: `pyproject.toml`, project-managed environments, pytest, and Ruff.
- Desktop and web: Node workspaces, TypeScript, Electron, React, Ink, and Docusaurus. The root `package.json` declares workspaces; TypeScript settings live in workspace `tsconfig.json` files (there is no root `tsconfig.json`).
- Python tests: `scripts/run_tests.sh <test-files> -q` with an isolated `HERMES_HOME` and `HERMES_RUNTIME_DIR`.
- Python checks: `python scripts/check`; format and lint through the project-managed Ruff configuration.
- JS checks: `npm run check` or `npm run check --workspace <name>`; workspace builds use `npm run build --workspace <name>` where defined.

## Layout and conventions

- `agent/`, `gateway/`, `hermes_cli/`, `tools/`, and `plugins/` hold the Python runtime and capabilities.
- `apps/desktop/`, `ui-tui/`, `web/`, and `website/` hold the Electron, terminal, dashboard, and docs clients.
- `tests/` and `tests-js/` mirror the Python and JS/TS surfaces; `scripts/` contains checks and test runners.
- `plugin-catalog/` contains bundled plugin metadata; `pm/` and `hermes_platform/` own environments and host integration.
- Keep facade modules thin and add topic-specific behavior to siblings. Preserve prompt caching and keep optional capabilities at the edges, as described in `AGENTS.md`.

## CI

- `.github/workflows/tests.yml` runs Python files through `scripts/run_tests.sh` in isolated processes.
- `.github/workflows/js-tests.yml` runs workspace checks through `.github/scripts/run-workspace-checks.mjs`.
- Other workflows cover docs, packaging, installation, and releases. Local checks do not establish a CI result.
