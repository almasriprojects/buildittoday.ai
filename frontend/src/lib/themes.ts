// BuildItToday.ai — Theme palette definitions
// Six candidate 3-color palettes, each with day/night support.

export type ThemeId = "coral" | "navy" | "teal" | "luxury" | "berry" | "nordic";

export interface ThemeColors {
  primary: string; // CTA / accent color
  primaryHover: string; // darker hover state
  primaryLight: string; // light tint for backgrounds/badges
  dark: string; // dark surface / text-on-light
  light: string; // light surface / text-on-dark
  lightAlt: string; // alternate light surface (section alternation)
  textOnLight: string; // body text on light backgrounds
  textMuted: string; // muted text
  border: string; // subtle border color
  borderOnDark: string; // border on dark surfaces
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
}

export const themes: Record<ThemeId, Theme> = {
  coral: {
    id: "coral",
    name: "Warm Coral",
    description: "Warm, friendly, high-contrast — great for local service businesses.",
    colors: {
      primary: "#E87053",
      primaryHover: "#D4604A",
      primaryLight: "#F0A892",
      dark: "#1C1917",
      light: "#F9F5F0",
      lightAlt: "#FFFFFF",
      textOnLight: "#5C554E",
      textMuted: "#8A8480",
      border: "#E8E2D8",
      borderOnDark: "#44403C",
    },
  },
  navy: {
    id: "navy",
    name: "Trust Navy",
    description: "Established, trustworthy, high-end — good for finance, law, medical.",
    colors: {
      primary: "#C9972A",
      primaryHover: "#B0841F",
      primaryLight: "#E8D5A8",
      dark: "#1B2A4A",
      light: "#F7F5F1",
      lightAlt: "#FFFFFF",
      textOnLight: "#4A4A48",
      textMuted: "#7A7A76",
      border: "#E5E0D6",
      borderOnDark: "#3A4A6A",
    },
  },
  teal: {
    id: "teal",
    name: "Modern Teal",
    description: "Fresh, energetic, modern — good for food, health & wellness.",
    colors: {
      primary: "#D97706",
      primaryHover: "#B45309",
      primaryLight: "#F5D9A8",
      dark: "#0F3A36",
      light: "#F8FAF9",
      lightAlt: "#FFFFFF",
      textOnLight: "#3F4A47",
      textMuted: "#6B7A76",
      border: "#E2E8E5",
      borderOnDark: "#2A4A46",
    },
  },
  luxury: {
    id: "luxury",
    name: "Luxury Gold",
    description: "Premium, elegant, hospitality-grade — for high-end services and boutiques.",
    colors: {
      primary: "#C5A880",
      primaryHover: "#A98F62",
      primaryLight: "#E3D5B8",
      dark: "#0F0F0F",
      light: "#FAF7F2",
      lightAlt: "#FFFFFF",
      textOnLight: "#6B6055",
      textMuted: "#8A9285",
      border: "#EDE6D6",
      borderOnDark: "#3A3A3A",
    },
  },
  berry: {
    id: "berry",
    name: "Bold Berry",
    description: "Creative, vibrant, modern — for creative studios and modern brands.",
    colors: {
      primary: "#9333EA",
      primaryHover: "#7E22CE",
      primaryLight: "#D8B4FE",
      dark: "#3B0764",
      light: "#FAF5FF",
      lightAlt: "#FFFFFF",
      textOnLight: "#6B21A8",
      textMuted: "#8A6FB0",
      border: "#EDE4F8",
      borderOnDark: "#5B21B6",
    },
  },
  nordic: {
    id: "nordic",
    name: "Nordic Slate",
    description: "Minimal, calm, trustworthy — for SaaS, tech, and consultants.",
    colors: {
      primary: "#2563EB",
      primaryHover: "#1D4ED8",
      primaryLight: "#93C5FD",
      dark: "#0F172A",
      light: "#F1F5F9",
      lightAlt: "#FFFFFF",
      textOnLight: "#475569",
      textMuted: "#94A3B8",
      border: "#E2E8F0",
      borderOnDark: "#334155",
    },
  },
};

export const themeList: Theme[] = [themes.coral, themes.navy, themes.teal, themes.luxury, themes.berry, themes.nordic];