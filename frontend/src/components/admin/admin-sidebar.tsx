"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Target,
  Mail,
  BarChart3,
  CreditCard,
  LogOut,
  Globe,
  CalendarClock,
  UserPlus,
  GitBranch,
  Plug,
  Bot,
  Building2,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: Target },
  { href: "/admin/sites", label: "Generated Sites", icon: Globe },
  { href: "/admin/bookings", label: "Call Requests", icon: CalendarClock },
  { href: "/admin/potential-customers", label: "Sign-ups", icon: UserPlus },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/emails", label: "Email", icon: Mail },
  { href: "/admin/inventory", label: "Lead Inventory", icon: Building2 },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/attribution", label: "Attribution", icon: GitBranch },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/agents", label: "Agents", icon: Bot },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(href + "/");

  const handleSignOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <aside className="w-60 shrink-0 bg-card-dark text-on-dark h-screen overflow-y-auto flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-on-dark">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-lg font-bold text-on-dark-white">
            BuildItToday
            <span className="text-accent-primary">.ai</span>
          </span>
        </Link>
        <p className="text-[11px] text-on-dark-muted mt-1 tracking-wide uppercase">Admin Console</p>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <div key={item.href} className="relative">
              {active && (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent-primary" />
              )}
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-primary text-white font-semibold shadow-sm"
                    : "text-on-dark hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    active ? "text-white" : "text-accent-primary"
                  )}
                />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom Section: Sign Out.
          There was a Settings link here pointing at a page of hardcoded
          placeholder values whose save button reported success without saving
          anything. Everything genuinely configurable lives on its own page —
          sending and templates under Email — so the link is gone rather than
          leading somewhere that lies. */}
      <div className="px-3 pb-4 pt-3 border-t border-on-dark flex flex-col gap-1">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-dark transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
        >
          <LogOut className="w-4 h-4 shrink-0 text-accent-primary" />
          {signingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}