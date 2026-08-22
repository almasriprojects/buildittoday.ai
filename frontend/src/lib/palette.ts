// BuildItToday.ai — Design System Color Palette
// EXACT colors from user specification

export const palette = {
  // === SURFACE COLORS ===
  bg: {
    page: '#F9F5F0',        // Warm Linen / Off-White (main background)
    cardLight: '#F3EEE6',   // Cream White (light card surface)
    cardDark: '#1C1917',    // Dark Charcoal (dark card surface)
    white: '#FFFFFF',       // Pure white
  },

  // === ACCENT ===
  accent: {
    primary: '#E87053',     // Coral Terracotta (CTA buttons, eyebrows)
    primaryHover: '#D4604A', // Darker on hover
    primaryLight: '#F0A892', // Lighter for backgrounds
    primaryMuted: 'rgba(232, 112, 83, 0.1)', // Very light
  },

  // === TEXT ===
  text: {
    primary: '#1B1918',     // Soft Obsidian (headings on light)
    secondary: '#5C554E',   // Warm Slate (body text on light)
    muted: '#8A8480',       // Medium gray
    light: '#A8A29E',       // Light gray
    onDark: '#F3EEE6',      // Off-White (text on dark cards)
    onDarkWhite: '#FFFFFF', // Pure white (headings on dark)
    onDarkMuted: '#A8A29E', // Muted on dark
  },

  // === BORDERS ===
  border: {
    subtle: '#E8E2D8',      // Muted Sand Line (light card borders)
    light: '#D6D3D1',
    medium: '#C8C4BE',
    dark: '#57534E',
    onDark: '#44403C',
  },

  // === STATUS ===
  status: {
    success: '#6B8E6B',
    successText: '#4A7C4A',
    warning: '#D4A574',
    error: '#C0564A',
  },

  // === BADGES ===
  badge: {
    dark: '#1C1917',
    accent: '#E87053',
  },

  // === ELEVATION ===
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
} as const;

// === TYPOGRAPHY ===
export const typography = {
  fonts: {
    serif: "'Fraunces', 'Playfair Display', Georgia, serif",
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  sizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
    '8xl': '5.5rem',
  },
  tracking: {
    tight: '-0.04em',
    normal: '0em',
    wide: '0.05em',
    wider: '0.1em',
    wideest: '0.2em',
  },
  leading: {
    tight: '1.1',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },
} as const;

// === SPACING ===
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  base: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
  '5xl': '8rem',
} as const;

// === BORDER RADIUS ===
export const radius = {
  none: '0',
  sm: '0.25rem',
  base: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const;

// === TRANSITIONS ===
export const transitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '400ms ease',
  slower: '600ms ease',
  spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// === EASING ===
export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  elastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;