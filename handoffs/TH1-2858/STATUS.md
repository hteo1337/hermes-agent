<!-- continuity-seed: 0711687d0edc18ff0fdd1bbb5b681558e03834aa94405ac0e108e1708892f12d -->
# TH1-2858
- Issue [TH1-2858](https://linear.app/th1337/issue/TH1-2858) in paseo-ops. Repository `hteo1337/hermes-agent`, branch `dispatch/TH1-2858`, [draft PR #5](https://github.com/hteo1337/hermes-agent/pull/5).
- Done. `gpt-6.2-sol` confirmed APPROVE for `af4cef507860853a1eb4c13ca44d55d447dd73f0`. Fix `b5bd5d44218` accepts the third diagnostic argument and checks the event-loop thread ID.
- Verification. With a disposable HOME, Python 3.14.9 and one worker, the Telegram deadline file passed 3 tests in 5.6s and the 23-file PR suite passed 255, failed 0 and skipped 12 in 132.7s. Both exited 0.
- Posted commands and verdict on [GitHub](https://github.com/hteo1337/hermes-agent/pull/5#issuecomment-7190917994) and [Linear](https://linear.app/th1337/issue/TH1-2858#comment-d387381e-44d6-4072-8ce7-62c219f5d778). Handoff updated locally to preserve the reviewed PR head.
- Next. Clear the existing handoff files from the PR diff and confirm the resulting head and green CI before Teo merges.
- Open questions. CI remained queued or pending. Desktop readiness under load at `tui_gateway/ws.py:669` remains non-blocking.

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

## New launch

Task: TH1-2858 confirm BLOCKING fix on PR #5
Issue: https://linear.app/th1337/issue/TH1-2858/hermes-m5m4-move-to-upstream-v0234-and-re-carry-local-commits
Branch: dispatch/TH1-2858
Adopted branch: yes
Acceptance: Brief confirming review only. Do not push code.

The earlier Sol review of https://github.com/hteo1337/hermes-agent/pull/5 (head f3bb3191) had one BLOCKING finding: the mock at tests/gateway/test_telegram_init_deadline.py:88 took two arguments, but agent/deadline.py:299 passes three. Commit b5bd5d44218 (head af4cef50786) fixes it.

Confirm the BLOCKING finding is resolved and that the fix introduces no regression. Run tests/gateway/test_telegram_init_deadline.py and the PR verification suite once on head af4cef50786.

Post a short PR comment and a TH1-2858 comment with the verdict (APPROVE or BLOCKING), the commands with exact results, and the actual model used. The non-blocking ws.py:669 item stays non-blocking. Teo owns the merge.
Launch: branch=dispatch/TH1-2858, repo_path=/Users/hteo/.hermes/hermes-agent, run_id=90fc7316025b4cdbbda7262eabf65584, task_id=714dd0e26c754ed4805cc2962d57fda6, workspace_id=wks_3006914af5933bf6
Continuity launch ID: 714dd0e26c754ed4805cc2962d57fda6:90fc7316025b4cdbbda7262eabf65584

Continuity stop ID: a5d82b17aa4f4fdf947ec4fe551534b2:2ac9c251af5a4013859e9718b9aa640a:e7b90791-555a-4d37-be01-9468d3db6650

Continuity stop ID: 714dd0e26c754ed4805cc2962d57fda6:90fc7316025b4cdbbda7262eabf65584:0ad0fdeb-7d0d-402f-a5ee-40c8e0050bd2
