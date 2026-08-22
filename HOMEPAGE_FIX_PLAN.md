# Homepage Fix Plan

**Status:** DRAFT — nothing changed yet. Read, decide, then I build.

Audited the live page at `localhost:3050` (code + rendered + full text). Five real problems, one of which
is a legal risk. Ordered by severity.

---

## P1 — The price contradicts itself on the same page 🔴

| Where | What it says |
|---|---|
| Browser tab / `<title>` | "Website For Your Business. **$1,500**. Built in One Week." |
| Hero paragraph | "Delivered in 5 days. Starting at **$1,500**." |
| Packages section | **$5,000** (Custom Website) · **$20,000** (Full Stack App) |
| Growth section | "Starting at **$2,000/mo**" |

**There is no $1,500 package anywhere on the page.** A lead reads "$1,500" in the hero, scrolls to
packages, and the cheapest option is 3.3× that. That reads as bait-and-switch and kills trust instantly —
worse than showing no price at all.

The $50/month hosting from the business model appears nowhere; the only recurring number is $2,000/mo.

## P2 — Unverifiable social proof 🔴 (legal risk)

The hero states:

- "**Award-Winning** Web Design Studio"
- "**500+** websites launched"
- "**98%** client satisfaction"
- "5-day average delivery"

Database reality: **0 customers, 0 conversions.** 43 demo sites generated, none sold.

If these numbers aren't backed by real work done elsewhere, this is false advertising to consumers — and
a Florida business owner who checks will find nothing behind it. This is the one item I'd fix before
anything is sent, independent of design.

**If they are true from prior work, say so specifically** ("500+ sites launched by our team since 2019")
and keep them. I can't verify that from here — you'd have to tell me.

## P3 — Wrong audience, wrong ask 🟠

The page is written for someone **shopping for a web design agency**. Your postcard lead is a different
person entirely: they just registered an LLC, and they've already seen a finished site with their own
business name on it.

| Page assumes | Your lead actually |
|---|---|
| Comparing agencies | Already saw their site |
| Wants to "Book a Free Call" | Wants to know "is this real, what's it cost, how do I get it" |
| Reading about a process | Ready to claim or walk away |

Both CTAs are **"Book a Free Call"** — the highest-friction ask you can make of a stranger. Nothing on the
page acknowledges the demo, the postcard, or "we already built this for you."

## P4 — No path to pay 🟠

Every CTA goes to booking or contact. Stripe checkout exists and correctly charges $1,500 — but **nothing
on the homepage links to it.** A lead who decides to buy has no button.

## P5 — Ten-crafts section is impressive but wrong for this funnel 🟡

The 10 crafts + 10 steps sections are genuinely good work and clearly took effort. But for a lead who
already has their site built, a long education sequence about your process delays the decision. It fits an
agency funnel, not a "claim your site" funnel.

Not deleting — see the recommendation below.

---

## Recommendation: don't rewrite the homepage — add a claim page

**Why not rewrite:** the current homepage is a legitimate agency pitch and may serve inbound/organic
visitors and the $5k/$20k tiers, which look like a real (different) business line. Rewriting it for
postcard leads destroys that and mixes two incompatible offers on one page.

**Instead:**

```
Postcard / email  →  their demo site  →  [ Claim This Website ]  →  /claim  →  Stripe $1,500
                                                                      ↑
                                                     new page, single offer, no distractions
```

### The new `/claim` page — what goes on it

1. **Headline naming the offer plainly** — "This website was built for {business}. Claim it for $1,500."
2. **Their actual demo embedded or linked** — proof it already exists
3. **What $1,500 includes** — the site, their domain, hosting setup, launched live
4. **$50/month** stated plainly — what it covers, cancel anytime
5. **One button → Stripe checkout.** No "book a call" as the primary action
6. **A real objection-handler**: who you are, what happens after payment, refund/guarantee terms
7. **Optional "talk to a human"** as the *secondary* link only

### Homepage changes (minimal, surgical)

- **P1:** remove the "$1,500" from the title and hero, *or* add a real $1,500 tier to packages. Pick one —
  they cannot both stay as-is.
- **P2:** delete or substantiate the award/500+/98% claims.
- **P4:** add a "Already have a demo? Claim your site" link in the header for leads who land here first.
- **P5:** leave as-is. It's good work and it serves the agency audience.

---

## What I need from you before building

1. **Are the "500+ / 98% / award-winning" claims true from prior work?** Keep, rewrite, or remove?
2. **Fix P1 by removing $1,500 from the hero, or by adding a real $1,500 package tier?**
3. **Confirm the offer wording:** $1,500 one-time + $50/month — is $50 right? What does it include?
4. **After payment, what do they actually get** — the site on their own domain, or on a subdomain of yours
   first? This changes the copy on `/claim` and it's the promise you'll have to keep.
5. **Refund/guarantee** — any? Leads will ask, and having an answer converts better than not.

Once those are answered this is roughly: one new page, two small homepage edits, one Stripe link.
