# Implementation Plan — Professional Main Page Structure

## [Overview]

Rebuild the homepage as a professional, component-driven page that mirrors the Red River Web Design structure: a 10-craft interactive showcase (Design, Layout, Imagery, 3D Animation, Content, Motion, Performance, Conversion, Build, Speed to Lead), Build Packages, Traffic, Automations, How We Work, About, and Contact — with every section as a separate component in a `main` folder, imported cleanly into `page.tsx`.

The current `frontend/src/app/page.tsx` is a monolith with inline sections. This plan extracts every section into `frontend/src/components/main/` so `page.tsx` becomes a clean composition of imports. Each section is a self-contained, theme-aware component with scroll-triggered motion.

## [Types]

```ts
// frontend/src/lib/site-data.ts
export interface Craft {
  num: string;        // "01" ... "10"
  title: string;      // Design, Layout, Imagery, ...
  tagline: string;    // short hook
  copy: string;       // description
  demo: CraftDemo;    // which interactive demo to render
}

export type CraftDemo =
  | "design"      // color palette picker + typography
  | "layout"      // responsive layout flipper
  | "imagery"     // image treatment switcher
  | "3d"          // rotating cube
  | "content"     // headline/body copy demo
  | "motion"      // scroll-motion preview
  | "performance" // load-time slider
  | "conversion"  // CTA hierarchy demo
  | "build"       // code/HTTPS checklist
  | "speed"       // speed-to-lead timer

export interface Package {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

export interface TrafficLayer {
  title: string;      // SEO, AEO, Analytics, CRO
  tool: string;       // Ahrefs, PostHog
  headline: string;
  copy: string;
  why: string;
}

export interface AutomationModule {
  num: string;        // "01" ... "08"
  title: string;
  desc: string;
}
```

## [Files]

### New folder: `frontend/src/components/main/`

| Path | Purpose |
|------|---------|
| `frontend/src/components/main/crafts-showcase.tsx` | The 10-craft interactive showcase (Design → Speed to Lead). Each craft is a clickable card with a live interactive demo. |
| `frontend/src/components/main/craft-demos.tsx` | The 10 interactive demo renderers (palette picker, layout flipper, 3D cube, load-time slider, etc.). |
| `frontend/src/components/main/packages-section.tsx` | Build Packages — Custom Website ($5,000) + Full Stack Web App ($20,000). |
| `frontend/src/components/main/traffic-section.tsx` | Traffic — $2,000/mo with SEO, AEO, Analytics, CRO layers. |
| `frontend/src/components/main/automations-section.tsx` | Automations — $2,500 with 8 modules. |
| `frontend/src/components/main/how-we-work.tsx` | How We Work — 4-step process. |
| `frontend/src/components/main/about-section.tsx` | About — founder story + values. |
| `frontend/src/components/main/contact-section.tsx` | Contact — booking call section. |
| `frontend/src/components/main/index.ts` | Barrel export for all main sections. |

### New data file

| Path | Purpose |
|------|---------|
| `frontend/src/lib/site-data.ts` | All data arrays: `crafts`, `packages`, `trafficLayers`, `automationModules`, `howWeWork`, `values`. |

### Modified files

| Path | Changes |
|------|---------|
| `frontend/src/app/page.tsx` | Replace all inline sections with imports from `@/components/main`. Becomes a clean composition. |
| `frontend/src/components/theme/theme-showcase.tsx` | Import the new main sections so the `/colors` studio shows them too. |

## [Functions]

### New components (in `frontend/src/components/main/`)

| Component | Purpose |
|-----------|---------|
| `CraftsShowcase` | Renders the 10-craft grid + active craft detail with live demo. |
| `CraftDemos` | Renders the active craft's interactive demo (palette, layout, 3D, etc.). |
| `PackagesSection` | Two pricing cards (Custom Website, Full Stack Web App). |
| `TrafficSection` | $2,000/mo with 4 layers (SEO, AEO, Analytics, CRO). |
| `AutomationsSection` | $2,500 with 8 modules grid. |
| `HowWeWork` | 4-step process. |
| `AboutSection` | Founder story + 4 values. |
| `ContactSection` | Booking call CTA. |

### Modified

| Function | File | Changes |
|----------|------|---------|
| `Home` (default export) | `frontend/src/app/page.tsx` | Import and compose all main sections. |

## [Classes]

No new classes. All components are functional React components using hooks and framer-motion. Theme-aware via optional `colors` prop (same pattern as `InteractiveProcess`).

## [Dependencies]

No new dependencies. Uses existing `framer-motion`, `lucide-react`, `next`, `tailwindcss`.

## [Testing]

1. `npx tsc --noEmit` — no type errors.
2. `npm run dev` — verify homepage renders all sections.
3. Verify `/colors` studio renders the new sections in all palettes + day/night.
4. Verify scroll animations trigger on each section.

## [Implementation Order]

1. Create `frontend/src/lib/site-data.ts` with all data arrays.
2. Create `frontend/src/components/main/craft-demos.tsx` (10 interactive demos).
3. Create `frontend/src/components/main/crafts-showcase.tsx`.
4. Create `packages-section.tsx`, `traffic-section.tsx`, `automations-section.tsx`.
5. Create `how-we-work.tsx`, `about-section.tsx`, `contact-section.tsx`.
6. Create `frontend/src/components/main/index.ts` barrel export.
7. Rewrite `frontend/src/app/page.tsx` to compose all sections.
8. Update `theme-showcase.tsx` to include new sections.
9. Verify build + render.