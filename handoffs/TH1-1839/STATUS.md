TH1-1839 — investigate refusal-stamp differential for Hermes PR #2; Agent Fleet, In Review.
Issue: https://linear.app/th1337/issue/TH1-1839 ; PR https://github.com/hteo1337/hermes-agent/pull/2 ; no merge/install/live gateway access.
Source verified: c1f9fcc309 vs upstream 4dcef215cf; actual PR branch th1-1839-gateway-executor-starvation (requested dispatch/TH1-1839 does not exist).
Done: inspected paired-baseline artifacts (base11/head12), created fresh Paseo base/head worktrees and isolated PM dev/test/messaging venv; unchanged PM/lock/test/status source verified.
Verification in progress: alternating 20 unchanged target runs per tree, retries0, -j1; exact invocations/exits/logs in repeat-results.json and repeat-*.log.
Next: finish paired repetitions; observe refusal writer/wait/hard-exit ordering; product fix only with demonstrated PR causality; final suites exactly once -j6 and compare baseline11.
Delivery: strip handoffs from PR source, keep evidence on review/TH1-1839-regression-9f8ecdef; one regression comment; clean created worktrees/environment.
Open: causality unresolved; no pass rate or final-suite claim yet. Prior normal/adversarial Sol reviews already completed; no duplicate full-review lanes.
decided: use existing actual PR branch and separate review evidence branch — preserve one PR and respect handoff-free source requirement; task prefix names checklist because PASEO_AGENT_ID unset.
