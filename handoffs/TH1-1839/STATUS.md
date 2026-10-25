TH1-1839 — investigate refusal-stamp differential for Hermes PR #2; Agent Fleet, In Review.
Issue: https://linear.app/th1337/issue/TH1-1839 ; PR https://github.com/hteo1337/hermes-agent/pull/2 ; no merge/install/live gateway access.
Source verified: c1f9fcc309 vs upstream 4dcef215cf; actual PR branch th1-1839-gateway-executor-starvation (requested dispatch/TH1-1839 does not exist).
Done: inspected paired-baseline artifacts (base11/head12), created fresh Paseo base/head worktrees and isolated PM dev/test/messaging venv; unchanged PM/lock/test/status source verified.
Verification: 20 unchanged runs/tree, alternating order, retries0, -j1: base20/20 pass, head19/20 pass (round4 exit1, identical line486 assertion); exact logs and exits in repeat-results.json.
Next: complete fixed extension to40 unchanged runs/tree (first20 base20/head19); successful traces show0 observed-executor submissions and29.9us observer before refusal; product fix only with demonstrated PR causality; final suites exactly once -j6 and compare baseline11.
Delivery: strip handoffs from PR source, keep evidence on review/TH1-1839-regression-9f8ecdef; one regression comment; clean created worktrees/environment.
Open: causality unresolved; no pass rate or final-suite claim yet. Prior normal/adversarial Sol reviews already completed; no duplicate full-review lanes.
decided: use existing actual PR branch and separate review evidence branch — preserve one PR and respect handoff-free source requirement; task prefix names checklist because PASEO_AGENT_ID unset.
