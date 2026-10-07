# CLAUDE.md — Project context for Envelope

> This file is the persistent context Claude Code reads at the start of every session.
> Keep it short, current and true. The one-time build brief lives in `HANDOVER.md`;
> the full math spec lives in `docs/MODELS.md` (created in Phase 0 from HANDOVER.md, Appendix A).
> **Scope is the construction phase only** (docs/DECISIONS.md D-003). Where HANDOVER.md describes operational
> models (5R1C energy, PV, cool roof, HVAC), MODELS.md wins. **Deadline ≈ 1 day**: 4 checkpoints, not 9 phases (D-008).

## 1. What we are building

A web app for a hackathon demo (Seva First Innovation Challenge, track: Swachh & Sustainable Bharat).
A company opens the app and sees **its building as a 3D model, placed at its real location on Google's
photorealistic 3D map**. It can then:

1. **Analyse three construction-phase impacts** around the building, each as its own heat-map layer that can
   be switched on and off: **Dust** (PM10/PM2.5 from site activity), **Heat** (site surface temperature and
   worker heat stress), **Greenhouse gas** (construction-stage carbon A1–A5, shown on the building envelope).
2. **Drive the models with real local data** pulled live from free APIs (weather, air quality, soil,
   land cover, sun position). Every number in the UI traces back to a formula in `docs/MODELS.md` and a
   data source with a timestamp.
3. **Toggle mitigation measures** (e.g. water sprinkling, wind barriers, stockpile covers, shade nets, low-carbon
   concrete, grid power instead of DG). Layers, KPIs and charts update live, showing baseline vs mitigated.
4. **Export** a formal *Environmental Sustainability Assessment Report* (PDF, optionally DOCX). An LLM writes
   the narrative; all numbers, tables, charts and map snapshots are generated deterministically from model
   output. The company can submit it to Indian regulators.

The demo must run end to end, reliably, on a laptop: open → explore → toggle → export.

## 2. Non-negotiables

- **Every control works.** No dead buttons, no placeholder toggles. If a feature isn't ready, the control
  doesn't ship. Every interactive control has a `data-testid` and is covered by the e2e "click everything" test.
- **Numbers are honest.** Models are screening-level (Tier 1–2), not regulatory dispersion models (e.g. AERMOD).
  The UI and report say so. Every assumption is visible and editable in the Assumptions panel.
  No invented coefficients: every default parameter in `packages/models` has a source comment
  (`// src: AP-42 13.2.4, eq. 1`) and a row in `docs/MODELS.md`.
- **The LLM never produces numbers.** It writes prose around a JSON payload. A validator checks that every
  number in the generated text exists in the payload; failures are regenerated or removed.
- **It must not look AI-generated.** See §6.
- **Secrets never reach the browser or git.** All keyed APIs (Google, Gemini, Groq, OpenAQ) go through the
  server. `.env` is gitignored; keep `.env.example` current.
- **Demo resilience.** Every API response is cached; a committed demo snapshot lets the full flow run offline.
  If live data fails, the app falls back to cache with a visible "Cached data from <date>" notice. It never shows
  a blank screen or an unhandled error.

## 3. Architecture

pnpm monorepo, TypeScript everywhere, strict mode.

```
apps/web            React 18 + Vite. UI shell, Cesium viewport, panels, charts, report preview
apps/server         Node (Hono). API proxy and cache, LLM report generation, PDF rendering (Playwright)
packages/models     Pure TS math models (dust, heat, ghg, solar, geometry, compliance rules). No DOM, no fetch
packages/data       API clients + normalisers (Open-Meteo, OpenAQ, Overpass, SoilGrids, NASA POWER), cache keys
packages/report     Report payload builder, LLM prompt + schema, number validator, HTML/print template
docs/               MODELS.md (math spec), DATA_SOURCES.md, DECISIONS.md, TEST_PLAN.md
fixtures/demo/      Committed snapshot of all API responses for the demo site
```

- **3D map:** CesiumJS (used directly through a thin React wrapper; do not add resium) with
  **Google Photorealistic 3D Tiles** (`Cesium.createGooglePhotorealistic3DTileset`, globe disabled).
  Use a `ClippingPolygonCollection` on the tileset to cut out the existing mesh where our building stands.
  Heat-map layers are canvas textures draped onto the 3D tiles with `GroundPrimitive` /
  `classificationType: BOTH`. Fallback when Google quota/keys fail: Cesium World Terrain + OSM Buildings.
- **Building:** parametric. Generated from `fixtures/demo/building.json` (footprint lat/lng polygon, floors,
  floor-to-floor height, window-to-wall ratio per facade, roof type, use type, structure type).
  Optionally loads a glTF for looks, but geometry for the math always comes from the JSON spec.
- **Compute:** models run in Web Workers (Comlink). Hour-level layers (one hour, one grid) must update in
  < 300 ms. Annual runs (8,760 h) run progressively in the worker and must finish in < 5 s.
- **State:** Zustand. A single `Scenario` object (site, building, assumptions, enabled mitigations, time
  selection) → hashed → cached results. The UI never computes model results itself.
- **UI kit:** Fluent UI React v9 (Office/Excel look), AG Grid Community for spreadsheet-style tables,
  Apache ECharts with our own muted theme for charts. Icons: Fluent System Icons only.
- **LLM:** default **Gemini Flash** (Google AI Studio free tier) with JSON schema output; fallback **Groq**
  (`gpt-oss-120b` or `llama-3.3-70b-versatile`). Model IDs are env config, never hardcoded. If both fail,
  a deterministic template writer produces the narrative so export always works.
- **PDF:** the server renders `packages/report` HTML with Playwright `page.pdf()` (A4, print CSS).

## 4. Data sources (free tiers; see docs/DATA_SOURCES.md for params, limits, attribution)

| Need | Source | Key? |
|---|---|---|
| Hourly weather, past year (ERA5) and forecast: temp, RH, wind 10 m, gusts, radiation (GHI, direct, diffuse, tilted), cloud, pressure, precipitation, soil moisture, boundary-layer height | Open-Meteo Forecast + Archive APIs | No (non-commercial, attribution) |
| Background PM10, PM2.5, dust, aerosol optical depth, CO2 | Open-Meteo Air Quality API (CAMS global, ~45 km) | No |
| Ground-station PM for validation | OpenAQ v3 (CPCB stations) | Free key |
| Soil clay/sand/silt, bulk density | ISRIC SoilGrids v2 REST | No (unstable: cache + fallback) |
| Neighbour buildings (height/levels), land use, roads, water, green, sensitive receptors (schools, hospitals) | OSM Overpass API | No (fair use) |
| Solar climatology cross-check | NASA POWER | No |
| Elevation | Open-Meteo Elevation / Cesium sampleHeight | No |
| Grid emission factor | CEA CO2 Baseline Database v21.0: 0.710 tCO2/MWh (FY 2024-25), editable | Constant |
| 3D basemap | Google Map Tiles API (Photorealistic 3D Tiles) or via Cesium ion | Key (billing account; ~1,000 free root requests/month) |
| Report narrative | Gemini API (free tier) / Groq (free tier) | Key |

Open-Meteo's tilted-irradiance azimuth convention is 0 = south, −90 = east, 90 = west, ±180 = north. Convert
facade azimuths accordingly and unit-test it.

Google tiles: show Google's logo and data attributions (Cesium credits). Each page load uses a root-tile
session (3 h). Avoid accidental reload loops in dev; use the fallback basemap during heavy development.

## 5. Domain conventions

- SI units internally; display: µg/m³, °C, W/m², kWh/m²·yr, tCO2e/yr. Every displayed number has a unit.
- Grid: local ENU tangent plane centred on the site, default 1.2 km × 1.2 km at 10 m cells. Convert to WGS84
  only for rendering.
- Time: the site's local timezone everywhere in the UI; UTC in storage.
- Scenarios: `baseline` = no mitigations; `mitigated` = enabled set. Always show both, plus the delta.
- Regulatory references (NAAQS 2009, MoEFCC/CPCB dust mitigation measures, EIA Notification 2006 item 8,
  ECSBC 2024, CEA grid factor) live in one file, `packages/models/src/compliance/rules.ts`, each with a citation
  and a `verifiedOn` date. Wording in the UI and report: "indicative compliance check", never "compliant".

## 6. UI rules (professional, not AI-looking)

Reference feel: **Autodesk Forma** (map-centric design tool) + **Excel** (ribbon, dense grids, status bar).

Layout: title bar → ribbon (tabs: *Project, Site, Analysis, Mitigation, Report*) → left panel (*Layers* tree with
eye toggle + opacity; *Mitigation* checklist with parameters) → centre 3D viewport (compass, scale bar, legend,
hover probe) → right *Inspector* (KPI table baseline/mitigated/Δ, assumptions as editable cells, charts) →
bottom status bar (cursor lat/lng, selected hour, data freshness per source, model run time). Collapsible
bottom *Data* sheet with Excel-style tabs: Climate · Dust · Heat · GHG · Assumptions.

Do:
- Neutral greys, one accent colour, white panels, 1 px borders, 2–4 px radii, 12–13 px base type,
  Segoe UI / Inter, tabular figures for numbers, sentence-case labels, real units, keyboard shortcuts with
  tooltips (e.g. "Dust layer (D)").
- Perceptually uniform colour maps with a labelled legend and units: dust = sequential yellow-brown,
  surface temperature = inferno-like, UTCI = the standard UTCI stress category colours, GHG = sequential purple.
- Empty, loading and error states for every panel (skeleton rows, not spinners in the middle of nothing).

Don't:
- Gradients, glassmorphism, glowing borders, emoji, oversized hero headers, purple-blue "AI" palettes,
  sparkle icons, rounded pill buttons everywhere, marketing copy, "Powered by AI" badges, toast spam.
- shadcn/Tailwind default look. If Tailwind is used at all, use it only for layout utilities.

## 7. Commands (keep updated as they are created)

```
pnpm i                    # install
pnpm dev                  # web (5173) + server (SERVER_PORT, default 8787; not PORT, see D-014)
pnpm test                 # vitest: models, data normalisers, report validator
pnpm test:e2e             # playwright (reuses a running dev server): click-everything, shell, visual snapshot
pnpm test:e2e --update-snapshots   # after an intended visual change
pnpm lint && pnpm typecheck
pnpm snapshot:demo        # refresh fixtures/demo from live APIs (needs .env) — arrives in checkpoint 2
```

pnpm is installed globally (`npm i -g pnpm@9`); corepack fails with EPERM on this machine. The dev store is exposed
as `window.__envelope` (dev builds only) for e2e assertions.

## 8. How we work

- Plan first (plan mode) for anything touching more than two packages. Keep a TODO list.
- Small, reviewable commits on a feature branch; conventional commit messages.
- After each phase: run lint, typecheck, unit tests and e2e; start the dev server; give the user a short
  **manual test checklist** (what to click, what they should see). The user does bug testing as we go;
  log bugs in `docs/BUGS.md` with steps to reproduce, and fix before moving on.
- Ask the user (don't guess) for: API keys, the demo site and building, branding, and any regulatory target.
  Never paste keys into code, logs or chat output.
- When a model formula changes, update `docs/MODELS.md` and its unit tests in the same commit.
- Prefer boring, well-documented libraries. Note every non-obvious decision in `docs/DECISIONS.md`.

## 9. Definition of done (per feature)

Works in the running app · every control has a test id and passes the click-everything test · unit tests for
the math with a hand-checked reference value · empty/loading/error states · units on every number ·
documented in MODELS.md / DATA_SOURCES.md · no console errors · user has checked it from the test checklist.
