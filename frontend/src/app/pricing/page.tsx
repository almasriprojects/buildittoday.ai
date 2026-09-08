import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Three ways to work together, from $750 — every price a real starting point, not a contact-us form.",
  alternates: { canonical: "/pricing" },
};

import { PackagesSection } from "@/components/main/packages-traffic";

/**
 * One ladder, and only one. This page carried the growth retainer as well,
 * so the page whose entire job is answering "what does it cost" gave two
 * unrelated answers — $750 to $3,500 once, and separately $2,000 a month.
 */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PackagesSection />
    </div>
  );
}