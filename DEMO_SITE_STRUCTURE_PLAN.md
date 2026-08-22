# Demo Site: Header/Footer/Claim-Modal/Hero-Motion Plan (Corrected)

**Status:** DRAFT — ready for review. Supersedes `DEMO_MULTIPAGE_SITE_PLAN.md` (wrong interpretation — that file assumed separate page files; the actual requirement is anchor-scroll navigation within one page).

---

## 1. Confirmed requirements

1. Header shows Home/About/Services/Contact — as **buttons that smooth-scroll to that section on the same page**, not links to separate files.
2. Footer shows the same set — a mini sitemap of anchor links, same page.
3. Remove the "Claim This Premium Website" section from the visible page; replace with a popup every CTA button triggers.
4. Hero background must move on its own (continuous idle motion), not only respond to scroll.

This stays a **single HTML document per lead** — no Storage layout changes, no route-handler changes, no multiplied OpenRouter calls. Far smaller than the superseded plan.

## 2. Why the previous multi-link nav got removed, and why the fix is different this time

v10 removed multi-link header nav entirely because it caused a real, verified bug: nav links became `display:none` on mobile with no way to reach them, then a naive fix caused the links to visually overlap the header CTA button instead. At the time, the pragmatic call was to drop multi-link nav rather than build a full toggle system.

That trade-off is no longer available — the nav links are a hard requirement now. So this plan builds the thing that was deliberately deferred before: **a real, working hamburger toggle for mobile**, this time as a first-class, validated hook — not a "just don't hide it" patch.

## 3. Technical plan

### 3a. Header — anchor nav + working mobile toggle

- Desktop (≥768px): full inline nav — Home (logo, scrolls to top or `#hero`), About, Services, Contact — plus the existing primary CTA button.
- Mobile (<768px): nav links hidden by default; a hamburger button (`data-menu-toggle`) toggles visibility of the nav container (`data-menu-target`) via a `.menu-open` class.
- New runtime function `mobileMenuInit()`: click `[data-menu-toggle]` → toggle `.menu-open` on `[data-menu-target]` and toggle `aria-expanded` on the button for accessibility.
- New validation rule: if the header contains 2+ real nav `<a>` links, `[data-menu-toggle]` and `[data-menu-target]` must both be present — catches the exact failure mode from before (links present but no way to reach them on mobile) automatically, rather than relying on the prompt being followed.
- Anchor links (`#about`, `#services`, `#contact`) point to `id`s already present in the page today (services/contact sections already have `id="services"`/`id="contact"` in current output) — About section needs an `id="about"` added.

### 3b. Footer — same anchor links repeated

- Footer gets a small nav block with the same Home/About/Services/Contact anchor links (a standard site-footer sitemap pattern), alongside the existing business name/city-state.
- Drop the "This is a preview website..." disclaimer line — see 3c, that messaging moves to the modal.

### 3c. Claim modal (unchanged from the superseded plan's reasoning, just simpler since it's one page)

- Remove `<section class="claim-section">` entirely from the page body.
- Add one hidden-by-default modal (`data-claim-modal`), containing the same content that section had: heading, feature checklist, "Claim This Website Now" button, plus a close control.
- Every `.btn` on the page becomes a trigger (`data-claim-trigger`) — clicking any CTA anywhere on the page opens the modal instead of (or in addition to) scrolling to `#contact`.
- New runtime function `claimModalInit()`: click any `[data-claim-trigger]` → show modal (remove `hidden`/add `.modal-open`); click backdrop or a close button, or press Escape → hide it.
- New validation rule: `[data-claim-modal]` must exist and must not be visible by default; no standalone `.claim-section` should exist as a normal scrollable section.

### 3d. Hero — continuous idle motion + existing scroll parallax, unified

Root cause of the current static-until-scrolled hero: `heroInit()` only writes `.style.transform` inside the scroll handler — zero scroll means zero motion. Ken-Burns was deliberately kept off the hero earlier to avoid a CSS-animation-vs-inline-style collision.

Fix: extend `heroInit()` to run its own continuous `requestAnimationFrame` loop (time-driven, independent of scroll) that computes a slow idle zoom, and combine it with the existing scroll-driven parallax into one transform written from the same function — one source of truth, no collision, no new HTML hook needed since `.hero-bg` already exists on every page. Result: the hero visibly breathes/zooms from the moment the page loads, and parallaxes faster on top of that when the user scrolls.

Explicitly not in scope: an actual video hero. Not verified as buildable (no ffmpeg in the Deno edge runtime, no confirmed OpenRouter video-generation capability) — same "verify before promising" discipline applied to the WebGL/3D question earlier in this project. The idle-zoom fix delivers the "moving photo" feel honestly with something already proven to work.

## 4. Runtime + prompt changes

- Motion runtime bumps to v2.4: rewritten `heroInit()`, new `mobileMenuInit()`, new `claimModalInit()`.
- Prompt requirement #7 (currently "keep the header minimal, no multi-link nav") gets replaced with the anchor-nav + hamburger-toggle requirement, including the exact markup pattern the runtime expects.
- Prompt requirement #8 (currently "include a Claim This Website section near the end") gets replaced with the modal requirement — every `.btn` must carry `data-claim-trigger`, one `data-claim-modal` element must exist, hidden by default.
- Footer requirement gets the sitemap-links addition and drops the "preview website" line instruction.
- Self-check list updated to match (new letters for: mobile toggle present when nav has links, modal present and hidden, no standalone claim section, footer has the anchor links).

## 5. Validation changes (`validateMotionHooks`)

New checks, same style as existing ones:
- If nav has ≥2 real anchor links → `data-menu-toggle` and `data-menu-target` must both exist.
- `data-claim-modal` must exist.
- No `class="claim-section"` (or equivalent standalone claim section) should exist outside the modal.
- (Existing checks — hero-bg, progress, reveal, media-sequence, button system, no dead buttons — all stay as-is, unaffected by this change.)

## 6. Testing gate

Same discipline as every prior phase: implement → regenerate 2-3 leads across different categories (not just re-testing Concretation again) → verify live in browser:
- Click each nav link, confirm smooth-scroll to the right section.
- Resize to mobile width, confirm hamburger toggle actually opens/closes the nav and links become tappable with no overlap (this is the exact thing that silently failed last time — must be checked with real interaction, not just "not display:none").
- Click multiple different CTA buttons across the page, confirm the modal opens from each one, confirm close button and backdrop click both work.
- Confirm the hero visibly zooms with zero scrolling (screenshot at page-load vs. a few seconds later, no scroll).
- Confirm no regression on existing hooks (captions, split-text, parallax-img, ken-burns on supporting images, magnetic buttons, custom cursor).

## 7. Self-critique

1. **The mobile hamburger toggle is the one genuinely new interactive pattern here** — everything else (modal, hero rewrite) reuses techniques already proven in this pipeline. This is the piece most likely to have an edge case, so it gets the most explicit testing attention in Section 6.
2. **Modal + hamburger both need real click-driven testing**, not just DOM/computed-style inspection — the last "fix" that turned out incomplete (nav overlapping the CTA on mobile) was only caught by an actual mobile screenshot, not a structural check. Same discipline applies here.
3. **No cost/latency change** — still one OpenRouter call per lead, same as today. This does not block or complicate Phase 5 batch generation the way the superseded multi-page plan would have.

## 8. Shipped and verified (v12)

Implemented and tested live on Tim Todd Consulting (Professional Services — a fresh lead, not the previously overused Concretation test case). All verified via real click/interaction, not just structural inspection:

- Header nav (Home/About/Services/Contact + CTA) renders and every anchor link scrolls to the exact right section (`getBoundingClientRect().top === 0` after clicking Services).
- Mobile hamburger toggle: verified at 375px width — nav correctly hidden by default, toggle button appears, clicking it opens a clean dropdown with zero overlap (the exact failure mode from before, now confirmed fixed with a real screenshot, not just a "not display:none" check), second click closes it.
- Claim modal: opens on trigger click (`modal-open` class + `visibility:visible` + `body.overflow:hidden`), closes on the close button (state fully reverts), old `.claim-section` completely absent, 3 real triggers present.
- Footer: full Home/About/Services/Contact sitemap plus a bonus per-service link list, zero "preview"/"claim this site" language.
- Hero motion: confirmed continuously zooming with `scrollY: 0` throughout (scale progressed from ~1.016 to the designed 1.06 cap over time, zero scrolling involved).
- Zero regression: progress bar, 14 reveal elements, 4 media-sequence captions, split-text renders correctly (no corruption), custom cursor present, runtime script injected exactly once.

Deployed as `generate-design-html` v12 (`generator_version = "v12-nav-modal-hero"`), motion runtime v2.4.
