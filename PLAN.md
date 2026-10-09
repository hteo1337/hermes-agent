# Envoy local branch integration

Scope: combine the three named local branches on `envoy/integration` based on `envoy/main`. No remote operations or full suite.

Assumptions: the existing integration branch at the same commit as main is the requested branch. Preserve both desktop endpoint gating and pet morph state guards during conflicts. Keep all tests from each branch.

Architecture: merge each branch in the specified order; resolve shared Electron main/window code around existing interfaces. Avoid changes outside conflicts or proven integration defects.

Work: (1) inspect heads and merge desktop, (2) merge backend D3b, (3) merge pet morph, (4) run focused gates, (5) inspect diff and commit/report.

Acceptance: three branch heads represented in local merge history; no unresolved conflicts; the named tests, typecheck, brand and egress audits have recorded real output; handoff names decisions and unverified work.

Risk: host load can time out tests; classify any failure using the branch baseline before calling it a regression.

Verification: `npm run typecheck`; `node scripts/egress-audit.mjs --check`; `node scripts/brand-audit.mjs --check`; focused `npx vitest run --maxWorkers=2 ...`; focused Python `scripts/run_tests.sh -j 2 ...` for backend decoupling.
