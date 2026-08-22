# Demo Site Reference Spec — "The Bubba Standard"

**Status:** LOCKED. This is the output every generated demo must match. Reference implementation:
Bubba & Duck's (`L26000420154`). Verified reproduced across 7 leads in 6 categories.

Anything in Section 2 is **enforced by code** (prompt contract + `validateMotionHooks` + one corrective
retry). Anything in Section 3 is **allowed to vary** per business. If a future change makes a Section 2
item optional, that is a regression, not a simplification.

---

## 1. Why this exists

Four earlier failure modes produced pages that were structurally "fine" but commercially useless:
a text-only hero, category-shared visuals that made competitors' sites identical, a 250vh scroll section
containing one static image, and dead `.btn-primary` styling. Each passed a naive check. The fix is a
locked spec with real enforcement, not a style guide.

## 2. Enforced — every page, every time

**Hero**
- Full-bleed `<video class="hero-bg" muted loop playsinline poster="...">` + `<source type="video/mp4">`.
  Never an image-only or typography-only hero.
- A **separate `.hero-scrim` div** between video and content. A `::after` on a `<video>` does not render —
  this was a real shipped bug.
- Hero `h1` and subheadline both carry `text-shadow`. Video brightness shifts frame to frame; the scrim
  alone is not enough.
- `h1` uses `data-split-text`; hero CTA is an `<a href="#contact" class="btn" data-claim-trigger>`.

**Section flow (exact order)**
`hero → about → media-sequence → services → why-choose → contact`

**Media sequence**
- `<section data-media-sequence>` with **≥2 `.ms-item`** blocks, each with its own `.ms-caption` (h3 + p)
  written from the business's real services. One item = wasted 250vh scroll; validator rejects it.
- One supporting image elsewhere carries `data-parallax-img`.

**Motion hooks** — `data-progress`, `data-reveal` (12+ elements), `data-split-text`, `data-parallax-img`,
`data-menu-toggle` + `data-menu-target`, `data-claim-modal` + `data-claim-trigger` + `data-claim-close`,
`data-current-year`.

**Rules**
- Buttons: `.btn` and `.btn-secondary` only. `.btn-primary` must never appear — it is undefined.
- Every CTA is a real `<a href>`; only menu-toggle and claim-close are bare `<button>`.
- Claim UI is modal-only. No standalone `.claim-section`.
- `html{scroll-behavior:smooth}` + a `prefers-reduced-motion:reduce` override.
- Google Fonts `<link>` present and actually used.
- Footer: nav sitemap + services list + `<span data-current-year>`. No "preview"/"claim this site" language.
- Motion runtime injected deterministically, never authored by the model.
- No invented phone numbers, addresses, emails, prices, credentials, or testimonials.

**Media quality gates**
- Stills center-cropped to 16:9 (the image model ignores aspect-ratio prompting).
- Vision gate on every still; regenerate once with reinforced no-text instruction if text detected.
- Video scenes retry once with an ambient-only prompt on a content-filter rejection.
- Montage re-encoded (480p, x264 crf 30, `+faststart`) — **never stream-copied**.

## 3. Free to vary per business

Palette, Google Font pairing, motion intensity, grain/marquee/oversized-typography toggles, scene subjects
and captions, service-card count (follows the real service list), heading clamp values, clip count (2 or 3 —
a 2-clip lead is shippable).

## 4. Verified reproduction — 7 leads, 6 categories

| Lead | Category | Hero | Clips | Structure | Validation |
|---|---|---|---|---|---|
| Bubba & Duck's *(ref)* | Food & Beverage | 0.57 MB | 3 | match | clean |
| Pema Spa Sarasota | Health & Wellness | 0.23 MB | 2 | match | clean |
| Lange Marine | Home & Trade | 0.61 MB | 3 | match | clean |
| Tim Todd Consulting | Professional Services | 0.39 MB | 3 | match | clean |
| Ayiti Prestij Exotic Rentals | Retail & E-commerce | 0.51 MB | 3 | match | clean |
| Sage And Hound | Retail & E-commerce | 0.34 MB | 3 | match | clean |
| Phantom Playbook | Creative & Marketing | 0.41 MB | 3 | match | clean |

Every page: identical section flow, all hooks present, zero validation failures. Hero videos 0.23-0.61 MB.

## 5. Measured rates (real data, not estimates)

- **Cost: ~$0.44-0.50/lead** end to end → **~$210-230 for 462 leads**.
- **Media-sequence defect: 6 of 7 builds** emitted a single `.ms-item` on first attempt. Every corrective
  retry passed clean. Without this validator the majority of pages would ship broken — this is the single
  highest-value check in the system.
- **Text-in-image: 4 of 9 stills (44%)** tripped the vision gate on the newest batch, far above the ~11%
  first estimated. 2 fixed by regeneration; 2 persisted but were harmless on inspection (illegible laptop
  UI, faint embossing). The gate is deliberately strict, so *flagged ≠ unusable*.
- **Vision gate accuracy: 5/5** on a labelled set (caught the real "Strategic Planning" artifact, cleared
  four clean images including borderline tool markings).
- **Vision gate cost: $0.00047/image** → ~$0.65 for all 462 leads. Effectively free.
- **Content-filter rejections: 1 of 18** video jobs (spa massage scene). Ambient-only retry now covers it.

## 6. Known limits

1. **The vision gate flags severity-blind.** It cannot distinguish a duplicated headline from illegible
   micro-text. Persistent flags need a human glance, or a second stricter question ("would a viewer notice
   this text at a glance?").
2. **Creative & Marketing is inherently text-heavy** — brand mockups, screens, collateral. Expect the
   highest flag rate there; consider steering its scene prompts toward texture and material over artifacts
   with printed surfaces.
3. **Still a local pipeline.** `generate-design-html` remains untouched and emits v12 output. Section 2 is
   enforced by the local scripts only. Productionizing is `DEMO_MEDIA_WORKER_PLAN.md`.
