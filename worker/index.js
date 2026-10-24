// Thaalam on Cloudflare: serves the web/dist build and answers /api/* so the
// frontend works unchanged. Ports server/app.py (FastAPI) — Jev is the only
// model here; vegaml stays local-only.

import { routePartykitRequest } from "partyserver";
import { YServer } from "y-partyserver";

// One shared canvas per room (/parties/room/<id>). Kept in memory only:
// photos are not stored after everyone leaves.
export class Room extends YServer {}

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
    return json({ detail: `${model} isn't available on this server` }, 400);
  }
  let photo;
  try {
    photo = (await request.formData()).get("photo");
  } catch {
    return json({ detail: "Expected a multipart photo upload" }, 400);
  }
  if (!(photo instanceof File)) return json({ detail: "No photo in the upload" }, 400);
  if (photo.size > 15 * 1024 * 1024) return json({ detail: "Photo is too big" }, 413);

  // The client already shrinks to JPEG <=512px (reading.ts shrink()), so the
  // bytes go straight to Jev — no server-side image step needed.
  const started = Date.now();
  const ref = crypto.randomUUID();
  const r = await fetch(JEV_URL, {
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
  if (!r.ok) return json({ detail: `Jev said ${r.status}: ${(await r.text()).slice(0, 200)}` }, 502);

  const out = (await r.json()).answers;
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
  return json({ model: "jev", ms: Date.now() - started, answers });
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
