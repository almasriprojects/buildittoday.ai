"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Mode = "day" | "night";

export interface ThemeContextValue {
  mode: Mode;
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "day",
  toggleMode: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("day");

  // Load persisted mode on mount
  useEffect(() => {
    const stored = window.localStorage.getItem("theme-mode");
    if (stored === "night" || stored === "day") {
      setMode(stored);
    }
  }, []);

  // Apply/remove `dark` class on <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "night") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    window.localStorage.setItem("theme-mode", mode);
  }, [mode]);

  const toggleMode = () => setMode((m) => (m === "day" ? "night" : "day"));

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}