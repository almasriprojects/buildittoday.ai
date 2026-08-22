import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// E-mail validation: a basic filter that rejects placeholder/junk addresses
// commonly found in registry data (example.com, test, dots, etc.).
const EMAIL_REJECT_PATTERN =
  /(example\.com|test\.|@test|@\.|\.\.|^\.|\.$|^@|@$|^test|@example|@domain|@email\.|@mail\.)/i;

function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  if (!trimmed.includes("@")) return false;
  if (EMAIL_REJECT_PATTERN.test(trimmed)) return false;
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return false;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
  return true;
}

// Determine the outreach channel + action status for a lead.
//   channel: "email" | "postcard" | "excluded"
//   status:  "ready" | "site_needed" | "sent" | "excluded"
function computeOutreach(lead: any): {
  channel: "email" | "postcard" | "excluded";
  status: "ready" | "site_needed" | "sent" | "excluded";
} {
  // Only target_fit = yes are potential leads for outreach.
  if (lead.target_fit !== "yes") {
    return { channel: "excluded", status: "excluded" };
  }
  // Already generated a site AND already sent a postcard → done.
  if (lead.site_generated && lead.postcard_sent) {
    return { channel: "excluded", status: "sent" };
  }

  const hasEmail = isValidEmail(lead.contact_email);
  const hasAddress = Boolean(
    lead.street_address || lead.full_address || lead.owner_mailing_address
  );

  // Email channel: valid email address is present.
  if (hasEmail) {
    return {
      channel: "email",
      status: lead.site_generated ? "ready" : "site_needed",
    };
  }

  // Postcard channel: no valid email but we have a mailing address.
  if (hasAddress) {
    return {
      channel: "postcard",
      status: lead.site_generated ? "ready" : "site_needed",
    };
  }

  // No email and no address → nothing to reach out with.
  return { channel: "excluded", status: "excluded" };
}

// Whitelist of sortable DB columns to prevent invalid/injection values.
const SORTABLE_COLUMNS = new Set([
  "business_name",
  "business_category",
  "target_fit",
  "contact_status",
  "contact_email",
  "contact_full_name",
  "city",
  "filing_date",
  "site_generated",
  "created_at",
  "updated_at",
]);

// GET /api/leads — list leads from Supabase with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() ?? "";
    const targetFit = searchParams.get("target_fit") ?? "all";
    const category = searchParams.get("business_category") ?? "all";
    const contactStatus = searchParams.get("contact_status") ?? "all";
    const siteGenerated = searchParams.get("site_generated") ?? "all";
    const contactEmail = searchParams.get("contact_email") ?? "";
    const contactName = searchParams.get("contact_full_name") ?? "";
    const city = searchParams.get("city") ?? "";
    const channel = searchParams.get("channel") ?? "all"; // all | build | email | postcard
    const limit = Math.min(Number(searchParams.get("limit") ?? "500"), 10000);
    const offset = Number(searchParams.get("offset") ?? "0");

    // Sorting — validate against whitelist, default to filing_date desc.
    const sortByRaw = searchParams.get("sort_by") ?? "";
    const sortDirRaw = searchParams.get("sort_dir") ?? "";
    const sortBy = SORTABLE_COLUMNS.has(sortByRaw) ? sortByRaw : "filing_date";
    const sortDir = sortDirRaw === "asc" ? "asc" : sortDirRaw === "desc" ? "desc" : "desc";

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("leads")
      .select(
        "id,document_number,business_name,entity_type_name,status,lead_tier,lead_priority," +
        "business_category,target_fit,classification_reason,contact_status," +
        "contact_full_name,contact_phone,contact_email,city,county,state,zip,filing_date," +
        "street_address,full_address,owner_mailing_address," +
        "site_generated,site_generated_at,demo_slug,postcard_sent,postcard_sent_date," +
        "expected_delivery_date,customer_id,created_at,updated_at",
        { count: "exact" }
      )
      .order(sortBy, { ascending: sortDir === "asc" })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("business_name", `%${search}%`);
    }
    if (targetFit !== "all") {
      query = query.eq("target_fit", targetFit);
    }
    if (category !== "all") {
      query = query.eq("business_category", category);
    }
    if (contactStatus !== "all") {
      query = query.eq("contact_status", contactStatus);
    }
    if (siteGenerated !== "all") {
      query = query.eq("site_generated", siteGenerated === "true");
    }
    if (contactEmail === "has") {
      query = query.not("contact_email", "is", null).neq("contact_email", "");
    } else if (contactEmail === "none") {
      query = query.or("contact_email.is.null,contact_email.eq.");
    } else if (contactEmail) {
      query = query.ilike("contact_email", `%${contactEmail}%`);
    }
    if (contactName === "has") {
      query = query.not("contact_full_name", "is", null).neq("contact_full_name", "");
    } else if (contactName === "none") {
      query = query.or("contact_full_name.is.null,contact_full_name.eq.");
    } else if (contactName) {
      query = query.ilike("contact_full_name", `%${contactName}%`);
    }
    if (city === "has") {
      query = query.not("city", "is", null).neq("city", "");
    } else if (city === "none") {
      query = query.or("city.is.null,city.eq.");
    } else if (city) {
      query = query.ilike("city", `%${city}%`);
    }
    if (channel === "email") {
      query = query.eq("target_fit", "yes").not("contact_email", "is", null);
    } else if (channel === "postcard") {
      query = query.eq("target_fit", "yes").is("contact_email", null);
    } else if (channel === "build") {
      query = query.eq("target_fit", "yes").eq("site_generated", false);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Augment each lead with computed outreach fields.
    const enriched = (data ?? []).map((lead: any) => {
      const { channel: ch, status } = computeOutreach(lead);
      return {
        ...lead,
        outreach_channel: ch,
        outreach_status: status,
        email_valid: isValidEmail(lead.contact_email),
      };
    });

    // Post-filter for the email/postcard/build channels (client-side validation).
    let filtered = enriched;
    if (channel === "email") {
      filtered = enriched.filter((l) => l.outreach_channel === "email");
    } else if (channel === "postcard") {
      filtered = enriched.filter((l) => l.outreach_channel === "postcard");
    } else if (channel === "build") {
      filtered = enriched.filter(
        (l) =>
          l.target_fit === "yes" &&
          !l.site_generated &&
          l.contact_status !== "already_has_website"
      );
    }

    // Check if today's SunBiz file was already pulled (any leads created today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayPulledCount, error: todayPulledError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    // Count leads that still need classification
    const { count: unclassifiedCount, error: unclassifiedError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .or("target_fit.is.null,business_category.is.null");

    // Count leads that still need the Google Maps check
    const { count: mapsPendingCount, error: mapsPendingError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("maps_checked", null);

    // Count leads that still need skip-tracing
    const { count: skipTracePendingCount, error: skipTracePendingError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("contact_status", "new");

    // Count leads that have been successfully skip-traced
    const { count: skipTraceDoneCount, error: skipTraceDoneError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .in("contact_status", ["matched", "already_has_website"]);

    // Segment counts for the outreach tabs.
    const { count: buildCount, error: buildError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("target_fit", "yes")
      .eq("site_generated", false)
      .neq("contact_status", "already_has_website");

    const { count: emailCount, error: emailError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("target_fit", "yes")
      .not("contact_email", "is", null);

    const { count: postcardCount, error: postcardError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("target_fit", "yes")
      .is("contact_email", null);

    return NextResponse.json({
      leads: filtered ?? [],
      count: count ?? filtered?.length ?? 0,
      todayPulled: todayPulledError ? false : (todayPulledCount ?? 0) > 0,
      unclassified: unclassifiedError ? 0 : (unclassifiedCount ?? 0),
      mapsPending: mapsPendingError ? 0 : (mapsPendingCount ?? 0),
      skipTracePending: skipTracePendingError ? 0 : (skipTracePendingCount ?? 0),
      skipTraceDone: skipTraceDoneError ? 0 : (skipTraceDoneCount ?? 0),
      outreachCounts: {
        build: buildError ? 0 : (buildCount ?? 0),
        email: emailError ? 0 : (emailCount ?? 0),
        postcard: postcardError ? 0 : (postcardCount ?? 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}