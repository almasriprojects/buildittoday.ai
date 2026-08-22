# Demo Site: Path to 100/100 (v13 + Video Hero v14)

**Status:** DRAFT — ready for review. v13 fixes the 3 gaps found in the L26000421575 (Tim Todd Consulting) audit that scored v12 at **91/100**. v14 (Section 6-7) adds a real video hero — a requirement that was previously scoped out as infeasible and is now confirmed possible.

**Superseded-in-part:** Sections 6-7's category-shared visual model (one photo/video set per category, reused across every lead) has been corrected — see `DEMO_SITE_DESIGN_BRAIN_PLAN.md`. Sharing visuals across leads in the same category undermines the actual point of the demo (a business-specific "we built this for you" pitch); real businesses in the same category/region could end up with visibly identical sites. Sections 6-7 below are kept for the technical mechanics (AI scene-prompt authoring, image-to-video, ffmpeg montage, hero markup/scrim) — all of that stays correct — but every generation described as "per category" now runs **per lead** instead, per the brain plan.

---

## 1. Why this matters (context, not a new requirement — just stating it plainly)

This HTML is the sales hook shown cold to businesses that just registered in Sunbiz. It has to look like a real, finished, professionally-run site on first glance — because it's what convinces them to become a paying client for the full package (real hosting on a VPS, a GitHub repo, and optionally a CRM/automations/chatbot already built elsewhere in this system). Every visible flaw at this stage is a lost conversion, so closing the last 9 points is worth doing properly, not patching around.

## 2. The 3 gaps, root cause, and fix — one per issue

### Gap 1 — No smooth scroll on nav (cost: 4 pts, header+footer)

**Root cause:** the entire `<style>` block is AI-generated per lead from the build prompt. Nothing has ever required `scroll-behavior: smooth`, so anchor clicks jump-cut instantly instead of gliding — jarring next to a page whose own claim-modal copy advertises "premium scroll-driven motion effects."

**Fix — deterministic, not prompt-only.** Same reasoning already applied to the motion runtime script and the header/footer template: anything that must be guaranteed on every single generation, regardless of whether the AI followed instructions, gets injected in code, not left to the prompt. `injectRuntime()` already inserts a `<script>`; extend it to also insert one tiny `<style>` block into `<head>`:

```css
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

The reduced-motion override matters — this session has been strict about that gating everywhere else (point #9 of the audit), so this fix must not regress it.

This retroactively fixes **every future generation** the moment v13 deploys — no prompt compliance risk, no validation check even needed for this one since it's no longer optional.

### Gap 2 — Dead `.btn-primary` CSS class (cost: 3 pts)

**Root cause:** the prompt currently tells the AI to use a `.btn` / `.btn-primary` / `.btn-secondary` three-class system, but `.btn` alone already renders the "primary" look (gold accent background) by default. No generation so far has ever actually defined a `.btn-primary` rule — it's dead weight riding on `.btn`'s styling by coincidence, not design.

**Fix — simplify the contract instead of patching it.** Drop `.btn-primary` from the system entirely:
- Primary CTAs use bare `.btn` (already the primary look, zero change needed to any existing generation's visual output).
- `.btn-secondary` remains for genuinely secondary/alternate actions.
- Update `BUILD_PROMPT_TEMPLATE` requirement #12 to stop mentioning `.btn-primary`.
- Add a `validateMotionHooks` check: if `class="[^"]*\bbtn-primary\b` appears anywhere in the output, fail validation with a corrective message ("`.btn-primary` is not a defined class — use `.btn` alone for primary CTAs"). This catches the exact defect class-wide, not just for this one lead, and forces the retry to self-correct.

### Gap 3 — Hardcoded/stale copyright year (cost: 2 pts)

**Root cause:** the footer's `&copy; 2024 ...` is plain AI-written text. It's already wrong today and will silently go stale every year forever unless every past demo is manually regenerated — not a one-time fix if left as prompt wording.

**Fix — deterministic, self-updating, zero maintenance.** Require the footer copyright markup to use a placeholder instead of a literal year:

```html
<p>&copy; <span data-current-year></span> Tim Todd Consulting, LLC. All rights reserved.</p>
```

New runtime function (added to `motion_runtime.js`, not gated by reduced-motion — this is a UI-state fill, not motion, same reasoning already applied to `mobileMenuInit`/`claimModalInit`):

```js
function yearInit() {
  var els = document.querySelectorAll("[data-current-year]");
  var y = new Date().getFullYear();
  els.forEach(function (el) { el.textContent = y; });
}
```

Add to `init()`. Add a `validateMotionHooks` check: footer must contain `data-current-year`. This means every page, forever, shows the correct year automatically — including the 33+ already-generated demos once each is regenerated under v13.

## 3. Version/deploy plan

- Motion runtime bumps to **v2.5**: `injectRuntime()` gains the deterministic `scroll-behavior` CSS block; new `yearInit()` added and called from `init()`.
- `BUILD_PROMPT_TEMPLATE` requirement #12 rewritten to drop `.btn-primary`, keep `.btn`/`.btn-secondary` only; footer requirement updated to require `data-current-year` instead of a literal year.
- `validateMotionHooks()` gains 2 new checks (btn-primary misuse, missing data-current-year); 1 gap (smooth scroll) needs no check since it's now unconditionally injected.
- `GENERATOR_VERSION` → `"v13-scorecard-100"`.

## 4. Testing gate (same discipline as every prior phase)

1. Regenerate **L26000421575** (Tim Todd Consulting) itself under v13 — this is the exact lead the scorecard was built against, so it's the direct before/after proof.
2. Regenerate **one more, different-category lead** (not Tim Todd, not Concretation — a fresh business) to confirm the fix isn't a one-off fluke.
3. Live-verify, real interaction (not structural-only, per this session's established methodology):
   - Click a nav link → confirm the scroll visibly animates (not an instant cut), on both header and footer links.
   - Resize to mobile, confirm the smooth-scroll fix doesn't break the hamburger dropdown.
   - Toggle `prefers-reduced-motion: reduce` in devtools, confirm scrolling reverts to instant jump (the override is doing its job, not just present in source).
   - Inspect the footer `<span data-current-year>` — confirm it renders the real current year, not literal source text.
   - Grep the generated HTML for `.btn-primary` — confirm zero occurrences, confirm all CTAs still visually look identical (bare `.btn` unchanged).
4. Re-run the same 12-point scorecard against the regenerated Tim Todd HTML — target: **100/100**, not just "no longer failing."

## 5. Self-critique (v13 — the 3 small fixes)

1. **Two of the three fixes are being made deterministic (scroll CSS, year), one is being made simpler-and-validated (btn-primary) rather than deterministic** — because a button-class naming contract is a design decision, not a fact like "what year is it," so it stays AI-generated but is now enforced by validation instead of trusted blindly.
2. **This fixes future generations automatically but does not retroactively fix the other 33+ already-shipped demos** — same open question flagged earlier this session (retrofit decision), still unresolved, out of scope for this specific plan.
3. **No cost/latency change** — no new OpenRouter calls, same one-call-per-lead pipeline, doesn't affect the pending Phase 5 batch-generation decision.

---

## 6. Video Hero (v14) — the hero background becomes a real video, category-aware

### 6.1 What changed since the last call on this

Earlier this session, an actual video hero was explicitly ruled out: *"Not verified as buildable... no confirmed OpenRouter video-generation capability."* That was true when it was written. It is no longer true — I just checked OpenRouter's live model list and they now host:

- **`bytedance/seedance-2.0-mini`** — text-to-video **and image-to-video**, 4–15s clips, 480p/720p, ~$0.0135–$0.03/sec depending on mode/resolution.

Image-to-video is the important part: it can take a photo we already have and animate it, rather than generating a whole new scene from scratch. So this doesn't replace the category-photo system — it extends it.

### 6.2 Business-category-aware motion, exactly as requested (superseded by 6.9 — kept as the original reasoning)

One video per **category**, not per lead — same cost-sharing pattern already proven with `category_photos` (8 categories, 8 photos each, ~$1.24 total, shared across every lead in that category). Generating video per-lead instead of per-category would multiply cost and generation time by however many leads exist in each category — not viable at the ~462-lead scale this pipeline is headed toward.

Each category's video is generated **image-to-video from that category's existing `hero.png`**, with a motion prompt matched to what that business actually does — this is the "depending on the business" part:

| Category (example) | Existing hero photo | Motion prompt direction |
|---|---|---|
| Real Estate | building exterior | slow drone-style dolly/flyover past the building |
| Restaurant/Food Service | plated dish / kitchen | steam rising, hands plating, subtle cooking motion |
| Professional Services | office/consulting scene | ambient office motion — people working, a handshake |
| Retail | storefront/shelf | slow pan across shelves/products, customer browsing |
| *(same pattern for the remaining categories)* | | |

This reuses the same photo the page already shows as the video's first frame (via `poster`), so there's zero visual inconsistency between "what the hero looks like" and "what it was built from."

### 6.3 Technical integration

New `category_design_references.category_hero_video` column (jsonb or plain URL, mirrors `category_photos`).

Hero markup changes from a static `<img class="hero-bg">` to:

```html
<video class="hero-bg" muted loop playsinline
       poster="https://.../professional-services/hero.png">
  <source src="https://.../professional-services/hero-video.mp4" type="video/mp4">
</video>
```

Note: **no `autoplay` HTML attribute.** Instead, `heroInit()` (already gated `if (!hero || prefersReduced) return;`) calls `bg.play()` itself once, right where it already sets the hero transform. This reuses the exact gating this session has been strict about everywhere else — reduced-motion users simply never get `.play()` called, and the `poster` frame (the same static photo used today) shows indefinitely instead. No new gating mechanism, no regression risk to point #9 of the scorecard. Programmatic `.play()` on a muted video is allowed without a user gesture in all current major browsers, so this works with zero user-interaction requirement.

If the `<source>` fails to load for any reason (slow connection, blocked format), the `poster` image still renders — today's static photo becomes the guaranteed fallback, not a regression.

### 6.4 Real risk: video quality, not just feasibility

Feasibility is now confirmed, but **quality is not** — AI-generated video is meaningfully more prone to warping, uncanny motion, or artifacts than AI-generated stills, and a glitchy hero video would actively hurt the sales pitch, worse than today's clean static/idle-zoom hero. This is the actual gating risk now, not "can we do it."

### 6.5 Mandatory single-test gate before any full build-out

Same discipline used for the category-photo spend: **do not commit to generating all 8 category videos, touching the edge function, or quoting a final cost until one real test call is made and reviewed.**

1. Make one real `bytedance/seedance-2.0-mini` image-to-video call using the existing `professional-services/hero.png` as input, with a category-appropriate motion prompt.
2. From the real response, confirm: actual output format, actual file size, actual generation latency, and the **actual cost from the response's cost field** (not the docs estimate above — the photo pipeline's real per-image cost came in noticeably different from initial assumptions and was only trusted once confirmed live).
3. **Watch the actual output.** If it looks warped, uncanny, or low-quality, this plan stops here and reverts to the idle-zoom hero (still a legitimate "moving" hero, already shipped and working) rather than shipping something that looks worse than a photo.
4. Only after that review passes: generate the remaining 7 category videos, wire up the edge function change, and test on 2 real leads across different categories, same as every other phase this session.

Rough, explicitly **unconfirmed** back-of-envelope order of magnitude: 8 categories × ~6s clip × ~$0.02/sec ≈ $1–$1.50 total — similar scale to the photo spend, but this is a placeholder until step 2 above returns a real number, not something to approve spend against yet.

### 6.6 Sequencing — kept separate from v13

v13 (Section 2–5) is small, deterministic, and low-risk — ship that first. Video hero is bigger scope, real spend, and a genuine quality risk that photos didn't have. It becomes its own phase (v14), gated by the single test call in 6.5, following the same phased pattern already used successfully for Phase A1/A2/B this session — not bundled into the same deploy as the three small fixes.

### 6.7 Live-verified on L26000421575 (manual patch, not yet in the pipeline)

To let the video be judged in real context (not just extracted frames), the one test clip was manually wired into the live Tim Todd Consulting demo — `<video>` swap, `.play()` call added to `heroInit()`, hero video uploaded to Storage — and viewed in-browser at desktop and mobile widths.

- First pass: legible but weak — the original `.hero-bg::after` gradient (tuned for a static photo) wasn't dark/consistent enough against a video whose brightness shifts frame to frame.
- Fix: flattened the gradient's minimum opacity (0.6→0.72 floor) **and** added `text-shadow` directly on the hero `<h1>`/`.subheadline` — a second, deterministic legibility layer that doesn't depend on guessing the right gradient for footage that changes over time. This is the two-layer scrim that should become the standard hero-text treatment once video hero ships for real (not just this one manual test).
- Re-verified at both desktop and mobile (375px) — headline and subheadline both clearly readable throughout the clip's motion, including the brighter street-level frames later in the clip.
- This same live view also visually reconfirmed the Section 6.4/6.5 loop problem in real time: by mid-clip the frame has already dollied to a completely different, invented street-level scene — visible proof (not just extracted stills) that this exact clip is not ready for the `loop` attribute as-is.
- **This was a manual one-off patch on one already-generated lead, not a pipeline change.** `generate-design-html` and its prompt/validation are untouched — this only proves the concept and the scrim technique before either goes into the real build.

### 6.8 Self-critique (video hero specifically)

1. **Feasibility confirmed via live docs research, not yet via a real API call** — OpenRouter's model page doesn't document the exact image-to-video request/response shape (parameter name for the input image, exact output format). The 6.5 test call resolves this before any further commitment.
2. **Mobile/bandwidth cost is real** — video is far heavier than a photo on what's supposed to be a fast first impression. Keeping clips short (4-6s) and capped at 480p is a deliberate cost-and-weight control, not just a price optimization.
3. **This is the one place in the whole pipeline where "AI got it wrong" would look worse than not having the feature at all** — a warped drone shot or uncanny-valley cooking motion actively damages the pitch. The poster-fallback and the mandatory quality check in 6.5 exist specifically to make sure a bad generation degrades gracefully instead of shipping.

---

## 7. AI-Authored Scene Prompts + 3-Scene Montage (revises 6.2 — the real fix for the loop problem)

### 7.1 Why this replaces the single-prompt approach

Section 6.2's plan was one hand-written motion prompt per category. The live test in 6.7 proved the actual failure mode: forcing one clip to loop perfectly is fragile — the model kept dollying forward and inventing new scene content (street level, cars, pedestrians) that was never in the source photo, breaking the loop outright. Two structural changes fix this properly instead of just tightening the same prompt and hoping:

1. **Don't hand-write the prompts — have an AI author them.** A capable model can reason about what visual scenes actually suit a given business type (a law firm vs. a med-spa vs. a restaurant), instead of me guessing one fixed formula per category.
2. **Don't rely on one clip self-looping — cut together 3 short scenes into a montage instead.** Jump cuts between distinct scenes are a normal, expected pattern — real corporate/real-estate video reels are built exactly this way. This sidesteps the loop-matching problem almost entirely: internal cuts are *supposed* to be cuts, and only the wrap-from-scene-3-back-to-scene-1 restart point matters, which is far less noticeable at a ~10-12s cycle than it was at 5s.

### 7.2 Pipeline (all 5 stages run in the existing offline per-category Python script — same script family as `gen_category_photos.py`, never in the Deno edge function)

**Stage 1 — AI scene-planning call (new).**
- Model: `anthropic/claude-sonnet-4.5` via OpenRouter (same model already trusted for the HTML build step — this call needs real visual/compositional reasoning, not just pattern-matching).
- Input: category name, that category's existing `design_tokens`/`layout_analysis`/`motion_notes` (already in `category_design_references`), plus 1-2 example real business types for that category, so the output is grounded rather than abstract.
- Output: strict JSON, 3 scenes, each `{ scene_name, image_prompt, video_motion_prompt }`.
- The face/hand-safety and "never invent content beyond the source frame" constraints (learned the hard way in 6.4-6.7) live in **one shared system instruction wrapping every call**, not re-derived per category — the AI only varies creative direction, never the safety rules.
- Shot grammar mirrors what `category_photos` already uses (hero/people/detail) — this isn't a new visual taxonomy, just the same grammar applied to motion.

**Stage 2 — Generate 3 images.** Same `google/gemini-2.5-flash-image` call already used in `gen_category_photos.py`, one call per scene's `image_prompt`.

**Stage 3 — Generate 3 videos.** Same `bytedance/seedance-2.0-mini` image-to-video call already proven live in 6.5-6.7 — one per scene, that scene's image as `frame_images[0]`, that scene's `video_motion_prompt`, ~3-4s each (3 scenes ≈ 10-12s total).

**Stage 4 — Merge (new, local ffmpeg, offline only).** All 3 clips share model/resolution/codec (480p h264 mp4, confirmed from the real test), so this is a plain concat, not a re-encode: `ffmpeg -f concat -i list.txt -c copy merged.mp4`. No crossfades — hard cuts are the intended look. ffmpeg is already confirmed available locally (used to pull the test frames in 6.7's verification) — this runs only in the offline script, so the Deno-edge-function ffmpeg limitation that ruled out video months ago never actually applies here.

**Stage 5 — Upload + store.** Merged clip → `category-photography/{category}/hero-video.mp4` (same path convention as the manual test). The 3 sub-images/sub-clips are worth keeping in storage too — cheap, and lets one scene be regenerated without redoing all 3. `category_design_references.category_hero_video` stores only the final merged URL — that's the only thing `generate-design-html`/the hero markup (6.3) ever needs to reference; the whole authoring/generation/merge process stays invisible to the live pipeline.

### 7.3 Cost (unconfirmed estimate — same discipline as every prior spend, real numbers only after one test category)

- 1 scene-planning call: cheap, ~$0.01-0.05.
- 3 images × ~$0.04 (real confirmed per-image cost from the photo pipeline) ≈ $0.12.
- 3 videos × ~$0.05-0.07 (real confirmed cost from the one seedance test at 5s; these are shorter at 3-4s so likely somewhat less) ≈ $0.15-0.21.
- **≈ $0.30-0.40 per category × 8 categories ≈ $2.50-3.50 total** — similar order of magnitude to the photo spend, but still just an estimate. Confirm with one real end-to-end category run before approving spend for all 8.

### 7.4 Testing gate

1. Run all 5 stages for **one category only** (professional-services — we already have a baseline from 6.7 to compare against).
2. Review before spending anything further: does the AI-authored prompt set read as genuinely sensible/professional? Do the 3 images form a coherent set? Does each video individually avoid the invented-content/warping problem (shorter scenes should make this much less likely, but verify, don't assume)? Does the merged clip play cleanly at the cut points, no encoding artifacts?
3. Wire into the same Tim Todd Consulting live page using the exact manual-patch + scrim/text-shadow technique already proven in 6.7, to judge it in real context.
4. Only after that passes: run the remaining 7 categories, then move this from "manual patch" into the real `generate-design-html` build — permanently swap the hero `<img>` for `<video>` in the prompt template + validation (6.3), not just a one-off patch on one lead.

### 7.5 Self-critique

1. **Real cost/complexity increase over 6.2** — 3x images, 3x videos, 1 planning call, 1 merge step per category instead of one clip. Justified because 6.7 proved the simpler version doesn't actually work, not because more is inherently better.
2. **The scene-planning call is a new failure surface** — its JSON output needs basic structural validation (3 scenes present, both prompt fields non-empty each) before anything downstream consumes it, same defensive pattern already used for `validateMotionHooks` elsewhere in this pipeline.
3. **Confirms the codebase decision**: this entire step lives in the offline per-category script. SiteReplicate is not involved. The Deno edge function's runtime behavior doesn't change beyond what 6.3 already specified — it only ever consumes one finished `category_hero_video` URL, regardless of how many stages produced it.
