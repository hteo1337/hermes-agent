# Envoy desktop integration adversarial review

Target: `envoy/integration` at `6de9e1510e1e762eb1c94e769ff9e678017fd01c` versus `envoy/main` at `f1a9444b4081dba369d63fa079554908609e2bab`. Review is local and read-only with respect to application code. No push.

## Findings, ordered by severity

### High — a non-overlay renderer can forge a chip answer

`apps/desktop/electron/preload.ts:99-114` exposes `petOverlay.control` through the common preload. `apps/desktop/electron/pet-overlay-ipc.ts:203-208,253` ignores `event.sender` and forwards every control payload to the main renderer, including `chip-answer`. `apps/desktop/src/store/pet-overlay.ts:341-348` accepts that forwarded type and calls `answerPetChip`. `apps/desktop/src/store/pet-chips.ts:75-92` limits the decision to `once`/`deny` and checks the local queue, but cannot tell whether the IPC originated in the pet window. A different desktop renderer with this preload can choose `once` for a request ID it knows while no pet is open. The queue and choice checks limit the impact; they do not provide sender authentication.

Reproduction: compiled `pet-overlay-ipc.ts` with esbuild in memory, registered its real listener with an Electron stub, then sent the same `{type:'chip-answer',sessionId:'session-a',requestId:'request-a',choice:'once'}` from sender IDs `overlay` and `unrelated-window`. The positive control forwarded; the negative control also forwarded: `{"overlayForwarded":true,"nonOverlayRejected":false,"nonOverlayForwardedPayload":{"type":"chip-answer","sessionId":"session-a","requestId":"request-a","choice":"once"}}`. Existing `electron/pet-overlay-ipc.test.ts:43-62` likewise passes `{}` as the sender and only checks window reveal behavior. This control verifies the forwarding boundary; it does not simulate a backend approval being executed.

The generic control channel already lacked sender authentication on `envoy/main` (`git show envoy/main:apps/desktop/electron/pet-overlay-ipc.ts`, lines 153-156). The new chip-answer consumer makes that pre-existing gap approval-relevant.

### Medium — a failed overlay renderer can leave the chat hidden with no pet control

`apps/desktop/electron/pet-morph-window.ts:169-176` hides the main window after shrinking it, then opens the overlay. The overlay's renderer lifecycle in `apps/desktop/electron/main.ts:14087-14089` supplies only `log`; it supplies neither `reload` nor `onRendererTerminated`. The recovery notification at `apps/desktop/electron/main.ts:14101-14113` runs only when the **window closes**. A live overlay window whose renderer fails to load or terminates remains blank while the chat stays hidden. The renderer cannot emit `pop-in`, and the `closed` handler does not fire. This violates the unstranded-window claim. `openPetOverlay` also reuses an existing live overlay window at `main.ts:14131-14144`, so merely reopening the pet does not recreate its renderer.

Reproduction/control: compiled the real `window-renderer-lifecycle.ts` in memory and emitted `render-process-gone` with `{reason:'launch-failed'}` on a live window. With the main overlay's log-only callbacks, output was `{"logged":2,"recovered":0}`. With an `onRendererTerminated` callback as positive control, output was `{"logged":2,"recovered":1}`. This proves the missing recovery signal; no live Electron crash was induced. `apps/desktop/electron/window-renderer-lifecycle.ts:323-348` documents the available termination callback.

### Low — local pet manifest symlink policy has a check/use race

`apps/desktop/electron/local-pets.ts:279-287` rejects a symlinked `pet.json` at `lstat`, but `local-pets.ts:296-297` opens it later by pathname. Unlike the atlas at `local-pets.ts:315-327`, the manifest is not opened with `O_NOFOLLOW` on a pinned descriptor. A local actor who can modify the pet folder can replace the manifest with a link to a valid JSON manifest outside `<userData>/pets` during that gap. The manifest ID and atlas still have to pass validation, so this is a symlink-policy bypass rather than arbitrary file disclosure.

Reproduction/control: an in-memory esbuild probe used a valid skin and swapped `pet.json` to an outside symlink immediately before the actual `fs.readFileSync`. Output: `{"ordinaryAccepted":true,"staticSymlinkRejected":true,"swappedToSymlink":true,"racedSymlinkAccepted":true,"racedReason":null}`. The static symlink rejection and ordinary skin acceptance show the control changed the path at the intended boundary.

### Low — a backend-stale approval is reported as answered

`apps/desktop/src/store/pet-chips.ts:80-93` re-reads the renderer's queue, then unconditionally clears the chip and returns `true` if `answerApproval` resolves. For a request already resolved by another surface or timed out on the backend but still present locally, `tui_gateway/methods_prompt.py:1204-1218,1360-1365` returns `{resolved: 0}`; `tools/approval.py:149-156` defines zero for an absent queue entry or request ID. `apps/desktop/src/store/prompts.ts:384-405` ignores that result, so the chip reports success. The backend does **not** execute a second decision, but the renderer's success claim and queue freshness claim are too strong. The positive control in `pet-chips.test.ts:48-60` covers a locally queued request; its `answerApproval` mock always resolves and does not exercise `{resolved: 0}`. This is a source-traced finding; no separate live-backend probe ran.

### Low, pre-existing and outside the desktop path — direct installer defaults still name upstream

The literal statement that **no code path** can fall back to an upstream host is false for direct invocation of `scripts/install.sh:23` or `scripts/install.ps1:74`: each supplies a NousResearch GitHub URL when `HERMES_REPO_URL` is unset. These lines are identical on `envoy/main`, so this is not an integration regression. The Electron bootstrap path does not take that fallback: `apps/desktop/electron/bootstrap-runner.ts:183-195` chooses a configured repository or bundled `source.git`, fails if the bundle is missing, and `bootstrap-runner.ts:266-269,766-783` passes its nonempty choice as `HERMES_REPO_URL`. The focused bootstrap test exercises empty and configured choices at `bootstrap-runner.test.ts:151-163`. This finding applies if the broad zero-upstream claim includes direct installer use; no desktop-triggered upstream fallback was established.

## Claims with nothing found in the inspected paths

- **Approval choice and queue guards:** nothing found for `always`/`session` via `answerPetChip`; `pet-chips.ts:75-87` rejects those choices and absent local requests, and `pet-chips.test.ts:48-60` exercises both. The main renderer re-reads its **local** queue; it does not query `approval.pending` at answer time. The stale backend response is covered above.
- **Window geometry:** nothing found for pet bounds being written to `window-state.json` on the inspected morph path. `main.ts:3632-3663` skips `isPetSized` and `isAppSized`; the morph saves before shrinking (`pet-morph-window.ts:160-165`) and marks subsequent bounds as app-sized (`pet-morph-window.ts:39-43`). Maximize retains the pet marker (`window-growth.ts:19-33`), and display-loss restore chooses live display bounds (`window-state.ts:256-273`). These are source and focused unit checks, not a real multi-monitor Electron run.
- **Local pet static validation:** nothing found for ordinary `../` IDs, static symlinks, invalid manifest fields, or oversized-at-open atlases. `local-pets.ts:11-18,221-255,263-292,315-345,360-366` validates them. The race above is a narrower exception.
- **Desktop empty endpoints:** nothing found for an empty `brand.json` endpoint directly restoring portal, hub, update-feed or bootstrap egress. `apps/desktop/brand.json` has four empty endpoint strings and an empty update repository; `main.ts:3720-3724,4687-4690` disables update checks/apply, `main.ts:7153-7162` fails the hub URL predicate, and `main.ts:8092-8095` exits cloud discovery on an empty portal. The direct installers remain the pre-existing exception above.

## Verification and limits

- Focused Vitest with fresh temporary `HERMES_HOME`, `HERMES_RUNTIME_DIR`, `HERMES_DESKTOP_USER_DATA_DIR`, `--maxWorkers=2`: **8 files, 74 tests passed** for pet IPC/morph/overlay/window-state/local-pets/bootstrap/feed/pet-chips; separate jsdom store run **1 file, 1 test passed**. The normal Vite config could not start because the linked dependency tree lacks `@rolldown/plugin-babel`; these runs used a minimal temporary config and were not the CI gate. A first node-only run had 74 passes but two environment setup failures (`electron` package and `window` missing); the passing reruns isolated the appropriate environments.
- The sender, symlink and renderer-termination reproductions were transient in-memory Node probes; they did not add tests or application files. No packaged-app, visual, full-suite or live backend test ran.

```dispatch-outcome
{"accomplished":"complete","evidence":{"artifacts":["handoffs/REVIEW-INTEGRATION.md"],"commands":["git rev-parse HEAD: 6de9e1510e1e762eb1c94e769ff9e678017fd01c","focused vitest --maxWorkers=2: 8 files/74 tests passed; jsdom: 1 file/1 test passed","in-memory sender probe: overlay forwarded=true, non-overlay rejected=false","in-memory manifest probe: static symlink rejected=true, raced symlink accepted=true","in-memory renderer termination probe: log-only recovered=0, recovery callback recovered=1"]},"blocker_category":"none","remaining_work":[]}
```
