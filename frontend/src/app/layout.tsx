import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "BuildItToday.ai — Website For Your Business. $1,500. Built in One Week.",
  description: "We build professional websites for small businesses in 1 week for $1,500. Mobile-friendly, SEO-optimized, and ready to get you customers.",
  keywords: "website design, small business website, professional website, web development",
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