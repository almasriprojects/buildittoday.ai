"""Re-run the vision gate over every stored scene image and persist the result.

The gate ran during generation but only printed to stdout, so the admin has no
way to know which images carry AI-rendered text. This backfills that into
demo_media.scenes_json[].text_detected so the UI can warn before sending.
"""
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from brain_v2 import OR_KEY
from brain_v3_fixes import has_visible_text
import paths as P

ENV = str(P.FRONTEND_ENV)
v = {}
for line in open(ENV):
    m = re.match(r"^([A-Z_]+)=(.*)$", line.strip())
    if m:
        v[m.group(1)] = m.group(2).strip().strip('"').strip("'")
URL = v["NEXT_PUBLIC_SUPABASE_URL"]
KEY = v["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

COST = {"total": 0.0}


def fetch_rows():
    q = f"{URL}/rest/v1/demo_media?select=demo_slug,scenes_json&status=eq.ready"
    return json.loads(urllib.request.urlopen(urllib.request.Request(q, headers=H), timeout=90).read())


def check(args):
    slug, idx, url = args
    if not url:
        return (slug, idx, None)
    try:
        img = urllib.request.urlopen(url, timeout=90).read()
        flagged, cost = has_visible_text(img, OR_KEY)
        COST["total"] += cost
        return (slug, idx, flagged)
    except Exception as e:
        print(f"  !! {slug}/scene{idx}: {e}", flush=True)
        return (slug, idx, None)


def main():
    rows = fetch_rows()
    tasks = []
    for r in rows:
        for s in r.get("scenes_json") or []:
            tasks.append((r["demo_slug"], s["idx"], s.get("image_url")))
    print(f"scanning {len(tasks)} images across {len(rows)} leads...", flush=True)

    results = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        for slug, idx, flagged in ex.map(check, tasks):
            results.setdefault(slug, {})[idx] = flagged

    updated = 0
    flagged_total = 0
    for r in rows:
        scenes = r.get("scenes_json") or []
        got = results.get(r["demo_slug"], {})
        for s in scenes:
            s["text_detected"] = got.get(s["idx"])
            if s["text_detected"]:
                flagged_total += 1
        req = urllib.request.Request(
            f"{URL}/rest/v1/demo_media?demo_slug=eq.{r['demo_slug']}",
            data=json.dumps({"scenes_json": scenes}).encode(),
            headers={**H, "Prefer": "return=minimal"},
            method="PATCH",
        )
        urllib.request.urlopen(req, timeout=60).read()
        updated += 1

    print(f"\nupdated {updated} leads | images with text: {flagged_total}/{len(tasks)}")
    print(f"vision cost: ${COST['total']:.4f}")


if __name__ == "__main__":
    main()
