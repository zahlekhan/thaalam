# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

## 2026-10-24T22:35:18+05:30 — Record the new card interaction in product context

- Changed: `PRODUCT.md` now describes the scattered canvas instead of the stage. Every card plays unless muted. Drag moves a card; click or tap opens its actions (mute or unmute, delete). The stage frame and parking are gone from the terminology and principles.
- Why: The user decided cards should be an unorganized mess with per-card mute and delete, instead of dragging cards off a stage to silence them.
- Validation: Documentation only. Checked that `PRODUCT.md` no longer uses stage or parking terms except where it notes the current code.
- Limitations: Not built yet. The app still uses the stage frame and parking until the redesign lands.

## 2026-10-24T22:31:11+05:30 — Logging for the server, Worker and web app

- Changed: `server/app.py` logs startup settings (no key value), each reading (model, bytes, ms, answers), rejected uploads, and Jev failures. Jev timeouts, network errors and malformed replies now return a 502 with a clear `detail` instead of a bare 500. `worker/index.js` logs the same events as JSON objects for Cloudflare observability, handles the same Jev failures, and logs room connect/close/error in `Room`. `web/src/App.tsx` and `web/src/reading.ts` log failed readings (with the server's `detail`), a failed health check, and a failed samples load. `web/src/CardShape.tsx` now shows "Can't reach the model" when the model call failed; before, the `'error'` status it checked was never set. README documents the logs.
- Why: Before this, failures showed only as status codes in the logs, with the reason visible only to the browser.
- Validation: `npm --prefix web run build` passed. Ran the FastAPI server locally and checked the logs and responses for a real Jev reading, a bad key (401 to 502), an unreachable Jev (ConnectError to 502), a non-image upload (400), and an unavailable model (400). Ran `wrangler dev` and checked the same Jev success, 401 and unavailable-model cases, plus a room WebSocket connect and close.
- Limitations: A Jev timeout and a malformed Jev reply were not triggered directly; they share the handlers checked above. Locally, `wrangler dev` prints "Uncaught Error: Network connection lost" after a room socket closes; this also happens on the code before this change. Root `npm ci` needs `--legacy-peer-deps` (a `@cloudflare/workers-types` peer conflict between `wrangler` and `partyserver`); this is unchanged.

## 2026-10-24T22:20:06+05:30 — Add product context for design work

- Changed: Added `PRODUCT.md`, which records the product facts design work should keep: users (friends jamming together first), purpose, positioning (a photo is a stem; the model reads, code writes the music), terminology, constraints, evidence on hand, and principles.
- Why: Give later UI and design work (the Impeccable skill) a confirmed product record instead of re-deriving it from the code each time.
- Validation: Checked the facts against `CONTEXT.md`, `README.md` and the current code (`web/src/`, `worker/index.js`, `server/app.py`). The user confirmed the primary audience, the horizon and how the brand uses the name.
- Limitations: Photo and room retention and the public gallery were changing in the uncommitted working tree, so `PRODUCT.md` marks them as open. `README.md` and `CONTEXT.md` still describe tldraw and say rooms aren't built yet; this entry doesn't update them.

## 2026-10-24T22:11:43+05:30 — Options menu at the bottom right

- Changed: Added an "Options" button at the bottom right of `web/src/App.tsx` that opens a menu with "Show code" and the model picker. Removed the "Code" button and the `?dev`-only model select from the top bar (`web/src/styles.css`, `README.md`, `SUBMISSION.md`).
- Why: Keep the top bar for the main actions and gather settings in one place.
- Validation: `npx tsc -b` passed. Checked in headless Chrome at 1280x800 and 390x844 against a stub `/api/health`: the menu opens, lists Jev and vegaml, and "Show code" shows the code panel.
- Limitations: The model picker is now visible to everyone (no longer behind `?dev`); it is hidden when `/api/health` is unreachable. On narrow phones the code panel still overlaps the wrapped top bar, as before.

## 2026-10-24T22:06:28+05:30 — Take photos with the webcam or phone camera

- Changed: New **Camera** button in the top bar (`web/src/Camera.tsx`, `web/src/App.tsx`, `web/src/styles.css`). It opens a live camera preview with Snap, Flip (front/back) and Cancel; the snapshot becomes a card just like an uploaded photo. Where the live camera API isn't available (plain-http pages), it falls back to a file input with `capture="environment"`, which opens the phone's camera app.
- Why: Make it easier to add photos from a laptop webcam or phone camera without saving a file first.
- Validation: `npm --prefix web run build` passed on Node 24. In headless Chrome with a fake camera, opening the camera showed a 1280x1280 stream, Flip switched to the mirrored front view, and Snap closed the modal and added one card that was read and placed on the stage.
- Limitations: Live preview needs https or localhost (browser rule); opening the dev server from a phone over plain-http LAN uses the camera-app fallback instead. Not tested on a real phone.

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
