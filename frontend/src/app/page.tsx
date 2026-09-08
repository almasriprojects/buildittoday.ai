"use client";

import { HeroSection, CraftsShowcase, PackagesSection, AboutSection, ContactSection, BookingSection } from "@/components/main";

/**
 * Almost everyone who lands here arrived from an email about a website we
 * already built for them. They need four things: proof it is real, proof it is
 * good, what it costs, and a way to say yes.
 *
 * The page used to carry ten sections and three separate businesses. A growth
 * retainer "starting at $2,000/mo" and automation modules "starting at $2,500"
 * sat below a hero offering a site from $750 — so a plumber who clicked an
 * email about a $750 website met a number twenty times the $99/month they were
 * being offered. That does not read as a bigger service, it reads as a price
 * nobody can keep straight.
 *
 * One offer, one price ladder, all of it from lib/pricing.ts.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* The offer, and the price, above the fold. */}
      <HeroSection />
      {/* Proof that the thing they were sent is not a template. */}
      <CraftsShowcase />
      {/* The one ladder: $750 / $1,500 / $3,500, derived from TIERS. */}
      <PackagesSection />
      {/* Who is behind it — a real question when a stranger emails you a site. */}
      <AboutSection />
      <BookingSection />
      <ContactSection />
    </div>
  );
}
