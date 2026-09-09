#!/usr/bin/env python3
"""Raise the custom cursor above the claim modal on already-built sites.

The runtime is baked into each stored page, so a page built before the fix
keeps the bug until its HTML is rewritten. Rebuilding through the model would
cost a call per site and would also rewrite the copy, which is not what is
wrong. The runtime CSS is a verbatim string in every page, so a targeted
replacement fixes it without changing a word of anyone's site.

Every original is written to ./backup/<slug>.html before anything is uploaded.
"""
import json
import os
import re
import sys
import urllib.request

PROJECT = "https://tftlysimqcrwjyncjvvf.supabase.co"
ENV = "/Users/ananalmasri/Downloads/autosite.ai/frontend/.env.local"
BUCKET = "demo-sites"
BACKUP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backup")

REPLACEMENTS = [
    # the dot
    ("z-index:10000;transition:transform .05s linear}",
     "z-index:30000;transition:transform .05s linear}"),
    # the ring
    ("pointer-events:none;z-index:10000;",
     "pointer-events:none;z-index:30000;"),
    # let form fields keep the I-beam
    (".mrv2-custom-cursor,.mrv2-custom-cursor a,.mrv2-custom-cursor button{cursor:none}",
     ".mrv2-custom-cursor,.mrv2-custom-cursor a,.mrv2-custom-cursor button{cursor:none}"
     ".mrv2-custom-cursor input,.mrv2-custom-cursor textarea,"
     ".mrv2-custom-cursor select,.mrv2-custom-cursor [contenteditable]{cursor:auto}"),
]


def fix_claim_cta(html):
    """Make the popup's call-to-action open the prices instead of closing.

    Every site shipped `<a href="#" class="btn btn-primary" data-claim-close>`
    inside the claim modal, straight from the build prompt's example. It closed
    the popup, went nowhere, and matched the page's own [data-claim-close]
    rule — which is position:absolute for the × — so it was also painted on top
    of the heading. Swapping the attribute fixes the behaviour and the layout
    together, because both came from the same attribute.
    """
    pattern = re.compile(
        r'(<a\b[^>]*\bclass=["\'][^"\']*\bbtn\b[^"\']*["\'][^>]*?)\s+data-claim-close(=["\'][^"\']*["\'])?',
        re.I,
    )

    def swap(m):
        tag = m.group(1)
        tag = re.sub(r'href=["\']#["\']', 'href="/pricing"', tag, flags=re.I)
        return tag + ' data-bit-open'

    return pattern.sub(swap, html)


def key():
    for line in open(ENV):
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("no service key in " + ENV)


K = key()
AUTH = {"apikey": K, "Authorization": "Bearer " + K}


def api(path, data=None, method="GET", ctype="application/json", raw=False):
    body = data if raw else (json.dumps(data).encode() if data is not None else None)
    req = urllib.request.Request(PROJECT + path, data=body, method=method,
                                 headers={**AUTH, "Content-Type": ctype})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def slugs():
    """Every top-level folder in the bucket."""
    out, offset = [], 0
    while True:
        page = json.loads(api(f"/storage/v1/object/list/{BUCKET}", {
            "prefix": "", "limit": 100, "offset": offset,
            "sortBy": {"column": "name", "order": "asc"},
        }, method="POST"))
        if not page:
            break
        out += [o["name"] for o in page if o.get("id") is None or "/" not in o["name"]]
        offset += 100
    return out


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    os.makedirs(BACKUP, exist_ok=True)
    targets = [only] if only else slugs()
    patched = skipped = missing = 0

    for slug in targets:
        path = f"/storage/v1/object/{BUCKET}/{slug}/index.html"
        try:
            html = api(path).decode()
        except Exception:
            missing += 1
            continue

        if "mrv2-cursor-dot" not in html:
            skipped += 1
            continue

        new = html
        for old, repl in REPLACEMENTS:
            if old in new and repl not in new:
                new = new.replace(old, repl)
        new = fix_claim_cta(new)

        if new == html:
            skipped += 1
            continue

        with open(os.path.join(BACKUP, f"{slug}.html"), "w") as f:
            f.write(html)

        api(path + "?upsert=true", new.encode(), method="PUT",
            ctype="text/html", raw=True)
        patched += 1
        print(f"  patched {slug}")

    print(f"\npatched {patched}, already correct {skipped}, no page {missing}")


if __name__ == "__main__":
    main()
