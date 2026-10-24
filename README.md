# Thaalam

Drop photos on a canvas, hear them become one original music loop.

Built at the hackathon from scratch. **[Agent instructions](AGENTS.md)** · **[Design notes](CONTEXT.md)**

## Project overview

- **Project name:** Thaalam
- **Short description:** Each photo becomes a card that plays one part of a loop (kick, percussion, bass, chords, melody or texture). A vision model reads the photo's mood, energy, texture and role; the browser turns that reading plus pixel measurements into a Strudel pattern. Photos are stuck on a shared "fridge door" canvas, scattered wherever people drop them; every card plays unless someone mutes it. It's a playful way for anyone, musician or not, to make an original loop from their own photos.
- **Team:** zahle khan
- **Working demo:** [Link](https://thaalam.theotherkhan271.workers.dev/)
- **Technology stack:** React 19, TypeScript, Vite 8, React Flow (`@xyflow/react`), Yjs rooms, Strudel (`@strudel/web`) in `web/`; Python FastAPI in `server/` (local); Cloudflare Worker in `worker/` (hosted); Jev (TypeSafe) and vegaml vision models.

### Run the project

1. **Prerequisites:** Node.js `^20.19` or `>=22.12` (Vite 8 needs one of these; older Node fails with "Cannot find native binding"). Python 3.10+ for the local server.
2. **Install dependencies:**
   ```sh
   npm --prefix web ci
   python3 -m venv server/.venv-lite && server/.venv-lite/bin/pip install -r server/requirements.txt
   ```
   Optional: install `vegaml` into `server/.venv` to use the local model. `server/dev.sh` uses `.venv` when vegaml is installed there, otherwise `.venv-lite`.
3. **Environment:** `TYPESAFE_API_KEY` (Jev) is required for Jev readings. Optional: `THAALAM_PROVIDER` (`jev` or `vegaml`, default model), `JEV_MODEL` (default `jev-latest`), `ALLOWED_ORIGINS` (CORS, default `*`), `VITE_API_URL` (frontend API base when the backend is on another origin). Never commit real keys.
4. **Start locally:**
   ```sh
   TYPESAFE_API_KEY=... ./server/dev.sh        # API on http://127.0.0.1:8000
   npm --prefix web run dev                     # app on http://localhost:5180, proxies /api
   ```
   Use the Options menu (bottom right) to switch between the models the server reports in `/api/health`.
5. **Checks:** `npm --prefix web run build` (TypeScript check plus Vite build). There are no automated tests yet.
6. **Logs:** the server logs its settings at startup (default model, available models, whether the Jev key is set, `ALLOWED_ORIGINS`), one line per reading (model, size, time, answers), and every rejected request or Jev failure with the reason. On Cloudflare the same events are logged as JSON objects (`analyze`, `analyze.rejected`, `jev.error`, `jev.unreachable`, `jev.bad_reply`, `room.connect`, `room.close`, `room.error`); see Workers Logs in the dashboard or `npx wrangler tail`. In the browser, failed model readings and a failed `/api/health` are logged to the console with a `[thaalam]` prefix.

### Deploy

- **Cloudflare Workers (single origin):** `npm install`, `npx wrangler secret put TYPESAFE_API_KEY`, then `npm run deploy`. The Worker serves `web/dist` and answers `/api/health` and `/api/analyze` with Jev only. Use `npm run dev:worker` to try it locally.
- **Separate backend (alternative):** `cd server && fly deploy` with `fly secrets set TYPESAFE_API_KEY=... ALLOWED_ORIGINS=https://<frontend-host>`, and build the frontend with `VITE_API_URL=https://<backend-host>`.

### Current status

- **Working features:** a "fridge door" canvas where photos hang at angles, each held by a magnet in its role colour; prints swing from their magnet when anyone drags them, lift off the door on each of their notes (the magnet squashes and stretches), and new cards are pressed onto the door; drop, paste or choose photos, or add one of 6 sample photos with precomputed Jev readings; every card plays unless muted; tap a card to mute, unmute or delete it (delete has Undo); play/stop with a loading state; a join screen where you type a name or get a random one; rooms with an invite sheet (link, copy, QR code, who's here); a separate Share sheet that lists the canvas in the public gallery (`/gallery`), where it opens view-only; a preview of shared canvases on the start screen; a code view showing the generated Strudel pattern; keyboard shortcuts (Space plays or stops, M mutes the selected card, Delete or Backspace deletes it); a `?dev` model picker; local FastAPI server and hosted Cloudflare Worker.
- **Known limitations:** Each device plays the loop on its own clock; timing is not synced across devices. Cards placed on a wide screen can look small on a phone until you zoom in. vegaml is local-only and is not available on Cloudflare. The key is fixed and all cards play at the same volume. If the model call fails, a card plays from pixel measurements alone. React Flow shows its attribution link. `server/dev.sh` falls back to reading the key from `../../seefood/.dev.vars`.
- **Libraries, APIs, and public datasets used:** [React Flow](https://reactflow.dev) (MIT, attribution shown), [Yjs](https://yjs.dev) and `y-partyserver`, [Rubik](https://fonts.google.com/specimen/Rubik) via `@fontsource-variable/rubik` (OFL), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT), [Strudel](https://strudel.cc) (`@strudel/web`, `@strudel/soundfonts`, AGPL-3.0), [React](https://react.dev), [Vite](https://vite.dev), [FastAPI](https://fastapi.tiangolo.com), [Pillow](https://python-pillow.org), [httpx](https://www.python-httpx.org), [Jev / TypeSafe API](https://typesafe.ai), vegaml (local open model, Apache 2.0), [Cloudflare Workers](https://developers.cloudflare.com/workers/). Sample photos are from Unsplash under the Unsplash License; see [web/public/samples/CREDITS.md](web/public/samples/CREDITS.md).

See [AI_USAGE.md](AI_USAGE.md) for AI assistance and [CHANGELOG.md](CHANGELOG.md) for the development record.
