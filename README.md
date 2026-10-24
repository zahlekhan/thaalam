# Thaalam

Drop photos on a canvas, hear them become one original music loop.

Built at the hackathon from scratch. **[Agent instructions](AGENTS.md)** · **[Design notes](CONTEXT.md)**

## Project overview

- **Project name:** Thaalam
- **Short description:** Each photo becomes a card that plays one part of a loop (kick, percussion, bass, chords, melody or texture). A vision model reads the photo's mood, energy, texture and role; the browser turns that reading plus pixel measurements into a Strudel pattern. Cards on the stage play together; cards off the stage are silent. It's a playful way for anyone, musician or not, to make an original loop from their own photos.
- **Team:** TODO — participant names and GitHub handles; maximum 4 members.
- **Working demo:** TODO — deployed Cloudflare Workers URL. Local steps are below.
- **Technology stack:** React 19, TypeScript, Vite 8, tldraw, Strudel (`@strudel/web`) in `web/`; Python FastAPI in `server/` (local); Cloudflare Worker in `worker/` (hosted); Jev (TypeSafe) and vegaml vision models.

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
   Add `?dev` to the URL to switch between the models the server reports in `/api/health`.
5. **Checks:** `npm --prefix web run build` (TypeScript check plus Vite build). There are no automated tests yet.

### Deploy

- **Cloudflare Workers (single origin):** `npm install`, `npx wrangler secret put TYPESAFE_API_KEY`, then `npm run deploy`. The Worker serves `web/dist` and answers `/api/health` and `/api/analyze` with Jev only. Use `npm run dev:worker` to try it locally.
- **Separate backend (alternative):** `cd server && fly deploy` with `fly secrets set TYPESAFE_API_KEY=... ALLOWED_ORIGINS=https://<frontend-host>`, and build the frontend with `VITE_API_URL=https://<backend-host>`.

### Current status

- **Working features:** tldraw canvas with a stage frame; drop, paste or upload photos to make cards; cards on the stage play and cards off it stay silent; a mix of tempo, scale and parts across all stage cards; a tray of 6 sample photos with precomputed Jev readings; a code view showing the generated Strudel pattern; a `?dev` model picker; local FastAPI server and hosted Cloudflare Worker.
- **Known limitations:** Rooms (multiplayer) are not built yet. vegaml is local-only and is not available on Cloudflare. The key is fixed and all cards play at the same volume. If the model call fails, a card plays from pixel measurements alone. tldraw shows its SDK license watermark. `server/dev.sh` falls back to reading the key from `../../seefood/.dev.vars`.
- **Libraries, APIs, and public datasets used:** [tldraw](https://tldraw.dev) (SDK license, watermark on free use), [Strudel](https://strudel.cc) (`@strudel/web`, `@strudel/soundfonts`, AGPL-3.0), [React](https://react.dev), [Vite](https://vite.dev), [FastAPI](https://fastapi.tiangolo.com), [Pillow](https://python-pillow.org), [httpx](https://www.python-httpx.org), [Jev / TypeSafe API](https://typesafe.ai), vegaml (local open model, Apache 2.0), [Cloudflare Workers](https://developers.cloudflare.com/workers/). Sample photos are from Unsplash under the Unsplash License; see [web/public/samples/CREDITS.md](web/public/samples/CREDITS.md).

See [AI_USAGE.md](AI_USAGE.md) for AI assistance and [CHANGELOG.md](CHANGELOG.md) for the development record.
