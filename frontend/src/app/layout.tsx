import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { ENTRY, money } from "@/lib/pricing";

const SITE_URL = "https://www.buildittoday.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Websites for Florida Small Businesses — From ${money(ENTRY.setup)}`,
    // Sub-pages set their own name and inherit this frame.
    template: "%s · BuildItToday.ai",
  },
  description: `Custom websites for Florida small businesses, live on your own domain in one week. From ${money(ENTRY.setup)} — no template, and you own the code.`,
  keywords:
    "website design, small business website, Florida web design, Miami web design, professional website, web development",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "BuildItToday.ai",
    title: `Websites for Florida Small Businesses — From ${money(ENTRY.setup)}`,
    description: `Custom websites, live in one week. From ${money(ENTRY.setup)} — no template, and you own the code.`,
  },
  twitter: {
    card: "summary_large_image",
    title: `Websites for Florida Small Businesses — From ${money(ENTRY.setup)}`,
    description: `Custom websites, live in one week. From ${money(ENTRY.setup)}.`,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}