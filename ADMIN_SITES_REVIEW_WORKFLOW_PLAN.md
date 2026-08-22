# Generated Sites: Review Workflow Plan

**Status:** DRAFT — nothing built yet. Read, adjust, then I build.

Closes the seven gaps found auditing `/admin/sites` (parent) and `/admin/sites/[slug]` (child).

---

## 1. What this is for

One job: **get through 43 demos — and later 462 — deciding which are good enough to send.**

Every item below is judged against that. Anything that doesn't make reviewing faster or safer is
deliberately out of scope.

Today the loop is: open a site → decide → navigate back → find your place → open the next one. That's
five actions per site, ~215 for the current batch. The target loop is: **decide → next**.

## 2. Current state

**Working:** search, category/sent/quality/needs-a-look filters, 4 stat cards, quality + flags +
reachability + status columns, live iframe preview, device toggle, code editor with outline and problems
panel, review actions with notes, written-copy panel, pre-send warning banner.

**Missing:** prev/next, review-status filter, bulk actions, pagination, sorting, lead links, stale list
after review.

## 3. The work, in build order

### Phase 1 — Make reviewing 43 sites tolerable

**1a. Prev/next navigation on the child page** *(the big one)*

The child page currently knows nothing about the list it came from, so "next" is ambiguous — next by
what order, within which filter?

Approach: the list passes its **filtered, ordered slugs** through the URL when opening a site
(`?from=<filterKey>&i=<index>`), and the child resolves neighbours from the same query server-side. This
keeps "next" meaning *next in what you were looking at*, not next in the whole table.

- `← Prev` / `Next →` buttons in the child header, plus **J / K** keyboard shortcuts
- Position indicator: "12 of 26"
- After any review action (approve/reject/skip), **auto-advance to the next unreviewed site** — this is
  what collapses five actions into one
- Disabled sensibly at the ends

**1b. Review-status filter on the list**

A new dropdown: `All` · `Not reviewed` · `Approved` · `Needs regen` · `Rejected` · `Skipped`.

Without this you cannot answer "what's left to review?" — the actual question after every session. Also
add a **"Not reviewed" stat card** replacing or joining the existing four, since that's the number that
should go to zero.

**1c. Bulk actions**

- Checkbox column + select-all-visible (respects active filters)
- Sticky action bar when anything is selected: **Approve N** · **Skip N** · Clear
- Reject/regenerate stay **single-site only** — they require a note, and a bulk note is a lie about why
  each one failed
- Confirmation showing exactly how many, since this writes to the database

New endpoint `POST /api/demo-sites/review-bulk` taking `{ slugs[], status }`, admin-auth'd like the
single-site one, returning per-slug success so a partial failure is visible rather than silent.

### Phase 2 — Survive 462 leads

**2a. Pagination.** Currently loads up to 500 rows and renders all of them. Server-side page/pageSize
(default 50), with counts computed across the **whole** filtered set, not the current page — a stat card
that only counts the visible page is worse than no stat card.

**2b. Column sorting.** Business, category, quality, status, built date. Server-side so it sorts the
whole set. Default stays newest-built first.

### Phase 3 — Polish

**3a. Lead links.** Both pages link to `/admin/leads/[id]` so you can reach full lead data from a demo.
**3b. Fresh list after review.** Refetch when returning from the child, so a site you just approved
doesn't still read "not reviewed."

## 4. What I'm deliberately not building

- **AI chat in the editor** — discussed separately. At 462 leads, per-page editing doesn't scale; a
  wrong page should be fixed in the generation prompt so every future page benefits.
- **Inline editing from the list** — the child page exists for that.
- **Bulk reject/regenerate** — needs a per-site reason to be worth anything later.

## 5. Order and effort

| Phase | Item | Why now |
|---|---|---|
| 1a | Prev/next + auto-advance | Turns 5 actions per site into 1 |
| 1b | Review-status filter | "What's left?" is unanswerable today |
| 1c | Bulk approve/skip | 35 clean sites shouldn't need 35 visits |
| 2a | Pagination | Breaks at 462, fine at 43 |
| 2b | Sorting | Wanted, not blocking |
| 3a/3b | Lead links, refresh | Polish |

Phase 1 is the one that changes whether this gets used. Phases 2–3 can follow whenever.

## 6. Testing gate

Same discipline as everything else — verified live in the browser, not assumed:

1. Open a site from a filtered list; confirm Next respects **that filter's** order, not the full table.
2. Approve → confirm it auto-advances to the next **unreviewed** site.
3. J/K move without stealing keystrokes from the code editor when it has focus.
4. Bulk-approve 3 sites → confirm all three rows change **and** the database reflects it.
5. Bulk-approve with a filter active → confirm it only touches visible/selected rows.
6. Paginate to page 2 → confirm stat cards still describe the whole filtered set.
7. Sort by quality → confirm it sorts all 43, not just the current page.
8. Approve, go back → list shows the new status, not the old one.

## 7. Risks

1. **Bulk write is the only destructive thing here.** It changes many rows at once and there's no undo.
   Mitigated by: confirmation with an explicit count, approve/skip only, and per-slug results so a partial
   failure is visible.
2. **Prev/next order must match what you were looking at**, or "next" sends you somewhere unexpected and
   you lose your place. This is why the filter travels in the URL rather than being re-derived.
3. **Keyboard shortcuts vs. the code editor** — J/K must not type into the source. Shortcuts are ignored
   whenever focus is inside a text input or the editor.

## 8. Still outstanding, unrelated to this plan

- **Supabase Storage read-cache** — saved edits may not appear immediately in the preview iframe. This
  affects the editor's trustworthiness and should be fixed before anyone relies on hand-edits.
- **6 leads need regeneration** — 2 with garbled AI text, 4 on the old no-video pipeline (~$2.60).
