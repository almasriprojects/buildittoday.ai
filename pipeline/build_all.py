"""Build pages for every lead that has media but no page yet. Resumable:
re-reads what's already built each pass, so it can be run repeatedly while the
media batch is still filling in.
"""
import json
import os
import time

import brain_v2_build as B
from brain_v2 import OUT

MEDIA = os.path.join(OUT, "media.json")


def pending():
    media = json.load(open(MEDIA))
    built = {f[:-5] for f in os.listdir(OUT) if f.endswith(".html")}
    return [s for s in media if s not in built]


def main():
    # keep sweeping until nothing new appears twice in a row (media batch may
    # still be adding leads while this runs)
    idle = 0
    total_ok = 0
    while idle < 2:
        todo = pending()
        if not todo:
            idle += 1
            time.sleep(60)
            continue
        idle = 0
        print(f"--- pass: {len(todo)} to build ---", flush=True)
        for slug in todo:
            try:
                B.build_one(slug)
                total_ok += 1
            except Exception as e:
                print(f"  !! {slug} FAILED: {e}", flush=True)
    print(f"\nALL DONE: built {total_ok} page(s) this run | ${B.COST['total']:.2f}", flush=True)


if __name__ == "__main__":
    main()
