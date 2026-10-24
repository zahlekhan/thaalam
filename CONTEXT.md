# Thaalam

Drop photos on a canvas, hear them become one original music loop. Jam alone or in a room with friends.

Built for Devin Hacks Kochi (Oct 24 to 25, 2026), Track 4: Make Room for Play.

## The idea

A photo becomes a **card**. A card is one part in the loop (drums, bass, chords...) and always plays the same part. That is what lets you mix photos like stems.

## User journey

Solo, on one device (laptop or phone):

1. Open the link. The canvas has a **stage** in the middle and a tray of sample photos.
2. Drop or paste a photo (or drag a sample). It becomes a card: the photo, a glow in its palette colors, a role icon and its reading ("calm 78%").
3. Cards on the stage play. Cards off the stage are parked and silent. A card joins on the next bar.
4. Add photos any time. No limit.
5. The same photo always plays the same part.

With friends:

6. Create a room and share the link. Everyone sees the same canvas and cards on their own device.
7. Anyone can add, move or remove cards. Each device plays the loop on its own clock; timing is not synced across devices.

## Glossary

- **Card**: a photo plus its reading and the part it plays.
- **Reading**: what we learn about a photo. Code reads brightness, warmth, busyness and palette from pixels. The model reads mood, energy, texture and role.
- **Role**: kick, percussion, bass, chords, melody or texture. Fixed per photo.
- **Stage**: the frame on the canvas. Cards inside play.
- **Mix**: everything on the stage, sharing one tempo, key and scale.

## Photo to sound

| Reading | Controls |
|---|---|
| role | which part the card plays |
| texture (wooden, organic, metallic, electronic, airy) x role | instrument (30, one per role and texture) |
| energy 1 to 5 | which pattern from the role's menu (sparse to busy) |
| busyness | straight or syncopated variant |
| brightness | register and filter (dark photos sound darker) |
| mood | melody shape, plus a vote on the mix's scale |
| main colour | which beat and note the melody starts on (12 tunes) |
| palette | breaks ties between similar readings |

Mix level:

- Tempo: average energy, 80 to 128 BPM.
- Scale: mood vote. calm = major pentatonic, happy = major, tense = phrygian, festive = mixolydian, melancholy = minor.
- Key: fixed for now.
- All cards play at the same volume for now.
- Bass and chord notes ring until the next note. Chords, melody and pads share one light reverb; drums and bass stay dry. Percussion is accented on the beat.
- Two cards with the same role take turns every 2 bars.

Patterns come from small hand-written menus per role. The model picks readings; code picks and plays patterns. Melodic parts are written in scale degrees so they fit any key.

## Decisions

- Input is images only. No video, no video export.
- No image hashing. Same photo gives the same reading because the model is a classifier, not a sampler.
- The canvas shows the real photo. Photos are not stored after the session.
- Two model providers behind one question set:
  - **Jev** (TypeSafe hosted API), the default, so anyone can use the app from a link.
  - **vegaml** (local, open model, Apache 2.0) for the laptop demo. Not available on Cloudflare.
  - Developer picker: add `?dev` to the URL to switch between the models the server reports in `/api/health`. Bespoke Nimble was tested and left out: its hosted API accepts text only, not images.
- Canvas: **tldraw** (SDK license watermark on free use, disclosed).
- Sound: **Strudel** (`@strudel/web`, AGPL), so the repo is open source. Tone.js + smplr is the fallback.
- Sample tray: 6 free Unsplash photos (credits in `web/public/samples/CREDITS.md`), with Jev readings precomputed in `samples.json` so they play instantly.
- Original loops only. Never suggest existing songs.
- No backward compatibility worries. Adding instruments may change how old photos sound.

## Layout

- `server/`: Python, FastAPI. `POST /api/analyze?model=jev|vegaml` takes an image, returns a reading. `GET /api/health` lists available models. Run with `./server/dev.sh`.
- `web/`: Vite, React, TypeScript, tldraw, Strudel.

## Build order

1. Canvas with a stage; drop one photo and it plays.
2. Many photos, sample tray, drag in and out of the stage.
3. Rooms.
4. Hosted Jev version, polish.

## Libraries (disclose)

vegaml, Jev (TypeSafe), tldraw, Strudel, FastAPI, React, Vite.
