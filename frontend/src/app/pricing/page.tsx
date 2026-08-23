import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Three ways to work together, from $750 — every price a real starting point, not a contact-us form.",
  alternates: { canonical: "/pricing" },
};

import { PackagesSection, TrafficSection } from "@/components/main/packages-traffic";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PackagesSection />
      <TrafficSection />
    </div>
  );
}