---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/styles.css","web/src/CardShape.tsx"]
---

# Canvas app surface (web/src/App.tsx)

Mode: Operate (a playful tool). Covers the canvas, controls, join flow, invite sheet and /gallery.

Audience and job: friends in one room on their phones joining by link; toss photos on, hear them play, mute, delete, invite. Judges see it on a laptop.

Proof and content: the 6 sample photos with real readings; per-card pulse on its own notes.

Constraints: React Flow canvas, Strudel, Yjs rooms unchanged; moderation and "Listening..." placeholders kept; `?dev` model picker kept; WCAG AA contrast; reduced motion respected; React Flow attribution kept (license).

## Direction contract

THESIS: The canvas is the shared fridge door everyone sticks things to. Photos hang at angles, scattered, each held by a chunky plastic magnet in its role colour. Refuses the whiteboard-with-a-dashed-stage and the dark DAW mixer.

OWN-WORLD: Glossy mint enamel ground (#CDEFE0) with a soft sheen; white-bordered photo prints with soft offset shadows; six primary-plastic magnet colours by role (kick red, percussion yellow, bass blue, chords green, melody purple, texture orange); near-black ink; Rubik for everything, heavy for the alphabet-magnet wordmark; white rounded control bar; authored stroke icons. One base unit (8px) sets card, magnet, bar and spacing.

STORY: A friend opens the link, types a name or keeps a random one, taps "Join the jam" and hears the room. They see whose photo is whose, tap a card to mute or delete it (Undo for 5s), add a photo, and invite someone with a QR code.

FIRST VIEWPORT: Phone 390 wide. Top-left the multicolour "thaalam" magnet wordmark; top-right a white status chip "4 playing · 104 BPM · festive". Middle: scattered tilted prints with magnets; a muted card greyed with a grey magnet; the selected card shows a dark pill with Mute and Delete. Bottom, in thumb reach: white bar with a round Play/Stop, "+ Add photo", "Invite · 3 here", and a more menu.

FORM: Fridge Door, candidate 4 of 7 (photo-booth prints, sticker sheets, riso flyer, fridge magnets, board-game table, Memphis pattern, cut-paper collage). seed:388f4b1ff2712be2. Raises: one exact card size (botanical folio); state on the magnet, no legend (convention catalog); tempo/scale change holds highlight until noticed (gate board); one base unit (Crouwel); motion only from the audio clock, still under reduced motion (datamatics). Signature move: the magnet bounces on its card's notes, carries role colour, and goes grey when muted.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
