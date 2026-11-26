<!-- continuity-seed: 0711687d0edc18ff0fdd1bbb5b681558e03834aa94405ac0e108e1708892f12d -->
# TH1-2858
- Issue https://linear.app/th1337/issue/TH1-2858/hermes-m5m4-move-to-upstream-v0234-and-re-carry-local-commits
- Repository `hteo1337/hermes-agent`, branch `dispatch/TH1-2858`, base `base/v0.23.4` at `8fc0374447313e276f6b9a2764bfc750190c966a`.
- Done. Fixed the Sol blocker from `f3bb3191ba7` in test commit `b5bd5d442187effdb31af0f61e7654af81082a74`. The test captures the loop thread ID and checks the diagnostic callback received it. [Draft PR #5](https://github.com/hteo1337/hermes-agent/pull/5) retains `lane:security`.
- Verification. On the test commit, the focused watchdog test passed (1 passed, 0 failed in 4.0s, exit 0). Ruff passed and code health reported 0 blocking and 0 advisory findings.
- Suite. One run of the existing 23-file selection returned 245 passed, 10 failed, 12 skipped in 116.6s (exit 1). The invocation inherited the account HOME. All ten failures trace to the home I/O guard blocking the update-marker probe in the worktree's Git directory. The PR body records the commands and results.
- Next. A passing suite on the corrected head still needs an isolated HOME and a separately authorized run. The original Sol reviewer was archived during takeover, so confirmation is outstanding. Keep the PR draft. Clear the handoffs from the diff before final-head review and merge. Teo owns merge.
- Open questions. Desktop readiness under load remains the separate non-blocking finding. GitHub CI and live gateway behavior are unverified.

## Dispatch history

Continuity stop ID: 07e8ab965a75400bb38cb00bdb7bb8da:799a0a86809a43d09f5573def8c46d10:2beba01a-5385-4055-a645-495c684b8710

## New launch

Task: TH1-2858 review: PR #5 Hermes port onto v0.23.4
Issue: https://linear.app/th1337/issue/TH1-2858/hermes-m5m4-move-to-upstream-v0234-and-re-carry-local-commits
Branch: dispatch/TH1-2858
Adopted branch: yes
Acceptance: Review-only. Do not push code to dispatch/TH1-2858. Work in a separate reviewer worktree. Target: https://github.com/hteo1337/hermes-agent/pull/5 at head f3bb3191ba7f41e468b42e6bbeb738eeb93040d2, based on base/v0.23.4 (8fc03744).

Do a PR-ready review plus an adversarial review of the four carry commits against upstream v0.23.4. Check for:
- regressions in gateway connectivity, including the loop watchdog and Desktop client connect;
- hunks dropped or superseded incorrectly;
- auth and credential handling;
- concurrency;
- fail-open paths.

Run the existing test suite once on the PR head. Write review.txt with the verdict (APPROVE or BLOCKING), each finding marked BLOCKING or non-blocking with file:line, the commands you ran with exact results, and the actual model used. Post the verdict as a PR comment and as a TH1-2858 comment. Teo owns the merge, so do not merge.
Launch: branch=dispatch/TH1-2858, repo_path=/Users/hteo/.hermes/hermes-agent, run_id=2ac9c251af5a4013859e9718b9aa640a, task_id=a5d82b17aa4f4fdf947ec4fe551534b2, workspace_id=wks_3006914af5933bf6
Continuity launch ID: a5d82b17aa4f4fdf947ec4fe551534b2:2ac9c251af5a4013859e9718b9aa640a

## New launch

Task: TH1-2858 fix BLOCKING review finding on PR #5
Issue: https://linear.app/th1337/issue/TH1-2858/hermes-m5m4-move-to-upstream-v0234-and-re-carry-local-commits
Branch: dispatch/TH1-2858
Adopted branch: yes
Acceptance: Fix exactly one BLOCKING finding from the Sol review of https://github.com/hteo1337/hermes-agent/pull/5 (head f3bb3191) on branch dispatch/TH1-2858.

Finding: tests/gateway/test_telegram_init_deadline.py:88 still installs a two-argument diagnostic mock, but the watchdog now passes a third argument (the loop thread ID) at agent/deadline.py:299. The timer raises TypeError and the recorded-dump assertion fails. Update the mock to accept the third argument, capture the loop thread ID in the test, and assert its value.

Do not change product code unless the test proves product code is wrong. Leave the non-blocking finding (tui_gateway/ws.py:669 readiness under load) out of this change.

Run the failing test, then the existing PR verification suite once. Push to dispatch/TH1-2858. Update the PR body with the commands and their exact results, and update handoffs/TH1-2858/STATUS.md. Keep the PR draft. Teo owns the merge.
Launch: branch=dispatch/TH1-2858, repo_path=/Users/hteo/.hermes/hermes-agent, run_id=d19c55e8dfc04e22969a3170eab3ad14, task_id=397f42362ddf4e85a781db37497182c5, workspace_id=wks_3006914af5933bf6
Continuity launch ID: 397f42362ddf4e85a781db37497182c5:d19c55e8dfc04e22969a3170eab3ad14
