"""Second-pass severity triage on images the vision gate flagged.

The gate answers "is there any lettering?" — deliberately strict, so it catches
illegible micro-text on a laptop screen and a duplicated headline equally. That
makes 26 of 43 sites 'flagged' and the signal useless for deciding what to fix.

This asks the question that actually matters: would a business owner notice it,
and does it look broken? Results go back into scenes_json as text_severity.
"""
import base64
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from brain_v2 import OR_KEY

ENV = "/Users/ananalmasri/Downloads/autosite.ai/frontend/.env.local"
v = {}
for line in open(ENV):
    m = re.match(r"^([A-Z_]+)=(.*)$", line.strip())
    if m:
        v[m.group(1)] = m.group(2).strip().strip('"').strip("'")
URL = v["NEXT_PUBLIC_SUPABASE_URL"]
KEY = v["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

QUESTION = (
    "This image is a hero/background photo on a small business website. It contains "
    "some text or lettering. Judge ONLY how a visitor would perceive that text.\n\n"
    "Answer with exactly one word:\n"
    "BAD - the text is prominent and looks wrong: misspelled, garbled, duplicated, "
    "nonsensical, or an obviously fake logo/sign a viewer would notice and find odd.\n"
    "MINOR - text is present but small, blurred, incidental or naturally part of the "
    "scene (a distant sign, tiny UI on a screen, product label) and reads as normal.\n"
    "NONE - no meaningful text is actually visible."
)

COST = {"total": 0.0}


def judge(args):
    slug, idx, url = args
    try:
        img = urllib.request.urlopen(url, timeout=90).read()
        payload = {
            "model": "google/gemini-2.5-flash",
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": QUESTION},
                {"type": "image_url",
                 "image_url": {"url": "data:image/png;base64," + base64.b64encode(img).decode()}},
            ]}],
            "temperature": 0,
            "max_tokens": 5,
        }
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {OR_KEY}", "Content-Type": "application/json"},
            method="POST")
        d = json.loads(urllib.request.urlopen(req, timeout=90).read())
        COST["total"] += d.get("usage", {}).get("cost") or 0
        ans = d["choices"][0]["message"]["content"].strip().upper()
        for level in ("BAD", "MINOR", "NONE"):
            if ans.startswith(level):
                return (slug, idx, level.lower())
        return (slug, idx, "minor")
    except Exception as e:
        print(f"  !! {slug}/{idx}: {e}", flush=True)
        return (slug, idx, None)


def main():
    q = f"{URL}/rest/v1/demo_media?select=demo_slug,scenes_json&status=eq.ready"
    rows = json.loads(urllib.request.urlopen(urllib.request.Request(q, headers=H), timeout=90).read())

    tasks = [
        (r["demo_slug"], s["idx"], s.get("image_url"))
        for r in rows
        for s in (r.get("scenes_json") or [])
        if s.get("text_detected") and s.get("image_url")
    ]
    print(f"triaging {len(tasks)} flagged images...", flush=True)

    res = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        for slug, idx, sev in ex.map(judge, tasks):
            res.setdefault(slug, {})[idx] = sev

    tally = {"bad": 0, "minor": 0, "none": 0}
    bad_leads = set()
    for r in rows:
        scenes = r.get("scenes_json") or []
        got = res.get(r["demo_slug"], {})
        changed = False
        for s in scenes:
            if s["idx"] in got:
                s["text_severity"] = got[s["idx"]]
                changed = True
                if got[s["idx"]]:
                    tally[got[s["idx"]]] = tally.get(got[s["idx"]], 0) + 1
                if got[s["idx"]] == "bad":
                    bad_leads.add(r["demo_slug"])
        if changed:
            req = urllib.request.Request(
                f"{URL}/rest/v1/demo_media?demo_slug=eq.{r['demo_slug']}",
                data=json.dumps({"scenes_json": scenes}).encode(),
                headers={**H, "Prefer": "return=minimal"}, method="PATCH")
            urllib.request.urlopen(req, timeout=60).read()

    print(f"\n  BAD (fix these):   {tally['bad']}")
    print(f"  MINOR (fine):      {tally['minor']}")
    print(f"  NONE (false flag): {tally['none']}")
    print(f"\n  leads needing attention: {len(bad_leads)}")
    for s in sorted(bad_leads):
        print(f"    {s}")
    print(f"\n  cost: ${COST['total']:.4f}")


if __name__ == "__main__":
    main()
