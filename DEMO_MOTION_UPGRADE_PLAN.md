# Demo Page Motion & Quality Upgrade Plan

**Status:** DRAFT v2 — reviewed for gaps, ready for implementation once open questions are answered.
**Scope:** `generate-design-html` (Supabase edge function, currently v6) — the actual production code that generates every lead's demo page. SiteReplicate is **not** touched by this plan; it stays a local research/inspiration tool only. (See `.../SiteReplicate/MOTION_UPGRADE_PLAN.md` for the separate, deferred SiteReplicate-as-standalone-product plan.)
**This plan blocks resuming Phase 5 batch generation** (the ~462 remaining leads) — bulk-generating on the current under-baked version now would mean regenerating all of them again later.

---

## 1. Why this plan exists, and why it's scoped this way

The original SiteReplicate-focused plan was written before checking one thing: SiteReplicate's pipeline isn't in our production call path at all. `generate-design-html` is a completely separate, single-pass Supabase edge function — it never calls SiteReplicate's code. So fixing SiteReplicate's `motion_enhancer.py` or `analyze.txt` would improve a tool we don't ship, not the actual lead demo pages.

This plan targets the real production function directly.

## 2. Current state of `generate-design-html` (v6, verified by direct read + live test)

- **One OpenRouter call** (`anthropic/claude-sonnet-4.5`) does everything: real business content placement, design-token styling, layout, and motion hook tagging, in a single prompt.
- Already uses the **correct v2.1 motion hooks** (`data-hero`/`.hero-bg`, `data-media-sequence`/`.ms-track`/`.ms-item`, `data-split-text`, `data-reveal`, `data-progress`) — verified working end-to-end on Concretation, LLC (hero parallax, scroll-scrubbed media sequence, split-text reveal, card reveals, progress bar all confirmed live in browser).
- **Zero deterministic post-processing.** Whatever the AI returns is uploaded as-is. Nothing checks that the hooks it used actually have matching CSS, or that it didn't skip a hook entirely.
- **Media-sequence images have no paired caption/text** — the original complaint. The AI was told to build an image carousel; nothing required each image to carry its own heading/caption, so it built a bare crossfade.
- The prompt currently asks the AI to reproduce the ~170-line motion runtime **verbatim in its own output** every generation — a real reliability risk (see Section 4, fix #1) and a waste of output-token budget.
- No `generator_version` tracking on `demo_sites` — we currently have no way to tell which prompt/validation version produced a given row.
- Category photography (32 images across 8 categories) and design-token research are already complete and feeding this function today.

## 3. Goals

- Every hook the AI is told to use gets verified after generation — no more shipping a "half-motion" page silently.
- Media-sequence images are paired with real, business-specific caption text **by construction**, and that caption is actually legible over the photo.
- The motion runtime itself can never be truncated or corrupted by the AI.
- A more dynamic scroll feel using assets we already have (4 category photos per category) — no new capability, no unverified tech.
- Keep it cheap and fast. Current generation is ~90s/lead on one AI call; the fix should add validation/retry logic, not a second full AI pass, to avoid re-introducing the idle-timeout problem already hit once during bulk generation.

## 4. Phase 1 — Combined: deterministic runtime injection + validation/retry + captioned media sequence

*(Merged from the earlier draft's separate Phase 1/Phase 2 — they touch the same file, the same validation function, and would need the same test lead regenerated twice for no real isolation benefit. One implementation/test/deploy cycle.)*

**4a. Stop asking the AI to reproduce the runtime script.**
Keep `MOTION_RUNTIME` in the prompt as *context* (so the model understands what each hook does), but change requirement #10 from "include the runtime script verbatim in your output" to "do NOT output the runtime script — the platform injects it automatically." After receiving HTML back from OpenRouter, the edge function deterministically appends `<script>${MOTION_RUNTIME}</script>` before `</body>` itself, every time, unconditionally. This removes an entire failure class (truncation/corruption) and frees output-token budget — which comfortably absorbs the extra tokens from 4c below.

**4b. Deterministic validation after generation, before upload.**
Regex-based checks (tolerant of formatting variance — check for selector/attribute *presence*, not exact-string CSS matches):
- `data-hero` attribute present, and an element with `class="hero-bg"` exists inside that section
- `data-progress` element present
- At least one `data-reveal` element present
- If `data-media-sequence` present: at least 2 `.ms-item` children, the required CSS selectors (`[data-media-sequence]`, `.ms-track`, `.ms-item`, `.ms-item.ms-active`) appear somewhere in the `<style>` block, **and each `.ms-item` contains both an `<img>` and a heading/caption element** (see 4c)

**On failure:** retry once — but not blindly. Append the specific failed check(s) to the prompt as an explicit correction ("your previous attempt was missing X — make sure to include it this time") and bump temperature slightly for the retry, mirroring why SiteReplicate's own retry uses 0.3 instead of 0.2. If the retry still fails, mark `demo_sites.status = 'failed'` with the specific check(s) that failed — not a generic error — so failures are diagnosable.

We don't yet know the real-world failure rate — Concretation, LLC is our only test case so far and it passed. This phase will surface the actual rate empirically once tested across more categories; that data should inform whether the retry logic needs tuning before Phase 5 batch generation resumes.

**4c. Caption-paired media sequence, with legibility built in.**
Rewrite the `data-media-sequence` requirement so each `.ms-item` must contain both the image and a caption block tied to that specific business's real content:

```html
<div class="ms-item">
  <img src="..." style="width:100%;height:100%;object-fit:cover">
  <div class="ms-caption">
    <h3>Short business-specific line</h3>
    <p>One supporting sentence, real content only</p>
  </div>
</div>
```

No motion-runtime code changes needed — `mediaInit()` already toggles the `ms-active` class on the whole `.ms-item`, so a caption placed inside that same item crossfades together with its image automatically via the existing CSS opacity transition.

**Must also require legibility CSS**, not just markup structure — mirror the hero's already-working technique (`.hero-bg::after` gradient overlay): `.ms-caption` needs `position:absolute`, sensible placement (e.g. bottom-aligned), and either a gradient scrim behind it or a solid-enough background so text stays readable over an arbitrary photo. This is the same class of bug we already hit once (structurally present, visually broken) — the prompt needs to say this explicitly, not leave it implied.

**4d. Add `generator_version` to `demo_sites`.**
Small migration: `alter table demo_sites add column if not exists generator_version text`. Set it on every generation (e.g. `"v7-validated-captioned"`). Cheap, and the only way we'll be able to tell later which rows need regenerating when the pipeline changes again.

## 5. Phase 2 (formerly Phase 3) — Optional depth/parallax layer

Lower priority — only take this on after Phase 1 is shipped, tested, and we've seen whether captions alone already look "special enough."

Unlike Phase 1, **this requires modifying the shared `MOTION_RUNTIME` constant itself** (extending `heroInit()` to support a second background layer at a different parallax rate) — a different risk profile than Phase 1's prompt/validation-only changes, since any runtime change needs a **full regression re-test of every existing hook** (hero, media-sequence, reveal, split-text, progress), not just the new layer. No image segmentation involved — just two already-existing category photos composited at two scroll speeds.

## 6. Testing gate for every phase

Same discipline as everything else this session: implement → regenerate Concretation, LLC plus 2 other categories (pick specific test leads before starting, for reproducibility) → verify live in browser (screenshot + DOM/computed-style checks, not just `ok: true` from the function) → confirm no regression from the current working v6 baseline → only then move to the next phase or resume Phase 5 batch generation.

## 7. Open questions

1. On repeated validation failure (after the one retry), should the lead stay `status='failed'` for manual follow-up, or fall back to the old v1 (non-motion) template so the lead isn't left with nothing? Leaning toward "stay failed, surface it" so root causes get fixed rather than silently degraded — needs confirmation.
2. Once Phase 1 ships, do we retrofit the 33 already-generated demo sites (currently on the pre-validation, no-caption version), or leave them as-is and only apply the new pipeline going forward?
3. Is Phase 2 (parallax layer) worth doing at all before we've seen Phase 1 results across more than one test lead per category?
