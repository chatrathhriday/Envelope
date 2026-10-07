# BUGS.md — Envelope

Bugs found during checkpoint testing. Fix before moving to the next checkpoint.

| ID | Checkpoint | Found by | Steps to reproduce | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| B-001 | 0 | Claude | Run `pnpm dev` from the desktop preview tool | API on 8787, web on 5173 | API server bound 5173 because the tool sets `PORT` | Fixed (D-014) |
| B-002 | 0 | Claude | Load the app in dev | No console errors | "Keyborg instance … disposed incorrectly" from StrictMode double mount | Fixed (D-013) |
| B-003 | 1 | Claude | Load the site with Google tiles and shadows on | Clean ground and roof | Moiré shadow acne on tiles and roof | Fixed (D-018) |
| B-004 | 1 | Claude | Load the app after adding Cesium | Workers and assets load from /cesium | vite-plugin-static-copy v4 kept full source paths, so /cesium/* returned index.html | Fixed (`rename: { stripBase: 4 }`) |
| B-005 | 2 | User | Change month after results load | Building matches the month | Floor rings floated above a stale frame volume (reused Cesium entity ids) | Fixed (auto ids) |
| B-006 | 2 | User | Open the UTCI layer at 14:00 in July | Informative map | Whole domain one category (red) | Fixed: UTCI shown on site + 50 m, continuous ramp |
| B-007 | 2 | Claude | Export report with Gemini/Groq keys | LLM narrative | gemini-2.5-flash 404 (closed to new keys), Groq llama-3.3 404 | Fixed: gemini-3.5-flash → 3-flash-preview → flash-latest; Groq openai/gpt-oss-120b |
