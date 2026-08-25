"""Design brain v2 -- hero visuals are MANDATORY, never an AI choice.

Stage A: style analysis + 3-scene visual plan (one call per lead)
Stage B: generate 3 images per lead
Stage C: submit all video jobs in parallel, poll
Stage D: ffmpeg merge -> one montage per lead
Stage E: build HTML + upload
"""
import base64
import json
import os
import re
import subprocess
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor

SR_ENV = "/Users/ananalmasri/Downloads/***_WORKING_NOW/SiteReplicate/.env"
FE_ENV = "/Users/ananalmasri/Downloads/autosite.ai/frontend/.env.local"
OUT = "/private/tmp/claude-501/-Users-ananalmasri-Downloads-autosite-ai/d8d1f973-387b-45fb-bb53-9b4960fab6b7/scratchpad/brain_v2_out"
os.makedirs(OUT, exist_ok=True)


def load_env(path, keys):
    vals = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            m = re.match(r"^([A-Z_]+)=(.*)$", line)
            if m and m.group(1) in keys:
                vals[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return vals


OR_KEY = load_env(SR_ENV, {"OPENROUTER_API_KEY"})["OPENROUTER_API_KEY"]
_fe = load_env(FE_ENV, {"NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"})
SUPABASE_URL = _fe["NEXT_PUBLIC_SUPABASE_URL"]
SERVICE_KEY = _fe["SUPABASE_SERVICE_ROLE_KEY"]

TEXT_MODEL = "anthropic/claude-sonnet-4.5"
IMAGE_MODEL = "google/gemini-2.5-flash-image"
VIDEO_MODEL = "bytedance/seedance-2.0-mini"

COST = {"total": 0.0}


def or_chat(system, user, temperature=0.7, max_tokens=None, model=TEXT_MODEL):
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
    }
    if max_tokens:
        payload["max_tokens"] = max_tokens
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {OR_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=240) as resp:
        data = json.loads(resp.read())
    COST["total"] += data.get("usage", {}).get("cost") or 0
    return data["choices"][0]["message"]["content"]


def gen_image(prompt):
    payload = {
        "model": IMAGE_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "modalities": ["image", "text"],
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {OR_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read())
    COST["total"] += data.get("usage", {}).get("cost") or 0
    url = data["choices"][0]["message"]["images"][0]["image_url"]["url"]
    return base64.b64decode(url.split(",", 1)[1])


def upload(data_bytes, path, content_type, bucket):
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}?upsert=true"
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "apikey": SERVICE_KEY,
            "Content-Type": content_type,
            "x-upsert": "true",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        resp.read()
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"


def submit_video(image_url, motion_prompt, duration=4):
    payload = {
        "model": VIDEO_MODEL,
        "prompt": motion_prompt,
        "duration": duration,
        "resolution": "480p",
        "aspect_ratio": "16:9",
        "generate_audio": False,
        "frame_images": [
            {"type": "image_url", "image_url": {"url": image_url}, "frame_type": "first_frame"}
        ],
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/videos",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {OR_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=240) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError:
        raise
    except Exception as e:
        raise RuntimeError(f"submit_video: {e}") from e


def poll_video(polling_url, label, timeout=900):
    start = time.time()
    while time.time() - start < timeout:
        time.sleep(20)
        req = urllib.request.Request(polling_url, headers={"Authorization": f"Bearer {OR_KEY}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
        except Exception as e:
            print(f"  [{label}] poll error {e}", flush=True)
            continue
        st = data.get("status")
        if st == "completed":
            COST["total"] += data.get("usage", {}).get("cost") or 0
            print(f"  [{label}] done in {time.time()-start:.0f}s", flush=True)
            return data
        if st in ("failed", "error"):
            print(f"  [{label}] FAILED: {json.dumps(data)[:300]}", flush=True)
            return None
    print(f"  [{label}] TIMEOUT", flush=True)
    return None


def download_video(url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {OR_KEY}"})
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            return resp.read()
    except Exception as e:
        raise RuntimeError(f"download_video: {e}") from e


SCENE_SYSTEM = """You are a brand art director AND a cinematographer planning a website hero video \
for a real small business. You produce two things at once: a style brief, and a 3-scene visual plan.

HARD RULES you must follow:
- The hero of this website IS a video montage. Never suggest a text-only or typography-only hero. \
Visual richness is mandatory -- this site must look expensive and impress a business owner who has \
never had a professional website.
- The 3 scenes must be genuinely DIFFERENT shots that together tell the story of this business \
(e.g. establishing/exterior shot -> people/craft in action -> detail/result close-up). Vary the \
framing and subject across the three, do not describe three versions of the same shot.
- Scenes must depict what this business ACTUALLY does, per the content given. Never invent a \
different industry, offering, or location.
- image_prompt: a photorealistic, editorial-quality still. Cinematic lighting, shallow depth of field \
where appropriate, no text/logos/watermarks/signage, 16:9. Be specific about subject, lighting, \
time of day, and mood.
- video_motion_prompt: describes SUBTLE motion animating that still. CRITICAL constraints: keep the \
camera nearly locked-off or an extremely slow push/drift; do NOT reveal or invent scene content that \
is not already visible in the still; do NOT animate faces, hands, or bodies with distinct movement \
(only the faintest natural micro-motion); never warp or distort people. Prefer ambient motion: \
drifting light, steam, water ripple, fabric sway, dust motes, slow reflections. The last frame should \
be close to the first frame in framing and light.

Output strict JSON only, no prose outside it:
{
  "palette": {"primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "text_on_dark": "#hex", "reasoning": "..."},
  "typography": {"heading_style": "...", "body_style": "...", "google_font_heading": "...", "google_font_body": "...", "reasoning": "..."},
  "tone_descriptors": ["...","...","..."],
  "motion_intensity": "subtle|moderate|bold",
  "effects": {"grain_texture": bool, "marquee_band": bool, "oversized_typography": bool},
  "effects_reasoning": "...",
  "scenes": [
    {"scene_name": "...", "image_prompt": "...", "video_motion_prompt": "..."},
    {"scene_name": "...", "image_prompt": "...", "video_motion_prompt": "..."},
    {"scene_name": "...", "image_prompt": "...", "video_motion_prompt": "..."}
  ]
}

For google_font_heading/google_font_body pick real Google Fonts families that match your direction \
(e.g. "Fraunces", "Instrument Serif", "Playfair Display", "DM Sans", "Inter", "Space Grotesk", \
"Bricolage Grotesque", "Outfit"). These will be loaded from Google Fonts."""


def stage_a(lead):
    raw = or_chat(SCENE_SYSTEM, json.dumps(lead, indent=2), temperature=0.8)
    raw = re.sub(r"^```json\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


if __name__ == "__main__":
    with open("leads_input.json") as f:
        leads = json.load(f)

    briefs = {}
    for lead in leads:
        slug = lead["demo_slug"]
        print(f"=== STAGE A: {lead['business_name']} ===", flush=True)
        brief = stage_a(lead)
        briefs[slug] = brief
        print(json.dumps(brief, indent=2)[:1200], flush=True)
        print(flush=True)

    with open(os.path.join(OUT, "briefs.json"), "w") as f:
        json.dump(briefs, f, indent=2)
    print(f"\nSTAGE A COST SO FAR: ${COST['total']:.4f}")
