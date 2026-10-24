# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

## 2026-10-25T01:45:00+05:30 — The control bar grows one next step at a time

- Changed: The bottom bar now follows the canvas instead of showing every action at once. Empty fridge: Play, a wide Go Red "Add photo" and More; Play turns Mint Wash while stopped so Add photo is the only red. First photo: Invite appears in Invite Blue as the next step and Add photo turns neutral. Once the canvas has a room (you opened Invite, or came in through a link): Invite turns neutral with its "· N here" count and Share appears, also neutral. Steps not yet in the bar sit at the top of the More menu ("Invite friends", "Share in the public gallery"), so nothing is unreachable. New buttons pop into the bar (none under reduced motion). The stage is worked out from the photo count and whether a room exists, so there is nothing new to store. Files: `web/src/App.tsx` (`BottomBar`, `MoreMenu`), `web/src/styles.css`, `DESIGN.md`, `README.md`.
- Why: Invite had the only filled button in the bar, so on an empty fridge it outranked Add photo, the one action that does anything. Inviting is worth more once there is a loop to hear, and public sharing should come last and never be pushed.
- Validation: `tsc -b` passes. In the in-app browser (Vite dev server, no worker) at 800x600 and 375x812, checked all three stages, the More menu at each stage, and that opening Invite creates the room and moves the bar to stage 3; fixed a phone mismatch where neutral Invite kept its icon while Share hid its own.
- Limitations: The "· N here" count with a second person wasn't checked, because no worker was running; that code didn't change. Someone who joins an empty room by link sees Invite (neutral) next to the red Add photo, by design. Not tested on a real phone.

## 2026-10-25T01:30:00+05:30 — Prints swing on their magnets

- Changed: New `web/src/swing.ts`: each card gets two spring animations driven by one rAF loop — a swing around the magnet while dragged (own drags and remote ones), a lift off the door (`rotateX`) on each of its notes, a press-on when added, and a snap when its reading lands. `CardShape.tsx` registers prints with the loop; `sound.ts` replaces the old magnet bounce with `pluck()`. CSS: cards pivot at the magnet (`transform-origin`), scale up while dragging, magnets get a light glint.
- Why: Make the fridge feel physical — prints hang like paper, not divs.
- Validation: `npm --prefix web run build` passes.
- Limitations: Spring constants tuned by eye; `prefers-reduced-motion` still respected via the `still` check in `swing.ts`.

## 2026-10-25T01:15:00+05:30 — Prints hang and swing from their magnets

- Changed: New `web/src/swing.ts` gives every card two small springs, driven by one animation loop that stops when all prints rest. Prints pivot on their magnet: dragging (yours or anyone's in the room) swings the print behind the pointer and lifts it off the door; on release it swings back and settles. On each note the magnet squashes and stretches and the paper lifts about 3 degrees in perspective. New cards are pressed onto the door and their magnet snaps on; a magnet also snaps when its reading arrives. Magnets got a glint. `sound.ts` now calls `pluck()` instead of the old bounce. Files: `web/src/swing.ts`, `CardShape.tsx`, `sound.ts`, `styles.css`, `README.md`, `DESIGN.md`.
- Why: The canvas felt flat; physical depth fits the fridge-door world without replacing React Flow or rooms.
- Validation: `tsc -b` passes; headless Chrome (1280x800): drag swings up to ~10 degrees and settles to rest in ~1.5s, notes lift the print with sound on, nothing moves under emulated reduced motion; screenshots checked.
- Limitations: Not tested on a real phone. Tuning is by eye. Deleted cards still vanish without an animation.

## 2026-10-25T01:22:00+05:30 — More instruments and a fuller sound

- Changed: Each role now has one instrument per photo texture (30 in all, up from 12 picked by a warm/cool split), so the model's 5-way texture answer is used. The original 12 sounds keep a slot. New: kit, punchy and retro kicks; wood block, drum machine and brushes; fretless, picked and soft synth bass; nylon guitar, steel drums and reed organ chords; sitar, synth beeps and flute melodies; bowed, metal and synth pads. Drum banks now list the sample numbers to use, because `n(0..4)` on `hh` could pick a crash cymbal or a kick. Metallic percussion now uses `linnhats` instead of `hh`, which measured 15 dB quieter than the other percussion. Bass and chord notes ring until the next note instead of lasting one 16th step. Chords, melody and pads get light reverb (`room(0.3)`). Percussion is accented on the beat.
- Why: The user asked to improve the sound and expand instruments. Before this, two of the three percussion samples played the same hi-hats, low-energy bass played one short blip per bar, and everything was dry.
- Files: `web/src/music.ts`, `CONTEXT.md`.
- Validation: `npm --prefix web run build` passes. With `npm run dev:worker` in the in-app browser, played each of the 30 role-and-texture parts alone and measured peak and RMS through a Strudel analyser: all load and play with no console errors, and each new sound sits inside the level range of the role's original sounds (fretless bass is about 3.6 dB above the loudest original bass). Added all 6 samples: 6 playing at 94 BPM, card titles show the new instruments, no console errors.
- Limitations: Levels were measured, not judged by ear; a person still needs to listen. A new soundfont skips its first notes while it loads. The levels already varied a lot inside each role (the round kick is about 12 dB quieter than the club kick); this change doesn't even them out. Only the crowd sample changes sound (hi-hats to brushes); lamps keeps hi-hats from a louder bank.

## 2026-10-25T01:20:00+05:30 — Hide the room link input in Invite

- Changed: The invite sheet no longer shows the room URL in a readonly input; a full-width "Copy link" button sits beside the QR. Copy fallback now asks people to copy the address bar.
- Why: The truncated URL field added nothing over Copy and the QR code.
- Validation: `npm --prefix web run build` passes.
- Limitations: None identified.

## 2026-10-25T01:10:00+05:30 — Page metadata, favicon and share card

- Changed: `web/index.html` now has a description, theme-color, canonical URL, Open Graph and Twitter card tags, and favicon links. New `web/public/og.png` (1200x630 share card rendered with Pillow: tilted photo cards with role-colour magnets on the enamel background), `favicon.svg`, `favicon-32.png` and `apple-touch-icon.png`.
- Why: Shared links showed no title, description or preview image.
- Validation: `npm --prefix web run build` passes; assets land in `web/dist`.
- Limitations: OG image is static, not per-canvas; absolute URLs point at the workers.dev domain (update if a custom domain is added).

## 2026-10-25T00:59:00+05:30 — Share gets its own button; start sheet previews the gallery

- Changed: Listing a canvas in the public gallery moved out of the Invite sheet into its own "Share" button and sheet (optional name, view-only explanation, "Share publicly", or "See the gallery" / "Remove from gallery" once listed). Invite now only covers the private link, QR code and who's here, with a note pointing to Share. Sharing an empty canvas is blocked with "Add a photo first". The start sheet for a new canvas shows up to three shared canvases as small fridge doors with "See all"; they open view-only. On phones the bar reads "Add · Invite · Share". `useGallery()` and `FridgeTile` are shared by the gallery page and the preview.
- Why: Inviting friends (private) and posting publicly were one sheet, so public sharing was hard to find and easy to confuse with inviting. First-time visitors had no way to hear what the app makes before starting.
- Files: `web/src/App.tsx`, `web/src/styles.css`. Most of this landed in commit `230b49c`, made by a parallel Devin session working in the same checkout; this entry describes it.
- Validation: `tsc --noEmit` passes; local `wrangler dev` build captured in headless Chrome at 375×812 and 1280×800: start sheet with preview, preview tile opens `?room=…&view=1`, Share sheet (empty, listed), Invite sheet, bottom bar fits on phone.
- Limitations: The preview is hidden when the gallery is empty or unreachable. Only checked locally with one listed canvas, not on the deployed site.

## 2026-10-25T00:45:00+05:30 — Public gallery opens canvases view-only

- Changed: Gallery cards link to `/?room=<id>&view=1`. View mode joins the room straight away (no join sheet), keeps pan, zoom and play/stop, and hides editing: no drag, select, mute, delete, add, invite or share controls, plus a "View only" note and a "Make your own" link in the bar. Share/publish copy now says visitors can look and listen, not add photos.
- Why: Public gallery links previously gave full edit access to anyone.
- Validation: `npm --prefix web run build` passes.
- Limitations: View-only is enforced in the UI, not the server — y-partyserver has no readonly mode, so a crafted client could still write to the room doc.

## 2026-10-25T00:30:00+05:30 — Camera in Add photo, canvas names in the gallery, code view as a debug button

- Changed: "Take a photo" in the Add-photo sheet opens the live camera (`Camera.tsx`, falls back to the phone camera app where getUserMedia is unavailable). The publish sheet now offers an optional canvas name, sent with the publish POST; the worker stores it on the Room DO and the Gallery lists it (`name` column added via ALTER for existing tables). Gallery cards show the name as the title with "by <names>" in the meta line. "See the code" moved out of the "⋯" menu to a `?dev`-only floating button at the bottom right.
- Why: The redesign's new Add-photo sheet had no camera option, and gallery canvases were titled only by participant names.
- Validation: `npm --prefix web run build` and `node --check worker/index.js` pass.
- Limitations: Publishing twice refreshes the stored name. The debug button overlaps the canvas edge on very small screens by design.

## 2026-10-24T23:55:00+05:30 — Merge react-flow-rooms into main, deploy to Cloudflare

- Changed: Merged `origin/main` (logging, camera capture, Options menu) with `react-flow-rooms` (permanent rooms, photos in R2, safety moderation, public gallery). Conflict resolutions: `worker/index.js` keeps persistent rooms + Gallery and adds main's structured logging and robust Jev reply parsing; `App.tsx` keeps Camera, publish/gallery UI, and `PhotoRejected` handling, dropping the top-bar Code button and `DEV` model select (now covered by the Options menu); `styles.css`, `server/app.py`, `AI_USAGE.md`, `CHANGELOG.md` keep both sides.
- Why: Deploy the full feature set to `main`.
- Validation: `npm --prefix web run build`, `npx tsc -b`, `node --check worker/index.js`, `python3 -m py_compile server/app.py` passed. `wrangler deploy` succeeded; `/api/health` returns `{"ok":true,"models":["jev"]}` and `/api/gallery` returns an empty room list.
- Limitations: Gallery returned no published rooms after deploy. Merge exercised endpoints only; room sync and camera flow not re-tested end to end on the deployed worker.

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
