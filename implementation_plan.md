# Implementation Plan

## [Overview]

Build a live `/colors` theme showcase page that renders all three candidate palettes (Warm Coral, Trust Navy, Modern Teal) in both day and night modes with every existing homepage component, so the user can visually compare and select the winning palette — then refactor the monolithic `frontend/src/app/page.tsx` into reusable section components and apply the chosen palette with curved edges and a working day/night toggle across the entire site.

The current homepage (`frontend/src/app/page.tsx`) is a single 700+ line file containing nine sections (Hero, Stats, Problem, Process, Portfolio, Testimonials, Pricing, FAQ, CTA) with hardcoded stone/coral Tailwind classes (`bg-stone-900`, `text-stone-500`, `rounded-none`, etc.). The design system files (`tailwind.config.ts`, `globals.css`, `palette.ts`) define a coral/linen/espresso palette, but the homepage bypasses these tokens with raw stone classes, the edges are sharp (`rounded-none`/`rounded-sm`), and dark mode is configured but never implemented. The user has repeatedly tried to get a 3-color palette applied and it has not worked, so this plan front-loads visual approval: a dedicated theme page shows all three palettes live before any site-wide changes are locked in.

The approach is two-phase. **Phase 1** creates a new `/colors` route that renders all three palettes side-by-side, each with a day/night toggle, showing every homepage component (hero, stats, process, portfolio, testimonials, pricing, FAQ, CTA) restyled in that palette with curved edges. The user reviews this page and selects a palette. **Phase 2** refactors `page.tsx` into individual section components under `frontend/src/components/sections/`, applies the winning palette to the design system tokens (`tailwind.config.ts`, `globals.css`, `palette.ts`), updates `navigation.tsx`, `footer.tsx`, and `button.tsx` to use the new tokens, adds curved edges site-wide, and wires up a functional day/night theme toggle using the same three colors inverted.

## [Types]

Define a `Theme` type system to drive the palette showcase and the site-wide theming.

```ts
// frontend/src/lib/themes.ts
export type ThemeId = "coral" | "navy" | "teal";

export interface ThemeColors {
  primary: string;      // CTA / accent color
  primaryHover: string; // darker hover state
  primaryLight: string; // light tint for backgrounds/badges
  dark: string;         // dark surface / text-on-light
  light: string;        // light surface / text-on-dark
  lightAlt: string;     // alternate light surface (section alternation)
  textOnLight: string;  // body text on light backgrounds
  textMuted: string;    // muted text
  border: string;       // subtle border color
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
    description: "Energetic, modern, stands out from typical blue/coral sites.",
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
};
```

```ts
// frontend/src/lib/theme-context.tsx
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
  // Persists mode to localStorage, defaults to "day"
  // Applies/removes `dark` class on <html> element
}

export function useTheme(): ThemeContextValue;
```

```ts
// frontend/src/components/theme/theme-showcase.tsx (Phase 1)
export interface ThemeShowcaseProps {
  theme: Theme;
  mode: Mode;
}
```

## [Files]

Create a new `/colors` theme showcase route and a set of reusable section components, then refactor the homepage to consume them.

### New files (Phase 1 — theme showcase)

| Path | Purpose |
|------|---------|
| `frontend/src/app/colors/page.tsx` | The `/colors` route. Renders all three palettes (Coral, Navy, Teal), each with a day/night toggle and a "Select this theme" button. |
| `frontend/src/lib/themes.ts` | The `ThemeId`, `ThemeColors`, `Theme`, `themes` type definitions and palette data (see [Types]). |
| `frontend/src/lib/theme-context.tsx` | `ThemeProvider`, `useTheme`, `Mode` — day/night mode state persisted to localStorage, toggling the `dark` class on `<html>`. |
| `frontend/src/components/theme/theme-showcase.tsx` | Renders a single theme's full component showcase (all sections) in a given mode. |
| `frontend/src/components/theme/theme-switcher.tsx` | Day/night toggle button + "Select this theme" button for the showcase. |
| `frontend/src/components/theme/theme-preview-card.tsx` | Compact preview card (colors swatches + mini hero + buttons) used in the palette picker grid. |

### New files (Phase 2 — section refactor)

| Path | Purpose |
|------|---------|
| `frontend/src/components/sections/hero-section.tsx` | Extracted `HeroSection` from `page.tsx`. |
| `frontend/src/components/sections/stats-section.tsx` | Extracted `StatsSection`. |
| `frontend/src/components/sections/problem-section.tsx` | Extracted `ProblemSection`. |
| `frontend/src/components/sections/process-section.tsx` | Extracted `ProcessSection`. |
| `frontend/src/components/sections/portfolio-section.tsx` | Extracted `PortfolioSection`. |
| `frontend/src/components/sections/testimonials-section.tsx` | Extracted `TestimonialsSection`. |
| `frontend/src/components/sections/pricing-section.tsx` | Extracted `PricingSection`. |
| `frontend/src/components/sections/faq-section.tsx` | Extracted `FAQSection` + `FAQItem`. |
| `frontend/src/components/sections/cta-section.tsx` | Extracted `CTASection`. |
| `frontend/src/components/sections/section-label.tsx` | Extracted `SectionLabel` shared component. |
| `frontend/src/components/sections/index.ts` | Barrel export for all sections. |
| `frontend/src/components/theme-toggle.tsx` | Site-wide day/night toggle button for the navigation bar. |

### Modified files

| Path | Changes |
|------|---------|
| `frontend/src/app/page.tsx` | **Phase 2:** Replace all inline section code with imports from `@/components/sections`. Keep only the data arrays (`portfolioItems`, `processSteps`, `testimonials`, `faqs`) or move them to `frontend/src/lib/site-data.ts`. |
| `frontend/src/lib/site-data.ts` | **New (Phase 2):** Move `portfolioItems`, `processSteps`, `testimonials`, `faqs` data arrays here so both the homepage and theme showcase share them. |
| `frontend/tailwind.config.ts` | Replace the current color tokens with the winning palette's tokens (primary, primary-hover, primary-light, dark, light, light-alt, text-on-light, text-muted, border, border-on-dark). Add `dark` variants for each token. Add curved radius tokens (`rounded-xl` = `1rem`, `rounded-2xl` = `1.25rem`). |
| `frontend/src/app/globals.css` | Update `body` background/text to the winning palette. Add `.dark` overrides (inverted same-3-colors). Add `@layer base` dark-mode styles. Keep `container-max` and `section-padding` utilities. |
| `frontend/src/lib/palette.ts` | Update to export the winning palette as the single source of truth, mirroring `tailwind.config.ts`. |
| `frontend/src/components/navigation.tsx` | Use new tokens (`bg-light`, `text-on-light`, `border`), add `ThemeToggle` button, add mobile menu if needed. |
| `frontend/src/components/footer.tsx` | Use new tokens for dark footer background and text. |
| `frontend/src/components/ui/button.tsx` | Update variants to use new tokens: `default` = primary bg, `outline` = border + text-on-light, `secondary` = dark bg. Add `rounded-full` or `rounded-xl` default radius for curved edges. |
| `frontend/src/app/layout.tsx` | Wrap children in `ThemeProvider`. |
| `frontend/src/app/colors/page.tsx` | After palette selection, becomes a redirect to `/` or is removed. |

### Files to delete

| Path | Reason |
|------|--------|
| `frontend/src/app/colors/page.tsx` | **After Phase 2 completes and palette is chosen** — the showcase served its purpose. (Optional: keep as `/colors` archive page.) |

## [Functions]

### New functions

| Function | Signature | File | Purpose |
|----------|-----------|------|---------|
| `ThemeProvider` | `({ children }: { children: React.ReactNode })` | `frontend/src/lib/theme-context.tsx` | Provides day/night mode state, persists to localStorage, toggles `dark` class on `<html>`. |
| `useTheme` | `() => ThemeContextValue` | `frontend/src/lib/theme-context.tsx` | Hook to read mode + toggle from any component. |
| `ThemeShowcase` | `({ theme, mode }: ThemeShowcaseProps)` | `frontend/src/components/theme/theme-showcase.tsx` | Renders all homepage sections in a given theme + mode. |
| `ThemeSwitcher` | `({ themeId, onSelect }: { themeId: ThemeId; onSelect: (id: ThemeId) => void })` | `frontend/src/components/theme/theme-switcher.tsx` | Day/night toggle + "Select this theme" button. |
| `ThemePreviewCard` | `({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect: () => void })` | `frontend/src/components/theme/theme-preview-card.tsx` | Compact palette preview card for the picker grid. |
| `ThemeToggle` | `() => JSX.Element` | `frontend/src/components/theme-toggle.tsx` | Site-wide day/night toggle for the navbar. |
| `HeroSection` | `() => JSX.Element` | `frontend/src/components/sections/hero-section.tsx` | Extracted from `page.tsx`, tokenized colors, curved edges. |
| `StatsSection` | `() => JSX.Element` | `frontend/src/components/sections/stats-section.tsx` | Extracted, tokenized. |
| `ProblemSection` | `() => JSX.Element` | `frontend/src/components/sections/problem-section.tsx` | Extracted, tokenized. |
| `ProcessSection` | `() => JSX.Element` | `frontend/src/components/sections/process-section.tsx` | Extracted, tokenized. |
| `PortfolioSection` | `() => JSX.Element` | `frontend/src/components/sections/portfolio-section.tsx` | Extracted, tokenized. |
| `TestimonialsSection` | `() => JSX.Element` | `frontend/src/components/sections/testimonials-section.tsx` | Extracted, tokenized. |
| `PricingSection` | `() => JSX.Element` | `frontend/src/components/sections/pricing-section.tsx` | Extracted, tokenized. |
| `FAQSection` | `() => JSX.Element` | `frontend/src/components/sections/faq-section.tsx` | Extracted, tokenized. |
| `FAQItem` | `({ question, answer }: { question: string; answer: string })` | `frontend/src/components/sections/faq-section.tsx` | Extracted, tokenized. |
| `CTASection` | `() => JSX.Element` | `frontend/src/components/sections/cta-section.tsx` | Extracted, tokenized. |
| `SectionLabel` | `({ children }: { children: React.ReactNode })` | `frontend/src/components/sections/section-label.tsx` | Extracted, tokenized. |

### Modified functions

| Function | File | Changes |
|----------|------|---------|
| `Home` (default export) | `frontend/src/app/page.tsx` | Replace inline sections with imports from `@/components/sections`. |
| `Navigation` | `frontend/src/components/navigation.tsx` | Tokenized colors, add `ThemeToggle`. |
| `Footer` | `frontend/src/components/footer.tsx` | Tokenized colors. |
| `Button` / `buttonVariants` | `frontend/src/components/ui/button.tsx` | New token-based variants, curved radius. |

### Removed functions

| Function | File | Reason | Migration |
|----------|------|--------|-----------|
| All inline section components (`HeroSection`, `StatsSection`, `ProblemSection`, `ProcessSection`, `PortfolioSection`, `TestimonialsSection`, `PricingSection`, `FAQSection`, `FAQItem`, `CTASection`, `SectionLabel`) | `frontend/src/app/page.tsx` | Monolith refactor | Moved to `frontend/src/components/sections/*` with identical names. |

## [Classes]

No new classes are introduced. The project uses functional React components with hooks; the refactor preserves this pattern. The `ThemeProvider` uses React Context (`createContext`) rather than a class-based provider. All extracted section components are plain function components with the same props as their inline counterparts.

## [Dependencies]

No new runtime dependencies are required.

- `framer-motion` (already installed, `^12.6.3`) — used for all existing animations; the theme showcase reuses the same `fadeInUp` / `staggerContainer` variants.
- `lucide-react` (already installed, `^0.469.0`) — used for the day/night toggle icons (`Sun`, `Moon`) and any new icons.
- `next` (already installed, `15.2.3`) — the `/colors` route is a standard App Router page.
- `tailwindcss` (already installed, `^3.4.17`) — dark mode via `darkMode: ["class"]` is already configured; no plugin changes needed.
- `class-variance-authority` (already installed) — used by `button.tsx`; variants updated in place.

No `npm install` is required. All work uses existing dependencies.

## [Testing]

Manual visual verification is the primary validation strategy, since this is a design/theming task.

1. **Phase 1 verification:** Run `npm run dev` in `frontend/`, open `http://localhost:3000/colors`, and verify:
   - All three palettes render with correct colors (Coral, Navy, Teal).
   - Day/night toggle inverts each palette correctly (same 3 colors, inverted roles).
   - Every homepage component (hero, stats, process, portfolio, testimonials, pricing, FAQ, CTA) renders in each theme.
   - Curved edges (`rounded-xl`/`rounded-2xl`) are applied to cards, buttons, and images.
   - No console errors.
2. **Phase 2 verification:** After palette selection, verify:
   - `http://localhost:3000/` renders identically to the selected theme showcase.
   - Day/night toggle in the navbar works on all pages and persists across reloads (localStorage).
   - Navigation, footer, and buttons use the new tokens.
   - Other pages (`/services`, `/pricing`, `/faq`, `/demo`, `/auth/*`) still render correctly with the new tokens.
3. **Build check:** Run `npm run build` in `frontend/` to confirm no TypeScript or Next.js build errors after the refactor.

## [Implementation Order]

Implement in two phases, with the palette selection gate between them.

1. **Phase 1 — Theme showcase:**
   1. Create `frontend/src/lib/themes.ts` with the three palette definitions.
   2. Create `frontend/src/lib/theme-context.tsx` with `ThemeProvider` / `useTheme` (day/night mode).
   3. Create `frontend/src/components/theme/theme-preview-card.tsx`, `theme-switcher.tsx`, and `theme-showcase.tsx`.
   4. Create `frontend/src/app/colors/page.tsx` rendering all three themes with day/night toggles.
   5. Run `npm run dev` and verify the showcase renders all palettes correctly.
   6. **User selects a palette** (Coral, Navy, or Teal) from the live page.
2. **Phase 2 — Apply winning palette + refactor:**
   7. Update `frontend/tailwind.config.ts` with the winning palette tokens + dark variants + curved radius.
   8. Update `frontend/src/app/globals.css` with the winning palette and `.dark` overrides.
   9. Update `frontend/src/lib/palette.ts` to match.
   10. Create `frontend/src/lib/site-data.ts` and move the data arrays out of `page.tsx`.
   11. Create `frontend/src/components/sections/*` — extract all nine sections + `SectionLabel` with tokenized colors and curved edges.
   12. Rewrite `frontend/src/app/page.tsx` to import the section components.
   13. Update `frontend/src/components/ui/button.tsx` with new token variants and curved radius.
   14. Update `frontend/src/components/navigation.tsx` (tokens + `ThemeToggle`) and `frontend/src/components/footer.tsx` (tokens).
   15. Create `frontend/src/components/theme-toggle.tsx` and wrap the app in `ThemeProvider` in `frontend/src/app/layout.tsx`.
   16. Run `npm run build` and verify all pages render correctly in both day and night modes.