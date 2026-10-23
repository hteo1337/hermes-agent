# TH1-1839 acceptance checklist

PASEO_AGENT_ID is unset; identifier comes from dispatcher issue_status agent 346df7f1-79a8-4921-9953-9552e5d33c0f.

- [x] Read Linear, handoff and repository contracts; verify branch against freshly fetched fork/main.
- [x] Create the required concise CLAUDE.md from this base's actual configuration (47 lines; inspected and diff-check clean).
- [ ] Isolate control/socket and WebSocket dispatch, compression, discovery and summaries in bounded named executors with shutdown and queue-wait warnings.
- [ ] Prove one saturation regression fails on fork/main and passes on the implementation.
- [ ] Run existing gateway and tui_gateway suites once and record exact counts.
- [ ] Prove isolated live ticket mint under saturation on both base and implementation.
- [x] Push issue-scoped handoff and one PR to hteo1337/hermes-agent; link issue and record blockers (draft PR #2 inspected; Linear updated).
- [ ] Complete required exact-head Sol review and adversarial review before PR-ready; do not merge.

Blocked at base validation: fork/main b6322901664 has no gateway control socket, desktop ticket mint, profile reconcile or session mutation compression modules. See TH1-1839/BLOCKED.md. Acceptance boxes remain unchecked until evidence exists.
