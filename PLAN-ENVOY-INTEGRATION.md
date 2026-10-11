# Envoy → fork: ce aducem din pet-ul Envoy în clientul rebrandat

Decizia (Teo, 2026-10-09): nu mai ținem Envoy Tauri ca aplicație separată pentru
UI; funcțiile lui merg în acest fork (Electron, rebrandat). Envoy Tauri rămâne
referință de comportament, nu o dependență.

## Ce are deja forkul (nu refacem)
- Pet flotant în fereastră, pop-out în overlay transparent, mereu deasupra
  (`electron/pet-overlay*.ts`, `src/store/pet-overlay.ts`), click-through cu
  `setIgnoreMouseEvents(true, {forward: true})` fără polling.
- Stare din activitate (`src/store/pet.ts`), bule, generator de pet-uri.
- Chip-uri de task și aprobări Deny/Allow în pet (`src/store/pet-chips.ts`,
  `src/components/pet/pet-chips.tsx`), verificate în dev cu aprobare reală.

## Ce lipsește față de Envoy
| # | Funcție Envoy | Starea în fork | Risc |
|---|---------------|----------------|------|
| A | Morph: fereastra de chat se micșorează în pet și revine | pet-ul e doar un element lângă chat; pop-out e comutare bruscă | mediu: atinge `main.ts` |
| B | Skin-uri locale: `pets/<id>/{pet.json,atlas.png}`, validate | pet-uri doar din petdex/generator | scăzut: modul nou în `electron/` |
| C | 7 stări incl. `sleeping`, `needsInput` distinct | 8 stări grosiere, `sleeping` neverificat | scăzut |
| D | Aprobare doar când e exact una în așteptare (FIFO) | coada vie e citită în fereastra principală | acoperit de `answerPetChip` |

## Design pentru A (morph în Electron)
Fără a doua fereastră de chat: aceeași `BrowserWindow` principală.
1. `toPet`: anima `setBounds` (spring, ~380 ms, pași de 4 ms ca în Envoy) spre
   colțul din dreapta-jos, apoi ascunde fereastra principală și deschide overlay-ul
   existent în aceeași poziție. Overlay-ul preia chip-urile.
2. `toChat`: invers — arată fereastra principală la dimensiunea pet-ului,
   anima spre dimensiunea salvată, apoi închide overlay-ul.
3. Dimensiunea și poziția chat-ului se salvează înainte de morph (`window-state`).
4. `prefers-reduced-motion`: sare peste animație (instant).
5. Poziția finală trece prin `resolvePetOverlayBounds` ca să nu iasă de pe ecran.
Neverificat în Envoy și de verificat aici: ecran full-screen, Spaces, 2 monitoare.

## Design pentru B
Port din `src-tauri/src/pets.rs`: id `[a-z0-9_-]{1,64}`, cadru 16–512, 1–64 coloane,
toate cele 7 stări, PNG ≤ 8 MiB și ≤ 16384 px, fără symlink-uri. Directorul:
`<userData>/pets/`. Livrare ca bytes prin IPC, nu protocol de fișiere.

## Ordine
1. A (morph) — cerut explicit; verificat în dev și în overlay.
2. B și C — skin-uri locale, stări.
3. Revizuire Sol pe A (ferestre, concurență între cele două `BrowserWindow`).

## Limite
- Rămân neatinse: `HERMES_HOME`, backend-ul Python, integrarea Nous Portal.
- Nu se rulează pe `~/.hermes` real; dev folosește `HERMES_HOME` izolat.
