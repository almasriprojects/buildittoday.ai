# Demo Site Design Brain — Award-Tier, Per-Lead Pipeline

**Status:** DRAFT — ready for review. Extends `generate-design-html` with 4 new upstream stages. Supersedes the category-shared visual model in `DEMO_SITE_100_SCORE_PLAN.md` Sections 6-7 (video hero) — those become **per-lead**, not per-category, per the earlier correction ("why did you build it this way").

Reference bar (visited live, not assumed): likova.space (cinematic photo + oversized wordmark, numbered scrollytelling, custom cursor, preloader), pxpush.com (grain texture, kinetic marquee, restrained palette), haoqi.design (WebGL 3D type, live data widgets — explicitly out of scope, see Section 6), awwwards.com (the general bar).

---

## 1. The four stages ("the brain")

### Stage 1 — Business Style Analysis
Input: `business_name`, category, `generated_content` (tagline/about/services), city/state.
Output: a style brief — color palette reasoned from *this business's* name/positioning/service tier (not a generic category default), typography direction (editorial serif vs. bold grotesk vs. clean sans), tone descriptors, and a motion-intensity level (subtle/moderate/bold). One OpenRouter text call.

### Stage 2 — Competitor Style Research (signals only, never harvested)
- A web-search-capable agent finds 2-3 real, currently-live sites in the same category/locale (or a well-known industry example if no close local match exists).
- **Hard constraint, stated explicitly in the agent's prompt: describe, don't copy.** It reports what it observes in its own words — color logic, layout rhythm, hero pattern, motion vocabulary, type scale. No scraping, no asset harvesting, no reproducing their copy or images, no pixel-matching their layout. This is a real copyright/IP line, not just a style preference — reproducing a real competitor's actual site closely is a legal problem, describing what a good site in their space tends to do is not.
- **SiteReplicate is not used here.** Its harvester is a literal clone tool — appropriate for the earlier deterministic-motion-runtime borrowing (our own code, already resolved), inappropriate for extracting real competitors' actual assets. If a screenshot reference is useful at all, it's only as something for the researching agent to describe in its own words, never to extract/reuse.
- Output merges into Stage 1's brief as a "competitive style signal" addendum.

### Stage 3 — Design Token + Layout Synthesis
Combines Stage 1 + 2 into the same `design_tokens`/`layout_analysis`/`motion_notes` shape already used today — but generated fresh **per lead**, not pulled from a shared category record. This is also where motion intensity gets decided: not every business should get every effect (grain + marquee fits a creative-agency tone; a law firm's brief might dial those down and lean toward likova.space's cleaner cinematic register instead). Effects applied without this reasoning step is exactly how "more motion" ends up looking worse, not better.

### Stage 4 — Build (extends the existing `generate-design-html` call)
Same one-call HTML build as today, now fed the per-lead synthesized brief instead of a static category record. New **deterministic** runtime additions (motion runtime bump, `injectRuntime()` — same "guarantee it in code, don't just hope the prompt is followed" pattern used all session):

- **Smooth/inertia scroll** — a small hand-rolled easing-based scroll (not a native `scrollTo`), no external library/CDN (the pages must stay self-contained). Delivers the "buttery" scroll feel from all 3 references without WebGL.
- **Grain/noise texture overlay** — pure CSS, deterministic, toggled per style brief.
- **Marquee/ticker band** — deterministic CSS+HTML, content pulled from real `generated_content` (e.g. a scrolling services/trust-marker strip), toggled per style brief.
- **Preloader with percentage counter** — deterministic JS, brief gate on first paint, matches the reference pattern.
- **Oversized editorial typography** — a design-token/prompt change (bigger scale ratio, tighter tracking, headline treated as a graphic element), not new code.
- Hero video/photo: reuses the pipeline already proven in `DEMO_SITE_100_SCORE_PLAN.md` Section 7 (AI-authored 3-scene prompts, image-to-video, ffmpeg montage) — but generated **per lead** now, not per category, per the uniqueness correction.

## 2. Cost per lead (full stack — the honest number)

| Stage | Cost |
|---|---|
| 1 — Style analysis | ~$0.02-0.05 |
| 2 — Competitor research (search + analysis) | ~$0.05-0.10 |
| 3 — Synthesis | folded into 1-2, or ~$0.02 |
| 4 — HTML build (existing) | ~$0.02-0.05 |
| Visuals — unique photos + 3-scene video montage | ~$0.50 |
| **Total per lead** | **~$0.60-0.75** |

Up from today's ~$0.02-0.05 (HTML-only, shared visuals). That's the real tradeoff for "unique, reasoned, per-business" instead of "good enough, shared." At the pending 462-lead batch, that's **~$280-350 total** — needs your explicit sign-off before batch use, same as every other real spend this session, and should be confirmed with one real test lead first, not assumed from this table.

## 3. Guardrails

- Stage 2 output gets a quick human skim on the first several leads specifically for over-reproduction risk (an agent can drift from "describing" toward "quoting" without meaning to) — this is fuzzy enough that it needs a person looking, not just automated validation.
- The existing one-retry-with-correction `validateMotionHooks` pattern extends to the new deterministic hooks (grain toggle present when brief calls for it, marquee content non-empty, preloader resolves, smooth-scroll doesn't break anchor-nav targeting).

## 4. Testing gate

1. Run all 4 stages on **one lead** (Tim Todd Consulting — full history/comparison already exists for it).
2. Review each stage's output *before* trusting the next one: is the style brief sensible? Is the competitor research genuinely descriptive, not lifted? Are the resulting design tokens coherent? Does the final HTML actually show grain/marquee/preloader/smooth-scroll working live in the browser?
3. Compare side-by-side against the current v12/v13 page and the 3 reference sites — is it actually closer to "stunning," or just "more effects turned on"? This is the real test, not a checklist pass.
4. Only then: 2-3 more leads across different categories, confirming the system generalizes rather than being tuned to one business.
5. Only after that: revisit the standing retrofit-vs-new-only decision and re-cost the 462-lead batch against the real ~$0.60-0.75/lead number from step 1, not the table estimate.

## 5. Explicitly out of scope

- **No WebGL/Three.js/3D** (haoqi.design-tier). That's hand-tuned shader work — not something reliably automatable per lead at 462+ scale without a human designer touching each one, which breaks the scale premise of this whole project. Flagging this now rather than overselling it.
- **No literal competitor cloning** — signals only, per Stage 2.
- **SiteReplicate is not part of this pipeline** — confirmed earlier this session; everything stays inside `generate-design-html` and its new upstream stages, OpenRouter-only per the standing hard constraint.

## 6.5 First live test result (manual, not yet in the pipeline)

Ran all 4 stages on Tim Todd Consulting as a manual local test (Python + OpenRouter, not deployed to `generate-design-html`). Total cost: **$0.13** (Stage 1 $0.014, Stage 2 $0 — used live web research directly instead of a paid agent call, Stage 3 $0.019 x2 due to the bug below, Stage 4 $0.082).

**Two real findings, both fixed before calling this a pass:**

1. **Stage 3 bug (caught immediately, per the testing gate's own purpose):** the first synthesis run hallucinated that Tim Todd Consulting does "video and photography," not consulting — because the test script only passed the two upstream style briefs into Stage 3, not the actual business content. Fixed by forcing the real business content through as explicit ground truth the model must never contradict. **This is a required fix in the real pipeline, not just this test** — Stage 3 must always receive full lead content directly, never rely on it surviving intact through Stage 1/2's outputs.

2. **Split-text runtime bug (pre-existing, unrelated to the brain pipeline, found because this test's hero wrapped differently than prior tests):** `data-split-text` wraps every character in its own span for the reveal animation, but nothing kept a word's characters glued together — so headings could line-break mid-word ("busin- esses"). Fixed by adding `.ms-word{display:inline-block;white-space:nowrap}` to the injected CSS. **This bug affects every page already shipped using `data-split-text`, not just this test** — worth a note for whenever `generate-design-html`'s runtime next gets touched.

**The brain's actual recommendation, built and viewed live:** typography-led hero (no photo/video), forest green/sage/warm-tan palette, serif headings at oversized scale, grain texture, subtle motion only — all correctly grounded in Tim Todd's real business, verified working at desktop and mobile width, claim modal opens/closes correctly, copyright year renders live (2026, not hardcoded). Visually distinct from — and arguably more confident than — the earlier video-hero version, for this specific business.

Not yet done: Stage 2 in this test was me directly browsing reference sites rather than a deployed search-agent call — the real pipeline version of Stage 2 (an autonomous agent call) still needs its own test before being trusted unattended.

## 6.6 Second live test — 3 leads, video heroes mandatory (CORRECTED)

**What was wrong in 6.5:** the first test let the brain choose `hero_pattern`, and it chose "typography-led"
(no imagery) for Tim Todd. That was a mistake in how the pipeline was framed, not a good judgement call.
The demo's job is to impress a business owner cold enough that they pay — a text-on-beige page does not do
that, however defensible it is as design theory. **Hero visuals are now a hard constraint: the brain decides
palette, typography, motion and scene content, never *whether* imagery exists.**

Tested on 3 deliberately different real leads (no repeats of earlier test businesses):

| Lead | Category | Palette chosen | Fonts | Scenes |
|---|---|---|---|---|
| Pema Spa Sarasota | Health & Wellness | forest/sage/gold | Cormorant Garamond + Outfit | entry → massage → ritual detail |
| Bubba & Duck's | Food & Beverage | terracotta/amber/teal | Fraunces + DM Sans | storefront → plating → finished dish |
| Lange Marine | Home & Trade | navy/blue/orange | Fraunces + Inter | marina → engine work → hull detail |

**Real cost: $1.31 for 3 leads = ~$0.44/lead** (Stage A briefs $0.06, 9 images $0.31, 9 videos $0.45,
builds incl. retries $0.48). Cheaper than the $0.60-0.75 estimate in Section 2.

**Findings:**

1. **Content-filter failures are real.** 1 of 9 video jobs (`Pema Spa / Healing Hands` — hands on a client's
   shoulders) returned HTTP 400 from the video model, almost certainly a safety filter on hands-on-body
   imagery. The pipeline degraded gracefully — the spa shipped an 8s 2-clip montage instead of 12s.
   Massage/medspa/personal-care categories will hit this repeatedly; the pipeline must tolerate N<3 scenes,
   which it now does, and ideally retry once with a re-worded scene prompt.
2. **The image model ignores aspect-ratio instructions** — all 9 stills came back 1024×1024 square despite
   "16:9" in the prompt. The video model takes `aspect_ratio` as a real API parameter and crops correctly
   (output 864×496), so heroes are fine; but the stills reused in the media sequence and parallax are square
   and get cropped by `object-fit:cover`. Should crop to 16:9 explicitly before use.
3. **New validation + one corrective retry added** (mirroring `validateMotionHooks`). It immediately caught a
   real defect: 2 of 3 pages emitted a `data-media-sequence` with only **one** `.ms-item` — a 250vh sticky
   scroll section showing a single static image. Both retries passed clean. This check belongs in the real
   edge function.
4. **`.hero-bg::after` does not render on a `<video>` element.** The scrim must be a separate `.hero-scrim`
   div. Encoded in both the build prompt and the validator.
5. **Hero video weight: 2.2-4.5MB per lead.** Heavy on mobile. The `poster` covers first paint so it degrades
   acceptably, but shorter clips or stronger compression is worth doing before batch.

**Verified live in-browser** (not just structurally): video heroes autoplay with legible text over them at
desktop and 375px mobile, media sequence scrubs between both images with real service copy, mobile hamburger
opens a clean 280px panel with no overlap, claim modal opens/locks scroll, footer year renders 2026 dynamically.

## 6.7 Fixes applied + 4th lead rebuilt

All four findings from 6.6 are now implemented in the local pipeline (`brain_v3_fixes.py`):

1. **16:9 crop** (`crop_16x9`) — stills are center-cropped after generation, since the image model
   ignores aspect-ratio instructions. Verified `cropped=True` on all new images.
2. **Content-filter retry** (`submit_video_safe`) — on a 400/403/422 the scene is resubmitted once with a
   deterministic ambient-only prompt that references no people at all. Recovers the failure class that
   killed the spa's massage scene without needing a second model call to reword it.
3. **Compression** (`compress_montage`) — the merge step now re-encodes (scale to 480p, x264 crf 30,
   `+faststart`) instead of stream-copying. **Heroes dropped 86-90%: 4.33MB → 0.61MB, 3.84 → 0.57,
   2.06 → 0.23.** Visual quality spot-checked on an extracted frame and holds up. The 3 earlier leads were
   recompressed and re-uploaded locally at zero API cost.
4. **Validation + one corrective retry** — in `brain_v2_validate.py`, wired into the build. Caught the
   single-`.ms-item` defect on Tim Todd's first build too; retry passed clean.

**Tim Todd Consulting rebuilt** off the text-only version onto a real video hero (navy/tan, Fraunces + Inter,
scenes: strategic overview → collaborative process → results focus). Cost $0.50 (media $0.31 + build $0.19).

Final state of all four demos — validator clean, storage objects confirmed serving:

| Lead | Hero video | Clips | Validation |
|---|---|---|---|
| Tim Todd Consulting | 0.39 MB | 3 | clean |
| Bubba & Duck's | 0.57 MB | 3 | clean |
| Pema Spa Sarasota | 0.23 MB | 2 | clean |
| Lange Marine | 0.61 MB | 3 | clean |

**Known cosmetic imperfection:** image models still occasionally render legible text into a scene despite
"no text" in the prompt (Tim Todd's hero has a visible "Strategic Planning" document). Harmless and on-topic
here, but it is not controllable via prompt alone — worth a check before any batch goes to real recipients.

**Still not production:** every stage above runs as local Python. The deployed `generate-design-html` edge
function is untouched and still emits v12-style output. Productionizing is Section 7.

## 7. Productionizing (not yet started)

The media stages need ffmpeg and ~2 minutes of wall-clock per lead, so they cannot run inside a Deno edge
function — that constraint is what makes this a batch worker rather than an edge-function change:

- A worker (VPS) pulls unbuilt leads in chunks: brief → images → videos → montage → upload.
- The build step consumes only the finished media URLs, so it can stay in `generate-design-html`.
- Validation + one corrective retry ports into the edge function alongside the existing `validateMotionHooks`.
- Run a small real batch (~10 leads across categories) and review before anything larger.

## 6. Self-critique

1. **This is the biggest pipeline change this session** — 4 new stages ahead of the existing build call, each a new OpenRouter call, each a new failure surface. Ships stage-by-stage (same Phase A1/A2/B discipline already used), not as one deploy.
2. **Cost per lead jumps roughly 10-15x** (~$0.05 → ~$0.60-0.75). Real tradeoff, needs explicit sign-off before touching the 462-lead batch.
3. **Stage 2 is the riskiest stage** — most exposed to quietly drifting from "inspired by" toward "too close to," and the least automatable to validate. Needs real human review on the first outputs.
4. **This absorbs/supersedes Sections 6-7 of `DEMO_SITE_100_SCORE_PLAN.md`** by making hero video per-lead instead of per-category — noted there too so the two documents don't contradict each other.
