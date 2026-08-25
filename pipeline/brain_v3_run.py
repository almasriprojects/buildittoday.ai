"""End-to-end run for one or more leads with all four fixes applied."""
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

from brain_v2 import (
    COST, OUT, OR_KEY, gen_image, upload, submit_video, poll_video, download_video, stage_a,
)
from brain_v3_fixes import (
    crop_16x9, submit_video_safe, compress_montage, has_visible_text,
    NO_TEXT_REINFORCE, AMBIENT_ONLY,
)

STYLE_SUFFIX = (
    " Photorealistic, editorial quality, cinematic lighting, no text, no logos, "
    "no watermarks, no readable signage, wide 16:9 landscape composition."
)
IMG_DIR = os.path.join(OUT, "images")
VID_DIR = os.path.join(OUT, "videos")
os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(VID_DIR, exist_ok=True)


def do_image(args):
    slug, idx, scene = args
    label = f"{slug}/scene{idx}"
    base = scene["image_prompt"] + STYLE_SUFFIX
    # Up to 2 passes: if the vision gate sees text, regenerate once with the
    # reinforced no-text instruction. Structural validators can never catch this.
    for text_pass in range(2):
        prompt = base if text_pass == 0 else base + NO_TEXT_REINFORCE
        img = None
        for attempt in range(3):
            try:
                raw = gen_image(prompt)
                img, cropped = crop_16x9(raw)
                break
            except Exception as e:
                print(f"  IMG retry {label} #{attempt+1}: {e}", flush=True)
                time.sleep(3)
        if img is None:
            continue
        try:
            has_text, vcost = has_visible_text(img, OR_KEY)
            COST["total"] += vcost
        except Exception as e:
            print(f"  vision check errored {label}: {e} -- accepting image", flush=True)
            has_text = False
        if has_text and text_pass == 0:
            print(f"  TEXT DETECTED {label} -- regenerating with no-text reinforcement", flush=True)
            continue
        path = os.path.join(IMG_DIR, f"{slug}__scene{idx}.png")
        with open(path, "wb") as f:
            f.write(img)
        url = upload(img, f"{slug}/scene{idx}.png", "image/png", "demo-media")
        flag = " (text still present)" if has_text else ""
        print(f"  IMG ok {label} cropped={cropped} pass={text_pass+1}{flag}", flush=True)
        return (slug, idx, url)
    return (slug, idx, None)


def _attempt_video(image_url, prompt, label):
    """Submit + poll once. Returns (result, failed_async) -- failed_async is True
    when the job was ACCEPTED then failed later (content filter at generation time),
    which raises no HTTPError and so is invisible to submit_video_safe."""
    job, softened = submit_video_safe(submit_video, image_url, prompt, 4, label)
    purl = job.get("polling_url") or f"https://openrouter.ai/api/v1/videos/{job['id']}"
    res = poll_video(purl, label)
    if res and res.get("status") == "completed":
        return res, False, softened
    return None, True, softened


def do_video(args):
    """Two distinct failure classes, each needing its own recovery:
      - content filter (at submit OR async at generation) -> retry ambient-only prompt
      - transient network/timeout                          -> retry the same request
    Without the second, one socket timeout silently costs a scene forever.
    """
    slug, idx, scene, image_url = args
    label = f"{slug}/scene{idx}"

    for net_try in range(3):
        try:
            res, failed_async, softened = _attempt_video(
                image_url, scene["video_motion_prompt"], label
            )
            if res is None and failed_async and not softened:
                print(f"  [{label}] failed after accept -- retrying ambient-only", flush=True)
                res, _, _ = _attempt_video(image_url, AMBIENT_ONLY, label)
                if res is not None:
                    print(f"  [{label}] recovered via ambient-only retry", flush=True)
            if res is None:
                return (slug, idx, None)  # genuine rejection, not worth re-requesting

            path = os.path.join(VID_DIR, f"{slug}__scene{idx}.mp4")
            for dl_try in range(3):
                try:
                    data = download_video(res["unsigned_urls"][0])
                    break
                except Exception as de:
                    if dl_try == 2:
                        raise
                    print(f"  [{label}] download retry {dl_try+1}: {de}", flush=True)
                    time.sleep(5)
            with open(path, "wb") as f:
                f.write(data)
            return (slug, idx, path)

        except Exception as e:
            if net_try == 2:
                print(f"  VID FAILED {label} after {net_try+1} tries: {e}", flush=True)
                return (slug, idx, None)
            print(f"  [{label}] transient error, retry {net_try+1}: {e}", flush=True)
            time.sleep(10)
    return (slug, idx, None)


def run(leads):
    briefs_path = os.path.join(OUT, "briefs.json")
    briefs = json.load(open(briefs_path)) if os.path.exists(briefs_path) else {}
    media_path = os.path.join(OUT, "media.json")
    media = json.load(open(media_path)) if os.path.exists(media_path) else {}
    imgs_path = os.path.join(OUT, "image_urls.json")
    images = json.load(open(imgs_path)) if os.path.exists(imgs_path) else {}

    for lead in leads:
        slug = lead["demo_slug"]
        print(f"=== STAGE A: {lead['business_name']} ===", flush=True)
        briefs[slug] = stage_a(lead)
        b = briefs[slug]
        print(f"  palette {b['palette']['primary']}/{b['palette']['accent']} "
              f"fonts {b['typography']['google_font_heading']}+{b['typography']['google_font_body']}",
              flush=True)
        for s in b["scenes"]:
            print(f"    - {s['scene_name']}", flush=True)
    json.dump(briefs, open(briefs_path, "w"), indent=2)

    print("\n=== STAGE B: images ===", flush=True)
    tasks = [(l["demo_slug"], i, s)
             for l in leads
             for i, s in enumerate(briefs[l["demo_slug"]]["scenes"], 1)]
    with ThreadPoolExecutor(max_workers=6) as ex:
        for slug, idx, url in ex.map(do_image, tasks):
            if url:
                images[f"{slug}__{idx}"] = url
    json.dump(images, open(imgs_path, "w"), indent=2)

    print("\n=== STAGE C: videos ===", flush=True)
    vtasks = [(l["demo_slug"], i, s, images[f"{l['demo_slug']}__{i}"])
              for l in leads
              for i, s in enumerate(briefs[l["demo_slug"]]["scenes"], 1)
              if f"{l['demo_slug']}__{i}" in images]
    clips = {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        for slug, idx, path in ex.map(do_video, vtasks):
            if path:
                clips.setdefault(slug, {})[idx] = path

    print("\n=== STAGE D: merge + compress ===", flush=True)
    for slug, parts in clips.items():
        ordered = [parts[i] for i in sorted(parts)]
        out = os.path.join(VID_DIR, f"{slug}__hero.mp4")
        size = compress_montage(ordered, out)
        url = upload(open(out, "rb").read(), f"{slug}/hero.mp4", "video/mp4", "demo-media")
        media[slug] = {"video": url, "poster": images.get(f"{slug}__1"),
                       "clips": len(ordered), "bytes": size}
        print(f"  {slug}: {len(ordered)} clips -> {size/1024/1024:.2f}MB", flush=True)
    json.dump(media, open(media_path, "w"), indent=2)
    print(f"\nCOST: ${COST['total']:.4f}")


if __name__ == "__main__":
    leads = json.load(open(sys.argv[1]))
    run(leads)
