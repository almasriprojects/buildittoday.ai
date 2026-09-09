import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * generate-hero-media — the per-business photograph and hero clip.
 *
 * The 43 sites built in August each have their own scene1.png and hero.mp4 in
 * demo-media/<demo_slug>/, produced by the Python pipeline on one laptop. The
 * automated path had neither: it dressed every site in shared
 * category-photography and no video at all, so the quality gate rejected each
 * one for "no hero video" and was right to.
 *
 * The pipeline needed a laptop for exactly one reason — it renders three clips
 * and concatenates them with ffmpeg, which an edge function cannot run. But
 * generating a clip is a plain HTTP call. One four-second clip, looping, is
 * what the existing sites already play (`muted loop playsinline`), so dropping
 * the montage removes the only step that ever needed a machine.
 *
 * Two phases, because a clip takes about eighty seconds and an edge function
 * should not sit and wait:
 *
 *   POST { leadId }        submit — write the brief, render the still, upload
 *                          it, ask for the clip, record the polling URL
 *   POST { collect: true } collect — poll outstanding jobs, download whatever
 *                          has finished, upload it as hero.mp4
 *
 * State lives in demo_media, which already had columns for exactly this.
 */

const TEXT_MODEL = "anthropic/claude-sonnet-4.5";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const VIDEO_MODEL = "bytedance/seedance-2.0-mini";

// Carried over from the pipeline verbatim. Text baked into a generated
// photograph cannot be corrected later and always looks wrong on a real
// business's site.
const STYLE_SUFFIX =
  " Photorealistic, editorial quality, cinematic lighting, no text, no logos, " +
  "no watermarks, no readable signage, 16:9 composition.";

/**
 * One scene, not three. The motion rules are the pipeline's, and they matter:
 * a generative video model asked for movement will invent content, warp faces
 * and drift away from the still. Ambient motion only, and a last frame close
 * to the first, is what makes a four-second clip loop without a visible seam.
 */
const SCENE_SYSTEM = `You are a brand art director and cinematographer planning the hero of a
website for a real small business.

HARD RULES:
- The hero IS a video. Never a text-only or typography-only hero.
- The scene must depict what this business ACTUALLY does, per the content given.
  Never invent a different industry, offering, or location.
- image_prompt: one photorealistic, editorial-quality still. Cinematic lighting,
  shallow depth of field where it suits, no text/logos/watermarks/signage, 16:9.
  Be specific about subject, lighting, time of day and mood. Prefer an
  establishing shot that says immediately what this business is.
- video_motion_prompt: SUBTLE motion animating that still. Keep the camera
  nearly locked off, or an extremely slow push. Do NOT reveal or invent content
  that is not already in the still. Do NOT animate faces, hands or bodies with
  distinct movement — only the faintest natural micro-motion. Never warp people.
  Prefer ambient motion: drifting light, steam, water ripple, fabric sway, dust
  motes, slow reflections. The last frame must be close to the first in framing
  and light, because the clip loops.

Output strict JSON only, no prose outside it:
{"scene_name":"...","image_prompt":"...","video_motion_prompt":"..."}`;

/**
 * The permitted values, from demo_media_status_check. Writing anything else is
 * rejected by the constraint and — because supabase-js returns the error
 * rather than throwing — fails silently, leaving a row that looks fine and a
 * pipeline that never picks it up. This project has been bitten by exactly
 * that once before, in the email sequence, where an invalid status left every
 * lead permanently due and re-sent the same message on every run.
 */
const STATUS = {
  awaitingVideo: "videos",
  ready: "ready",
  failed: "failed",
} as const;

/** Never let a write fail quietly. See STATUS above for why. */
function must(label: string, error: { message: string } | null) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

const OR_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(SUPABASE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function openrouter(path: string, payload: unknown) {
  const res = await fetch(`https://openrouter.ai/api/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OR_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

/**
 * Upload through the client rather than a hand-rolled fetch.
 *
 * The first version posted to the storage REST endpoint with the service key
 * as a bearer token and got "Invalid Compact JWS": this project's key is not
 * the JWT that endpoint expects. The client knows how to authenticate itself,
 * and sunbiz-pull has been uploading this way for weeks.
 */
async function upload(bytes: Uint8Array, path: string, contentType: string) {
  const { error } = await db.storage
    .from("demo-media")
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`storage: ${error.message}`);
  return `${SUPABASE_URL}/storage/v1/object/public/demo-media/${path}`;
}

/**
 * Fetch the finished clip and prove it is one.
 *
 * The rendered video sits behind the same key that ordered it. Fetching it
 * without the header returns a 67-byte JSON body — `{"error":{"message":"No
 * cookie auth credentials found","code":401}}` — with a 401 that nothing was
 * reading, so that JSON was uploaded as hero.mp4 and the row was marked ready.
 * A site would then have passed the quality gate carrying a hero video that is
 * not a video.
 *
 * So: send the key, check the status, and check the bytes. Every MP4 carries
 * the ASCII "ftyp" at offset 4; a JSON error never will. Checking that the
 * write succeeded is not the same as checking that what was written is real.
 */
async function fetchClip(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${OR_KEY}` } });
  const bytes = new Uint8Array(await res.arrayBuffer());

  if (!res.ok) {
    throw new Error(
      `clip download ${res.status}: ${new TextDecoder().decode(bytes.slice(0, 200))}`,
    );
  }
  const ftyp = new TextDecoder().decode(bytes.slice(4, 8));
  if (ftyp !== "ftyp") {
    throw new Error(
      `clip is not an mp4 (${bytes.length} bytes, header "${ftyp}"): ` +
        new TextDecoder().decode(bytes.slice(0, 200)),
    );
  }
  return bytes;
}

// ---------------------------------------------------------------- submit ---

async function submit(leadId: string) {
  const { data: lead } = await db
    .from("leads")
    .select("id, demo_slug, business_name, city, business_category, generated_content")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return json({ ok: false, error: "No such lead" }, 404);
  if (!lead.demo_slug) return json({ ok: false, error: "Lead has no demo_slug" }, 400);
  if (!lead.generated_content) {
    return json({ ok: false, error: "Lead has no copy yet. Run generate-site first." }, 400);
  }

  const slug = lead.demo_slug as string;

  must(
    "claim demo_media row",
    (await db.from("demo_media").upsert(
      {
        lead_id: lead.id, demo_slug: slug, status: STATUS.awaitingVideo,
        error: null, updated_at: new Date().toISOString(),
      },
      { onConflict: "demo_slug" },
    )).error,
  );

  let cost = 0;
  try {
    // 1. The scene, from this business's own copy — never a category default.
    const brief = await openrouter("chat/completions", {
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SCENE_SYSTEM },
        {
          role: "user",
          content: `Business: ${lead.business_name}\nCity: ${lead.city ?? "Florida"}\n` +
            `Category: ${lead.business_category ?? "small business"}\n\n` +
            `Its own website copy:\n${JSON.stringify(lead.generated_content).slice(0, 4000)}`,
        },
      ],
    });
    cost += brief?.usage?.cost ?? 0;

    const raw = brief.choices[0].message.content as string;
    const scene = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));

    // 2. The still, asked for in 16:9 twice over.
    //
    // The pipeline asked only in the prompt text and mostly got 1024x576 —
    // but "mostly" is not a shape. This lead's first still came back
    // 1024x1024, and because the video model takes its framing from the first
    // frame rather than from aspect_ratio, the clip came back 640x640 too. A
    // square clip in a full-bleed hero loses the top and bottom of the frame
    // to object-fit: cover, which is 44% of the picture the model composed.
    const img = await openrouter("chat/completions", {
      model: IMAGE_MODEL,
      messages: [{ role: "user", content: scene.image_prompt + STYLE_SUFFIX }],
      modalities: ["image", "text"],
      image_config: { aspect_ratio: "16:9" },
    });
    cost += img?.usage?.cost ?? 0;

    const dataUrl = img.choices[0].message.images[0].image_url.url as string;
    const b64 = dataUrl.split(",", 2)[1];
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // PNG width and height live at bytes 16-24, big-endian. Recorded rather
    // than enforced: a square hero is worse than a wide one, but far better
    // than no hero, and a shape that is drifting should be visible before it
    // becomes a wall of soft-looking sites.
    const view = new DataView(bin.buffer);
    const shape = { width: view.getUint32(16), height: view.getUint32(20) };

    // 3. Stored as scene1.png — the same name the existing sites use for their
    //    poster, so the HTML shape does not have to change.
    const posterUrl = await upload(bin, `${slug}/scene1.png`, "image/png");

    // 4. The clip, from that still as its first frame.
    const job = await openrouter("videos", {
      model: VIDEO_MODEL,
      prompt: scene.video_motion_prompt,
      duration: 4,
      resolution: "480p",
      aspect_ratio: "16:9",
      generate_audio: false,
      frame_images: [
        { type: "image_url", image_url: { url: posterUrl }, frame_type: "first_frame" },
      ],
    });

    const pollingUrl = job.polling_url ?? `https://openrouter.ai/api/v1/videos/${job.id}`;

    must(
      "record polling url",
      (await db.from("demo_media").update({
        status: STATUS.awaitingVideo,
        scenes_json: {
          scene, shape, polling_url: pollingUrl,
          submitted_at: new Date().toISOString(),
        },
        hero_poster_url: posterUrl,
        cost_usd: cost,
        updated_at: new Date().toISOString(),
      }).eq("demo_slug", slug)).error,
    );

    return json({ ok: true, phase: "submitted", slug, poster: posterUrl, shape, cost });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("demo_media").update({
      status: STATUS.failed, error: msg, updated_at: new Date().toISOString(),
    }).eq("demo_slug", slug);
    return json({ ok: false, slug, error: msg }, 502);
  }
}

// --------------------------------------------------------------- collect ---

async function collect(limit = 10) {
  const { data: pending } = await db
    .from("demo_media")
    .select("demo_slug, scenes_json, cost_usd")
    .eq("status", STATUS.awaitingVideo)
    .order("updated_at", { ascending: true })
    .limit(limit);

  const done: string[] = [];
  const waiting: string[] = [];
  const failed: { slug: string; error: string }[] = [];

  for (const row of pending ?? []) {
    const slug = row.demo_slug as string;
    const pollingUrl = (row.scenes_json as Record<string, unknown> | null)
      ?.polling_url as string | undefined;
    if (!pollingUrl) {
      failed.push({ slug, error: "no polling url recorded" });
      continue;
    }

    try {
      const res = await fetch(pollingUrl, {
        headers: { Authorization: `Bearer ${OR_KEY}` },
      });
      const data = await res.json();

      if (data.status === "failed" || data.status === "error") {
        await db.from("demo_media").update({
          status: STATUS.failed,
          error: `video ${data.status}: ${JSON.stringify(data).slice(0, 200)}`,
          updated_at: new Date().toISOString(),
        }).eq("demo_slug", slug);
        failed.push({ slug, error: String(data.status) });
        continue;
      }

      if (data.status !== "completed") {
        waiting.push(slug);
        continue;
      }

      // Finished: fetch the rendered clip and put it where the HTML expects it.
      const url = data.unsigned_urls?.[0] ?? data.url;
      if (!url) {
        failed.push({ slug, error: "completed with no url" });
        continue;
      }
      const clip = await fetchClip(url);
      const heroUrl = await upload(clip, `${slug}/hero.mp4`, "video/mp4");

      await db.from("demo_media").update({
        status: "ready",
        hero_video_url: heroUrl,
        clip_count: 1,
        cost_usd: (row.cost_usd ?? 0) + (data?.usage?.cost ?? 0),
        error: null,
        updated_at: new Date().toISOString(),
      }).eq("demo_slug", slug);

      done.push(slug);
    } catch (e) {
      failed.push({ slug, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return json({ ok: true, phase: "collect", done, waiting, failed });
}

Deno.serve(async (req: Request) => {
  let body: { leadId?: string; collect?: boolean; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    // An empty body means collect: the schedule calls it that way.
  }

  if (body.collect || !body.leadId) return collect(body.limit ?? 10);
  return submit(body.leadId);
});
