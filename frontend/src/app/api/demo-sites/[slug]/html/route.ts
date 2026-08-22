import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const BUCKET = "demo-sites";

async function resolve(slug: string) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("demo_sites")
    .select("demo_slug, storage_path, status")
    .eq("demo_slug", slug)
    .maybeSingle();
  return data;
}

async function requireAdmin() {
  const authed = await createServerClient();
  const {
    data: { user },
  } = await authed.auth.getUser();
  return user;
}

// GET — the raw HTML, for the admin code view.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const site = await resolve(slug);
  if (!site?.storage_path) {
    return NextResponse.json({ error: "No stored page for this slug" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${site.storage_path}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Could not read the stored page" }, { status: 502 });
  }

  const html = await res.text();
  return NextResponse.json({ html, bytes: html.length, path: site.storage_path });
}

// PUT — save edited HTML back to storage.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { html?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const html = body.html;
  if (typeof html !== "string" || html.trim().length < 200) {
    return NextResponse.json(
      { error: "That doesn't look like a complete page — refusing to overwrite." },
      { status: 400 }
    );
  }

  const site = await resolve(slug);
  if (!site?.storage_path) {
    return NextResponse.json({ error: "No stored page for this slug" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(
    `${url}/storage/v1/object/${BUCKET}/${site.storage_path}?upsert=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "text/html",
        "x-upsert": "true",
      },
      body: html,
    }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `Storage rejected the save (${res.status})` },
      { status: 502 }
    );
  }

  // A hand-edit is a real change to what a lead will see — record who did it.
  const supabase = createServiceRoleClient();
  await supabase
    .from("demo_sites")
    .update({
      generator_version: "hand-edited",
      reviewed_by: user.email ?? user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("demo_slug", slug);

  return NextResponse.json({ ok: true, bytes: html.length, warnings: checkHtml(html) });
}

// Light structural check — warns, never blocks. The admin is deliberately
// editing; the job here is to point out something obviously lost.
function checkHtml(html: string): string[] {
  const w: string[] = [];
  const need: [RegExp, string][] = [
    [/<video[^>]*class=["'][^"']*hero-bg/i, "hero video"],
    [/data-claim-modal/i, "claim modal"],
    [/data-claim-trigger/i, "claim trigger on a CTA"],
    [/data-menu-toggle/i, "mobile menu toggle"],
    [/data-current-year/i, "auto-updating copyright year"],
    [/__motionRuntimeV2/i, "motion runtime script"],
    [/<section[^>]*id=["']contact/i, "contact section"],
  ];
  for (const [re, label] of need) {
    if (!re.test(html)) w.push(`Missing ${label}`);
  }
  if (/class=["'][^"']*\bbtn-primary\b/.test(html)) {
    w.push("Uses .btn-primary, which has no CSS rule");
  }
  return w;
}
