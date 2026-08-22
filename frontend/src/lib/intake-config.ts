// BuildItToday.ai — FULL Design Studio intake configuration
// 4 Layers: Global Tokens / Shadcn Primitives / Page Sections / Export

import type { ThemeId } from "./themes";
import { themes, themeList } from "./themes";

// ============ Layer 1: Global Tokens ============
export type ModeChoice = "light" | "dark" | "system";
export type DarkCanvasId = "midnight" | "charcoal" | "graphite" | "pine" | "plum" | "umber";
export type RadiusChoice = "0px" | "6px" | "12px" | "24px";
export type FontChoice = "editorial" | "modern" | "display" | "friendly" | "technical" | "mono";
export type HeadingWeightChoice = "light" | "regular" | "semibold" | "bold";
export type HeadingStyleChoice = "normal" | "italic";
export type BodyWeightChoice = "regular" | "medium";
export type LetterSpacingChoice = "tight" | "normal" | "wide";
export type HeadingCaseChoice = "normal" | "uppercase";
export type BorderChoice = "thin" | "standard" | "borderless";
export type ShadowChoice = "flat" | "subtle" | "medium" | "heavy";

export interface DarkCanvasDef {
  id: DarkCanvasId;
  label: string;
  description: string;
  bg: string; // main dark background surface
  card: string; // card / elevated dark surface
  fg: string; // foreground text on dark
  border: string; // borders on dark
}

export const darkCanvasOptions: DarkCanvasDef[] = [
  { id: "midnight", label: "Midnight Slate", description: "Cool deep navy — SaaS, tech, consultants.", bg: "#0F172A", card: "#1E293B", fg: "#F1F5F9", border: "#334155" },
  { id: "charcoal", label: "Charcoal", description: "Neutral dark — flexible across every palette.", bg: "#111827", card: "#1F2937", fg: "#F9FAFB", border: "#374151" },
  { id: "graphite", label: "Graphite Noir", description: "Hyper-dark premium black — luxury, boutiques.", bg: "#09090B", card: "#18181B", fg: "#FAFAFA", border: "#27272A" },
  { id: "pine", label: "Deep Pine", description: "Dark evergreen — food, health & wellness.", bg: "#0F3A36", card: "#173F3B", fg: "#ECFDF5", border: "#2F5A55" },
  { id: "plum", label: "Plum Noir", description: "Dark violet — creative studios, modern brands.", bg: "#1E1B4B", card: "#2E2A6B", fg: "#EEF2FF", border: "#4C4A8F" },
  { id: "umber", label: "Warm Umber", description: "Warm near-black — hospitality, warm services.", bg: "#1C1917", card: "#292524", fg: "#FAFAF9", border: "#44403C" },
];

export const modeOptions: { value: ModeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export const radiusOptions: { value: RadiusChoice; label: string }[] = [
  { value: "0px", label: "Sharp (0px)" },
  { value: "6px", label: "Subtle (6px)" },
  { value: "12px", label: "Curved (12px)" },
  { value: "24px", label: "Pill (24px)" },
];

export const fontOptions: { value: FontChoice; label: string; description: string }[] = [
  { value: "editorial", label: "Editorial Serif", description: "Instrument Serif + Inter — elegant, editorial, trustworthy." },
  { value: "modern", label: "Modern Sans", description: "Inter + Inter — clean, minimal, classic SaaS." },
  { value: "display", label: "Premium Display", description: "Playfair Display + Source Sans 3 — luxury, high-end." },
  { value: "friendly", label: "Friendly Rounded", description: "Poppins + Inter — warm, approachable, local services." },
  { value: "technical", label: "Modern Tech", description: "Space Grotesk + Inter — contemporary, tech-forward." },
  { value: "mono", label: "Monospace Tech", description: "JetBrains Mono + Inter — developer, technical, precise." },
];

export const borderOptions: { value: BorderChoice; label: string }[] = [
  { value: "thin", label: "Thin 1px" },
  { value: "standard", label: "Standard 1px" },
  { value: "borderless", label: "Borderless" },
];

export const shadowOptions: { value: ShadowChoice; label: string }[] = [
  { value: "flat", label: "Flat / No Shadow" },
  { value: "subtle", label: "Subtle Float" },
  { value: "medium", label: "Medium Depth" },
  { value: "heavy", label: "Heavy Floating" },
];

// ==================== Layer 2: Shadcn Primitive Groups ====================

export type PrimitiveGroupKey =
  | "buttons"
  | "inputs"
  | "display"
  | "feedback"
  | "navigation"
  | "overlays"
  | "data";

export interface PrimitiveGroup {
  key: PrimitiveGroupKey;
  title: string;
  options: { value: string; label: string }[];
}

export const primitiveGroups: PrimitiveGroup[] = [
  {
    key: "buttons",
    title: "Actions & Buttons",
    options: [
      { value: "primary", label: "Primary Button" },
      { value: "secondary", label: "Secondary Button" },
      { value: "outline", label: "Outline Button" },
      { value: "ghost", label: "Ghost Button" },
      { value: "destructive", label: "Destructive Button" },
      { value: "link", label: "Link Button" },
      { value: "icon", label: "Icon Button" },
    ],
  },
  {
    key: "inputs",
    title: "Form Inputs & Controls",
    options: [
      { value: "text", label: "Text Input" },
      { value: "textarea", label: "Textarea" },
      { value: "select", label: "Select Dropdown" },
      { value: "combobox", label: "Combobox / Autocomplete" },
      { value: "checkbox", label: "Checkbox" },
      { value: "radio", label: "Radio Group" },
      { value: "switch", label: "Switch Toggle" },
      { value: "slider", label: "Slider" },
      { value: "otp", label: "OTP / Pin Code" },
      { value: "date", label: "Date Picker" },
    ],
  },
  {
    key: "display",
    title: "Data Display & Typography",
    options: [
      { value: "badges", label: "Badges / Tags" },
      { value: "avatar", label: "Avatar" },
      { value: "card", label: "Card" },
      { value: "metric", label: "Metric Stat Card" },
      { value: "tooltip", label: "Tooltip" },
      { value: "popover", label: "Hover Card" },
      { value: "separator", label: "Separator" },
      { value: "kbd", label: "Kbd Badge" },
    ],
  },
  {
    key: "feedback",
    title: "Feedback & Status",
    options: [
      { value: "alerts", label: "Alerts" },
      { value: "toast", label: "Toast Notif" },
      { value: "skeleton", label: "Skeleton" },
      { value: "progress", label: "Progress Bar" },
      { value: "spinner", label: "Spinner" },
    ],
  },
  {
    key: "navigation",
    title: "Navigation & Structure",
    options: [
      { value: "tabs", label: "Tabs" },
      { value: "accordion", label: "Accordion" },
      { value: "dropdown", label: "Dropdown Menu" },
      { value: "breadcrumbs", label: "Breadcrumbs" },
      { value: "pagination", label: "Pagination" },
      { value: "command", label: "Command Palette" },
    ],
  },
  {
    key: "overlays",
    title: "Overlays & Dialogs",
    options: [
      { value: "dialog", label: "Modal Dialog" },
      { value: "alertdialog", label: "Alert Dialog" },
      { value: "sheet", label: "Sheet / Slide-over" },
      { value: "drawer", label: "Bottom Drawer" },
    ],
  },
  {
    key: "data",
    title: "Tables & Data Display",
    options: [
      { value: "table", label: "Data Table" },
      { value: "cards", label: "Card Grid" },
      { value: "scroll", label: "Scroll Area" },
    ],
  },
];

// ==================== Layer 2b: Business Choices (multi-select) ====================

export interface MultiSelectOption {
  value: string;
  label: string;
  desc: string;
}

export const formOptions: MultiSelectOption[] = [
  { value: "contact", label: "Contact Form", desc: "A simple way for visitors to reach you" },
  { value: "booking", label: "Booking / Appointment", desc: "Let clients book time with you" },
  { value: "quote", label: "Quote Request", desc: "Visitors request a custom quote" },
  { value: "newsletter", label: "Newsletter Signup", desc: "Collect emails for updates" },
  { value: "payment", label: "Payment / Checkout", desc: "Collect payments online" },
  { value: "multistep", label: "Multi-step Lead Form", desc: "A guided, multi-step form" },
];

export const contentSectionOptions: MultiSelectOption[] = [
  { value: "testimonials", label: "Testimonials and Reviews", desc: "Social proof from happy clients" },
  { value: "faq", label: "FAQ", desc: "Answer common questions" },
  { value: "team", label: "Team / About", desc: "Introduce the people behind the brand" },
  { value: "pricing", label: "Pricing / Plans", desc: "Show your packages and rates" },
  { value: "blog", label: "Blog / News", desc: "Share articles and updates" },
  { value: "stats", label: "Stats and Metrics", desc: "Highlight key numbers" },
];

// ==================== Layer 3: Page Sections ====================
export type SectionKey =
  | "header" | "hero" | "logos" | "features" | "process" | "stats"
  | "testimonials" | "pricing" | "faq" | "team" | "cta" | "footer";

export interface SectionDef {
  key: SectionKey;
  title: string;
  options: { value: string; label: string }[];
  defaultOption: string;
}

export const sectionDefs: SectionDef[] = [
  {
    key: "header", title: "Header / Navigation",
    options: [
      { value: "sticky", label: "Sticky Minimal Nav" },
      { value: "floating", label: "Floating Pill Nav" },
      { value: "centered", label: "Centered Split Nav" },
      { value: "sidebar", label: "Top + Sidebar Nav" },
      { value: "topbar", label: "Top Bar + Nav" },
      { value: "transparent", label: "Transparent Over Hero" },
    ],
    defaultOption: "sticky",
  },
  {
    key: "hero", title: "Hero Section",
    options: [
      { value: "left", label: "Left Form Hero" },
      { value: "center", label: "Centered Minimal" },
      { value: "split", label: "Split Image Hero" },
      { value: "badge", label: "Top Badge Hero" },
      { value: "video", label: "Media Canvas Hero" },
      { value: "minimal", label: "Minimal Hero" },
    ],
    defaultOption: "left",
  },
  {
    key: "logos", title: "Logo Cloud / Trust",
    options: [
      { value: "wall", label: "Client Logo Wall" },
      { value: "marquee", label: "Animated Marquee" },
      { value: "grid", label: "Static Grid" },
      { value: "quote", label: "Quote + Logo" },
    ],
    defaultOption: "wall",
  },
  {
    key: "features", title: "Features & Value Props",
    options: [
      { value: "3col", label: "3-Column Cards" },
      { value: "4col", label: "4-Column Icons" },
      { value: "bento", label: "Bento Grid" },
      { value: "rows", label: "Alternating Rows" },
      { value: "hover", label: "Hover Cards" },
      { value: "list", label: "Minimal List" },
    ],
    defaultOption: "3col",
  },
  {
    key: "process", title: "How It Works / Process",
    options: [
      { value: "timeline", label: "Numbered Timeline" },
      { value: "cards", label: "Horizontal Cards" },
      { value: "tabs", label: "Tabbed Wizard" },
      { value: "flow", label: "Icon Flow Grid" },
    ],
    defaultOption: "timeline",
  },
  {
    key: "stats", title: "Stats & Metrics",
    options: [
      { value: "row", label: "Stat Row" },
      { value: "cards", label: "Stat Cards" },
      { value: "dark", label: "Dark Band Stats" },
      { value: "inline", label: "Inline Metrics" },
    ],
    defaultOption: "cards",
  },
  {
    key: "testimonials", title: "Testimonials & Social Proof",
    options: [
      { value: "quote", label: "Quote Cards" },
      { value: "stars", label: "Star Rating Grid" },
      { value: "carousel", label: "Carousel" },
      { value: "video", label: "Video Testimonial" },
    ],
    defaultOption: "quote",
  },
  {
    key: "pricing", title: "Pricing & Plans",
    options: [
      { value: "3tier", label: "3-Tier Cards" },
      { value: "toggle", label: "Monthly/Annual Toggle" },
      { value: "matrix", label: "Feature Matrix Table" },
      { value: "single", label: "Single Offer Box" },
    ],
    defaultOption: "3tier",
  },
  {
    key: "faq", title: "FAQ / Help Section",
    options: [
      { value: "accordion", label: "Accordion List" },
      { value: "2col", label: "2-Column Cards" },
      { value: "tabs", label: "Category Tabs" },
      { value: "search", label: "Searchable FAQ" },
      { value: "support", label: "Support Split" },
      { value: "grid", label: "Help Center Grid" },
    ],
    defaultOption: "accordion",
  },
  {
    key: "team", title: "Team & About",
    options: [
      { value: "grid", label: "Team Grid" },
      { value: "story", label: "Story + Photo" },
      { value: "values", label: "Values Cards" },
      { value: "founder", label: "Founder Spotlight" },
    ],
    defaultOption: "grid",
  },
  {
    key: "cta", title: "CTA & Lead Capture",
    options: [
      { value: "dark", label: "Dark Solid Card" },
      { value: "light", label: "Light Subdued Box" },
      { value: "form", label: "Inline Form CTA" },
      { value: "split", label: "Split Image CTA" },
    ],
    defaultOption: "dark",
  },
  {
    key: "footer", title: "Footer & Links",
    options: [
      { value: "columns", label: "Multi-Column Footer" },
      { value: "minimal", label: "Minimal Footer" },
      { value: "cta", label: "Footer + CTA" },
      { value: "newsletter", label: "Newsletter Footer" },
    ],
    defaultOption: "columns",
  },
];

// ==================== Layer 4: DesignSpec State ====================
export interface DesignSpec {
  // Layer 1
  colorTheme: ThemeId;
  mode: ModeChoice;
  darkCanvas: DarkCanvasId;
  radius: RadiusChoice;
  font: FontChoice;
  headingWeight: HeadingWeightChoice;
  headingStyle: HeadingStyleChoice;
  bodyWeight: BodyWeightChoice;
  letterSpacing: LetterSpacingChoice;
  headingCase: HeadingCaseChoice;
  border: BorderChoice;
  shadow: ShadowChoice;
  // Layer 2 (one selected style per primitive group)
  buttonStyle: string;
  inputStyle: string;
  displayStyle: string;
  feedbackStyle: string;
  navStyle: string;
  overlayStyle: string;
  dataStyle: string;
  // Layer 2b (multi-select business choices)
  forms: string[];
  contentSections: string[];
  // Layer 3 (one variant per section)
  sections: Record<SectionKey, string>;
}

export const defaultSpec: DesignSpec = {
  colorTheme: "coral",
  mode: "light",
  darkCanvas: "midnight",
  radius: "12px",
  font: "editorial",
  headingWeight: "regular",
  headingStyle: "normal",
  bodyWeight: "regular",
  letterSpacing: "normal",
  headingCase: "normal",
  border: "standard",
  shadow: "subtle",
  buttonStyle: "primary",
  displayStyle: "card",
  feedbackStyle: "toast",
  navStyle: "tabs",
  overlayStyle: "dialog",
  dataStyle: "table",
  inputStyle: "text",
  forms: ["contact"],
  contentSections: ["testimonials", "faq"],
  sections: Object.fromEntries(sectionDefs.map((s) => [s.key, s.defaultOption])) as Record<SectionKey, string>,
};

export const colorThemeOptions = themeList.map((t) => ({
  value: t.id,
  name: t.name,
  description: t.description,
  swatches: [t.colors.primary, t.colors.dark, t.colors.light],
}));

export function resolveColors(spec: DesignSpec) {
  return themes[spec.colorTheme].colors;
}

export function resolveDarkCanvas(spec: DesignSpec) {
  return darkCanvasOptions.find((d) => d.id === spec.darkCanvas) ?? darkCanvasOptions[0];
}

// Radius rem mapping (shadcn uses rem)
export const radiusRem: Record<RadiusChoice, string> = {
  "0px": "0rem",
  "6px": "0.375rem",
  "12px": "0.75rem",
  "24px": "1.5rem",
};

export const fontStack: Record<FontChoice, { heading: string; body: string }> = {
  editorial: { heading: "'Instrument Serif', serif", body: "'Inter', sans-serif" },
  modern: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
  display: { heading: "'Playfair Display', serif", body: "'Source Sans 3', sans-serif" },
  friendly: { heading: "'Poppins', sans-serif", body: "'Inter', sans-serif" },
  technical: { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" },
  mono: { heading: "'JetBrains Mono', monospace", body: "'Inter', sans-serif" },
};

export const headingWeightOptions: { value: HeadingWeightChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "regular", label: "Regular" },
  { value: "semibold", label: "Semibold" },
  { value: "bold", label: "Bold" },
];

export const headingStyleOptions: { value: HeadingStyleChoice; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "italic", label: "Italic" },
];

export const bodyWeightOptions: { value: BodyWeightChoice; label: string }[] = [
  { value: "regular", label: "Regular" },
  { value: "medium", label: "Medium" },
];

export const letterSpacingOptions: { value: LetterSpacingChoice; label: string }[] = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
];

export const headingCaseOptions: { value: HeadingCaseChoice; label: string }[] = [
  { value: "normal", label: "Normal Case" },
  { value: "uppercase", label: "UPPERCASE" },
];

export interface ResolvedType {
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  headingStyle: string;
  bodyWeight: number;
  letterSpacing: string;
  headingCase: string;
}

export function resolveType(spec: DesignSpec): ResolvedType {
  const stack = fontStack[spec.font];
  const weightMap: Record<HeadingWeightChoice, number> = { light: 300, regular: 400, semibold: 600, bold: 700 };
  const bodyWeightMap: Record<BodyWeightChoice, number> = { regular: 400, medium: 500 };
  const spacingMap: Record<LetterSpacingChoice, string> = { tight: "-0.02em", normal: "0em", wide: "0.08em" };
  return {
    headingFont: stack.heading,
    bodyFont: stack.body,
    headingWeight: weightMap[spec.headingWeight],
    headingStyle: spec.headingStyle,
    bodyWeight: bodyWeightMap[spec.bodyWeight],
    letterSpacing: spacingMap[spec.letterSpacing],
    headingCase: spec.headingCase === "uppercase" ? "uppercase" : "none",
  };
}

export const shadowMap: Record<ShadowChoice, string> = {
  flat: "none",
  subtle: "0 4px 12px rgba(0,0,0,0.06)",
  medium: "0 10px 30px rgba(0,0,0,0.1)",
  heavy: "0 24px 60px rgba(0,0,0,0.18)",
};

export const borderWidth: Record<BorderChoice, string> = {
  thin: "1px",
  standard: "1px",
  borderless: "0px",
};

// ==================== Wizard Step Definitions ====================
export interface WizardOption {
  value: string;
  label: string;
  desc?: string;
  swatch?: string[];
}

export interface WizardGroup {
  field: string; // "colorTheme" | "sections.hero" ...
  label: string;
  options: WizardOption[];
  cols?: number;
}

export interface WizardStep {
  id: string;
  layer: string;
  layerLabel: string;
  title: string;
  subtitle: string;
  groups: WizardGroup[];
}

const sGroup = (key: SectionKey, cols = 3): WizardGroup => {
  const def = sectionDefs.find((s) => s.key === key);
  return {
    field: `sections.${key}`,
    label: def?.title ?? key,
    cols,
    options: (def?.options ?? []).map((o) => ({ value: o.value, label: o.label })),
  };
};

export const wizardSteps: WizardStep[] = [
  {
    id: "color-theme",
    layer: "1a",
    layerLabel: "Layer 1 — Global Tokens",
    title: "Choose Your Color Theme",
    subtitle: "Pick the palette that defines your brand. 3 colors per theme, applied end-to-end.",
    groups: [
      {
        field: "colorTheme",
        label: "6 Color Themes",
        cols: 3,
        options: colorThemeOptions.map((o) => ({
          value: o.value,
          label: o.name,
          desc: o.description,
          swatch: o.swatches,
        })),
      },
    ],
  },
  {
    id: "mode",
    layer: "1b",
    layerLabel: "Layer 1 — Global Tokens",
    title: "Theme Mode",
    subtitle: "Day, Night, or follow your visitor's system preference.",
    groups: [
      {
        field: "mode",
        label: "Light / Dark / System",
        cols: 3,
        options: modeOptions.map((o) => ({ value: o.value, label: o.label })),
      },
    ],
  },
  {
    id: "radius",
    layer: "1c",
    layerLabel: "Layer 1 — Global Tokens",
    title: "Corner & Border Radius",
    subtitle: "Controls every button, card, input, and dialog radius.",
    groups: [
      {
        field: "radius",
        label: "Border Radius",
        cols: 4,
        options: radiusOptions.map((o) => ({ value: o.value, label: o.label })),
      },
    ],
  },
  {
    id: "typography",
    layer: "1d",
    layerLabel: "Layer 1 — Global Tokens",
    title: "Typography Pairings",
    subtitle: "Choose the personality of your headlines and body text.",
    groups: [
      {
        field: "font",
        label: "6 Type Pairings",
        cols: 2,
        options: fontOptions.map((o) => ({ value: o.value, label: o.label, desc: o.description })),
      },
    ],
  },
  {
    id: "border-shadow",
    layer: "1e",
    layerLabel: "Layer 1 — Global Tokens",
    title: "Borders & Elevation",
    subtitle: "Borders define structure. Shadows define depth.",
    groups: [
      {
        field: "border",
        label: "Border Style",
        cols: 3,
        options: borderOptions.map((o) => ({ value: o.value, label: o.label })),
      },
      {
        field: "shadow",
        label: "Shadow & Elevation",
        cols: 4,
        options: shadowOptions.map((o) => ({ value: o.value, label: o.label })),
      },
    ],
  },
  {
    id: "buttons",
    layer: "2a",
    layerLabel: "Layer 2 — Shadcn Primitives",
    title: "Actions & Buttons",
    subtitle: "Pick the button style used for your primary and secondary calls-to-action.",
    groups: [
      {
        field: "buttonStyle",
        label: "Button Variants",
        cols: 2,
        options: primitiveGroups.find((g) => g.key === "buttons")?.options.map((o) => ({ value: o.value, label: o.label })) ?? [],
      },
    ],
  },
  {
    id: "inputs",
    layer: "2b",
    layerLabel: "Layer 2 — Shadcn Primitives",
    title: "Form Inputs & Controls",
    subtitle: "Choose how contact forms, quotes, and bookings collect info.",
    groups: [
      {
        field: "inputStyle",
        label: "Input Styles",
        cols: 2,
        options: primitiveGroups.find((g) => g.key === "inputs")?.options.map((o) => ({ value: o.value, label: o.label })) ?? [],
      },
    ],
  },
  {
    id: "display-feedback",
    layer: "2c",
    layerLabel: "Layer 2 — Shadcn Primitives",
    title: "Display & Feedback",
    subtitle: "Badges, cards, metrics, alerts, toasts — how info surfaces.",
    groups: [
      {
        field: "displayStyle",
        label: "Data Display",
        cols: 2,
        options: primitiveGroups.find((g) => g.key === "display")?.options.map((o) => ({ value: o.value, label: o.label })) ?? [],
      },
      {
        field: "feedbackStyle",
        label: "Feedback & Status",
        cols: 2,
        options: primitiveGroups.find((g) => g.key === "feedback")?.options.map((o) => ({ value: o.value, label: o.label })) ?? [],
      },
    ],
  },
  {
    id: "nav-overlays",
    layer: "2d",
    layerLabel: "Layer 2 — Shadcn Primitives",
    title: "Navigation & Overlays",
    subtitle: "Tabs, accordions, menus, dialogs, drawers for the whole site.",
    groups: [
      {
        field: "navStyle",
        label: "Navigation",
        cols: 2,
        options: primitiveGroups.find((g) => g.key === "navigation")?.options.map((o) => ({ value: o.value, label: o.label })) ?? [],
      },
      {
        field: "overlayStyle",
        label: "Overlays & Dialogs",
        cols: 2,
        options: primitiveGroups.find((g) => g.key === "overlays")?.options.map((o) => ({ value: o.value, label: o.label })) ?? [],
      },
    ],
  },
  {
    id: "data",
    layer: "2e",
    layerLabel: "Layer 2 — Shadcn Primitives",
    title: "Tables & Data Display",
    subtitle: "How pricing tables, portfolios, and stats are structured.",
    groups: [
      {
        field: "dataStyle",
        label: "Data Tables & Lists",
        cols: 3,
        options: primitiveGroups.find((g) => g.key === "data")?.options.map((o) => ({ value: o.value, label: o.label })) ?? [],
      },
    ],
  },
  {
    id: "header-hero",
    layer: "3a",
    layerLabel: "Layer 3 — Page Sections",
    title: "Header & Hero",
    subtitle: "The very top of your site. First impression + primary CTA.",
    groups: [sGroup("header", 2), sGroup("hero", 3)],
  },
  {
    id: "logos-features",
    layer: "3b",
    layerLabel: "Layer 3 — Page Sections",
    title: "Trust & Features",
    subtitle: "Logo cloud / social proof and feature value props.",
    groups: [sGroup("logos", 2), sGroup("features", 3)],
  },
  {
    id: "process-stats",
    layer: "3c",
    layerLabel: "Layer 3 — Page Sections",
    title: "Process & Stats",
    subtitle: "How It Works timeline and metrics band.",
    groups: [sGroup("process", 4), sGroup("stats", 2)],
  },
  {
    id: "trust-pricing",
    layer: "3d",
    layerLabel: "Layer 3 — Page Sections",
    title: "Social Proof & Pricing",
    subtitle: "Testimonials and pricing/plans table.",
    groups: [sGroup("testimonials", 2), sGroup("pricing", 2)],
  },
  {
    id: "faq-team",
    layer: "3e",
    layerLabel: "Layer 3 — Page Sections",
    title: "FAQ & Team",
    subtitle: "Common questions and your about / team section.",
    groups: [sGroup("faq", 2), sGroup("team", 2)],
  },
  {
    id: "cta-footer",
    layer: "3f",
    layerLabel: "Layer 3 — Page Sections",
    title: "CTA & Footer",
    subtitle: "Lead capture call-to-action + the footer.",
    groups: [sGroup("cta", 2), sGroup("footer", 2)],
  },
  {
    id: "review",
    layer: "4",
    layerLabel: "Layer 4 — Export & Hand-off",
    title: "Review & Export Your Spec",
    subtitle: "Everything is captured. Download your design hand-off doc.",
    groups: [],
  },
];
