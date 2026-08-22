"use client";

import { useState } from "react";
import { themeList, type ThemeId } from "@/lib/themes";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { ThemePreviewCard } from "@/components/theme/theme-preview-card";
import { ThemeShowcase } from "@/components/theme/theme-showcase";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

function ColorsPageInner() {
  const { mode } = useTheme();
  const [selected, setSelected] = useState<ThemeId>("coral");
  const [confirmed, setConfirmed] = useState<ThemeId | null>(null);

  const activeTheme = themeList.find((t) => t.id === selected)!;

  const handleSelect = (id: ThemeId) => {
    setSelected(id);
    setConfirmed(id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Theme Studio</h1>
            <p className="text-sm text-gray-500">Pick your 3-color palette — view it live in day & night mode</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher themeId={selected} onSelect={handleSelect} />
          </div>
        </div>
      </header>

      {/* Palette picker */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">1. Choose your palette</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {themeList.map((theme) => (
            <ThemePreviewCard
              key={theme.id}
              theme={theme}
              selected={selected === theme.id}
              onSelect={() => setSelected(theme.id)}
            />
          ))}
        </div>

        {confirmed && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            ✅ <strong>{themeList.find((t) => t.id === confirmed)?.name}</strong> selected. Scroll down to review the full
            page in {mode === "day" ? "day" : "night"} mode, then toggle day/night to compare.
          </div>
        )}
      </section>

      {/* Live showcase */}
      <section className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            2. Live preview — {activeTheme.name} ({mode === "day" ? "Day" : "Night"})
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Every homepage component rendered in this palette. Use the Day/Night toggle above to flip it.
          </p>
        </div>
        <ThemeShowcase theme={activeTheme} mode={mode} />
      </section>
    </div>
  );
}

export default function ColorsPage() {
  return (
    <ThemeProvider>
      <ColorsPageInner />
    </ThemeProvider>
  );
}