"use client";

import { usePathname } from "next/navigation";

/**
 * The name of the page you are on, in the browser tab and at the top of the
 * screen. Longest match wins so /admin/sites/L260… still reads "Generated
 * Sites" rather than falling back to the console name.
 */
const TITLES: [string, string][] = [
  ["/admin/leads/map", "Lead Map"],
  ["/admin/leads", "Leads"],
  ["/admin/sites", "Generated Sites"],
  ["/admin/bookings", "Call Requests"],
  ["/admin/potential-customers", "Sign-ups"],
  ["/admin/customers/new", "New Customer"],
  ["/admin/customers", "Customers"],
  ["/admin/emails", "Email"],
  ["/admin/analytics", "Analytics"],
  ["/admin/attribution", "Attribution"],
  ["/admin/billing", "Billing"],
  ["/admin/agents", "Agents"],
  ["/admin/integrations", "Integrations"],
  ["/admin", "Dashboard"],
];

export function AdminTitle() {
  const pathname = usePathname() ?? "/admin";
  const match = TITLES.find(([href]) => pathname === href || pathname.startsWith(href + "/"));
  const title = match?.[1] ?? "Admin";

  return (
    <div className="shrink-0 border-b border-border-subtle px-6 py-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
    </div>
  );
}
