// Thaalam on Cloudflare: serves the web/dist build and answers /api/* so the
// frontend works unchanged. Ports server/app.py (FastAPI) — Jev is the only
// model here; vegaml stays local-only.

import { routePartykitRequest, Server } from "partyserver";
import { YServer } from "y-partyserver";
import * as Y from "yjs";

function galleryStub(env) {
  return env.Gallery.get(env.Gallery.idFromName("gallery"));
}

// One shared canvas per room (/parties/room/<id>). The Yjs doc is persisted in
// the Durable Object's storage — rooms are permanent. Publishing a room lists
// it in the public gallery.
export class Room extends YServer {
  onConnect(conn, ctx) {
    console.log({ event: "room.connect", room: this.name, conn: conn.id });
    return super.onConnect(conn, ctx);
  }

  onClose(conn, code, reason, wasClean) {
    console.log({ event: "room.close", room: this.name, conn: conn.id, code, wasClean });
    return super.onClose(conn, code, reason, wasClean);
  }

  onError(conn, error) {
    console.error({ event: "room.error", room: this.name, conn: conn.id, error: String(error) });
  }

  async onLoad() {
    const update = await this.ctx.storage.get("doc");
    if (update) Y.applyUpdate(this.document, update);
  }

  async onSave() {
    await this.ctx.storage.put("doc", Y.encodeStateAsUpdate(this.document));
    // Keep a published room's gallery entry fresh as the canvas changes.
    if (await this.ctx.storage.get("published")) await this.registerWithGallery();
  }

  // HTTP requests that reach this DO (from /api/rooms/<id>/...).
  async onRequest(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/publish") {
      await this.ctx.storage.put("published", true);
      await this.registerWithGallery();
      return json({ ok: true });
    }
    if (request.method === "POST" && url.pathname === "/unpublish") {
      await this.ctx.storage.delete("published");
      await galleryStub(this.env).fetch(new Request("https://gallery/remove", { method: "POST", body: JSON.stringify({ room: this.name }) }));
      return json({ ok: true });
    }
    if (request.method === "GET") {
      return json({ published: !!(await this.ctx.storage.get("published")) });
    }
    return new Response("Not found", { status: 404 });
  }

  // Snapshot for the public gallery: first few R2-backed photo URLs + card count.
  // Inline data-URL photos (e.g. samples) are skipped — they'd bloat the listing.
  async registerWithGallery() {
    const previews = [];
    for (const src of this.document.getMap("photos").values()) {
      if (typeof src === "string" && src.startsWith("/photos/")) previews.push(src);
      if (previews.length >= 4) break;
    }
    // Who made it and how it feels, so the gallery can title it with something human.
    const names = new Set();
    const moods = {};
    for (const card of this.document.getMap("cards").values()) {
      if (card?.by) names.add(card.by);
      try {
        const mood = card?.model && JSON.parse(card.model).answers?.mood?.choice;
        if (mood) moods[mood] = (moods[mood] ?? 0) + 1;
      } catch {}
    }
    const mood = Object.entries(moods).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    await galleryStub(this.env).fetch(
      new Request("https://gallery/upsert", {
        method: "POST",
        body: JSON.stringify({
          room: this.name,
          cards: this.document.getMap("cards").size,
          previews,
          names: [...names].slice(0, 3),
          mood,
          at: Date.now(),
        }),
      })
    );
  }
}

// Registry of rooms that were shared publicly. Single instance, SQLite storage.
export class Gallery extends Server {
  onStart() {
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS rooms (room TEXT PRIMARY KEY, at INTEGER NOT NULL, cards INTEGER NOT NULL, previews TEXT NOT NULL)"
    );
    // Added later: who made the canvas and its mood. Older tables get the columns here.
    for (const col of ["names TEXT NOT NULL DEFAULT '[]'", "mood TEXT NOT NULL DEFAULT ''"]) {
      try {
        this.ctx.storage.sql.exec(`ALTER TABLE rooms ADD COLUMN ${col}`);
      } catch {
        // Column already exists.
      }
    }
  }

  async onRequest(request) {
    if (request.method === "POST") {
      const body = await request.json();
      if (new URL(request.url).pathname === "/remove") {
        this.ctx.storage.sql.exec("DELETE FROM rooms WHERE room = ?", body.room);
      } else {
        this.ctx.storage.sql.exec(
          "INSERT INTO rooms (room, at, cards, previews, names, mood) VALUES (?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(room) DO UPDATE SET at = excluded.at, cards = excluded.cards, previews = excluded.previews, " +
            "names = excluded.names, mood = excluded.mood",
          body.room,
          body.at ?? Date.now(),
          body.cards ?? 0,
          JSON.stringify(body.previews ?? []),
          JSON.stringify(body.names ?? []),
          body.mood ?? ""
        );
      }
      return json({ ok: true });
    }
    const rows = this.ctx.storage.sql
      .exec("SELECT room, at, cards, previews, names, mood FROM rooms ORDER BY at DESC LIMIT 200")
      .toArray();
    return json({ rooms: rows.map((r) => ({ ...r, previews: JSON.parse(r.previews), names: JSON.parse(r.names) })) });
  }
}

const JEV_URL = "https://api.typesafe.ai/v1/systemone";

// One question set. Choice questions only, same as server/app.py — but with
// "this photo" already swapped for the `photo` state reference Jev expects.
const JEV_QUESTIONS = {
  mood: {
    type: "choice",
    instructions: "What is the overall mood of `photo`?",
    criteria: {
      calm: "peaceful, quiet, still, relaxed",
      happy: "cheerful, bright, warm, light-hearted",
      tense: "dramatic, dark, uneasy, intense",
      festive: "celebration, party, crowd, lights, colour",
      melancholy: "sad, lonely, rainy, nostalgic, grey",
    },
  },
  energy: {
    type: "choice",
    instructions: "How much energy or movement does `photo` have?",
    criteria: {
      "1": "very still, empty, nothing happening",
      "2": "gentle, slow, a little life",
      "3": "moderate, everyday activity",
      "4": "lively, busy, moving",
      "5": "wild, packed, fast, explosive",
    },
  },
  texture: {
    type: "choice",
    instructions: "Which material or feel best describes `photo`?",
    criteria: {
      wooden: "wood, clay, handmade, rustic, earthy",
      organic: "plants, food, skin, water, nature",
      metallic: "metal, glass, machines, shiny hard surfaces",
      electronic: "screens, neon, city lights, digital",
      airy: "sky, fog, open space, soft light, distance",
    },
  },
  role: {
    type: "choice",
    instructions: "If `photo` were one player in a band, which part would it play?",
    criteria: {
      kick: "heavy, bold, a single strong subject, a solid base",
      percussion: "many small repeated details, patterns, crowds, texture",
      bass: "dark, deep, low, grounded, shadowy",
      chords: "warm, cosy, a full balanced scene",
      melody: "one clear subject that stands out, a story, a face",
      texture: "wide, soft, empty, sky, background atmosphere",
    },
  },
  safety: {
    type: "choice",
    instructions: "Does `photo` show nudity, sexual content, or profanity (rude words, obscene gestures)?",
    criteria: {
      clean: "none of that — an ordinary photo",
      flagged: "nudity, sexual content, profanity, or obscene gestures visible",
    },
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function health(env) {
  return json({
    ok: true,
    default: "jev",
    models: env.TYPESAFE_API_KEY ? ["jev"] : [],
  });
}

function base64(buf) {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(out);
}

async function analyze(request, env, url) {
  if (request.method !== "POST") return json({ detail: "Method not allowed" }, 405);
  const model = url.searchParams.get("model") ?? "jev";
  if (model !== "jev" || !env.TYPESAFE_API_KEY) {
    console.warn({ event: "analyze.rejected", reason: "model unavailable", model, jevKey: !!env.TYPESAFE_API_KEY });
    return json({ detail: `${model} isn't available on this server` }, 400);
  }
  let photo;
  try {
    photo = (await request.formData()).get("photo");
  } catch {
    return json({ detail: "Expected a multipart photo upload" }, 400);
  }
  if (!(photo instanceof File)) return json({ detail: "No photo in the upload" }, 400);
  if (photo.size > 15 * 1024 * 1024) {
    console.warn({ event: "analyze.rejected", reason: "too big", bytes: photo.size });
    return json({ detail: "Photo is too big" }, 413);
  }

  // The client already shrinks to JPEG <=512px (reading.ts shrink()), so the
  // bytes go straight to Jev — no server-side image step needed.
  const started = Date.now();
  const ref = crypto.randomUUID();
  let r;
  try {
    r = await fetch(JEV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
        "Content-Type": "application/json",
        "TypeSafe-Danger-Zone-Images": "true",
      },
      body: JSON.stringify({
        model: env.JEV_MODEL || "jev-latest",
        state: { photo: ref },
        assets: {
          [ref]: { type: "image", format: "jpg", data_base64: base64(await photo.arrayBuffer()) },
        },
        questions: JEV_QUESTIONS,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    console.error({ event: "jev.unreachable", error: String(e), ms: Date.now() - started });
    return json({ detail: `Couldn't reach Jev: ${e.name}` }, 502);
  }
  if (!r.ok) {
    const body = (await r.text()).slice(0, 500);
    console.warn({ event: "jev.error", status: r.status, body, ms: Date.now() - started });
    return json({ detail: `Jev said ${r.status}: ${body.slice(0, 200)}` }, 502);
  }

  const text = await r.text();
  let out;
  try {
    out = JSON.parse(text).answers;
  } catch (e) {
    console.error({ event: "jev.bad_reply", error: String(e), body: text.slice(0, 500) });
    return json({ detail: "Jev sent an unexpected reply" }, 502);
  }
  if (out.safety?.choice === "flagged") {
    console.warn({ event: "analyze.rejected", reason: "safety flagged", bytes: photo.size });
    return json({ detail: "That photo isn't allowed — no nudity or profanity." }, 422);
  }
  delete out.safety; // moderation result stays server-side, never reaches a card
  const answers = Object.fromEntries(
    Object.entries(out).map(([q, a]) => [
      q,
      {
        choice: a.choice,
        prob: a.probabilities[a.choice],
        unsure: (a.confidence ?? 1) < 0.35,
      },
    ])
  );
  const ms = Date.now() - started;
  console.log({
    event: "analyze",
    model: "jev",
    bytes: photo.size,
    ms,
    ...Object.fromEntries(Object.entries(answers).map(([q, a]) => [q, a.choice])),
  });
  return json({ model: "jev", ms, answers });
}

async function uploadPhoto(request, env) {
  if (request.method !== "POST") return json({ detail: "Method not allowed" }, 405);
  let photo;
  try {
    photo = (await request.formData()).get("photo");
  } catch {
    return json({ detail: "Expected a multipart photo upload" }, 400);
  }
  if (!(photo instanceof File)) return json({ detail: "No photo in the upload" }, 400);
  if (photo.size > 15 * 1024 * 1024) return json({ detail: "Photo is too big" }, 413);
  const key = `photos/${crypto.randomUUID()}.jpg`;
  await env.PHOTOS.put(key, await photo.arrayBuffer(), {
    httpMetadata: { contentType: "image/jpeg" },
  });
  return json({ url: `/${key}` });
}

function servePhoto(env, url) {
  // Keys are unguessable UUIDs, so a URL is shareable but not enumerable.
  return env.PHOTOS.get(url.pathname.slice(1)).then(
    (obj) =>
      obj
        ? new Response(obj.body, {
            headers: {
              "Content-Type": obj.httpMetadata?.contentType ?? "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          })
        : new Response("Not found", { status: 404 })
  );
}

// /api/rooms/<id>          → { published }
// /api/rooms/<id>/publish  → mark public, add to gallery
// /api/rooms/<id>/unpublish
function roomAction(request, env, url) {
  const m = url.pathname.match(/^\/api\/rooms\/([^/]+)(\/publish|\/unpublish)?$/);
  if (!m) return json({ detail: "Not found" }, 404);
  const stub = env.Room.get(env.Room.idFromName(m[1]));
  const path = m[2] ?? "/status";
  return stub.fetch(new Request(`https://room${path}`, { method: request.method }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return health(env);
    if (url.pathname === "/api/analyze") return analyze(request, env, url);
    if (url.pathname === "/api/photos") return uploadPhoto(request, env);
    if (url.pathname === "/api/gallery") {
      return galleryStub(env).fetch(request);
    }
    if (url.pathname.startsWith("/api/rooms/")) return roomAction(request, env, url);
    if (url.pathname.startsWith("/photos/")) return servePhoto(env, url);
    if (url.pathname.startsWith("/parties/")) {
      return (await routePartykitRequest(request, env)) ?? new Response("Not found", { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
