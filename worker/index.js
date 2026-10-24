// Thaalam on Cloudflare: serves the web/dist build and answers /api/* so the
// frontend works unchanged. Ports server/app.py (FastAPI) — Jev is the only
// model here; vegaml stays local-only.

import { routePartykitRequest } from "partyserver";
import { YServer } from "y-partyserver";

// One shared canvas per room (/parties/room/<id>). Kept in memory only:
// photos are not stored after everyone leaves.
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
  let answers;
  try {
    answers = Object.fromEntries(
      Object.entries(JSON.parse(text).answers).map(([q, a]) => [
        q,
        {
          choice: a.choice,
          prob: a.probabilities[a.choice],
          unsure: (a.confidence ?? 1) < 0.35,
        },
      ])
    );
  } catch (e) {
    console.error({ event: "jev.bad_reply", error: String(e), body: text.slice(0, 500) });
    return json({ detail: "Jev sent an unexpected reply" }, 502);
  }
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return health(env);
    if (url.pathname === "/api/analyze") return analyze(request, env, url);
    if (url.pathname.startsWith("/parties/")) {
      return (await routePartykitRequest(request, env)) ?? new Response("Not found", { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
