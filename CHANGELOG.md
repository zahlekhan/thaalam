# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

## 2026-10-24T23:34:20+05:30 — Fridge Door redesign: scattered canvas, mute/delete, join, invite, gallery

- Changed: Replaced the stage-and-toolbar UI with the "Fridge Door" design. Photos hang at angles on a mint enamel canvas, each held by a magnet in its role colour that bounces on its notes (the old card glow pulse moved to the magnet). No stage: every card plays unless muted. Tap a card to get a pill above the bottom bar with Mute/Unmute and Delete; delete is instant with a 6-second Undo (one Undo restores every card from a multi-delete). New bottom bar with Play/Stop (with a loading state), Add photo (sheet with file picker and the 6 samples), Invite and a "⋯" menu (code view, public gallery, `?dev` model picker). New join screen: type a name or keep a random one, then "Join the jam"/"Start jamming" (or look around without sound); names are shared with the room and new joiners are announced. Invite sheet: room link with Copy, QR code, who's here, and listing in the public gallery behind a confirmation. The gallery page uses the same look and titles canvases by the people who made them and their mood. Status chip in plain words ("6 playing · 98 BPM · calm", "Sound off · 7 photos"), highlighted until noticed when the tempo or mood changes. New photos land in a free spot instead of on top of other cards; phones open on the busiest part of the canvas at a readable size. The red crash banner became a dismissible toast with a recovery step. Keyboard: Space plays/stops, M mutes, Delete/Backspace deletes. Self-hosted Rubik font and authored SVG icons.
- Why: The critique (17/40) found a broken phone layout, unclear parking, no stop button, a risky invite/publish flow and a generic look; the user chose a bright, playful full redesign, a scattered canvas with per-card mute/delete, permanent canvases and named joiners.
- Files: `web/src/App.tsx`, `web/src/CardShape.tsx`, `web/src/styles.css`, `web/src/sound.ts`, `web/src/room.ts`, `web/src/main.tsx`, new `web/src/canvas.ts`, `web/src/toast.ts`, `web/src/icons.tsx`; `worker/index.js` (gallery entries now carry names and mood); `web/package.json` (adds `@fontsource-variable/rubik`, `qrcode-generator`); `README.md`, `SUBMISSION.md`; design records in `DESIGN.md`, `.impeccable/`.
- Validation: `npm --prefix web run build` passes (type check and Vite build). Ran the app with `npm run dev:worker` and checked join, add sample, mute, delete and Undo (including reload and leaving the page right after Undo), invite with QR and the publish confirmation, two people in one room with names and the join toast, and the gallery, at 1280x800 and 375x812 (in-app browser and headless Chrome). Impeccable detector clean on `web/src` and `web/index.html`. A separate design review returned "ship" for all scored fixes.
- Limitations: Multi-card delete with Undo was checked by code reading only (multi-select could not be triggered in headless Chrome). Cards placed on a wide screen can sit outside a phone's first view (pan to see them). Each device still plays on its own clock. The deployed demo room was not checked for overlapping cards. Not committed; merging `origin/main` (camera capture, options menu, logging) was aborted at the user's request and will conflict with these files.

## 2026-10-24T22:35:18+05:30 — Record the new card interaction in product context

- Changed: `PRODUCT.md` now describes the scattered canvas instead of the stage. Every card plays unless muted. Drag moves a card; click or tap opens its actions (mute or unmute, delete). The stage frame and parking are gone from the terminology and principles. It also records two more decisions: canvases are kept permanently (the gallery stays opt-in), and people joining a room enter a name or get a random one.
- Why: The user decided cards should be an unorganized mess with per-card mute and delete, instead of dragging cards off a stage to silence them. The user settled retention and naming while planning the redesign.
- Validation: Documentation only. Checked that `PRODUCT.md` no longer uses stage or parking terms except where it notes the current code.
- Limitations: Not built yet. The app still uses the stage frame and parking until the redesign lands.

## 2026-10-24T22:20:06+05:30 — Add product context for design work

- Changed: Added `PRODUCT.md`, which records the product facts design work should keep: users (friends jamming together first), purpose, positioning (a photo is a stem; the model reads, code writes the music), terminology, constraints, evidence on hand, and principles.
- Why: Give later UI and design work (the Impeccable skill) a confirmed product record instead of re-deriving it from the code each time.
- Validation: Checked the facts against `CONTEXT.md`, `README.md` and the current code (`web/src/`, `worker/index.js`, `server/app.py`). The user confirmed the primary audience, the horizon and how the brand uses the name.
- Limitations: Photo and room retention and the public gallery were changing in the uncommitted working tree, so `PRODUCT.md` marks them as open. `README.md` and `CONTEXT.md` still describe tldraw and say rooms aren't built yet; this entry doesn't update them.

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
