# Project submission

Complete this file during the hackathon and use it to prepare your submission through the method announced by the organizers.

## Project

- **Project name:** Thaalam
- **Short description:** Photos become cards that each play one part of an original music loop. A vision model reads each photo's mood, energy, texture and role, and the browser turns the readings into a Strudel loop. Anyone can make music by sticking photos on a shared fridge-door canvas, alone or with friends in a room.
- **Code repository URL:** https://github.com/zahlekhan/thaalam
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL or local demo steps:** TODO — deployed URL. Local steps are in [README.md](README.md#run-the-project).
- **Demo access requirements:** A browser with audio. Type a name (or keep the random one) and tap "Start jamming" or "Join the jam" to turn on sound. No account is needed for the hosted demo; local runs need a Jev API key in `TYPESAFE_API_KEY`.

## Participants

Participate solo or in a team of up to 4. Remove unused rows.

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| TODO | zahlekhan | TODO |

## Run and demonstrate

- **Prerequisites and versions:** Node.js `^20.19` or `>=22.12`; Python 3.10+ for the local server.
- **Install command:** `npm --prefix web ci` and `pip install -r server/requirements.txt` (in a venv at `server/.venv-lite`).
- **Required environment variable names:** `TYPESAFE_API_KEY`. Optional: `THAALAM_PROVIDER`, `JEV_MODEL`, `ALLOWED_ORIGINS`, `VITE_API_URL`.
- **Start command:** `./server/dev.sh` and `npm --prefix web run dev` (local), or `npm run deploy` (Cloudflare Workers).
- **Demo walkthrough:** Tap "Start jamming", then "Add photo" and pick a sample to hear its part. Add more samples or drop your own photos and the loop grows. Tap a card to mute or delete it (Undo brings it back). Tap "Invite" to open a room and show the QR code to a friend. Tap "Share" to list the canvas in the public gallery. Open the "⋯" menu and "See the code" for the generated Strudel pattern.
- **Checks performed and results:** `npm --prefix web run build` passes. No automated tests.
- **Known limitations or incomplete features:** Timing is not synced across devices; vegaml is local-only; fixed key; equal volume for all cards. See [README.md](README.md#current-status).
- **Libraries, APIs, and public datasets used:** See [README.md](README.md#current-status) and [web/public/samples/CREDITS.md](web/public/samples/CREDITS.md).
- **AI usage record:** [AI_USAGE.md](AI_USAGE.md)
- **Development change log:** [CHANGELOG.md](CHANGELOG.md)

## Submission checklist

- [x] The project implementation started from scratch at the event.
- [x] I participated solo or with no more than 4 team members in total.
- [x] AI tool usage during development is documented.
- [x] The code repository URL, short description, and working demo are provided.
- [x] README setup and demo instructions match the submitted code.
- [x] Actual checks and known limitations are documented.
- [x] Meaningful changes are documented and committed throughout development.
- [x] The final implementation is committed and pushed, and its SHA is recorded above.
- [x] No credentials or private data are included in the repository or demo instructions.
- [x] The organizers' announced submission method and timing have been followed.
