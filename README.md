# Envelope

Construction-phase environmental impact analysis on a 3D map: dust (PM10/PM2.5), heat (surface temperature and
worker heat stress) and greenhouse gases (A1–A5), with mitigation scenarios and an exportable assessment report.
Screening-level (Tier 1–2) models; see `docs/MODELS.md`.

## Setup (Windows, macOS or Linux)

1. Install **Node.js 20+** (https://nodejs.org).
2. Install pnpm 9:
   ```
   npm i -g pnpm@9
   ```
   Open a **new** terminal afterwards so `pnpm` is on the PATH.
3. In this folder, install dependencies and the Chromium used for PDF export:
   ```
   pnpm i
   pnpm exec playwright install chromium
   ```
4. Create `.env` from the template and fill in the keys (ask the team lead; never commit `.env`):
   ```
   cp .env.example .env
   ```
   - `CESIUM_ION_TOKEN`: Google Photorealistic 3D Tiles via Cesium ion. Without it the app shows an OpenStreetMap basemap.
   - `GEMINI_API_KEY`, `GROQ_API_KEY`: report narrative. Without them the report uses a built-in template writer.

## Run

```
pnpm dev
```

Open http://localhost:5173 (API on port 8787). Weather, air-quality and OSM data for the demo site are committed in
`fixtures/demo/`, so the app works offline.

## Demo flow

1. The building appears on its plot in Gurugram; the hour and construction month (Analysis tab) move the sun and the building.
2. Layers (left): D dust, H surface temperature, U worker heat stress, G GHG on the envelope.
3. Mitigation (left panel or the Mitigation tab presets): the KPI table on the right compares baseline and mitigated.
4. Analysis → Worst dust day / Hottest day jumps to the critical day.
5. Report → Export report produces a PDF (A4) with tables, maps and a validated narrative.

## Commands

```
pnpm test        # unit tests (models, report validator)
pnpm test:e2e    # Playwright end-to-end (needs pnpm dev running or starts it)
pnpm lint && pnpm typecheck
pnpm snapshot:demo   # refresh fixtures/demo from the live APIs
```

Project rules and architecture: `CLAUDE.md`. Decisions and known issues: `docs/DECISIONS.md`, `docs/BUGS.md`.
