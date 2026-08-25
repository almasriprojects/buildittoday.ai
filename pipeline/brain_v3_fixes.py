"""Fixes folded into the media pipeline:
1. crop_16x9      -- image model returns 1024x1024 regardless of prompt; crop before use
2. submit_video_safe -- retry once with an ambient-only prompt when a scene trips a content filter
3. compress_montage  -- re-encode the merged hero video instead of stream-copying it
"""
import os
import re
import subprocess
import tempfile
import urllib.error


def crop_16x9(png_bytes):
    """Center-crop to 16:9. Returns (bytes, was_cropped)."""
    with tempfile.TemporaryDirectory() as td:
        src = os.path.join(td, "in.png")
        dst = os.path.join(td, "out.png")
        with open(src, "wb") as f:
            f.write(png_bytes)
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "stream=width,height",
             "-of", "csv=p=0:s=x", src],
            capture_output=True, text=True,
        )
        dims = probe.stdout.strip().split("x")
        if len(dims) != 2:
            return png_bytes, False
        w, h = int(dims[0]), int(dims[1])
        target_h = int(round(w * 9 / 16))
        if abs(h - target_h) <= 2:
            return png_bytes, False
        if target_h > h:
            target_w = int(round(h * 16 / 9))
            vf = f"crop={target_w}:{h}"
        else:
            vf = f"crop={w}:{target_h}"
        subprocess.run(
            ["ffmpeg", "-y", "-i", src, "-vf", vf, dst, "-loglevel", "error"],
            check=True,
        )
        with open(dst, "rb") as f:
            return f.read(), True


# Deterministic fallback: drop every reference to people/bodies, keep only ambient motion.
AMBIENT_ONLY = (
    "Locked-off camera, no camera movement at all. Animate ONLY ambient environmental "
    "elements already visible in the frame: soft drifting light and shadow, gentle "
    "reflections, faint steam or vapor, slow shifting highlights, subtle depth-of-field "
    "breathing. Everything else remains completely still. Do not animate or alter any "
    "person, face, hand, or body in any way -- treat people as part of the static "
    "background. Do not introduce, reveal, or invent any content not already visible in "
    "the source image. Preserve the exact composition, color grading and lighting; the "
    "final frame should match the first."
)


def submit_video_safe(submit_fn, image_url, motion_prompt, duration, label):
    """Submit; on a 4xx (content filter) retry once with the ambient-only prompt."""
    try:
        return submit_fn(image_url, motion_prompt, duration), False
    except urllib.error.HTTPError as e:
        if e.code not in (400, 403, 422):
            raise
        print(f"  [{label}] {e.code} on first submit -- retrying ambient-only", flush=True)
        return submit_fn(image_url, AMBIENT_ONLY, duration), True


def compress_montage(clip_paths, out_path, crf=30, height=480):
    """Concat + re-encode (the old path stream-copied, leaving 2-4.5MB heroes)."""
    with tempfile.TemporaryDirectory() as td:
        listfile = os.path.join(td, "list.txt")
        with open(listfile, "w") as f:
            for p in clip_paths:
                f.write(f"file '{os.path.abspath(p)}'\n")
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
             "-vf", f"scale=-2:{height}",
             "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
             out_path, "-loglevel", "error"],
            check=True,
        )
    return os.path.getsize(out_path)


# ---- Vision gate: catch text/letters the image model renders despite the prompt ----
# Structural validators read HTML and can never see this -- it lives in the pixels.
VISION_MODEL = "google/gemini-2.5-flash"

VISION_QUESTION = (
    "Look at this image. Does it contain ANY readable or partially-readable text, "
    "letters, words, numbers, signage, logos, or watermarks that a viewer would "
    "notice -- including garbled, duplicated, or nonsensical lettering? "
    "Ignore texture that is clearly not lettering. "
    "Answer with exactly one word: YES or NO."
)


def has_visible_text(png_bytes, or_key, timeout=90):
    """True if a vision model reports readable text in the image."""
    import base64, json, urllib.request
    b64 = base64.b64encode(png_bytes).decode()
    payload = {
        "model": VISION_MODEL,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": VISION_QUESTION},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
        ]}],
        "temperature": 0,
        "max_tokens": 5,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {or_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read())
    ans = data["choices"][0]["message"]["content"].strip().upper()
    cost = data.get("usage", {}).get("cost") or 0
    return ans.startswith("YES"), cost


NO_TEXT_REINFORCE = (
    " ABSOLUTELY NO TEXT ANYWHERE IN THE IMAGE. No signage, no lettering, no words, "
    "no numbers, no logos, no labels, no printed documents, no screens showing text, "
    "no book or paper with writing, no branded packaging. If a surface would normally "
    "carry text, show it blank or turned away from camera."
)
