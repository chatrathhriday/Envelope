# BUGS.md — Envelope

Bugs found during checkpoint testing. Fix before moving to the next checkpoint.

| ID | Checkpoint | Found by | Steps to reproduce | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| B-001 | 0 | Claude | Run `pnpm dev` from the desktop preview tool | API on 8787, web on 5173 | API server bound 5173 because the tool sets `PORT` | Fixed (D-014) |
| B-002 | 0 | Claude | Load the app in dev | No console errors | "Keyborg instance … disposed incorrectly" from StrictMode double mount | Fixed (D-013) |
