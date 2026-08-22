# Demo Media Worker — Productionizing the Design Brain

**Status:** DRAFT — ready for review. Turns the local scripts proven in `DEMO_SITE_DESIGN_BRAIN_PLAN.md`
§6.6-6.7 into a real, resumable batch pipeline. Nothing here is built yet.

---

## 1. Why a worker and not an edge function

The build step (HTML generation) can stay in `generate-design-html`. The media stages cannot:

- **ffmpeg is required** (16:9 crop, concat, re-encode) and is not available in the Deno edge runtime.
- **~2 minutes of wall-clock per lead** — video jobs took 100-141s each in testing, even run in parallel.
  Edge functions are the wrong shape for that; they time out and can't be resumed mid-job.
- **Async, polled, partially-failing work.** 1 of 9 video jobs hit a content filter in testing. This needs
  durable per-scene state, not a single request that either returns or doesn't.

So: a long-running worker owns media, the edge function owns HTML, and they meet at a set of finished URLs.

## 2. Split of responsibilities

```
┌─ WORKER (VPS, Python, ffmpeg) ──────────────┐   ┌─ EDGE FN (Deno) ──────────┐
│ brief → 3 images → 3 videos → montage       │   │ generate-design-html      │
│ → crop → compress → upload to demo-media    │──▶│ consumes finished URLs    │
│ writes demo_media rows                      │   │ → validate → retry → HTML │
└─────────────────────────────────────────────┘   └───────────────────────────┘
```

The edge function's only new input is `demo_media` for that lead. It does not know or care how the media
was produced, which keeps the two halves independently deployable.

## 3. Schema

`demo_sites` already has `demo_slug`, `status`, `error`, `generator_version` — reuse that pattern.

New table `demo_media`, one row per lead:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `lead_id` | uuid fk → leads | |
| `demo_slug` | text unique | matches storage prefix |
| `status` | text | `pending` / `briefing` / `images` / `videos` / `merging` / `ready` / `failed` |
| `brief_json` | jsonb | Stage A output (palette, typography, effects, 3 scenes) |
| `scenes_json` | jsonb | per-scene state: image_url, video_url, attempts, softened, error |
| `hero_video_url` | text | final merged montage |
| `hero_poster_url` | text | scene 1 still |
| `clip_count` | int | 2 or 3 — a lead with 2 is still shippable |
| `cost_usd` | numeric | real cost from OpenRouter usage fields, not estimated |
| `error` | text | last failure, same convention as `demo_sites.error` |
| `attempts` | int | worker-level retry guard |
| `created_at` / `updated_at` | timestamptz | |

`scenes_json` holding per-scene state is what makes the job **resumable**: a worker restart re-reads which
scenes already have image/video URLs and only redoes the missing ones. Without it a crash at scene 3 wastes
the two completed videos.

## 4. Worker loop

```
claim a batch  →  for each lead: brief → images → videos → merge → upload → mark ready
```

- **Claiming:** `UPDATE demo_media SET status='briefing' WHERE id IN (SELECT ... WHERE status='pending'
  LIMIT :n FOR UPDATE SKIP LOCKED) RETURNING *`. `SKIP LOCKED` means two workers never grab the same lead,
  so scaling out is just running a second process.
- **Concurrency:** 6 parallel video jobs was comfortable in testing (9 also worked). Start at 6 and treat it
  as a tunable, not a constant.
- **Per-scene retry:** already implemented — content-filter failures resubmit once with the ambient-only
  prompt. Record `softened: true` so we can see how often it fires per category.
- **Partial success is success.** A lead that lands 2 of 3 scenes is `ready` with `clip_count=2`, exactly as
  Pema Spa shipped. Only 0 usable scenes is `failed`.
- **Idempotency:** re-running a `ready` lead is a no-op unless explicitly forced.

## 5. Cost control

Measured **$0.44-0.50 per lead** across 4 real leads. At 462 leads that is **~$210-230**. Controls:

- `--limit N` per invocation; nothing runs unbounded.
- A hard `MAX_BATCH_COST_USD` the worker checks before each lead and stops cleanly when exceeded.
- Real cost recorded per lead from OpenRouter's `usage.cost`, so the batch total is measured, never inferred.
- Dry-run mode that runs Stage A only (~$0.02/lead) to eyeball briefs before committing to media spend.

## 6. Edge function changes

1. Read `demo_media` for the lead; if not `ready`, fail fast with a clear error rather than building a page
   with no hero.
2. Swap the hero to `<video class="hero-bg" muted loop playsinline poster>` + a **separate `.hero-scrim` div**
   (a `::after` on a `<video>` does not render — this was a real bug).
3. Require hero `h1`/subheadline `text-shadow` — the scrim alone is not enough over shifting video.
4. Port `brain_v2_validate.py` into `validateMotionHooks`, including the `.ms-item >= 2` check that caught a
   real defect on 3 of 4 builds.
5. Bump `generator_version` to `v14-brain-video`.

## 7. Rollout

1. Apply the migration; backfill `demo_media` rows as `ready` for the 4 already-built leads so they aren't
   regenerated.
2. Deploy the worker; run `--limit 3 --dry-run` (briefs only) and read the output.
3. Run `--limit 3` for real; compare against the 4 known-good pages.
4. Deploy the edge function changes; rebuild those 3 through the real path end-to-end.
5. Run `--limit 10` across mixed categories. **Human review before anything larger** — image models still
   occasionally render legible text into scenes despite the prompt, which no validator catches.
6. Then decide the two standing open questions: retrofit the 33+ old demos, and the full 462 batch.

## 8. Self-critique

1. **The worker is new operational surface** — a process that can wedge, run up cost, or half-finish. The
   `SKIP LOCKED` claim, per-scene resumability, and hard cost cap exist specifically because of that; they
   are not optional polish.
2. **Human review does not scale to 462 and cannot be automated away.** The text-in-image problem is the
   clearest case. Options are accepting some imperfect pages, adding a vision-model check (more cost, still
   imperfect), or reviewing only a sample. Unresolved — flagging rather than pretending it's solved.
3. **Category-level content-filter rates are unknown.** One data point (spa massage) is not a rate. The
   `softened` flag exists to turn this into real data over the first batches.
4. **Cost is real money at batch scale.** ~$220 for 462 leads is defensible for a conversion asset but should
   be an explicit decision, made against measured cost from step 5, not this estimate.
