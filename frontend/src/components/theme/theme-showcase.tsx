"use client";

import type { Theme } from "@/lib/themes";
import type { Mode } from "@/lib/theme-context";
import { HeroSection, CraftsShowcase, PackagesSection, TrafficSection, AutomationsSection, HowWeWorkSection, AboutSection, ContactSection, Process10Grid, BookingSection } from "@/components/main";

interface ThemeShowcaseProps {
  theme: Theme;
  mode: Mode;
}

export function ThemeShowcase({ theme, mode }: ThemeShowcaseProps) {
  const c = theme.colors;
  const isNight = mode === "night";

  // In night mode, invert: dark becomes background, light becomes text
  const colors = {
    primary: c.primary,
    primaryLight: c.primaryLight,
    dark: isNight ? c.light : c.dark,
    light: isNight ? c.dark : c.light,
    lightAlt: isNight ? c.dark : c.lightAlt,
    textOnLight: isNight ? c.light : c.textOnLight,
    textMuted: isNight ? c.light : c.textMuted,
    border: isNight ? c.borderOnDark : c.border,
  };

  return (
    <div style={{ backgroundColor: colors.light }}>
      <HeroSection colors={colors} />
      <CraftsShowcase colors={colors} />
      <Process10Grid colors={colors} />
      <PackagesSection colors={colors} />
      <TrafficSection colors={colors} />
      <AutomationsSection colors={colors} />
      <HowWeWorkSection colors={colors} />
      <AboutSection colors={colors} />
      <BookingSection colors={colors} />
      <ContactSection colors={colors} />
    </div>
  );
}