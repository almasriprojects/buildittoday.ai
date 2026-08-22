"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

/**
 * SiteShell wraps all pages. It renders the homepage Navigation + Footer
 * ONLY for public site routes. Admin routes (/admin/*) get a clean shell
 * with no homepage chrome — the admin layout provides its own header/sidebar.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}