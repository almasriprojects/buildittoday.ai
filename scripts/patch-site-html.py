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
    """Make the popup's call-to-action open the prices.

    Across 55 built sites the button inside the "Claim This Website" modal came
    in three flavours, and not one of them reached a price:

      12  data-claim-close    closed the offer, and — because that selector is
                              position:absolute for the × — was also dragged
                              out of flow and printed over the heading
       6  data-claim-trigger  re-opened the modal it was already inside
      37  a plain anchor      scrolled to #contact behind a modal still
                              covering the page

    All three read as a working button and do nothing. They now carry
    data-bit-open, which the serve-time offer layer binds: the prices live in
    lib/pricing.ts, not in the page, so handing over is the only way this
    button can lead to money.

    Scoped to the modal so the page's own CTAs, which correctly open the modal
    via data-claim-trigger, are left alone.
    """
    modal = re.search(r'<div\b[^>]*data-claim-modal.*?(?=</body>)', html, re.S | re.I)
    if not modal:
        return html
    block = modal.group(0)

    cta = re.search(r'<a\b[^>]*\bclass=["\'][^"\']*\bbtn\b[^"\']*["\'][^>]*>', block, re.I)
    if not cta or "data-bit-open" in cta.group(0):
        return html

    tag = cta.group(0)
    new = re.sub(r'\s+data-claim-(?:close|trigger)(=["\'][^"\']*["\'])?', '', tag, flags=re.I)
    # href="#" is not a fallback. Anything else the model chose is a real
    # section on the page, so it is left as the no-JS behaviour.
    new = re.sub(r'href=["\']#["\']', 'href="/pricing"', new, flags=re.I)
    new = new[:-1].rstrip() + ' data-bit-open>'

    return html.replace(block, block.replace(tag, new, 1), 1)


def fix_hero_autoplay(html):
    """Give the hero video a second chance to start.

    A browser attempts autoplay once, when the element is created. On a site's
    first ever load the clip has not buffered — preload was "metadata" and the
    file comes cold from storage — so that attempt fails and is never retried.
    Proved on Omegashirts Logistic: first load paused at readyState 4, second
    load played from the start.

    The first visitor to a new site is almost always the owner who was just
    emailed about it, so that single failure lands on exactly the person the
    page exists to impress.

    Two changes: buffer the clip rather than only its metadata, and retry play
    once there is data. Patched into pages already built so they do not have to
    be regenerated.
    """
    if "heroVideoInit" in html:
        return html

    out = html.replace('preload="metadata"', 'preload="auto"')

    rescue = (
        "function heroVideoInit(){var v=document.querySelector('video.hero-bg');"
        "if(!v)return;function n(){if(!v.paused)return;var p=v.play();"
        "if(p&&p.catch)p.catch(function(){});}"
        "v.addEventListener('loadeddata',n);v.addEventListener('canplay',n);"
        "v.addEventListener('canplaythrough',n);n();}"
    )
    # Define it next to heroInit, then call it where heroInit is called.
    if "function heroInit()" in out and "heroInit();" in out:
        out = out.replace("function heroInit()", rescue + "function heroInit()", 1)
        out = out.replace("heroInit();", "heroInit();heroVideoInit();", 1)
    return out


def fix_boxed_hero(html):
    """Let the hero out of the page's own width limit.

    A rule like

        section { padding: ...; max-width: 1200px; margin: 0 auto }

    is good practice for body copy and catastrophic for the hero, because the
    hero IS a section. At 1280px it leaves a 40px white margin down each side
    of the photograph, and the gap grows with the screen. It reads as a broken
    page, and it is the first thing the business owner sees.

    Only one site had it — the first one built after the models moved to
    DeepSeek. Eighty-three pages written by the previous model never did,
    which is the point: a full-bleed hero was an unstated assumption, and a
    new model had no reason to keep it. The builder now refuses a page with
    this defect; this repairs the one already published.
    """
    if "section[data-hero]" in html:
        return html
    blanket = re.search(r'(?<![\w.#\-\[])section\s*\{[^{}]*max-width\s*:\s*\d[^{}]*\}', html, re.I)
    if not blanket:
        return html
    override = ("section[data-hero]{max-width:none;margin-left:0;margin-right:0;"
                "width:100%}")
    # Straight after the rule it is undoing, so the cascade order is obvious
    # to anyone reading the page later.
    at = blanket.end()
    return html[:at] + override + html[at:]


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


        new = html
        for old, repl in REPLACEMENTS:
            if old in new and repl not in new:
                new = new.replace(old, repl)
        new = fix_claim_cta(new)
        new = fix_hero_autoplay(new)
        new = fix_boxed_hero(new)

        if new == html:
            skipped += 1
            continue

        # Never overwrite an existing backup. A second run would otherwise
        # replace the true original with the output of the first one, and the
        # thing worth keeping is the state before anything was touched.
        dest = os.path.join(BACKUP, f"{slug}.html")
        if not os.path.exists(dest):
            with open(dest, "w") as f:
                f.write(html)

        api(path + "?upsert=true", new.encode(), method="PUT",
            ctype="text/html", raw=True)
        patched += 1
        print(f"  patched {slug}")

    print(f"\npatched {patched}, already correct {skipped}, no page {missing}")


if __name__ == "__main__":
    main()
