"""Thaalam server: photo in, reading out.

The model only answers closed questions about the photo. Everything musical
happens in the browser. Pick the model with THAALAM_PROVIDER=vegaml|jev.
"""

import base64
import importlib.util
import io
import logging
import os
import time
import uuid

import httpx
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("thaalam")

PROVIDER = os.environ.get("THAALAM_PROVIDER", "jev")  # default model
JEV_URL = "https://api.typesafe.ai/v1/systemone"
JEV_MODEL = os.environ.get("JEV_MODEL", "jev-latest")

# One question set for both models. Choice questions only, so both answer the same way.
QUESTIONS = {
    "mood": {
        "type": "choice",
        "instructions": "What is the overall mood of this photo?",
        "criteria": {
            "calm": "peaceful, quiet, still, relaxed",
            "happy": "cheerful, bright, warm, light-hearted",
            "tense": "dramatic, dark, uneasy, intense",
            "festive": "celebration, party, crowd, lights, colour",
            "melancholy": "sad, lonely, rainy, nostalgic, grey",
        },
    },
    "energy": {
        "type": "choice",
        "instructions": "How much energy or movement does this photo have?",
        "criteria": {
            "1": "very still, empty, nothing happening",
            "2": "gentle, slow, a little life",
            "3": "moderate, everyday activity",
            "4": "lively, busy, moving",
            "5": "wild, packed, fast, explosive",
        },
    },
    "texture": {
        "type": "choice",
        "instructions": "Which material or feel best describes this photo?",
        "criteria": {
            "wooden": "wood, clay, handmade, rustic, earthy",
            "organic": "plants, food, skin, water, nature",
            "metallic": "metal, glass, machines, shiny hard surfaces",
            "electronic": "screens, neon, city lights, digital",
            "airy": "sky, fog, open space, soft light, distance",
        },
    },
    "role": {
        "type": "choice",
        "instructions": "If this photo were one player in a band, which part would it play?",
        "criteria": {
            "kick": "heavy, bold, a single strong subject, a solid base",
            "percussion": "many small repeated details, patterns, crowds, texture",
            "bass": "dark, deep, low, grounded, shadowy",
            "chords": "warm, cosy, a full balanced scene",
            "melody": "one clear subject that stands out, a story, a face",
            "texture": "wide, soft, empty, sky, background atmosphere",
        },
    },
}

app = FastAPI(title="Thaalam")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
_vega = None


def vega():
    global _vega
    if _vega is None:
        import vegaml

        _vega = vegaml.load()
    return _vega


def ask_vegaml(img: Image.Image) -> dict:
    out = vega().decide_image(img, QUESTIONS)["answers"]
    return {
        q: {"choice": a["choice"], "prob": float(a["probs"][a["choice"]]), "unsure": bool(a.get("abstain"))}
        for q, a in out.items()
    }


def ask_jev(img: Image.Image) -> dict:
    key = os.environ.get("TYPESAFE_API_KEY")
    if not key:
        raise HTTPException(500, "TYPESAFE_API_KEY is not set")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    ref = str(uuid.uuid4())
    questions = {
        q: {**spec, "instructions": spec["instructions"].replace("this photo", "`photo`")}
        for q, spec in QUESTIONS.items()
    }
    try:
        r = httpx.post(
            JEV_URL,
            headers={"Authorization": f"Bearer {key}", "TypeSafe-Danger-Zone-Images": "true"},
            json={
                "model": JEV_MODEL,
                "state": {"photo": ref},
                "assets": {ref: {"type": "image", "format": "jpg", "data_base64": base64.b64encode(buf.getvalue()).decode()}},
                "questions": questions,
            },
            timeout=30,
        )
    except httpx.HTTPError as e:
        log.error("jev request failed: %r", e)
        raise HTTPException(502, f"Couldn't reach Jev: {type(e).__name__}")
    if r.status_code != 200:
        log.warning("jev returned %s: %s", r.status_code, r.text[:500])
        raise HTTPException(502, f"Jev said {r.status_code}: {r.text[:200]}")
    try:
        out = r.json()["answers"]
        return {
            q: {
                "choice": a["choice"],
                "prob": float(a["probabilities"][a["choice"]]),
                "unsure": float(a.get("confidence", 1)) < 0.35,
            }
            for q, a in out.items()
        }
    except (ValueError, KeyError, TypeError, AttributeError) as e:
        log.error("jev sent an unexpected reply (%r): %s", e, r.text[:500])
        raise HTTPException(502, "Jev sent an unexpected reply")


def available() -> list[str]:
    """Models this server can run. On Cloudflare there's no vegaml, so only Jev shows up."""
    models = []
    if os.environ.get("TYPESAFE_API_KEY"):
        models.append("jev")
    if importlib.util.find_spec("vegaml"):
        models.append("vegaml")
    return models


def read_photo(data: bytes, model: str) -> dict:
    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except Exception as e:
        log.warning("analyze rejected: unreadable image (%r)", e)
        raise HTTPException(400, "That file isn't a photo we can read")
    img.thumbnail((512, 512))
    started = time.time()
    if model not in available():
        log.warning("analyze rejected: model=%s not in %s", model, available())
        raise HTTPException(400, f"{model} isn't available on this server")
    answers = ask_jev(img) if model == "jev" else ask_vegaml(img)
    ms = round((time.time() - started) * 1000)
    log.info(
        "analyze model=%s bytes=%d ms=%d %s",
        model, len(data), ms, " ".join(f"{q}={a['choice']}" for q, a in answers.items()),
    )
    return {"model": model, "ms": ms, "answers": answers}


@app.on_event("startup")
def warm_up():
    log.info(
        "starting: default=%s models=%s jev_key=%s allowed_origins=%s",
        PROVIDER, available(), "set" if os.environ.get("TYPESAFE_API_KEY") else "missing",
        os.environ.get("ALLOWED_ORIGINS", "*"),
    )
    if PROVIDER == "vegaml" or os.environ.get("THAALAM_WARM_VEGAML"):
        vega()


@app.get("/api/health")
def health():
    return {"ok": True, "default": PROVIDER, "models": available()}


@app.post("/api/analyze")
async def analyze(photo: UploadFile, model: str = PROVIDER):
    data = await photo.read()
    if len(data) > 15 * 1024 * 1024:
        log.warning("analyze rejected: %d bytes is too big", len(data))
        raise HTTPException(413, "Photo is too big")
    return read_photo(data, model)
