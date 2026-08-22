"use client";

import { PackagesSection, TrafficSection } from "@/components/main/packages-traffic";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PackagesSection />
      <TrafficSection />
    </div>
  );
}