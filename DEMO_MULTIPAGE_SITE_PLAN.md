# Demo Site: Multi-Page Architecture Plan

**Status:** SUPERSEDED — the user clarified "About/Services/Contact" should be anchor-scroll buttons within one page, not separate page files. See `DEMO_SITE_STRUCTURE_PLAN.md` for the corrected, much smaller plan. Kept here only as a record of the wrong initial interpretation — do not implement anything in this file.

---

## 1. What actually changed in the requirements

Four points raised, verbatim intent:
1. Header must link to all other pages — not anchors within one page, actual **pages**.
2. Footer must also link to all other pages.
3. Remove the "Claim This Premium Website" section from the visible page.
4. The hero image must move on its own (a "movie or moving photo"), not just respond to scroll.

Plus: "list a proper full page for a min site" and "create a full plan" — this is a request for an actual page inventory and an architecture plan, not a quick patch.

This is a real pivot: everything built so far (`generate-design-html`, all 11 versions) produces **one HTML document** per lead. Points 1 and 2 mean that's no longer sufficient — the demo needs to be a genuine multi-page site.

## 2. Grounding: what real content exists to build pages from

Checked `leads.generated_content` directly for the current test lead (Tim Todd Consulting) rather than assume. The actual shape is:

```json
{
  "tagline": "...",
  "hero": { "headline": "...", "subheadline": "...", "cta_text": "..." },
  "about": { "heading": "...", "body": "..." },
  "services": [{ "title": "...", "description": "..." }, ...  5 items],
  "why_choose_us": ["...", "...", "...", "..."],
  "contact_cta": { "heading": "...", "body": "...", "button_text": "..." }
}
```

**No testimonials field. No FAQ field. No team/staff bios. No gallery captions.** This isn't a gap in this one lead — it's the schema `generate-site` produces for everyone. It directly bounds what pages we can honestly build. We cannot fabricate a testimonials page or a team page — that would violate the no-fabrication rule that's been enforced since the start of this pipeline. Any page richer than what's listed above requires expanding `generate-site`'s content schema first — a separate, upstream change, not something to fake at the HTML-generation layer.

## 3. Proposed page structure (minimum real site, 4 pages)

| Page | File | Built from | Purpose |
|------|------|-----------|---------|
| **Home** | `index.html` | `hero` + condensed `about.heading`/short excerpt + `why_choose_us` highlights + services preview (titles only, links to Services page for detail) + final CTA | First impression, overview, funnels into other pages |
| **About** | `about.html` | `about.heading` + full `about.body` + full `why_choose_us` list | The fuller story — everything Home only teases |
| **Services** | `services.html` | full `services[]` list, one block per service, detailed | The actual offering, in full |
| **Contact** | `contact.html` | `contact_cta.heading`/`body` + the claim mechanism prominently featured here (not a real submittable form — there's no real business inbox to receive it — this page's real job is to be where "claim this site" makes the most sense contextually) | Where a visitor who's convinced goes next |

This is the honest maximum given current content. A Gallery/Portfolio page or Testimonials page would need real material first (upstream `generate-site` change) — not listed here as in-scope.

## 4. Point-by-point plan

### Point 1 + 2 — Header/footer link to all pages

**Architecture decision: build header, footer, nav, and the claim modal as deterministic templates in code, not via the AI.**

This mirrors a technique that already proved itself in this exact pipeline: the motion runtime is deterministically injected by the edge function rather than trusted to AI reproduction, specifically *because* AI reproduction had a real failure mode (the backslash-mangling bug in v8→v9). The same reasoning applies here, more strongly:
- Header/footer/nav must be **byte-identical across all 4 pages** — if each page's AI call independently reworded the nav or reordered links, the site would look broken/inconsistent between pages, which is worse than the current single-page site.
- Header/footer contain zero content risk if built in code directly from `lead.business_name`/`lead.city`/`lead.state`/`generated_content.tagline` — no chance of the AI inventing a phone number or a fake credential in the footer, because the AI never touches it.
- Validation gets simpler: only the AI-generated main content per page needs structural checking; header/footer/nav are correct by construction every time.

So: the edge function builds one shared header/footer/nav HTML block (a plain TypeScript template function, not a prompt), and each of the 4 AI calls is only asked to generate the `<main>` content for its one page, which then gets deterministically wrapped in the shared header/footer at assembly time — the same pattern already used for the motion runtime script.

Nav links: Home / About / Services / Contact, present identically in header and footer on every page, pointing to the sibling files (`index.html`, `about.html`, `services.html`, `contact.html`) via relative paths.

### Point 3 — Remove the claim section, make it a popup

Already scoped in the previous turn, still correct, now extended to work across 4 pages instead of 1:
- No `<section class="claim-section">` on any page.
- One shared claim-modal template (same deterministic-injection pattern as header/footer) — hidden by default, present on every page.
- Every `.btn` on every page becomes a trigger (`data-claim-trigger`) that opens the modal, via a new runtime function `claimModalInit()`.
- Footer's old "this is a preview website" disclaimer line is dropped — the modal is the only place that messaging lives now.

### Point 4 — Hero must move on its own, not just on scroll

**Technical root cause of why this wasn't already the case:** `heroInit()` currently only writes `.style.transform` in response to scroll events — with zero scroll, the hero is a static image. The plan's existing Ken-Burns idle-zoom effect was deliberately *excluded* from the hero specifically to avoid a transform collision (a separate CSS `@keyframes` animation fighting the scroll-driven inline `.style.transform`).

**Fix:** don't add a second, separate animation — extend `heroInit()` itself to run its own continuous `requestAnimationFrame` loop (driven by elapsed time, not scroll) that combines a slow idle zoom with the existing scroll-driven parallax into one unified transform, written from the same function. One source of truth, no collision, no new hook needed — this is a rewrite of existing code, not a new feature to validate. Result: the hero image slowly, continuously breathes/zooms on its own the moment the page loads, and *additionally* parallaxes faster when the user scrolls.

**What this is not:** an actual video background. That's a materially bigger, currently-unverified capability (no ffmpeg available in the Deno edge function runtime; video generation via OpenRouter has not been confirmed feasible — exactly the kind of claim that got flagged and correctly walked back earlier in this session for the WebGL/3D idea). The idle-zoom fix delivers the "moving photo" feel honestly and is buildable today; real video is explicitly deferred, not promised.

## 5. What changes technically

- `generate-design-html` goes from **1 OpenRouter call → 4 OpenRouter calls per lead** (one per page), each scoped to just that page's `<main>` content, using the same design-token/photo/motion-hook system already in place.
- Deterministic header/footer/nav/claim-modal templates, built in TypeScript from `lead` + `generated_content` fields directly (no AI involved for these).
- Storage layout changes: `{demoSlug}/index.html`, `{demoSlug}/about.html`, `{demoSlug}/services.html`, `{demoSlug}/contact.html` (was just `{demoSlug}/index.html`).
- `/demo-sites/[slug]/route.ts` needs to serve sub-pages, not just the one file — becomes `/demo-sites/[slug]/[[...page]]/route.ts` or similar, resolving `about`/`services`/`contact` to the right Storage object.
- `validateMotionHooks` needs to run per-page, plus a new cross-page check (do all 4 pages exist, do nav links resolve consistently).
- Real cost/latency impact: ~4x the OpenRouter calls per lead. Current single page is ~$0.02-0.05 and ~60-90s; four pages generated sequentially could be ~$0.08-0.20 and 4-6 minutes per lead — meaningful for Phase 5 batch generation of ~462 leads, and needs an explicit decision on sequential-vs-parallel generation and chunk size before resuming that phase.

## 6. Self-critique — real risks

1. **This is the single biggest architecture change in this pipeline's history.** Every other change so far was additive to one document. This touches storage layout, the route handler, the validation function, and the generation loop simultaneously. It should not be built and deployed as one big change — see phasing below.
2. **Cost/latency roughly 4x's per lead**, right as Phase 5 (462 leads) is the next queued step. This plan should be finished and verified on 2-3 leads before any bulk generation resumes, or Phase 5 will need re-costing.
3. **Deterministic header/footer is a good idea in principle but needs the same care the runtime injection got** — it must be built once, tested for correctness (real business name, real city/state, no placeholder text), and verified it can't silently produce broken relative links if a business name contains characters that break a URL-safe slug, etc.
4. **4 pages sharing one design-token CSS system needs the CSS to actually be shared, not regenerated per page** — if each of the 4 AI calls is asked to write its own `<style>` block, colors/spacing will drift between pages even with the same tokens fed in, because the AI won't produce byte-identical CSS four times. This needs a decision: either extract CSS into a 5th deterministic asset (`{demoSlug}/styles.css`) shared by all 4 pages, or accept minor CSS drift as a known limitation. Recommend the shared stylesheet — same reasoning as the header/footer decision.
5. **Not addressed by this plan:** richer pages (testimonials, gallery, FAQ) that would need real content generate-site doesn't currently produce. Flagged, not solved here.

## 7. Recommended phased build order

1. **Deterministic templates first** (header, footer, nav, claim-modal, shared CSS extraction) — build and unit-verify these in isolation before touching the generation loop at all, since correctness here is load-bearing for every page.
2. **Hero idle-zoom fix** — smallest, most isolated change, no new architecture, ship and verify on its own.
3. **Storage layout + route handler changes** — get `/demo-sites/[slug]/about` etc. actually serving before generation produces real content for them (can test with placeholder pages first).
4. **Rewire `generate-design-html` to produce 4 pages** — the biggest single piece, needs its own dedicated testing pass on 2-3 real leads across different categories, verifying every page individually and cross-page nav consistency.
5. **Full site regeneration test** — pick one lead, generate all 4 pages, click through every nav link on every page, verify claim modal opens from every trigger on every page, verify hero motion, verify footer.
6. Only after step 5 passes cleanly: decide whether to retrofit existing single-page demos or leave them as-is, and re-cost Phase 5 batch generation for the new 4x-per-lead reality.

## 8. Open questions

1. Are Home/About/Services/Contact the right 4 pages, or is there a different minimum set in mind?
2. For the Contact page specifically — since there's no real inbox to receive a submitted form, should it just be `contact_cta` copy + claim-modal triggers (as proposed), or something else?
3. Confirm the phased order in Section 7 is acceptable, or if a different sequence is wanted.
