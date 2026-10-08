# Plan: de-brand the desktop client (apps/desktop)

Scope: `apps/desktop` only. Goal: no Nous / Nous Research / Hermes branding visible to the user,
while the app keeps working against a Hermes backend. MIT allows this, with one obligation (below).

## Footprint (measured, 2026-10-08)
- "nous": 1743 hits in 395 files. "hermes": ~14.9k hits in 1945 files (src + electron).
- Top identifiers: `hermesDesktop` (1215, the preload bridge), `hermesHome` (301), `HERMES_HOME` (239),
  `hermes-agent` (177), `hermes_cli` (118), `hermes-bots` plugin (110), `hermes.exe` (67).
- Nous URLs: portal.nousresearch.com (billing, device login), hermes-agent.nousresearch.com
  (docs, `install.sh`), github.com/NousResearch/hermes-agent, an `ares-3009.agents...` host.
- Assets: `public/hermes.png`, `hermes-sprite.png`, `hermes-frames/`, `nous-girl*.png`, HERMES AGENT wordmark.
- Metadata: `package.json` name/productName `Hermes`, author `Nous Research`.

## Hard constraints
1. **MIT notice stays.** Keep `LICENSE` (Copyright Nous Research) and add an About/NOTICE entry.
   Removing the copyright line would breach the license. Product branding may go; attribution may not.
2. **Trademarks are not covered by MIT.** Do not ship under "Hermes" or "Nous"; pick a new name first.
3. **Protocol names are not branding.** The backend is `hermes_cli`/`hermes serve`, env vars like
   `HERMES_HOME`, the `~/.hermes` dir and the JSON-RPC method names. Renaming these breaks the backend
   and every upstream merge. Keep them; hide them from the UI.
4. **Nous Portal is a feature, not branding.** Provider login, billing, subscription pages. Hide behind a
   flag or remove only if the Nous provider is unwanted (decision below).

## Decisions needed (default in bold)
- Product name: **"Envoy"** (matches the theme and the Nexus Envoy app). Reversible: one constant.
- Nous Portal provider/billing UI: **keep functional, rename labels to "Nous Portal" only where it
  names the provider** (a factual label), remove marketing copy and upsells.
- Auto-update: **disable the Nous feed** (`electron-updater`, install.sh checks); updates come from our fork.
- Telemetry "Share usage stats with Nous": **remove the prompt and the sender.** Verify no data leaves.

## Strategy: one brand module, then mechanical passes
Never sed across the tree. Introduce `src/brand.ts` (name, short name, vendor, docs URL, support URL,
about text, logo, wordmark) and route every user-visible string through it.

### Phase 0 - baseline (0.5 d)
- Record `npm run typecheck`, `vitest`, lint on `envoy/main` as the reference. Keep upstream remote
  `no_push`. Tag `envoy/pre-rebrand`.
- Add `scripts/brand-audit.mjs`: lists remaining brand hits split into user-visible vs identifier, so
  progress is measurable and CI can fail on regressions.

### Phase 1 - brand module and metadata (0.5 d)
- `src/brand.ts`; `package.json` (`productName`, `description`, `author`, `appId`), window titles,
  menu labels, tray, dock name, `HermesDevMock-*` app names, installer names (`electron-builder` config).
- Keep `name` in package.json stable until Phase 5 (workspace and lockfile references).

### Phase 2 - i18n and UI copy (1-2 d)
- `src/i18n` holds 36 files with "Nous": replace with `{brand}` interpolation. Check every locale.
- Components (10), settings (10), onboarding (8), billing (4): copy and labels.
- Remove the "HERMES AGENT" wordmark hero: swap for a brand-driven component. Done in the empty-chat view.
- Tests asserting strings must read the brand module, not literals.

### Phase 3 - assets (0.5 d)
- Replace `hermes.png`, `hermes-sprite.png`, `hermes-frames/`, `nous-girl*.png`, app icons
  (`.icns`, `.ico`, `apple-touch-icon.png`), favicons, DMG background, splash.
- Check `public/ds-assets` licensing before reuse.
- Themes: keep `nous`/`nousAlt` presets only as neutral palettes under new names, or drop them. Default = Envoy.

### Phase 4 - URLs, update and telemetry (1 d)
- Route docs/support/billing links through `brand.ts`; remove `install.sh` and update feed checks from the
  Nous host; remove the `ares-3009` host and PR-link references; disable the usage-stats sender.
- Failure mode to test: offline start, no update feed, no portal reachability. App must boot clean.

### Phase 5 - identifiers (optional, 2-3 d, high risk)
- Rename the preload bridge `hermesDesktop` -> `desktop` and `hermes-bots` plugin id only if there is a
  real reason. 1215 hits; invisible to users. Do it as one codemod (ts-morph), alone in its own commit.
- Do NOT rename backend names listed in constraint 3.

### Phase 6 - verification
- `brand-audit` shows zero user-visible hits (identifiers allowlisted).
- Grep the built bundle and `Info.plist`/asar strings, not only the source.
- Run the app, walk: empty chat, Settings (all pages), onboarding, About, update dialog, error toasts,
  tray/menu, OS notifications. Screenshot each. Check light and dark.
- Existing suite once; at most one new test (brand audit as a test).
- Sol review (gpt-6-sol) of the diff for: leftover brand strings, broken backend coupling, license notice kept.

## Risks
- Merge cost: Phase 2 touches ~400 files, so every upstream merge conflicts. Mitigate by doing it in few
  commits and merging upstream first; accept that this becomes a long-lived fork.
- Hidden brand in generated or remote content (docs links, backend-sent strings, skills text). The client
  cannot rewrite those; list them as known residuals.
- Trademark/legal: needs a human check before any public release. This plan assumes private use.

## Order of value
Phases 0-4 give a fully de-branded UI in about 4-5 days. Phase 5 is optional.
