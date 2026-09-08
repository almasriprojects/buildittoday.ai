import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { createServiceRoleClient } from "@/lib/supabase";
import { HEADLINE } from "@/lib/pricing";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * The first screen of the day.
 *
 * It used to show three customer counts and an empty table. For a business
 * with 47,000 leads, 43 built sites and nobody emailed yet, every figure on it
 * read zero — so the one screen meant to say what is happening said nothing,
 * and one of the three was wrong on top of that: "New Leads" counted customers
 * whose subscription was pending, not leads.
 *
 * This shows the funnel end to end, and says plainly what is standing between
 * the current state and money.
 */

type Counts = {
  leads: number;
  reachable: number;
  sitesBuilt: number;
  sitesApproved: number;
  awaitingReview: number;
  inSequence: number;
  emailsSent: number;
  demoViews: number;
  clicks: number;
  customers: number;
  activeCustomers: number;
  sendingOn: boolean;
  testMode: boolean;
  recentCustomers: {
    id: string; business_name: string; created_at: string;
    subscription_status: string; hosting_status: string;
  }[];
};

async function getCounts(): Promise<{ error: string | null; c: Counts }> {
  const empty: Counts = {
    leads: 0, reachable: 0, sitesBuilt: 0, sitesApproved: 0, awaitingReview: 0,
    inSequence: 0, emailsSent: 0, demoViews: 0, clicks: 0,
    customers: 0, activeCustomers: 0, sendingOn: false, testMode: true,
    recentCustomers: [],
  };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not set.", c: empty };
  }

  const db = createServiceRoleClient();
  const n = (q: { count: number | null }) => q.count ?? 0;

  const [
    leads, reachable, sitesBuilt, sitesApproved, awaitingReview,
    inSequence, emailsSent, demoViews, clicks, customers, activeCustomers,
    settings, recent,
  ] = await Promise.all([
    db.from("leads").select("*", { count: "exact", head: true }),
    db.from("leads").select("*", { count: "exact", head: true })
      .not("contact_email", "is", null).neq("contact_email", "")
      .is("unsubscribed_at", null).is("email_bounced_at", null),
    db.from("demo_sites").select("*", { count: "exact", head: true }).eq("status", "ready"),
    db.from("demo_sites").select("*", { count: "exact", head: true }).eq("review_status", "approved"),
    db.from("demo_sites").select("*", { count: "exact", head: true }).eq("review_status", "pending"),
    db.from("lead_email_state").select("*", { count: "exact", head: true }).eq("status", "active"),
    // Rehearsals reached the operator, not a business. Counting them here
    // would show outreach that never happened.
    db.from("email_sends").select("*", { count: "exact", head: true }).eq("was_test", false),
    db.from("outreach_events").select("*", { count: "exact", head: true }).eq("event_type", "viewed"),
    db.from("outreach_events").select("*", { count: "exact", head: true }).eq("event_type", "clicked"),
    db.from("customers").select("*", { count: "exact", head: true }),
    db.from("customers").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
    db.from("email_settings").select("sending_enabled, test_mode").maybeSingle(),
    db.from("customers")
      .select("id, business_name, created_at, subscription_status, hosting_status")
      .order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    error: null,
    c: {
      leads: n(leads), reachable: n(reachable), sitesBuilt: n(sitesBuilt),
      sitesApproved: n(sitesApproved), awaitingReview: n(awaitingReview),
      inSequence: n(inSequence), emailsSent: n(emailsSent),
      demoViews: n(demoViews), clicks: n(clicks),
      customers: n(customers), activeCustomers: n(activeCustomers),
      sendingOn: Boolean(settings.data?.sending_enabled),
      testMode: settings.data?.test_mode !== false,
      recentCustomers: (recent.data ?? []) as Counts["recentCustomers"],
    },
  };
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function AdminDashboard() {
  const { error, c } = await getCounts();

  // What is actually stopping the next pound coming in, in the order it has to
  // be fixed. Naming it here means the answer is on screen rather than in
  // somebody's head.
  const blockers: { text: string; href: string; label: string }[] = [];
  if (c.testMode && c.sendingOn) {
    blockers.push({
      text: `Test mode is on, so all ${c.inSequence} queued emails go to you rather than to the business.`,
      href: "/admin/emails", label: "Email settings",
    });
  }
  if (!c.sendingOn) {
    blockers.push({
      text: "Sending is switched off. Nothing will go out.",
      href: "/admin/emails", label: "Email settings",
    });
  }
  if (c.awaitingReview > 0) {
    blockers.push({
      text: `${c.awaitingReview} site${c.awaitingReview === 1 ? "" : "s"} held for a human look before they can be sent.`,
      href: "/admin/sites", label: "Review them",
    });
  }
  if (c.reachable > c.sitesApproved) {
    blockers.push({
      text: `${(c.reachable - c.sitesApproved).toLocaleString()} businesses can be emailed but have no approved site yet. The site builder adds 20 a day.`,
      href: "/admin/agents", label: "Agents",
    });
  }

  const setupRevenue = c.customers * HEADLINE.setup;
  const mrr = c.activeCustomers * HEADLINE.monthly;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Where the business actually is, from lead to payment.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error} Nothing can load until it is set.
        </div>
      )}

      {blockers.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">
              What is between you and the next sale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {blockers.map((b) => (
              <div key={b.text} className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900">
                <span>{b.text}</span>
                <Link href={b.href}>
                  <Button variant="outline" size="sm">{b.label}</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Money
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Setup collected" value={money(setupRevenue)}
            hint={`${c.customers} customer${c.customers === 1 ? "" : "s"}`} />
          <StatCard label="Monthly recurring" value={money(mrr)}
            hint={`${c.activeCustomers} active`} />
          <StatCard label="Customers" value={c.customers} hint="paid" />
          <StatCard label="Active" value={c.activeCustomers} hint="subscription live" />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          The funnel
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Leads" value={c.leads.toLocaleString()} hint="pulled from SunBiz" />
          <StatCard label="Reachable by email" value={c.reachable.toLocaleString()}
            hint={c.leads ? `${((c.reachable / c.leads) * 100).toFixed(1)}% — the ceiling on email` : "—"} />
          <StatCard label="Sites built" value={c.sitesBuilt} hint={`${c.sitesApproved} approved`} />
          <StatCard label="Queued to send" value={c.inSequence} hint="in the sequence" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Emails sent" value={c.emailsSent}
            hint={c.emailsSent === 0 ? "none yet — rehearsals excluded" : "to real businesses"} />
          <StatCard label="Demos viewed" value={c.demoViews} hint="someone opened a site" />
          <StatCard label="Clicks" value={c.clicks} hint="from an email" />
          <StatCard label="Awaiting review" value={c.awaitingReview}
            hint={c.awaitingReview === 0 ? "the gate is keeping up" : "held for a human"} />
        </div>
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent customers</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-3 font-medium">Business</th>
                  <th className="px-2 py-3 font-medium">Signed up</th>
                  <th className="px-2 py-3 font-medium">Subscription</th>
                  <th className="px-2 py-3 font-medium">Hosting</th>
                </tr>
              </thead>
              <tbody>
                {c.recentCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No customers yet. The first one arrives through a demo site, not this page.
                    </td>
                  </tr>
                ) : (
                  c.recentCustomers.map((cu) => (
                    <tr key={cu.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-2 py-3 font-medium">{cu.business_name}</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {new Date(cu.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          cu.subscription_status === "active"
                            ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"}`}>
                          {cu.subscription_status}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">{cu.hosting_status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* The per-customer View button linked at /admin/customers/{id}, a
              page that does not exist, so every row led to a 404. The list
              page has the detail panel. */}
          <div className="mt-4">
            <Link href="/admin/customers">
              <Button variant="outline" size="sm">All customers</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { h: "Generated sites", p: "Review and approve what leads will be shown", href: "/admin/sites", b: "Open sites" },
          { h: "Email outreach", p: "Sequence, sending controls and templates", href: "/admin/emails", b: "Open email" },
          { h: "Agents", p: "Every scheduled job and what it last returned", href: "/admin/agents", b: "Open agents" },
        ].map((card) => (
          <Card key={card.href}>
            <CardContent className="pt-6">
              <h3 className="mb-2 font-semibold">{card.h}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{card.p}</p>
              <Link href={card.href}>
                <Button size="sm" className="w-full">{card.b}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
