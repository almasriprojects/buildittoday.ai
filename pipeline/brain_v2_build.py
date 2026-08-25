"""Stage E: build HTML per lead using the brief + generated media, inject runtime, upload."""
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor

from brain_v2 import COST, OUT, or_chat, upload
from brain_v2_validate import validate

RUNTIME_PATH = "/private/tmp/claude-501/-Users-ananalmasri-Downloads-autosite-ai/d8d1f973-387b-45fb-bb53-9b4960fab6b7/scratchpad/motion_runtime_v2.6.js"

with open(os.path.join(OUT, "briefs.json")) as f:
    BRIEFS = json.load(f)
with open(os.path.join(OUT, "media.json")) as f:
    MEDIA = json.load(f)
with open(os.path.join(OUT, "image_urls.json")) as f:
    IMAGES = json.load(f)
with open("leads_input.json") as f:
    LEADS = {l["demo_slug"]: l for l in json.load(f)}
with open(RUNTIME_PATH) as f:
    RUNTIME = f.read()

BUILD_SYSTEM = """You build ONE self-contained, premium, award-tier HTML page for a real small business.
This page is sent cold to a business owner who has never had a professional website -- it must look
expensive and impressive on first glance. Follow the design brief's palette/typography/effects exactly.

=== HERO (MANDATORY -- NEVER a text-only hero) ===
The hero MUST be a full-bleed background video. Exact markup:
<section data-hero id="hero">
  <video class="hero-bg" muted loop playsinline poster="{POSTER_URL}">
    <source src="{VIDEO_URL}" type="video/mp4">
  </video>
  <div class="hero-content"> ...h1, subheadline p, CTA a.btn... </div>
</section>
Required hero CSS (adapt colors to the palette, keep the structure):
- [data-hero]{position:relative;min-height:88vh;display:flex;align-items:center;overflow:hidden}
- .hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
- A dark scrim MUST sit between video and text. Use a separate .hero-scrim div (position:absolute;
  inset:0;z-index:1) with a gradient from ~rgba(dark,0.85) to ~rgba(dark,0.62) -- NOT a ::after on
  .hero-bg (that does not render on a <video> element).
- .hero-content{position:relative;z-index:2}
- Hero h1 AND the subheadline MUST also carry text-shadow: 0 2px 16px rgba(0,0,0,.5), 0 1px 3px
  rgba(0,0,0,.4) -- video brightness shifts frame to frame, the scrim alone is not enough.
- Hero text is light (use the brief's text_on_dark).

=== IMAGERY ELSEWHERE (MANDATORY) ===
Use the two supporting images given. Include a scroll-scrubbed media sequence:
<section data-media-sequence>
  <div class="ms-track">
    <div class="ms-item"><img src="..."><div class="ms-caption"><h3>..</h3><p>..</p></div></div>
    <div class="ms-item"><img src="..."><div class="ms-caption"><h3>..</h3><p>..</p></div></div>
  </div>
</section>
Required CSS: [data-media-sequence]{position:relative;height:250vh}
[data-media-sequence] .ms-track{position:sticky;top:0;height:100vh;overflow:hidden}
[data-media-sequence] .ms-item{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
[data-media-sequence] .ms-item.ms-active{opacity:1;z-index:2}
[data-media-sequence] .ms-item img{width:100%;height:100%;object-fit:cover}
.ms-caption{position:absolute;bottom:0;left:0;right:0;padding:4rem 1.5rem 3rem;z-index:3;color:#fff;
background:linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,.6) 60%,transparent)}
Captions must be REAL copy about this business (draw from its services), never lorem/placeholder.
Also use one of the images inside the About section with data-parallax-img="0.15".

=== STRUCTURE (all required) ===
- <div data-progress></div> immediately after <body>.
- Sticky header: business name logo, nav with anchor links Home(#hero) About(#about) Services(#services)
  Contact(#contact) + one CTA a.btn. Mobile (<=767px): <button data-menu-toggle> visible, nav has
  data-menu-target, hidden by default, shown via .menu-open class as a clean dropdown/panel.
- Sections in order: hero, about(#about), media-sequence, services(#services), why-choose, contact(#contact).
- About: data-reveal, heading with data-split-text, real about copy, plus the parallax image.
- Services: grid of .service-card each data-reveal, real titles/descriptions.
- Why-choose: the real why_choose_us items, data-reveal.
- Contact: real contact_cta copy + CTA button.
- Footer: nav sitemap (same 4 anchors) + services list + business name/city/state +
  "&copy; <span data-current-year></span> {business name}. All rights reserved."
  NO "preview"/"claim this site" language anywhere in the footer.
- Claim modal: <div data-claim-modal> with .claim-modal-panel inside, a <button data-claim-close>,
  heading, 4-item feature list, and one closing CTA. It is NOT a page section. Hidden by default;
  the runtime injects its positioning CSS -- you only style the inner panel.
- Every real CTA button gets data-claim-trigger AND href="#contact". Nav links must NOT have
  data-claim-trigger.

=== RULES ===
- Buttons: use `.btn` and `.btn-secondary` ONLY. There is NO .btn-primary class -- never emit it.
  Every CTA is a real <a href>, never a bare <button> (except menu-toggle and claim-close).
- Load the brief's Google Fonts via a <link> to fonts.googleapis.com in <head>, and use them.
- html{scroll-behavior:smooth} plus @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}.
- If brief effects.grain_texture is true, add a fixed full-viewport grain overlay via an inline SVG
  feTurbulence data-URI at low opacity, pointer-events:none, and make sure it sits BELOW content
  (z-index:1) and never blocks clicks.
- If effects.oversized_typography is true, push heading scale genuinely large (clamp up to ~5rem).
- Generous vertical rhythm (sections ~6-8rem padding). Responsive at 767px and 1023px.
- Do NOT include any <script> tag -- the motion runtime is injected separately.
- All copy must come from the provided business content. Never invent phone numbers, addresses,
  emails, prices, years in business, credentials, or testimonials.

Output ONLY the complete HTML document. No markdown fences, no commentary."""


def build_one(slug):
    lead = LEADS[slug]
    brief = BRIEFS[slug]
    media = MEDIA[slug]
    payload = {
        "business": {
            "name": lead["business_name"],
            "category": lead["business_category"],
            "city": lead["city"],
            "state": lead["state"],
        },
        "content": lead["generated_content"],
        "design_brief": {
            "palette": brief["palette"],
            "typography": brief["typography"],
            "tone_descriptors": brief["tone_descriptors"],
            "motion_intensity": brief["motion_intensity"],
            "effects": brief["effects"],
        },
        "media": {
            "hero_video_url": media["video"],
            "hero_poster_url": media["poster"],
            "supporting_image_1": IMAGES.get(f"{slug}__2"),
            "supporting_image_2": IMAGES.get(f"{slug}__3"),
            "scene_names": [s["scene_name"] for s in brief["scenes"]],
        },
    }
    def clean(raw):
        raw = re.sub(r"^```html\s*\n?", "", raw.strip())
        raw = re.sub(r"\n?```\s*$", "", raw)
        return re.sub(r"<script\b[^>]*>.*?</script>", "", raw, flags=re.S | re.I)

    user_msg = json.dumps(payload, indent=2)
    html = clean(or_chat(BUILD_SYSTEM, user_msg, temperature=0.6, max_tokens=20000))

    problems = validate(html)
    if problems:
        print(f"  [{slug}] validation failed, retrying: {problems}", flush=True)
        retry_msg = (
            user_msg
            + "\n\nYour previous attempt FAILED these requirements. Regenerate the COMPLETE "
            "corrected HTML document, fixing every item:\n- "
            + "\n- ".join(problems)
        )
        html2 = clean(or_chat(BUILD_SYSTEM, retry_msg, temperature=0.4, max_tokens=20000))
        still = validate(html2)
        if len(still) < len(problems):
            html = html2
            problems = still
        if problems:
            print(f"  [{slug}] REMAINING after retry: {problems}", flush=True)
        else:
            print(f"  [{slug}] retry passed clean", flush=True)

    html = html.replace("</body>", f"<script>{RUNTIME}</script>\n</body>")
    local = os.path.join(OUT, f"{slug}.html")
    with open(local, "w") as f:
        f.write(html)
    upload(html.encode(), f"{slug}/index.html", "text/html", "demo-sites")
    print(f"  built {slug} ({lead['business_name']}) {len(html)} chars", flush=True)
    return slug


if __name__ == "__main__":
    print("=== STAGE E: build + upload ===", flush=True)
    with ThreadPoolExecutor(max_workers=3) as ex:
        list(ex.map(build_one, list(MEDIA.keys())))
    print(f"\nBUILD COST: ${COST['total']:.4f}")
