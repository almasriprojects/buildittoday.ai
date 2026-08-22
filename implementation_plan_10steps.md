# Implementation Plan — 10-Step Process + Scroll Motion

## [Overview]

Add a prominent "How We Build Your Website" section to the homepage showing a 10-step process (mirroring the professional agency layout of redriverwebdesign.com), and ensure every section of the main page animates in on scroll using framer-motion's `whileInView`.

## [Types]

```ts
export interface ProcessStep {
  num: string;      // "01" ... "10"
  title: string;    // step name
  desc: string;     // short description
  icon: string;     // lucide icon name
}
```

## [Files]

### New files
| Path | Purpose |
|------|---------|
| `frontend/src/components/sections/process-10-steps.tsx` | The 10-step process section component with scroll animations. |
| `frontend/src/lib/process-steps.ts` | The 10-step data array. |

### Modified files
| Path | Changes |
|------|---------|
| `frontend/src/app/page.tsx` | Import and render `Process10Steps` after the existing `ProcessSection`. |
| `frontend/src/components/theme/theme-showcase.tsx` | Add the 10-step section to the showcase. |

## [Functions]

- `Process10Steps` — renders a numbered 10-step grid with scroll-triggered stagger animation.
- `processSteps10` — data array of 10 steps.

## [Implementation Order]

1. Create `process-steps.ts` data.
2. Create `Process10Steps` component with scroll motion.
3. Wire into `page.tsx` and `theme-showcase.tsx`.
4. Verify build + render.