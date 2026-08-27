import json
import os
import re
import time
import urllib.request
import urllib.error
import paths as P

ENV_PATH = str(P.SITEREPLICATE_ENV or P.FRONTEND_ENV)

def load_key():
    with open(ENV_PATH) as f:
        for line in f:
            m = re.match(r"^OPENROUTER_API_KEY=(.+)$", line.strip())
            if m:
                return m.group(1).strip().strip('"').strip("'")
    raise RuntimeError("OPENROUTER_API_KEY not found in .env")

OPENROUTER_KEY = load_key()
MODEL = "bytedance/seedance-2.0-mini"
HERO_IMAGE_URL = "https://tftlysimqcrwjyncjvvf.supabase.co/storage/v1/object/public/category-photography/professional-services/hero.png"
OUT_DIR = str(P.WORK)

PROMPT = (
    "Subtle, professional cinemagraph-style motion. Slow, steady camera push-in "
    "toward the scene -- no cuts, no scene changes. Ambient environmental motion "
    "only: soft shifting light and shadow, a faint flicker of reflected light off "
    "surfaces, gentle depth-of-field breathing. If people are visible, keep them "
    "nearly still -- only extremely subtle natural micro-motion (a slow blink, "
    "slight sway) -- do not animate faces, hands, or bodies with distinct movement; "
    "avoid any warping or distortion of people. Maintain the exact color grading, "
    "lighting, and composition of the source image throughout. The final frame "
    "should closely match the starting frame in framing and lighting so the clip "
    "loops seamlessly. Calm, understated, premium corporate aesthetic -- not flashy."
)

def req(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print("HTTP ERROR", e.code, e.read().decode())
        raise

def submit():
    payload = {
        "model": MODEL,
        "prompt": PROMPT,
        "duration": 5,
        "resolution": "480p",
        "aspect_ratio": "16:9",
        "generate_audio": False,
        "frame_images": [
            {
                "type": "image_url",
                "image_url": {"url": HERO_IMAGE_URL},
                "frame_type": "first_frame",
            }
        ],
    }
    print("Submitting job...", flush=True)
    result = req("POST", "https://openrouter.ai/api/v1/videos", payload)
    print(json.dumps(result, indent=2), flush=True)
    return result

def poll(job_id, polling_url):
    start = time.time()
    while True:
        time.sleep(15)
        elapsed = time.time() - start
        result = req("GET", polling_url)
        status = result.get("status")
        print(f"[{elapsed:.0f}s] status={status}", flush=True)
        if status in ("completed", "failed", "error"):
            return result, elapsed
        if elapsed > 600:
            print("TIMEOUT after 600s")
            return result, elapsed

def download(url, dest):
    r = urllib.request.Request(url, headers={"Authorization": f"Bearer {OPENROUTER_KEY}"})
    with urllib.request.urlopen(r, timeout=120) as resp:
        data = resp.read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)

def main():
    submitted = submit()
    job_id = submitted.get("id")
    polling_url = submitted.get("polling_url") or f"https://openrouter.ai/api/v1/videos/{job_id}"
    final, elapsed = poll(job_id, polling_url)
    print("\n=== FINAL RESULT ===")
    print(json.dumps(final, indent=2))
    if final.get("status") == "completed":
        urls = final.get("unsigned_urls") or []
        if urls:
            dest = os.path.join(OUT_DIR, "hero_video_test_professional_services.mp4")
            size = download(urls[0], dest)
            print(f"\nDownloaded {size} bytes to {dest}")
        cost = final.get("usage", {}).get("cost")
        print(f"\nGeneration time: {elapsed:.0f}s")
        print(f"Real cost: ${cost}")
    else:
        print("Job did not complete successfully.")

if __name__ == "__main__":
    main()
