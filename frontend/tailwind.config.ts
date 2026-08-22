import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === EXACT COLORS FROM USER SPECIFICATION ===
        
        // Surface Colors
        "bg-page": "#F9F5F0",
        "bg-card-light": "#F3EEE6",
        "bg-card-dark": "#1C1917",
        "bg-white": "#FFFFFF",

        // Accent & Action
        "accent-primary": "#E87053",
        "accent-primary-hover": "#D4604A",
        "accent-primary-light": "#F0A892",
        "accent-primary-muted": "rgba(232, 112, 83, 0.1)",

        // Text Colors
        "text-primary": "#1B1918",
        "text-secondary": "#5C554E",
        "text-muted": "#8A8480",
        "text-light": "#A8A29E",
        "text-on-dark": "#F3EEE6",
        "text-on-dark-white": "#FFFFFF",
        "text-on-dark-muted": "#A8A29E",

        // Borders & UI Lines
        "border-subtle": "#E8E2D8",
        "border-light": "#D6D3D1",
        "border-medium": "#C8C4BE",
        "border-dark": "#57534E",
        "border-on-dark": "#44403C",

        // Status
        "status-success": "#6B8E6B",
        "status-success-text": "#4A7C4A",
        "status-warning": "#D4A574",
        "status-error": "#C0564A",

        // Badges
        "badge-dark": "#1C1917",
        "badge-accent": "#E87053",

        // Secondary palette (earthy accent tones)
        forest: "#3D4A2E",
        "forest-hover": "#33401F",
        wood: "#6B4423",
        "wood-hover": "#5A3A1D",

        // === shadcn/ui semantic tokens (required by components/ui/*) ===
        border: "#E8E2D8",
        input: "#D6D3D1",
        ring: "#E87053",
        background: "#F9F5F0",
        foreground: "#1B1918",
        primary: {
          DEFAULT: "#E87053",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F3EEE6",
          foreground: "#1B1918",
        },
        destructive: {
          DEFAULT: "#C0564A",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F3EEE6",
          foreground: "#8A8480",
        },
        accent: {
          DEFAULT: "#F0A892",
          foreground: "#1B1918",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1B1918",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1B1918",
        },
      },
      fontFamily: {
        serif: ["Fraunces", "Playfair Display", "Georgia", "serif"],
        sans: ["Outfit", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      borderRadius: {
        none: "0",
        sm: "0.25rem",
        base: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;