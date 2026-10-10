# D5 egress probe checklist

- [x] Inspect signed packaged app, isolated launch recipe, and clean branch state.
- [x] Start local mock and CONNECT-aware logging proxy; verify positive and negative proxy controls.
- [x] Launch packaged app in isolated state with proxy settings and capture process-tree network/DNS activity.
- [x] Exercise boot, Settings, About, Skills/Capabilities, update, free-tier/portal, chat, HUD goal, and five minutes idle with observations.
- [x] Stop app and proxy; summarize every observed host, counts, feature attribution, and limits in `handoffs/EGRESS-PROBE.md`.
- [x] Inspect report/diff and commit it on `envoy/egress-probe` without pushing.
