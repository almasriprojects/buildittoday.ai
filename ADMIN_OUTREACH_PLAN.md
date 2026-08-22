# Admin: The Outreach Gap

**Status:** DRAFT — nothing built yet. Read, decide, then I build.

---

## 1. The gap you spotted, confirmed in data

```
14,703 leads  →  43 demos built  →  0 sent
                                     ↑
                              nothing exists here
```

**43 demos are built. 43 have never been sent to anyone.** There is no page in the admin that shows a
finished demo waiting to go out, and no way to send one.

Every other stage has a home: `/admin/leads` owns everything up to "site generated," and `/admin/customers`
would own people after they pay. Between those two — the part that actually earns money — there is nothing.

### What's actually sitting there right now

| | Count |
|---|---|
| Demos ready | **43** |
| With premium video hero | **39** (37 full 3-clip · 2 at 2-clip) |
| On the old pipeline, no video | **4** |
| Have an email address | **43** |
| Have a mailing address | **37** |
| Reachable by neither | **0** |
| Ever contacted | **0** |

*(I also just synced 39 `demo_media` rows into the database — the batch had been writing to a JSON file on
this Mac, so the admin couldn't have seen them at all.)*

## 2. What the missing page is

**`/admin/outreach` — the send queue.** One row per lead whose demo is built but unsent.

| Column | Why it's there |
|---|---|
| Business + category + city | Who this is |
| **Preview** | Opens their real demo — you must be able to look before sending |
| Quality | `3-clip video` / `2-clip` / `no video (old)` — so weak ones don't go out |
| Channel | `Email` / `Postcard` / `Both`, from what contact data exists |
| Status | `Ready` · `Queued` · `Sent` · `Opened` · `Clicked` · `Claimed` |
| Action | Send email · Queue postcard · Skip |

**Filters that matter:** channel, quality, category, "never contacted."
**Bulk select** — sending 43 one at a time is not a workflow.

### Why one page, not two

You first said two pages (email + postcard). I'd argue one, because the decision "which channel" is a
*property of the lead* (do we have an email? an address?), not a separate workflow. Splitting them means
you'd check two queues to answer "who haven't we contacted?" — and 37 leads appear in both.

One queue, a channel column, filter by it. Same information, half the navigation.

## 3. What must exist before it can send anything

The page is easy. These are the real work:

1. **`send-demo-email`** — doesn't exist. Needs Resend + a verified sending domain
   (SPF/DKIM/DMARC). This is the hard prerequisite.
2. **The email itself** — subject, body, their business name, a preview image of their site, a tracked
   link. The tracking routes (`/api/track/open|click`) already exist and work.
3. **Postcards** — `send-postcards` exists but sits in Lob **test mode**. QR encodes
   `/api/track/scan`, which is already correct.
4. **A public URL** — every link and QR points at `localhost:3050` today. Nothing can be sent until the
   site is deployed.

## 4. Build order

| # | Step | Blocked by |
|---|---|---|
| 1 | `/admin/outreach` page — list, filter, preview, mark status | nothing — buildable now |
| 2 | Deploy so links resolve | Vercel + DNS |
| 3 | Resend + sending domain | your DNS |
| 4 | `send-demo-email` + email template | 2 and 3 |
| 5 | Wire "Send" buttons to it | 4 |
| 6 | Postcard: Lob live mode | your call |

**Step 1 is worth building now even though it can't send yet** — it's how you review 43 demos and decide
which are good enough to go out. That review has to happen regardless, and right now there's no way to do it
except opening URLs by hand.

## 5. About the rest of the admin

Four pages currently show **invented business data** — Customers (5 fake companies), Campaigns ($15,000
fake revenue), Analytics ($21,000 fake revenue, 20% churn), Billing (4 fake invoices). They read from
`mock-data.ts`.

**Recommendation: gut them now.** Not because they're ugly — because the day you have one real customer,
you won't know whether a number on screen is real. An empty state that says "No customers yet" is more
useful than a fake one that says five.

Also: **Dashboard "New Leads" shows 0** instead of 14,703. It counts `customers` with
`subscription_status='pending'` rather than leads. One-line fix.

## 6. Decisions

1. **One `/admin/outreach` queue, or separate email/postcard pages?** (I recommend one.)
2. **Build the queue page now**, before sending works — so you can review the 43?
3. **Replace the 4 mock pages with real empty states now**, or leave them until there's real data?
4. **The 4 old-pipeline demos with no video** — regenerate them (~$2) so all 43 are consistent, or send as-is?
