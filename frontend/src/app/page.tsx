"use client";

import { HeroSection, CraftsShowcase, PackagesSection, TrafficSection, AutomationsSection, HowWeWorkSection, AboutSection, ContactSection, Process10Grid, BookingSection } from "@/components/main";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <CraftsShowcase />
      <Process10Grid />
      <PackagesSection />
      <TrafficSection />
      <AutomationsSection />
      <HowWeWorkSection />
      <AboutSection />
      <BookingSection />
      <ContactSection />
    </div>
  );
}