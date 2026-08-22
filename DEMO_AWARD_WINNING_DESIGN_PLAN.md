# Demo Page Award-Winning Design Plan

**Status:** DRAFT v4 — Phase A1 and Phase B are both live in production (v10 pipeline, 8 photos/category). See Section 7 for a full record of what shipped and what a full-file read of 3 real generations turned up beyond the original plan.
**Builds on:** `DEMO_MOTION_UPGRADE_PLAN.md` Phase 1, which is **already live in production** (`generate-design-html` v7) — captioned media-sequence, deterministic validation/retry, deterministic runtime injection. This plan is the next tier: pushing the actual visual/motion quality toward Awwwards/FWA-level, specifically so a lead looking at their preview wants to claim it immediately.

---

## 0. The hard guardrail, restated

"Award-winning" here means **design, motion, and photography excellence** — never content fabrication. Every rule from the original pipeline stays: real business content only, no invented credentials/stats/testimonials, no personal contact info in the footer. This plan never touches that boundary — it's entirely about how the page *looks and moves*, not what it *claims*.

## 0.5. A real bug found in already-shipped v7, unrelated to this plan but must be fixed as part of it

Checked the actual deployed runtime code: `heroInit()` correctly checks `prefersReduced` (the `prefers-reduced-motion: reduce` media query) and disables itself for users with that OS-level preference set. **`mediaInit()`, `splitInit()`, `revealInit()`, and `progressInit()` do not check it at all.** Right now, a reduced-motion user gets the hero parallax disabled but still gets the full split-text character reveal, card fade/slide, and media-sequence crossfade animating regardless of their accessibility preference. This is live in production today, independent of whether any part of this plan proceeds — it needs fixing as part of Phase A (see below), not treated as a "someday" item.

## 1. How to make a static image move on scroll — the actual techniques

This was asked directly, so here's the real answer, technique by technique. All of these are scroll-**linked** (tied to scroll position, not autoplay/time), which is what makes them feel intentional instead of gimmicky.

| # | Technique | How it works | Needs how many images | Feasibility |
|---|-----------|---------------|------------------------|-------------|
| 1 | **Scroll-linked parallax translate/scale** | JS reads scroll position → converts to a 0-1 progress value → applies `transform: translateY(...) scale(...)` to the image. This is exactly what `heroInit()` already does for `.hero-bg`. | 1 | **Already built, proven** — just needs generalizing beyond the hero |
| 2 | **Ken-Burns idle zoom/pan** | A slow CSS `@keyframes` animation (scale 1.0 → 1.08 over 8-12s) that plays automatically while the image is in view, independent of scroll. Makes a still photo feel alive even before the user scrolls at all. | 1 | **Trivial, zero new tech** — pure CSS, no JS needed |
| 3 | **Depth-layer parallax (real "3D" feel)** | Split one photo into a foreground subject and a background, move each at a *different* scroll-linked speed. The speed mismatch is what the brain reads as depth. Requires either real image segmentation (subject cutout) or faking it with two separate photos (a sharp foreground + a blurred/darker background). | 1-2 | **Segmentation: unverified** whether any OpenRouter model can do this — needs a feasibility check before committing. **Two-photo fake version: buildable today**, no new tech |
| 4 | **Scroll-scrubbed media sequence (crossfade)** | Multiple images crossfade based on scroll position — what we already built in Phase 1. | 3-4 | **Already built, live** |
| 5 | **Cursor-reactive tilt/parallax** | Image subtly shifts or tilts based on mouse position (not scroll) — adds a "living" quality even when the user isn't scrolling. | 1 | **Trivial** — mousemove listener + transform, zero new tech |
| 6 | **Scale/crop reveal** | Image starts zoomed in tight, and as the section scrolls into view it "zooms out" to reveal the full photo — scroll-linked, dramatic first-impression technique often used for hero images. | 1 | **Buildable today** — same scroll-progress math as #1, different transform target |

**The honest takeaway:** five of these six techniques are pure CSS/JS, zero new capability, and already proven by the hero section's existing code. Only true single-photo segmentation (#3's strongest version) is unverified — and it has a fully buildable fallback (two photos instead of one) that gets most of the same effect. This is not a repeat of the WebGL/3D over-promise we already ruled out once — everything here is achievable with what we have today, except the one item explicitly flagged as needing a feasibility check first.

## 2. Design pillars

Organizing the earlier brainstorm into five pillars, each with a clear "why this drives claims, not just looks nice":

### Pillar A — Motion (extends what's already live)
Generalize technique #1 beyond the hero; add #2, #5, #6 as reusable page-wide hooks; add magnetic-pull buttons and a custom cursor on desktop; fix the reduced-motion gap in Section 0.5. **Why:** this is what makes the page feel like it belongs on Awwwards instead of a template — the first 3 seconds decide whether a lead keeps scrolling.

**Two hard implementation rules for Phase A, found on review:**
- **Transform composition, not overwrite.** `heroInit()` already writes directly to `.style.transform` on the hero background for scroll parallax. Any new technique (cursor-tilt, generalized parallax) that touches an element already animated elsewhere must compose into a single transform string, never assign over what's already there — otherwise one animation silently cancels the other.
- **Every new hook extends `validateMotionHooks()`**, the same way captions extended it in Phase 1 — a new hook with no validation coverage is a silent failure waiting to happen.
- **Custom cursor must be gated by `(pointer: fine)`**, not just labeled "desktop only" — touch devices report as non-fine-pointer regardless of screen size, which is the correct signal, not a width breakpoint.

### Pillar B — Photography variety & quality
Expand from 4 to 8-12 photos per category; detect sub-categories (e.g. split "Home & Trade Services" into HVAC/plumbing/concrete/cleaning) so imagery actually matches what the business does; higher-tier image model for the hero shot specifically. **Why:** at Phase 5 scale (~462 more leads), 4 shared photos per category means visible repetition across leads in the same category — this stops being a design problem and becomes a credibility problem ("why does my competitor's demo have the same photo as mine").

### Pillar C — Conversion psychology
Sticky "Claim This Website" CTA that appears after the hero, not just at the bottom; honest "this is a preview, you don't have a live site yet" framing; real (not fabricated) trust signals pulled from data we already collect — `found_on_maps`/`maps_review_count` for a genuine "find us on Google Maps" badge. **Why:** this is a sales page. Beautiful motion that doesn't convert is a wasted investment — the CTA and trust signals are what actually turn "nice demo" into "I want to claim this."

**Found on review:** the "Sunbiz active-status badge" idea from the original brainstorm asserted a database field (`active`/`status`) that was never actually confirmed to exist on `leads` this session — only `document_number` and `filing_date` are verified-real columns. Before this makes it into a prompt requirement, the schema needs an actual check (`select column_name from information_schema.columns where table_name = 'leads'`), not an assumption.

### Pillar D — Performance
Lazy-load below-the-fold images (SiteReplicate already proves this pattern), preload the hero image specifically. **Why:** a slow-loading "award-winning" page defeats itself — the first-3-seconds impression pillar A is chasing depends on the page actually being fast.

### Pillar E — Mobile-specific tuning
Motion patterns (especially the media-sequence pin distance) are currently tuned assuming desktop scroll behavior. If postcards drive QR-code traffic, most first views are mobile. **Why:** the single biggest audience for these pages may currently be getting the least-tuned experience.

## 3. Phased rollout

| Phase | Pillar(s) | Scope | Feasibility risk | Depends on |
|-------|-----------|-------|-------------------|------------|
| **A1** | Motion | Fix the reduced-motion gap (0.5); generalize scroll-parallax (#1) into a reusable `data-parallax-img` hook; Ken-Burns idle animation (#2). No pointer/mouse-driven effects. | None — proven techniques, but still a shared-runtime change requiring full regression re-test of existing hooks | Nothing — can start immediately |
| **A2** | Motion | Cursor-tilt (#5), magnetic buttons, custom cursor (`pointer: fine` gated) — all pointer-driven, split from A1 because these are more likely to collide with each other and with A1/existing scroll transforms | None individually, but composition risk with A1 — ship and test after A1 is confirmed stable | A1 |
| **B** | Photography | Expand to 8-12 photos/category; sub-category detection for imagery matching | Low — same OpenRouter image-gen approach already proven, just more of it (est. $2.50-3.75 total at current per-image rate) | None, but should land **before** Phase 5 batch generation resumes to avoid regenerating leads later |
| **C** | Conversion | Sticky CTA; honest "preview" framing; real Maps trust badge (Sunbiz-status badge gated on a schema check first, see Pillar C) | None for the Maps badge; Sunbiz badge needs schema verification first | None |
| **D** | Performance | Lazy-load + hero preload | None — SiteReplicate already proves the pattern | None |
| **E** | Motion (advanced) | Real depth-layer parallax (#3) — segmentation feasibility research first; two-photo fallback if unavailable | **Unverified** — must confirm OpenRouter segmentation capability before committing to the real version | A1, A2 |
| **F** | Mobile | Dedicated mobile motion tuning (shorter pin distances, verify touch-scroll performance) | Low | A1, A2 |
| **G** | Systematic quality | Curated benchmark gallery (2-3 best demos per category as internal reference); sampled AI "grade this" pass; claim-rate tracking | Medium effort, ongoing not one-time. **Claim-rate tracking specifically needs new instrumentation — no click/claim analytics currently exist, this isn't an assumed capability** | Phases A1/A2-D shipped |

**Recommended order:** A1 → D → C → B → A2 → F → E → G. Reduced-motion fix and parallax/Ken-Burns first (proven, no pointer-event collision risk), performance next, conversion psychology (directly ties to the actual goal — people claiming), photography variety before Phase 5 resumes (avoids rework), *then* the pointer-driven A2 techniques once A1 is confirmed stable in isolation, mobile tuning once desktop motion is settled, the unverified depth-layer work and systematic quality tracking last.

## 4. Self-critique — real risks, not just a feature list

1. **Over-animation risk.** More motion isn't automatically better — a page with too many competing effects (parallax + Ken-Burns + cursor-tilt + magnetic buttons + captions all at once) can feel chaotic instead of premium, and could actively hurt conversion by distracting from the CTA. Phase A1/A2 should ship with motion *restrained* by default (one or two techniques per section, not all of them everywhere) and be tunable, not maximal — the A1/A2 split also helps here, since it forces a checkpoint to evaluate restraint before adding the pointer-driven layer.
2. **We have zero data that more motion increases claim rate.** Everything in this plan is a design hypothesis, not a proven conversion lever — we have no claim-rate data at all yet (no leads have claimed a site through this pipeline as far as we've verified). Phase G's benchmark/eval layer should eventually include actual claim-rate tracking, not just visual quality, once there's real traffic.
3. **Segmentation (Phase E) could repeat the WebGL mistake if not checked first.** Explicitly gated behind a feasibility check, with a fallback already identified (two photos instead of one) — this is the one item in the whole plan that isn't 100% provably buildable today.
4. **Photography variety (Phase B) has real cost/latency implications at scale.** Going from 4 to 8-12 photos/category × 8 categories is 64-96 images instead of 32 — still cheap in absolute dollars (~$2.50-3.75 total based on the $0.0387/image rate already measured), but worth stating plainly before generating rather than assuming.
5. **Mobile tuning (Phase F) can't be verified without real device/viewport testing** — the browser tool's mobile emulation is a reasonable proxy but isn't a substitute for confirming touch-scroll feel is actually smooth, not just that the layout doesn't break.
6. **This plan doesn't address the demo pages' underlying repetition problem at the content level**, only at the photography level — the AI-written business copy itself, category design tokens, and layout patterns are also shared across every lead in a category. That's a separate, larger conversation not covered here (out of scope for this specific design/motion plan).

## 5. Testing gate

Same discipline as every phase before this: implement → regenerate test leads → verify live in browser → confirm no regression on what Phase 1 already fixed (captions, validation, runtime injection) → only then move to the next phase.

**One correction found on review:** the standard 3 test leads (Concretation LLC, Sabal Sweets, Beauty Layne By Maggie) are each in a *different* category — fine for A1/A2/C/D/E/F, but useless for verifying Phase B specifically, since photo repetition is only visible when 2+ leads *in the same category* are compared side by side. **Phase B needs its own test set:** at least 2-3 leads sharing one category (e.g. two more Home & Trade Services leads alongside Concretation), regenerated and compared directly against each other for visible photo variety, not just against the pre-Phase-B baseline.

## 6. Open questions

1. ~~Should Phase A ship all its techniques together?~~ **Resolved on review** — split into A1 (parallax/Ken-Burns, no pointer events) and A2 (cursor-tilt/magnetic/custom-cursor, pointer-driven), A1 shipped and verified stable before A2 starts.
2. Phase B (photography variety) — go straight to 8-12/category, or step to 6/category first and see if that alone resolves the repetition concern at a lower cost?
3. Is there an appetite for the claim-rate tracking mentioned in Phase G now, or is that premature before Phase 5 has even produced enough live leads to measure? (This now also requires building actual click/claim instrumentation first — it doesn't exist yet.)
4. ~~Do we want the Section 0.5 reduced-motion fix pulled forward?~~ **Done** — shipped as part of Phase A1 (v8).

## 7. Shipped so far (v7 → v10) + what a full-file read turned up

Phase A1 is live. Along the way, three full generated HTML files (Concretation LLC, Sabal Sweets, Beauty Layne By Maggie) were read end-to-end — not just spot-checked via DOM queries — which surfaced real bugs the earlier validation-only approach had missed. All of the following are confirmed live and verified in-browser:

**v7 (captions):** every media-sequence image now carries a real, distinct, legible caption. Fixed the original complaint.

**v8 (Phase A1 motion + accessibility fix):** generalized scroll-parallax to any image via `data-parallax-img`; added `.ken-burns` idle zoom; fixed the reduced-motion gap from Section 0.5 (`mediaInit`/`splitInit`/`revealInit` now all respect `prefers-reduced-motion`, not just the hero); added transform-collision validation so `data-parallax-img`/`.ken-burns` can never be placed on the hero-bg or a media-sequence item.

**v9 (critical bug fix, found by reading full output, not by validation):** `splitInit()`'s word-splitting regex was `split(/s+/)` instead of `split(/\s+/)` — a literal-`s` matcher, not a whitespace matcher. It was **silently deleting every lowercase "s" from every split-text heading** ("Quality Concrete Work You Can Trust" rendered as "Quality Concrete Work You Can Tru t"). This affected every heading on every page generated since v6, including all 33+ already-live demos. Root cause was never fully pinned down (likely a transcription artifact in how the file was reconstructed for an earlier deploy call) — fixed by switching to `.split(" ")`, which needs no backslash at all and is immune to the same failure mode regardless of cause. Also fixed in the same pass: a dead `<button>` in Beauty Layne's header with no `href`/`onclick`, and enforced one shared `.btn`/`.btn-primary`/`.btn-secondary` button system instead of each page inventing its own one-off classes (Beauty Layne had 4 different button classes on one page).

**v10 (mobile nav):** v9 also added a "nav links must stay reachable on mobile" requirement, which on live testing turned out to be an incomplete fix — Concretation's nav links became technically non-`display:none` but visually overlapped the header CTA button at 375px width, making them just as unusable. Rather than build a full hamburger-toggle system (more new JS, more testing surface), removed the feature that caused the bug: the header is now required to be minimal (logo + at most one CTA), matching the pattern two of the three real generations had already independently chosen and that renders cleanly at every width. Verified on live regeneration: clean at both desktop and 375px mobile, no overlap.

**Not yet acted on — real findings from the same file read, held for a future phase:**
- No icon system — service/feature cards rely on bare text or a single unicode checkmark. Inline SVG icons per service (zero external dependency, compliant with the no-icon-fonts rule) would meaningfully improve scannability.
- Flat typography hierarchy — just h1/h2/h3 + body, no eyebrow/label/display-vs-body distinction. This is a limitation of the underlying category design-token research (`category_design_references.design_tokens`), not something a per-generation prompt tweak alone can fix — would need the category research itself revisited.
- Repetitive interaction feedback — every button/card across all 3 real pages uses the identical `translateY` + `box-shadow` hover, nothing else varies. This is exactly what Phase A2 (cursor-tilt, magnetic buttons) already targets — the file read didn't change that plan, just confirmed it's worth doing.
- Thin footer — by design, a direct consequence of the no-fabricated-contact-info compliance rule (Section 0). Documented here as a permanent, accepted trade-off, not a bug to fix.

**Methodology note worth keeping:** validation-by-regex (checking hooks/elements exist) caught structural gaps but completely missed the split-text corruption bug, because corrupted-but-present text passes every structural check. The only thing that caught it was reading actual rendered text output end-to-end. Worth remembering for any future validation work — presence checks and correctness checks are not the same thing.

**Phase B (photo variety) — shipped.** Expanded every category from 4 to 8 photos (added `workspace`/`closeup2`/`interaction`/`result` shot types alongside the original `hero`/`people`/`detail`/`secondary`), 32 new images across 8 categories, $1.24 total (one transient generation failure on `retail-ecommerce/closeup2`, retried successfully). Verified on live regeneration: the AI naturally draws from the full 8-photo pool rather than defaulting to the original 4 — a fresh Concretation LLC generation used `hero`/`people`/`detail` (original) plus `workspace`/`interaction`/`result` (new) in the same page, confirming the variety is actually being exercised, not just theoretically available. No regression on the split-text fix or any other Phase A1 hook.
