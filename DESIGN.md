---
name: Thaalam
description: A shared fridge door where friends stick up photos and hear them play as one loop.
colors:
  enamel: "#cdefe0"
  enamel-hi: "#e6f8ef"
  enamel-lo: "#bfe6d3"
  paper: "#ffffff"
  ink: "#1b1b1f"
  ink-soft: "#3d4a44"
  line: "#d3e3dc"
  wash: "#eef6f2"
  kick: "#e8322b"
  percussion: "#ffc41f"
  bass: "#1e5bd8"
  chords: "#1fa34a"
  melody: "#8a4fe0"
  texture: "#ff7a1a"
  magnet-idle: "#b7c4be"
  go: "#c8231d"
  go-hover: "#a91c17"
  invite: "#1e5bd8"
  invite-hover: "#1749b0"
  danger: "#8f1a15"
typography:
  wordmark:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "clamp(32px, 6vw, 48px)"
    fontWeight: 800
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
  action:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 650
  lede:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.45
  control:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 650
  status:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    fontFeature: "tnum"
  caption:
    fontFamily: "'Rubik Variable', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "13px"
    lineHeight: 1.5
rounded:
  print-mini: "3px"
  print: "4px"
  print-sample: "6px"
  control: "12px"
  panel: "16px"
  bar: "24px"
  pill: "999px"
spacing:
  hair: "2px"
  xs: "4px"
  icon-gap: "6px"
  u: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
  4xl: "40px"
components:
  button-go:
    backgroundColor: "{colors.go}"
    textColor: "{colors.paper}"
    typography: "{typography.action}"
    rounded: "{rounded.panel}"
    padding: "0 20px"
    height: "52px"
  button-go-hover:
    backgroundColor: "{colors.go-hover}"
  button-play:
    backgroundColor: "{colors.go}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    size: "56px"
  button-play-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-play-loading:
    backgroundColor: "{colors.magnet-idle}"
    textColor: "{colors.ink}"
  button-invite:
    backgroundColor: "{colors.invite}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.panel}"
    height: "52px"
  button-invite-hover:
    backgroundColor: "{colors.invite-hover}"
  button-bar:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.panel}"
    height: "52px"
  button-big:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.action}"
    rounded: "{rounded.panel}"
    height: "56px"
  button-text:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  chip-status:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.status}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip-status-changed:
    backgroundColor: "{colors.percussion}"
    textColor: "{colors.ink}"
  chip-person:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-person-me:
    backgroundColor: "{colors.enamel}"
  card-print:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.print}"
    padding: "8px 8px 0"
    width: "160px"
    height: "200px"
  magnet:
    backgroundColor: "{colors.kick}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "36px"
  magnet-muted:
    backgroundColor: "{colors.magnet-idle}"
  control-bar:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.bar}"
    padding: "8px"
    width: "min(100% - 24px, 560px)"
  selection-pill:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "20px"
    padding: "6px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    padding: "6px 6px 6px 16px"
  toast-error:
    backgroundColor: "{colors.danger}"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bar}"
    padding: "20px"
    width: "480px"
  input-name:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "14px"
    padding: "0 16px"
    height: "52px"
  input-link:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "48px"
---

# Design System: Thaalam

## Overview

**Creative North Star: "The Fridge Door"**

The canvas is the shared fridge door everyone sticks things to. A glossy mint enamel ground carries white-bordered photo prints hung at small random angles, each held by a chunky plastic magnet in its role's colour. Everything else (the control bar, the status chip, the sheets) is white plastic or paper resting on the same door, so the interface reads as household objects rather than software chrome.

Density is low and tactile. Cards are one fixed size and land wherever people drop them; there is no grid, stage or lane to tidy them into. State lives on the object itself: a muted card's magnet goes grey and its photo desaturates, a card still being read shows a striped placeholder with a grey magnet, and a tempo or mood change turns the status chip yellow until someone notices. Motion comes from the music: each magnet bounces on its own card's notes, and it stays still under reduced motion.

The world refuses the whiteboard with a dashed stage and the dark DAW mixer. Dark ink appears only as small transient overlays (the selected-card pill, the toast, the code view) and as the solid commit button inside a sheet. The ground itself is never dark.

**Key Characteristics:**
- Mint enamel ground with a soft top-left sheen, never flat white or dark.
- White paper prints (160 x 200px) at a random tilt between -6 and 6 degrees.
- One glossy plastic magnet per card, coloured by role, grey when muted or still being read.
- Rubik for everything; heavy 900 only for the multicolour magnet-letter wordmark.
- Thumb-reach white control bar at the bottom, status chip at top right.
- Authored stroke icons on one 24px grid, 2.2 stroke, round caps and joins.
- One 8px unit drives card size, magnet size, bar heights and spacing.

## Colors

A cool mint household ground, white paper and plastic, near-black ink, and six primary-plastic magnet colours that each mean one musical role.

### Primary
- **Go Red** (go): the one "do it" colour. Round Play button, Join the jam, Publish. A deeper cut of Kick Red so white text clears AA. Hover darkens to **Go Red Pressed** (go-hover).

### Secondary
- **Invite Blue** (invite): Invite and Copy link only, the social action. Same value as Bass Blue; hover darkens to **Invite Blue Pressed** (invite-hover).

### Tertiary (the magnet set)
Role colours exist to tell parts apart across the room. They fill magnets, the wordmark letters and gallery mini-magnets, and nothing else.
- **Kick Red** (kick)
- **Sticker Yellow** (percussion): also the "the mix just changed" highlight on the status chip, the text-selection colour, and the action-text and focus-ring colour on dark ink surfaces.
- **Bass Blue** (bass)
- **Leaf Green** (chords)
- **Grape Purple** (melody)
- **Tangerine** (texture)
- **Idle Grey** (magnet-idle): a magnet with no voice. Muted cards, cards still being read, and the Play button while sounds load.

### Neutral
- **Mint Enamel** (enamel): the door. Body ground, and the "you" chip in the people list.
- **Enamel Sheen** (enamel-hi): the radial highlight at the top-left of the ground and the light stripe of the Listening placeholder.
- **Enamel Shade** (enamel-lo): the gallery's mini fridge doors.
- **Paper White** (paper): prints, control bar, sheets, status chip, menu.
- **Ink** (ink): all primary text, the selection ring, the focus outline, and the dark transient overlays.
- **Soft Ink** (ink-soft): secondary lines under card titles, hints, ledes, captions.
- **Hairline** (line): input borders and the QR frame.
- **Mint Wash** (wash): quiet fills inside white surfaces: neutral bar buttons, hover rows, the link field, people chips, the photo well.
- **Brick** (danger): the error toast.

### Named Rules
**The Magnet Owns the Colour Rule.** Role colours never fill buttons, panels or text blocks. If a surface is coloured by role, it is a magnet (or a wordmark letter).

**The Deep Cut Rule.** When a role colour must carry white text it is replaced by its deep cut (go for kick, invite for bass), never used raw.

**The One Highlight Rule.** Sticker Yellow behind ink means "something changed, look". It is not decoration.

## Typography

**Display Font:** Rubik Variable (with system-ui, sans-serif)
**Body Font:** Rubik Variable (same family)
**Label/Mono Font:** ui-monospace, SF Mono, Menlo (Code view only)

**Character:** One rounded, friendly grotesque used across a wide weight range, so hierarchy comes from weight and size rather than a second family. The heavy end reads like alphabet magnets; the regular end stays plain and legible.

### Hierarchy
- **Wordmark** (900, 32px; 26px at 420px and below; 44px in the join sheet; line-height 1, -0.02em): "thaalam" only, each letter in a magnet colour with a slight drop shadow.
- **Headline** (800, clamp(32px, 6vw, 48px), -0.02em): the gallery page title. The join sheet's "Join the jam" uses 750 at 28px, -0.01em.
- **Title** (700, 22px, 1.25): sheet headings and the empty-canvas hint.
- **Action** (650, 17px): solid commit buttons (Add from photos, Join, Publish).
- **Lede** (400, 17px, 1.45): introductory sentence in join and gallery, max 60ch.
- **Control** (600, 16px; 15px at 420px and below): bottom-bar buttons. Menu rows use 500 at 16px.
- **Body** (400, 15px, 1.45): hints, publish copy, toasts.
- **Label** (650, 15px): card titles (instrument), selection pill name, sheet subheads.
- **Status** (600, 14px, tabular numerals): the status chip, so BPM digits do not jitter.
- **Caption** (400, 13px, 1.5, Soft Ink): card meta line, fine print, credits.

### Named Rules
**The One Family Rule.** Rubik carries every role; contrast comes from weight (400 to 900), never from a second display face.

## Layout

The canvas fills the viewport; floating chrome sits on top of it in fixed positions. The wordmark is top-left and the status chip top-right, with 16px insets that respect the safe area. The control bar is centred at the bottom, `min(100% - 24px, 560px)` wide, in thumb reach. The selected-card pill and the toast stack directly above the bar at the same width (the toast rises further when a selection is showing).

Spacing runs on an 8px unit with half and quarter steps: 8, 12, 16, 20, 24, 32, 40. A 6px gap separates icons from their labels inside buttons. Cards are 20 x 25 units (160 x 200px) with a 132px photo well; magnets are 4.5 units (36px). Bar controls are 52px tall, the Play button 56px, and every tap target is at least 44px.

Sheets are bottom sheets on phones (full width, 88vh max) and become centred 480px dialogs from 640px up. At 420px and below, the wordmark shrinks, the Invite icon and "here" text drop, and the invite QR stacks above the link. The gallery is a 1120px max column with an auto-fill grid of 260px minimum tracks.

### Named Rules
**The No Stage Rule.** The canvas has no frame, grid, lanes or drop zone. Cards stay exactly where people leave them.

## Elevation & Depth

Depth is physical and soft: objects on the door cast diffuse, green-tinted shadows (rgba(28, 70, 52, ...)) as if lit from above, and plastic objects carry an inner lip. There are no hard offset shadows.

### Shadow Vocabulary
- **Print** (`box-shadow: 0 6px 14px rgba(28, 70, 52, 0.22), 0 1px 2px rgba(28, 70, 52, 0.18)`): photo prints, sample tiles, gallery mini prints.
- **Lift** (`box-shadow: 0 10px 28px rgba(28, 70, 52, 0.22)`): floating chrome: control bar, menu, sheets, selection pill, toast.
- **Peel** (`box-shadow: 0 14px 28px rgba(28, 70, 52, 0.3), 0 2px 4px rgba(28, 70, 52, 0.2)`): a print while it is being dragged off the door.
- **Chip** (`box-shadow: 0 2px 8px rgba(28, 70, 52, 0.14)`): status chip and gallery back link.
- **Magnet gloss** (`box-shadow: inset 0 -4px 0 rgba(0,0,0,0.18), inset 0 3px 2px rgba(255,255,255,0.45), 0 4px 6px rgba(0,0,0,0.28)`): the plastic dome of a magnet.
- **Plastic lip** (`box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.2)`): Go Red buttons (Play, primary), so they read as the same plastic as the magnets.
- **Selection ring** (`box-shadow: 0 0 0 3px #1b1b1f` stacked over Print): a selected or focused print, a hovered sample.

### Named Rules
**The Door Light Rule.** Every drop shadow falls straight down and is tinted green from the enamel, never neutral black, except the magnet's own contact shadow.

## Shapes

Paper is nearly square-cornered (prints 4px, sample tiles 6px, gallery mini prints 3px). Plastic and controls are generously rounded: 12px for small controls and fields, 16px for bar buttons, toasts and menus, 24px for the control bar and sheets, and full pills for the status chip, people chips and the gallery back link. Magnets and the Play button are perfect circles. Prints are rotated by hand (random -6 to 6 degrees, one decimal); controls are never rotated.

## Components

### Buttons
Chunky, plastic, thumb-sized.
- **Shape:** 16px radius for bar and commit buttons, 12px for small and text buttons, circular for Play.
- **Go (primary):** Go Red with white Action text, 52px tall, 20px side padding, plastic lip. Hover deepens to Go Red Pressed.
- **Play:** 56px Go Red circle with plastic lip; Ink while playing (shows Stop); Idle Grey with ink icon while sounds load.
- **Invite / Copy:** Invite Blue with white text; hover to Invite Blue Pressed.
- **Bar (neutral):** Mint Wash fill, Control text, 52px; icon-only variant is 52px square.
- **Big (sheet commit):** full-width Ink, 56px, white Action text.
- **Text:** no fill, underlined with 3px offset, 44px min height; hover adds a 6% ink wash.
- **Focus:** a 3px Ink outline offset 2px everywhere; Sticker Yellow on dark ink surfaces.

### Chips
- **Status:** white pill, Status type, Chip shadow; turns Sticker Yellow (0.3s) when tempo or mood changes and holds until tapped or noticed.
- **People:** Mint Wash pills in the invite sheet; "you" is Mint Enamel.

### Cards / Containers
- **Print (signature):** Paper White, 4px radius, Print shadow, 8px padding on top and sides, 132px photo well in Mint Wash, then a Label title and a Caption meta line, both single-line with ellipsis. Selected: Ink ring. Dragging: Peel. Muted: photo greyscale at 50% opacity, grey magnet with a mute glyph. Listening: diagonal Mint Wash and Enamel Sheen stripes, grey magnet, title "Listening…".
- **Sheet:** Paper White, 24px top corners (all corners at 640px and up), 20px padding, Lift.
- **Publish panel:** Mint Wash block inside a sheet, 16px radius, 16px padding.
- **Gallery fridge:** a 220px Enamel Shade mini door, 18px radius, with up to four tilted mini prints and 16px mini magnets; hover or focus adds an Ink ring.

### Inputs / Fields
- **Name field:** white, 2px Hairline border, 14px radius, 52px tall, 17px text; focus swaps the border to Ink instead of an outline.
- **Link field:** Mint Wash, 2px Hairline border, 12px radius, 48px, 14px text, paired with Copy.

### Navigation
- **Control bar:** white 24px-radius bar with Lift holding Play, Add photo, Invite and a More button. The More menu is a white 16px panel of 48px rows that take a Mint Wash hover.
- **Selected-card pill:** Ink bar, 20px radius, above the control bar; 44px thumbnail, Label name, Caption meta, then Mute and Delete as ghost buttons with a 14% white hover.
- **Toast:** Ink bar, 16px radius, Body text; action in Sticker Yellow bold; Brick for errors.

### Magnet (signature)
A 36px glossy dome centred on the top edge of a print, overlapping it by 14px, filled with its role colour. On each note the card plays it bounces (translateY -5px, scale 1.14, 240ms, cubic-bezier(0.16, 1, 0.3, 1)) timed to the audio clock. It turns Idle Grey when muted or still being read. The magnet is the legend: there is no separate role key.

### Icons
Authored inline SVG strokes on a 24px grid, stroke 2.2, round caps and joins, `currentColor`, 22px by default and 16px inside magnets.

## Do's and Don'ts

### Do:
- **Do** hang every photo as a white print with its role magnet on top and a random tilt between -6 and 6 degrees.
- **Do** show card state on the magnet and the print (grey magnet, greyscale photo, stripes), never in a legend or separate list.
- **Do** derive sizes and spacing from the 8px unit, and keep every tap target at least 44px.
- **Do** keep primary controls in the bottom bar in thumb reach, at most 560px wide.
- **Do** tint drop shadows with the enamel green (rgba(28, 70, 52, ...)).
- **Do** drive decorative motion only from the audio clock, and keep it still under prefers-reduced-motion.
- **Do** use the deep cuts (go, invite) when a coloured surface carries white text.

### Don't:
- **Don't** add a stage frame, grid, lanes or drop zone to the canvas.
- **Don't** make the ground dark or turn controls into a mixer; Ink is for small transient overlays and the sheet commit button.
- **Don't** fill buttons, panels or text with raw role colours; they belong to magnets and the wordmark.
- **Don't** use hard offset shadows or neutral black drop shadows.
- **Don't** introduce a second typeface for display; use Rubik weights.
- **Don't** use emoji or glyph characters as icons; draw them on the 24px stroke grid.
- **Don't** rotate controls, sheets or chips; only prints and mini prints hang at an angle.
