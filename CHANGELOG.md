# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

## 2026-10-24T21:44:19+05:30 — Add hackathon documentation

- Changed: Added `README.md`, `AGENTS.md`, `CHANGELOG.md`, `AI_USAGE.md`, `SUBMISSION.md` and `.github/pull_request_template.md` from the hackathon template, filled in from the existing code and `CONTEXT.md`. Entries below are backfilled from git history.
- Why: Follow the hackathon template's documentation and submission guidelines.
- Validation: `npm --prefix web ci && npm --prefix web run build` passed on Node 22.12.0 (with Rolldown ambiguous-export warnings from Strudel's `superdough`). `python3 -m py_compile server/app.py` and `node --check worker/index.js` passed. Local Markdown links checked.
- Limitations: The team, demo URL and submission details are still TODO. Backfilled entries have no recorded validation.

## 2026-10-24T21:20:31+05:30 — Ignore Wrangler state

- Changed: `.gitignore` now ignores `.wrangler/` (commit `8afacba`).
- Why: Keep local Wrangler state out of the repo.
- Validation: Not recorded at the time.
- Limitations: None identified.

## 2026-10-24T21:20:24+05:30 — Deploy to Cloudflare Workers

- Changed: Added `worker/index.js`, `wrangler.jsonc` and root `package.json` (commit `d166fa1`). One Worker serves `web/dist` and ports `/api/health` and `/api/analyze` to call Jev directly.
- Why: Host the app on a single origin so the frontend works without CORS or API base config.
- Validation: Not recorded at the time.
- Limitations: Jev only; vegaml stays local. `TYPESAFE_API_KEY` must be set as a Wrangler secret.

## 2026-10-24T21:09:16+05:30 — Configurable API base and backend container

- Changed: `VITE_API_URL` in `web/src/reading.ts`, CORS via `ALLOWED_ORIGINS` in `server/app.py`, plus `server/Dockerfile` and `server/fly.toml` (commit `b390741`).
- Why: Allow the frontend and backend to be hosted on separate origins.
- Validation: Not recorded at the time.
- Limitations: The Fly.io deploy is an alternative to the Cloudflare Worker.

## 2026-10-24T20:56:36+05:30 — Initial Thaalam build

- Changed: Initial commit `9c22bd2`: tldraw canvas with a stage, photo cards, pixel measurements and model readings (`web/src/`), Strudel music generation (`music.ts`, `sound.ts`), sample tray with precomputed readings (`web/public/samples/`), and the FastAPI reading server with Jev and vegaml (`server/`).
- Why: Build steps 1 and 2 of the plan in `CONTEXT.md`.
- Validation: Not recorded at the time.
- Limitations: Rooms (build step 3) not started.
