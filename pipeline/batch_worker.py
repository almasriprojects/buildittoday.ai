"""Resumable batch runner. Processes leads in chunks, saves after every lead,
skips anything already done. Safe to re-run after a crash or Ctrl-C.

  python3 batch_worker.py batch32_input.json --limit 8
  python3 batch_worker.py batch32_input.json           # all remaining
"""
import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

from brain_v2 import COST, OUT, OR_KEY, upload, submit_video, poll_video, download_video, stage_a
from brain_v3_fixes import compress_montage
from brain_v3_run import do_image, do_video, VID_DIR

BRIEFS = os.path.join(OUT, "briefs.json")
IMGS = os.path.join(OUT, "image_urls.json")
MEDIA = os.path.join(OUT, "media.json")

MAX_BATCH_COST_USD = 40.0  # hard stop; nothing runs unbounded


def load(p, default):
    return json.load(open(p)) if os.path.exists(p) else default


def save(p, obj):
    tmp = p + ".tmp"
    json.dump(obj, open(tmp, "w"), indent=2)
    os.replace(tmp, p)  # atomic; a crash mid-write can't corrupt the file


def process_lead(lead, briefs, images, media):
    slug = lead["demo_slug"]
    name = lead["business_name"]

    if slug not in briefs:
        briefs[slug] = stage_a(lead)
        save(BRIEFS, briefs)
    scenes = briefs[slug]["scenes"]

    todo_img = [(slug, i, s) for i, s in enumerate(scenes, 1) if f"{slug}__{i}" not in images]
    if todo_img:
        with ThreadPoolExecutor(max_workers=3) as ex:
            for s_, idx, url in ex.map(do_image, todo_img):
                if url:
                    images[f"{slug}__{idx}"] = url
        save(IMGS, images)

    todo_vid = [(slug, i, s, images[f"{slug}__{i}"])
                for i, s in enumerate(scenes, 1)
                if f"{slug}__{i}" in images
                and not os.path.exists(os.path.join(VID_DIR, f"{slug}__scene{i}.mp4"))]
    if todo_vid:
        with ThreadPoolExecutor(max_workers=3) as ex:
            list(ex.map(do_video, todo_vid))

    clips = [os.path.join(VID_DIR, f"{slug}__scene{i}.mp4")
             for i in range(1, len(scenes) + 1)
             if os.path.exists(os.path.join(VID_DIR, f"{slug}__scene{i}.mp4"))]
    if not clips:
        print(f"  !! {name}: no usable clips, skipping", flush=True)
        return False

    out = os.path.join(VID_DIR, f"{slug}__hero.mp4")
    size = compress_montage(clips, out)
    url = upload(open(out, "rb").read(), f"{slug}/hero.mp4", "video/mp4", "demo-media")
    media[slug] = {"video": url, "poster": images.get(f"{slug}__1"),
                   "clips": len(clips), "bytes": size}
    save(MEDIA, media)
    print(f"  OK {name}: {len(clips)} clips, {size/1048576:.2f}MB  (running ${COST['total']:.2f})", flush=True)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    leads = json.load(open(args.input))
    briefs, images, media = load(BRIEFS, {}), load(IMGS, {}), load(MEDIA, {})
    pending = [l for l in leads if l["demo_slug"] not in media]
    if args.limit:
        pending = pending[:args.limit]

    print(f"{len(pending)} lead(s) to process\n", flush=True)
    ok = 0
    for n, lead in enumerate(pending, 1):
        if COST["total"] >= MAX_BATCH_COST_USD:
            print(f"\n!! cost cap ${MAX_BATCH_COST_USD} reached, stopping cleanly", flush=True)
            break
        print(f"[{n}/{len(pending)}] {lead['business_name']} ({lead['business_category']})", flush=True)
        try:
            if process_lead(lead, briefs, images, media):
                ok += 1
        except Exception as e:
            print(f"  !! {lead['business_name']} FAILED: {e}", flush=True)
        time.sleep(1)

    print(f"\ndone: {ok}/{len(pending)} succeeded | media cost this run ${COST['total']:.2f}", flush=True)


if __name__ == "__main__":
    main()
