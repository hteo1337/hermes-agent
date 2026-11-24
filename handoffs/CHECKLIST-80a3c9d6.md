# TH1-2642 review repair (PASEO_AGENT_ID unset)
- [x] Match the branch, brief, handoff, and blocking review to the authorized head.
- [x] Verify the durable close fix against a stale snapshot control.
- [x] Verify the index build stays off the listener path for launch and secondary stores.
- [x] Verify a lost mint reply cannot cause a second submission.
- [x] Verify the retry floor, SQLite-only sweep, and retirement following cleanup failure.
- [x] Run both named focused suites once in socket-capable isolation.
- [x] Commit and push fixes and issue handoff, and verify the existing draft head and CI state.
