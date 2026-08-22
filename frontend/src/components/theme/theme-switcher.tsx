"use client";

import { Moon, Sun } from "lucide-react";
import type { ThemeId } from "@/lib/themes";
import { useTheme } from "@/lib/theme-context";

interface ThemeSwitcherProps {
  themeId: ThemeId;
  onSelect: (id: ThemeId) => void;
}

export function ThemeSwitcher({ themeId, onSelect }: ThemeSwitcherProps) {
  const { mode, toggleMode } = useTheme();

  return (
    <div className="flex items-center gap-3">
      {/* Day/Night toggle */}
      <button
        onClick={toggleMode}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Toggle day/night mode"
      >
        {mode === "day" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {mode === "day" ? "Day" : "Night"}
      </button>

      {/* Select this theme */}
      <button
        onClick={() => onSelect(themeId)}
        className="px-5 py-2 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "#E87053" }}
      >
        Select this theme
      </button>
    </div>
  );
}