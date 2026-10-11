# Pet morph — second Sol review fix round — DONE

Commit `e452a95df3` on `envoy/pet-morph` (local only, no push, no merge).
Fixes all 5 findings from Sol's review of `08b0aa8108` (review worktree
`/Users/hteo/.paseo/worktrees/1so5obpm/review-pet-morph-fix-1/handoffs/STATUS.md`).

## Fixes

1. **Strand on throw:** `morphMainWindowToPet`/`morphPetToMainWindow` in
   main.ts wrapped in try/catch(/finally for toChat) — a setBounds/show/
   animation throw now always restores minimum size, clears
   `savedChatBounds`, closes the overlay.
2. **Maximize bypassing no-persist guard:** `window-growth.ts` adds
   `markPetSized`/`clearPetSized`/`isPetSized` (`WeakSet`, doesn't drop on
   `isMaximized()` unlike `isAppSized`'s `WeakMap` compare). main.ts's
   `persistWindowState` checks `isPetSized(mainWindow)` first.
3. **Chat bounds memory-only:** `morphMainWindowToPet` calls the undebounced
   `persistWindowState()` synchronously right after capturing
   `savedChatBounds`, before any shrink.
4. **IPC accepts bad dims:** `pet-overlay-ipc.ts` adds `isValidRect` (finite,
   `>0`, `<=10000`); `resolveScreenBounds` rejects instead of laundering
   `NaN` through `|| 0` or relying on the display-clamp.
5. **toChat's first write unmarked:** `markAppSized(mainWindow, from)` added
   before that `setBounds(from)` call.

## Gates, real output

- `npm run typecheck` (apps/desktop): clean, 0 errors, all 4 checks.
- `npx eslint` on all 4 touched files: clean (one blank-line warning
  auto-fixed, re-ran clean).
- `npx vitest run --project electron electron/window-growth.test.ts
  electron/pet-overlay.test.ts`: **23 passed (23)**.
- `npx vitest run --project electron` (full suite, once): **16 failed
  files / 31 failed tests, 3561 passed, 32 skipped**. All 16 failing files
  are pre-existing infra/environment failures (macOS code signing, Store
  packaging, git-worktree-against-real-git, Python venv `ruamel` missing,
  update-channel branding) — none touch pet/overlay/morph/window-growth.
  Full `FAIL` list checked by name; no regression.

## One new test

`electron/window-growth.test.ts`: `isPetSized stays true through a maximize,
unlike isAppSized` — imports functions that don't exist without the fix.

## Live verification (real app, CDP, isolated HERMES_HOME)

Used a throwaway copy of `scripts/dev-approval.mjs` on CDP port 9333 (another
agent already held 9222 on this machine) — deleted after use, not committed.

- **Finding 2's exact repro:** `morphToPet` → `petOverlay.control({type:
  'toggle-app'})` revealed the hidden window at pet size (260×320, confirmed
  via `window.outerWidth/outerHeight`) → `windowControls.toggleMaximize()` →
  window grew to the full display (1920×1008) → `window-state.json` on disk
  **unchanged**, still the true chat bounds (234,33,1686,887). Before this
  fix this would have persisted the pet-sized restore rect.
- **Finding 3:** read `window-state.json` ~50ms into an animated `morphToPet`
  call (mid-shrink) — already held the correct pre-morph chat bounds, proving
  the synchronous persist-at-entry fired before any shrink.
- **Finding 1/5 recovery:** un-maximized, called `morphToChat`, window
  restored to the exact original bounds (234,33,1686,887), visible, not
  stranded.
- **Finding 4:** `morphToPet` with `width:-5`, `x:NaN`, and `width:1e9`
  each returned `{ok:false}` immediately; main window geometry unchanged
  after each rejected call.

## What did not run

No OS-level screenshot (no screen-recording permission in this sandbox);
CDP geometry/visibility/disk-file checks used instead — stronger evidence
for this bug class than a picture would be.

## Residual risk

None known. All 5 findings fixed and reproduced live with the exact trigger
Sol's review described where one was given (finding 2). No second review
requested for this round; flag if a third pass is wanted.
