"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/leads": "Leads",
  "/admin/customers": "Customers",
  "/admin/campaigns": "Campaigns",
  "/admin/analytics": "Analytics",
  "/admin/billing": "Billing",
  "/admin/settings": "Settings",
};

export function AdminHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Admin Console";

  return (
    <header className="bg-bg-page border-b border-border-subtle shrink-0">
      <div className="flex items-center justify-between h-16 px-6">
        <div>
          <h1 className="text-lg font-semibold text-text-primary serif">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              View Site
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
