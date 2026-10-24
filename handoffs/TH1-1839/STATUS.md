# TH1-1839 — gateway executor starvation
- Issue: https://linear.app/th1337/issue/TH1-1839 (Agent Fleet); branch th1-1839-gateway-executor-starvation; PR https://github.com/hteo1337/hermes-agent/pull/2 (draft, worker never merges).
- Done: merged upstream 4dcef215cf per newer Linear instruction; pinned PR base base/th1-1839-upstream-4dcef215cf. Source blocker resolved; implementation cf1d443774 plus kwargs repair pending commit.
- Done: bounded control(4)/RPC(8)/MCP(4)/compression(4)/summary(2), context propagation, runner shutdown drain, default queue/activity logging; live install/service untouched.
- Verification: new 22-worker regression fails on unchanged source (5s) and passes on fix; full suites once: 11488 passed / 2252 failed / 342 skipped, 129 no-test files; guard failure reproduces unchanged upstream. Details verification.txt.
- Verification: own kwargs bug fixed; affected WS files 20 passed. Real gateway, 32 occupied workers: mint 1.03ms / ready 172.03ms / ping 9.96ms, legacy fallback and invalid-binding controls pass; queue warning 1.353s; exit 0.
- Next: final checker, push repair/evidence, single latest Sol review under this issue; Jev/semif evaluates actual diff, then required adversarial review; ready PR only after blocking findings fixed.
- Open: local suite limited by live-install git-metadata guard and missing optional deps; remaining unrelated failures not fully classified. CI queued, not green. Do not bypass guards or repeat full suite under test cap.
- decided: preserve failed evidence, baseline only a failing case, continue independent delivery; second-loop/cron provenance remains outside required fix.
