"""Top-up pass: re-generate missing scenes for any lead with fewer than 3 clips.

The main batch ran with the pre-fix code, so scenes lost to (a) async content-filter
rejections and (b) transient socket timeouts were dropped permanently. This re-tries
just those scenes with the fixed do_video, then re-merges.

  python3 topup_clips.py            # report only
  python3 topup_clips.py --run      # actually regenerate
"""
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor

from brain_v2 import COST, OUT, upload
from brain_v3_fixes import compress_montage
from brain_v3_run import do_video, VID_DIR

BRIEFS = os.path.join(OUT, "briefs.json")
IMGS = os.path.join(OUT, "image_urls.json")
MEDIA = os.path.join(OUT, "media.json")


def missing_scenes():
    briefs = json.load(open(BRIEFS))
    media = json.load(open(MEDIA))
    out = []
    for slug, m in media.items():
        n = len(briefs.get(slug, {}).get("scenes", []))
        gaps = [i for i in range(1, n + 1)
                if not os.path.exists(os.path.join(VID_DIR, f"{slug}__scene{i}.mp4"))]
        if gaps:
            out.append((slug, gaps, m.get("clips", 0)))
    return out


def main():
    run = "--run" in sys.argv
    briefs = json.load(open(BRIEFS))
    images = json.load(open(IMGS))
    media = json.load(open(MEDIA))

    gaps = missing_scenes()
    if not gaps:
        print("no gaps -- every lead has a full clip set")
        return
    print(f"{len(gaps)} lead(s) with missing scenes:")
    for slug, g, clips in gaps:
        print(f"  {slug}: has {clips} clip(s), missing scene(s) {g}")
    if not run:
        print("\n(report only -- pass --run to regenerate)")
        return

    print()
    for slug, g, _ in gaps:
        scenes = briefs[slug]["scenes"]
        tasks = [(slug, i, scenes[i - 1], images[f"{slug}__{i}"])
                 for i in g if f"{slug}__{i}" in images]
        if not tasks:
            print(f"  {slug}: no source images for missing scenes, skipping")
            continue
        print(f"  {slug}: regenerating scene(s) {[t[1] for t in tasks]}", flush=True)
        with ThreadPoolExecutor(max_workers=3) as ex:
            list(ex.map(do_video, tasks))

        clips = [os.path.join(VID_DIR, f"{slug}__scene{i}.mp4")
                 for i in range(1, len(scenes) + 1)
                 if os.path.exists(os.path.join(VID_DIR, f"{slug}__scene{i}.mp4"))]
        if not clips:
            continue
        out = os.path.join(VID_DIR, f"{slug}__hero.mp4")
        size = compress_montage(clips, out)
        url = upload(open(out, "rb").read(), f"{slug}/hero.mp4", "video/mp4", "demo-media")
        media[slug].update({"video": url, "clips": len(clips), "bytes": size})
        json.dump(media, open(MEDIA, "w"), indent=2)
        print(f"    -> now {len(clips)} clips, {size/1048576:.2f}MB", flush=True)

    print(f"\ntop-up cost ${COST['total']:.2f}")


if __name__ == "__main__":
    main()
