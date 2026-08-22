"use client";

import { Check } from "lucide-react";
import type { Theme } from "@/lib/themes";

interface ThemePreviewCardProps {
  theme: Theme;
  selected: boolean;
  onSelect: () => void;
}

export function ThemePreviewCard({ theme, selected, onSelect }: ThemePreviewCardProps) {
  const c = theme.colors;

  return (
    <button
      onClick={onSelect}
      className={`group relative w-full text-left rounded-2xl border-2 p-4 transition-all duration-300 ${
        selected
          ? "border-[#E87053] shadow-lg"
          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
      }`}
      style={{ backgroundColor: c.light }}
    >
      {/* Selected badge */}
      {selected && (
        <span
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: c.primary }}
        >
          <Check className="w-4 h-4" />
        </span>
      )}

      {/* Color swatches */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-full border border-black/10" style={{ backgroundColor: c.primary }} />
        <span className="w-8 h-8 rounded-full border border-black/10" style={{ backgroundColor: c.dark }} />
        <span className="w-8 h-8 rounded-full border border-black/10" style={{ backgroundColor: c.light }} />
      </div>

      {/* Mini hero preview */}
      <div
        className="rounded-xl p-4 mb-3"
        style={{ backgroundColor: c.dark }}
      >
        <div className="h-2 w-3/4 rounded-full mb-2" style={{ backgroundColor: c.light }} />
        <div className="h-2 w-1/2 rounded-full mb-3" style={{ backgroundColor: c.light, opacity: 0.6 }} />
        <div
          className="inline-block px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: c.primary, color: "#FFFFFF" }}
        >
          Button
        </div>
      </div>

      {/* Name + description */}
      <h3 className="text-sm font-semibold mb-1" style={{ color: c.dark }}>
        {theme.name}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: c.textMuted }}>
        {theme.description}
      </p>
    </button>
  );
}