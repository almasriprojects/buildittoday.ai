"""Stage B (images) + Stage C (videos, parallel) + Stage D (ffmpeg merge)."""
import json
import os
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor

from brain_v2 import (
    COST, OUT, gen_image, upload, submit_video, poll_video, download_video,
)

STYLE_SUFFIX = (
    " Photorealistic, editorial quality, cinematic lighting, no text, no logos, "
    "no watermarks, no readable signage, 16:9 composition."
)

with open(os.path.join(OUT, "briefs.json")) as f:
    BRIEFS = json.load(f)

IMG_DIR = os.path.join(OUT, "images")
VID_DIR = os.path.join(OUT, "videos")
os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(VID_DIR, exist_ok=True)


def do_image(args):
    slug, idx, scene = args
    label = f"{slug}/scene{idx}"
    for attempt in range(3):
        try:
            img = gen_image(scene["image_prompt"] + STYLE_SUFFIX)
            path = os.path.join(IMG_DIR, f"{slug}__scene{idx}.png")
            with open(path, "wb") as f:
                f.write(img)
            url = upload(img, f"{slug}/scene{idx}.png", "image/png", "demo-media")
            print(f"  IMG ok {label}", flush=True)
            return (slug, idx, url, path)
        except Exception as e:
            print(f"  IMG retry {label} attempt {attempt+1}: {e}", flush=True)
            time.sleep(3)
    print(f"  IMG FAILED {label}", flush=True)
    return (slug, idx, None, None)


def do_video(args):
    slug, idx, scene, image_url = args
    label = f"{slug}/scene{idx}"
    try:
        job = submit_video(image_url, scene["video_motion_prompt"], duration=4)
        purl = job.get("polling_url") or f"https://openrouter.ai/api/v1/videos/{job['id']}"
        res = poll_video(purl, label)
        if not res:
            return (slug, idx, None)
        data = download_video(res["unsigned_urls"][0])
        path = os.path.join(VID_DIR, f"{slug}__scene{idx}.mp4")
        with open(path, "wb") as f:
            f.write(data)
        return (slug, idx, path)
    except Exception as e:
        print(f"  VID FAILED {label}: {e}", flush=True)
        return (slug, idx, None)


if __name__ == "__main__":
    print("=== STAGE B: images (9 parallel) ===", flush=True)
    img_tasks = []
    for slug, br in BRIEFS.items():
        for i, sc in enumerate(br["scenes"], 1):
            img_tasks.append((slug, i, sc))

    image_urls = {}
    with ThreadPoolExecutor(max_workers=9) as ex:
        for slug, idx, url, path in ex.map(do_image, img_tasks):
            if url:
                image_urls[(slug, idx)] = url
    print(f"images done: {len(image_urls)}/9  cost so far ${COST['total']:.4f}", flush=True)

    with open(os.path.join(OUT, "image_urls.json"), "w") as f:
        json.dump({f"{k[0]}__{k[1]}": v for k, v in image_urls.items()}, f, indent=2)

    print("\n=== STAGE C: videos (9 parallel) ===", flush=True)
    vid_tasks = []
    for slug, br in BRIEFS.items():
        for i, sc in enumerate(br["scenes"], 1):
            if (slug, i) in image_urls:
                vid_tasks.append((slug, i, sc, image_urls[(slug, i)]))

    clips = {}
    with ThreadPoolExecutor(max_workers=9) as ex:
        for slug, idx, path in ex.map(do_video, vid_tasks):
            if path:
                clips.setdefault(slug, {})[idx] = path
    print(f"videos done  cost so far ${COST['total']:.4f}", flush=True)

    print("\n=== STAGE D: ffmpeg merge ===", flush=True)
    merged = {}
    for slug, parts in clips.items():
        ordered = [parts[i] for i in sorted(parts) if parts.get(i)]
        if not ordered:
            continue
        listfile = os.path.join(VID_DIR, f"{slug}__list.txt")
        with open(listfile, "w") as f:
            for p in ordered:
                f.write(f"file '{p}'\n")
        outp = os.path.join(VID_DIR, f"{slug}__hero.mp4")
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
             "-c", "copy", outp, "-loglevel", "error"],
            check=True,
        )
        with open(outp, "rb") as f:
            data = f.read()
        url = upload(data, f"{slug}/hero.mp4", "video/mp4", "demo-media")
        merged[slug] = {"video": url, "poster": image_urls.get((slug, 1)), "clips": len(ordered), "bytes": len(data)}
        print(f"  merged {slug}: {len(ordered)} clips, {len(data)/1024:.0f}KB", flush=True)

    with open(os.path.join(OUT, "media.json"), "w") as f:
        json.dump(merged, f, indent=2)
    print(f"\nTOTAL COST: ${COST['total']:.4f}")
