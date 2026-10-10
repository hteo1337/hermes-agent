# Envoy integration fixes

`PASEO_AGENT_ID` was unset in this session; `noagent` is the checklist suffix.

- [x] Baseline focused desktop tests recorded on the unmodified application tree with isolated runtime directories: 4 files, 32 tests passed.
- [x] Overlay IPC accepts control messages only from its live overlay webContents; focused sender test passed.
- [x] Overlay renderer load/crash recovery restores and shows chat; morph recovery test passed.
- [x] Local pet manifest reads use a pinned `O_NOFOLLOW` descriptor and preserve valid manifest behavior; swap and valid atlas tests passed.
- [x] A backend `{ resolved: 0 }` leaves the chip queued and reports failure; focused store tests passed.
- [x] Direct installers require an explicit repository source or use a bundled source, with no NousResearch default; direct shell and dot-sourced PowerShell probes rejected an absent source.
- [x] Typecheck, touched-file ESLint, focused tests, brand audit, and egress audit have recorded results: typecheck exit 0; ESLint 0 errors/0 warnings; 7 files/80 tests; brand audit 2,128 hits/710 files; egress audit 10 hits/5 files; all commands exit 0.
- [x] Changes are committed on `envoy/integration-fixes` in `c2e09dd4f1`, `16af277e80`, and `216a898c68`; `handoffs/STATUS.md` records the hashes, counts, unrun checks, and residual directory race.
