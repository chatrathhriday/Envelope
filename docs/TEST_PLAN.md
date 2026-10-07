# TEST_PLAN.md — Envelope

Gate at the end of every checkpoint: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`, then the dev server
and the user's manual checklist. Bugs go to `docs/BUGS.md` and are fixed before the next checkpoint.

## Unit (Vitest): hand-checked reference values

| Area | Case | Expected | Checkpoint | Status |
|---|---|---|---|---|
| Hash | FNV-1a 32 test vectors "", "a", "foobar" | 811c9dc5, e40c292c, bf9cf968 | 0 | done |
| Server cache | Round trip, freshness, key hash ("abc" → SHA-1 a9993e36…) | as stated | 0 | done |
| Units | en-IN grouping, units always attached, true minus sign | as stated | 0 | done |
| Schedule | Month → phase at boundaries 3/4, 15/16, 24 | as stated | 0 | done |
| Gaussian plume | Briggs urban D, Q = 1 g/s, u = 1 m/s, x = 100 m, ground source and receptor on centreline | σy ≈ 15.69 m, σz ≈ 13.79 m, C ≈ 1,471 µg/m³ | 2 | |
| AP-42 13.2.4 | U = 3 m/s, M = 2% | E_PM10 = 0.35 × 0.0016 × (3/2.2)^1.3 ≈ 8.38 × 10⁻⁴ kg/Mg | 2 | |
| Fécan | clay 20% | w′ = 0.0014·400 + 3.4 = 3.96% | 2 | |
| AP-42 13.2.2 | s = 8.5%, W = 20 t (hand-calculated in the test file) | PM10 lb/VMT | 2 | |
| Stability class | Table cases (day strong < 2 m/s → A; night ≤ 3/8, 2–3 m/s → F) | as table | 2 | |
| UTCI | Ta 25 °C, Tmrt 25 °C, v 1.0 m/s, RH 50% | ≈ 24.6 °C | 3 | |
| Solar position | Site, 21 June 12:00 IST vs NOAA calculator | within 0.5° | 1 | |
| Azimuth conversion | compass 0° (north facade) → Open-Meteo 180; 90° → −90; 180° → 0 | as stated | 2 | |
| Embodied carbon | Hand-calculated quantity × factor for one material | as calculated | 3 | |
| Report validator | Rejects a sentence containing a number absent from the payload | rejected | 4 | |

## E2E (Playwright, Chromium)

- `shell.spec.ts`: all shell regions visible, zero console errors, arrow-key hour stepping, project name persistence,
  help dialog, visual snapshot.
- `click-everything.spec.ts`: discovers every `[data-testid^="ctl-"]` reachable from each ribbon tab, operates each one
  from a fresh load (click, slider arrow key, or text entry), and asserts that both the store and the visible screen
  change. Zero console errors.
- Later: export flow (checkpoint 4), offline mode with the network blocked (checkpoint 2).

## Manual

The per-checkpoint checklists, run by the user.
