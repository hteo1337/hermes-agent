# Envoy fork development notes

Envoy is a private Hermes Agent fork with a local Python agent backend and an Electron desktop client.

Read [AGENTS.md](AGENTS.md) and each area's AGENTS.md before changing code; they hold the behavioral and test contracts.

- Languages: Python and TypeScript. Desktop uses Electron, React, Vite, Vitest, nanostores, and a JSON-RPC backend; the repository is an npm workspace.
- TypeScript target: ES2023 with strict checking in `apps/desktop/tsconfig.json`; Electron and E2E have separate configs.
- Install: `npm ci` at the root; Python environment via `source ./activate` or the project PM instructions.
- Desktop typecheck: `cd apps/desktop && npm run typecheck` (renderer, Electron, E2E, builder config).
- Desktop build: `cd apps/desktop && npm run build`; package locally with `npm run builder -- --dir --publish never`.
- Focused desktop tests: `cd apps/desktop && npx vitest run --maxWorkers=2 <files>`; full desktop checks are `npm run check`.
- Python tests: `scripts/run_tests.sh <files>`; blocking lint checks: `python scripts/check`.
- Desktop lint and format: `cd apps/desktop && npm run lint` and `npm run fmt` (ESLint and Prettier).
- Envoy audits: `cd apps/desktop && node scripts/egress-audit.mjs --check` and `node scripts/brand-audit.mjs --check`.

Layout: `agent/`, `hermes_cli/`, `gateway/`, `tui_gateway/`, `tools/`, `plugins/`, and `pm/` hold Python services and extensions; `apps/desktop/` is Electron and React; `apps/shared/` holds shared transport; `tests/` and desktop `*.test.ts(x)` hold tests; `scripts/` and `.github/workflows/` hold checks and CI.

Keep profile scope explicit in backend code, preserve the desktop's `hermes serve` JSON-RPC contract, and extend capability at the edges. Isolate `HERMES_HOME`, `HERMES_RUNTIME_DIR`, and desktop user data in tests. CI installs locked npm dependencies and runs workspace JS checks, Python lint, and separate desktop build/E2E jobs; local output is not a CI result.
