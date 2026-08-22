"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DesignSpec } from "@/lib/intake-config";
import {
  defaultSpec,
  colorThemeOptions,
  radiusOptions,
  fontOptions,
  borderOptions,
  shadowOptions,
  sectionDefs,
  resolveColors,
  resolveDarkCanvas,
  darkCanvasOptions,
  fontStack,
  headingWeightOptions,
  headingStyleOptions,
  bodyWeightOptions,
  letterSpacingOptions,
  headingCaseOptions,
  formOptions,
  contentSectionOptions,
} from "@/lib/intake-config";
import { buildCssVars, buildTailwind, buildMarkdownDoc, buildJsonDoc } from "@/lib/design-export";
import { ComponentShowcase } from "./component-showcase";
import { PageAssembly } from "./page-assembly";
import { useTheme } from "@/lib/theme-context";

type Group = { field: string; label: string; cols?: number; options: { value: string; label: string; desc?: string; swatch?: string[] }[] };
type Step = { id: string; layer: string; layerLabel: string; title: string; subtitle: string; groups: Group[]; section?: string };

const buildSectionGroups = (): Record<string, Group[]> => {
  const map: Record<string, Group[]> = {};
  for (const s of sectionDefs) {
    const key = `sections.${s.key}`;
    map[key] = [
      {
        field: key,
        label: s.title,
        options: s.options.map((o) => ({ value: o.value, label: o.label })),
      },
    ];
  }
  return map;
};
const SG = buildSectionGroups();

const steps: Step[] = [
  { id: "theme", layer: "1a", layerLabel: "Layer 1 · Day Colors", title: "Color Theme", subtitle: "Pick the 3-color palette that defines your brand.", groups: [
    { field: "colorTheme", label: "6 Color Themes", cols: 2, options: colorThemeOptions.map((o) => ({ value: o.value, label: o.name, desc: o.description, swatch: o.swatches })) },
  ]},
  { id: "dark-canvas", layer: "1b", layerLabel: "Layer 1 · Night Colors", title: "Dark Background Palette", subtitle: "Pick one of 6 dark backgrounds — the night version of your palette.", groups: [
    { field: "darkCanvas", label: "6 Dark Backgrounds", cols: 2, options: darkCanvasOptions.map((d) => ({ value: d.id, label: d.label, desc: d.description, swatch: [d.bg, d.card, d.fg, d.border] })) },
  ]},
  { id: "radius", layer: "1d", layerLabel: "Layer 1 · Global Tokens", title: "Corner Radius", subtitle: "Every button, card, input, and dialog.", groups: [
    { field: "radius", label: "Border Radius", cols: 4, options: radiusOptions.map((o) => ({ value: o.value, label: o.label })) },
  ]},
  { id: "typography", layer: "1e", layerLabel: "Layer 1 · Global Tokens", title: "Typography", subtitle: "Headline + body personality.", groups: [
    { field: "font", label: "6 Type Pairings", cols: 2, options: fontOptions.map((o) => ({ value: o.value, label: o.label, desc: o.description })) },
    { field: "headingWeight", label: "Heading Weight", cols: 4, options: headingWeightOptions.map((o) => ({ value: o.value, label: o.label })) },
    { field: "headingStyle", label: "Heading Style", cols: 2, options: headingStyleOptions.map((o) => ({ value: o.value, label: o.label })) },
    { field: "bodyWeight", label: "Body Weight", cols: 2, options: bodyWeightOptions.map((o) => ({ value: o.value, label: o.label })) },
    { field: "letterSpacing", label: "Letter Spacing", cols: 3, options: letterSpacingOptions.map((o) => ({ value: o.value, label: o.label })) },
    { field: "headingCase", label: "Heading Case", cols: 2, options: headingCaseOptions.map((o) => ({ value: o.value, label: o.label })) },
  ]},
  { id: "border-shadow", layer: "1f", layerLabel: "Layer 1 · Global Tokens", title: "Borders & Shadows", subtitle: "Structure and depth.", groups: [
    { field: "border", label: "Border Style", cols: 3, options: borderOptions.map((o) => ({ value: o.value, label: o.label })) },
    { field: "shadow", label: "Shadow", cols: 2, options: shadowOptions.map((o) => ({ value: o.value, label: o.label })) },
  ]},
  { id: "forms", layer: "2b", layerLabel: "Layer 2 · BuildKit Primitives", title: "What Forms Do You Need?", subtitle: "Select all that apply — we'll build the right form for each.", groups: [
    { field: "forms", label: "Forms & Lead Capture", cols: 2, options: formOptions.map((o) => ({ value: o.value, label: o.label, desc: o.desc })) },
  ]},
  { id: "content", layer: "2c", layerLabel: "Layer 2 · BuildKit Primitives", title: "What Content Sections Do You Need?", subtitle: "Select all that apply — these become key sections of your site.", groups: [
    { field: "contentSections", label: "Content Sections", cols: 2, options: contentSectionOptions.map((o) => ({ value: o.value, label: o.label, desc: o.desc })) },
  ]},
  { id: "header", layer: "3a", layerLabel: "Layer 3 · Page Sections", title: "Header / Navigation", subtitle: "First impression and primary CTA.", groups: [SG["sections.header"][0]], section: "header" },
  { id: "hero", layer: "3b", layerLabel: "Layer 3 · Page Sections", title: "Hero Section", subtitle: "The very top of your site.", groups: [SG["sections.hero"][0]], section: "hero" },
  { id: "logos", layer: "3c", layerLabel: "Layer 3 · Page Sections", title: "Trust & Logo Cloud", subtitle: "Logo wall and social proof.", groups: [SG["sections.logos"][0]], section: "logos" },
  { id: "features", layer: "3d", layerLabel: "Layer 3 · Page Sections", title: "Features & Value Props", subtitle: "How your features are presented.", groups: [SG["sections.features"][0]], section: "features" },
  { id: "process", layer: "3e", layerLabel: "Layer 3 · Page Sections", title: "How It Works / Process", subtitle: "Steps and timeline layout.", groups: [SG["sections.process"][0]], section: "process" },
  { id: "stats", layer: "3f", layerLabel: "Layer 3 · Page Sections", title: "Stats & Metrics", subtitle: "Metrics and data presentation.", groups: [SG["sections.stats"][0]], section: "stats" },
  { id: "testimonials", layer: "3g", layerLabel: "Layer 3 · Page Sections", title: "Testimonials & Social Proof", subtitle: "Quotes and customer proof.", groups: [SG["sections.testimonials"][0]], section: "testimonials" },
  { id: "pricing", layer: "3h", layerLabel: "Layer 3 · Page Sections", title: "Pricing & Plans", subtitle: "Plans and pricing layout.", groups: [SG["sections.pricing"][0]], section: "pricing" },
  { id: "faq", layer: "3i", layerLabel: "Layer 3 · Page Sections", title: "FAQ / Help", subtitle: "Questions and answers.", groups: [SG["sections.faq"][0]], section: "faq" },
  { id: "team", layer: "3j", layerLabel: "Layer 3 · Page Sections", title: "Team / About", subtitle: "Team and about layout.", groups: [SG["sections.team"][0]], section: "team" },
  { id: "cta", layer: "3k", layerLabel: "Layer 3 · Page Sections", title: "CTA & Lead Capture", subtitle: "Lead capture band.", groups: [SG["sections.cta"][0]], section: "cta" },
  { id: "footer", layer: "3l", layerLabel: "Layer 3 · Page Sections", title: "Footer & Links", subtitle: "Footer and links layout.", groups: [SG["sections.footer"][0]], section: "footer" },
  { id: "review", layer: "4", layerLabel: "Layer 4 · Export", title: "Review & Export", subtitle: "Download your design spec.", groups: [] },
];

function setField(spec: DesignSpec, field: string, value: string): DesignSpec {
  if (field.startsWith("sections.")) {
    const key = field.replace("sections.", "") as keyof DesignSpec["sections"];
    return { ...spec, sections: { ...spec.sections, [key]: value } };
  }
  // Multi-select fields (arrays)
  if (field === "forms" || field === "contentSections") {
    const arr = spec[field as "forms" | "contentSections"];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    return { ...spec, [field]: next };
  }
  return { ...spec, [field as keyof DesignSpec]: value as never };
}

function DownloadButton({ label, onClick, primary, bg }: { label: string; onClick: () => void; primary?: boolean; bg?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${primary ? "text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
      style={primary ? { backgroundColor: bg } : undefined}
    >
      {label}
    </button>
  );
}

const STORAGE_KEY = "buildittoday-intake-spec";
const STORAGE_STEP_KEY = "buildittoday-intake-step";

function loadSavedSpec(): DesignSpec {
  if (typeof window === "undefined") return defaultSpec;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSpec;
    const parsed = JSON.parse(raw) as Partial<DesignSpec>;
    // Merge over defaults so new fields/options are never missing.
    return { ...defaultSpec, ...parsed, sections: { ...defaultSpec.sections, ...(parsed.sections ?? {}) } };
  } catch {
    return defaultSpec;
  }
}

function loadSavedStep(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_STEP_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 && n < steps.length ? n : 0;
  } catch {
    return 0;
  }
}

export function DesignStudioWizard() {
  const { mode, toggleMode } = useTheme();
  // Start from defaults so server + client first render match (no hydration error).
  // Saved progress is loaded in a useEffect after mount.
  const [spec, setSpec] = useState<DesignSpec>(defaultSpec);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [dir, setDir] = useState(1);
  const c = resolveColors(spec);
  const step = steps[stepIdx];

  // Auto-scroll the preview panel to the section currently being edited.
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const container = previewRef.current;
      if (!container) return;
      if (!step.section) {
        container.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = container.querySelector(`[data-section="${step.section}"]`) as HTMLElement | null;
      if (!el) return;
      container.scrollTo({ top: el.offsetTop - container.offsetTop - 24, behavior: "smooth" });
    }, 350);
    return () => clearTimeout(t);
  }, [stepIdx, step.section]);

  // Restore saved progress after hydration.
  useEffect(() => {
    setSpec(loadSavedSpec());
    setStepIdx(loadSavedStep());
  }, []);

  // Persist spec + current step on every change so a refresh never resets to step 1.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(spec));
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [spec]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STEP_KEY, String(stepIdx));
    } catch {
      /* ignore */
    }
  }, [stepIdx]);

  const reset = () => {
    setSpec(defaultSpec);
    setStepIdx(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_STEP_KEY);
    } catch {
      /* ignore */
    }
  };

  const go = (next: number) => {
    if (next < 0 || next >= steps.length) return;
    setDir(next > stepIdx ? 1 : -1);
    setStepIdx(next);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(buildJsonDoc(spec), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "website-design-spec.json";
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem("buildittoday-intake-spec", JSON.stringify(spec));
  };

  const exportMd = () => {
    const blob = new Blob([buildMarkdownDoc(spec)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "website-design-spec.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCss = () => navigator.clipboard.writeText(buildCssVars(spec));
  const copyTw = () => navigator.clipboard.writeText(buildTailwind(spec));

  const isLayer2 = step.layer.startsWith("2");
  const isLayer3 = step.layer.startsWith("3");
  // Steps 7 (forms) and 8 (content sections) are multi-select business choices —
  // show the full site preview so the user sees sections appear/disappear live.
  const isBusinessMulti = step.id === "forms" || step.id === "content";
  // On the Dark Background step, force the preview to render in dark mode so the
  // user sees the night canvas they're choosing, regardless of the mode setting.
  const previewSpec: DesignSpec = step.id === "dark-canvas" ? { ...spec, mode: "dark" } : spec;
  const renderPreview = () => {
    if (isBusinessMulti) return <PageAssembly spec={previewSpec} />;
    if (isLayer2) return <ComponentShowcase spec={previewSpec} />;
    if (isLayer3) return <PageAssembly spec={previewSpec} />;
    if (step.id === "review")
      return (
        <div className="p-8 text-sm text-slate-600">
          <p className="font-bold text-slate-900 text-lg mb-2">Your design spec is ready.</p>
          <p className="mb-4">Theme: {colorThemeOptions.find((o) => o.value === spec.colorTheme)?.name} · Mode: {spec.mode} · Dark Canvas: {darkCanvasOptions.find((d) => d.id === spec.darkCanvas)?.label ?? spec.darkCanvas} · Radius: {spec.radius}</p>
          <div className="flex flex-wrap gap-2">
            <DownloadButton label="Export JSON" primary bg={c.primary} onClick={exportJson} />
            <DownloadButton label="Export Markdown" onClick={exportMd} />
            <DownloadButton label="Copy CSS" onClick={copyCss} />
            <DownloadButton label="Copy Tailwind" onClick={copyTw} />
          </div>
        </div>
      );
    return <ComponentShowcase spec={previewSpec} />;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">BuildItToday · Design Studio</h1>
            <p className="text-xs text-slate-500">{step.layerLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMode} className="px-4 py-2 rounded-full border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50">
              {mode === "night" ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button onClick={reset} className="px-4 py-2 rounded-full border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50" title="Clear saved progress and start over">
              ↺ Reset
            </button>
            <DownloadButton label="Export JSON" primary bg={c.primary} onClick={exportJson} />
            <DownloadButton label="Copy CSS" onClick={copyCss} />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-8 items-start">
          {/* Left: step controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              {steps.map((s, i) => (
                <button key={s.id} onClick={() => go(i)} className={`h-2 flex-1 rounded-full transition-colors ${i === stepIdx ? "" : "bg-slate-200"}`} style={i === stepIdx ? { backgroundColor: c.primary } : undefined} aria-label={s.title} />
              ))}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Step {stepIdx + 1} of {steps.length} · {step.layer}
            </p>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{step.title}</h2>
            <p className="text-sm text-slate-500 mb-5">{step.subtitle}</p>

            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step.id}
                initial={{ x: dir * 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: dir * -60, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                {step.groups.map((g) => (
                  <div key={g.field}>
                    <label className="text-xs font-bold text-slate-900 block mb-2">{g.label}</label>
                    <div className={`grid gap-2 ${g.cols ? `grid-cols-2` : `grid-cols-2`}`}>
                      {g.options.map((o) => {
                        const isActive = setFieldRefActive(spec, g.field, o.value);
                        const isMulti = g.field === "forms" || g.field === "contentSections";
                        return (
                          <button
                            key={o.value}
                            onClick={() => setSpec((s) => setField(s, g.field, o.value))}
                            className={`px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                              isActive ? "text-white shadow-md" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                            }`}
                            style={isActive ? { backgroundColor: c.primary } : undefined}
                          >
                            {isMulti && (
                              <span className={`inline-flex items-center justify-center w-4 h-4 rounded border mr-1.5 align-middle ${isActive ? "border-white bg-white/20" : "border-slate-300 bg-white"}`}>
                                {isActive && <span className="text-[10px] leading-none">✓</span>}
                              </span>
                            )}
                            {o.swatch && (
                              <span className="flex gap-1 mb-1.5">
                                {o.swatch.map((sw, i) => (
                                  <span key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: sw }} />
                                ))}
                              </span>
                            )}
                            {g.field === "font" && fontStack[o.value as keyof typeof fontStack] && (
                              <span className="block mb-1.5">
                                <span
                                  className="block text-base leading-tight"
                                  style={{ fontFamily: fontStack[o.value as keyof typeof fontStack].heading, color: isActive ? "#fff" : "#0F172A" }}
                                >
                                  Aa
                                </span>
                                <span
                                  className="block text-[10px] leading-tight mt-0.5"
                                  style={{ fontFamily: fontStack[o.value as keyof typeof fontStack].body, color: isActive ? "rgba(255,255,255,0.85)" : "#64748B" }}
                                >
                                  Body text sample
                                </span>
                              </span>
                            )}
                            {o.label}
                            {o.desc && <span className="block text-[10px] opacity-80 mt-0.5 font-normal">{o.desc}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {step.id === "review" && (
                  <div className="pt-2 space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Export your spec</p>
                    <div className="flex flex-wrap gap-2">
                      <DownloadButton label="JSON" primary bg={c.primary} onClick={exportJson} />
                      <DownloadButton label="Markdown" onClick={exportMd} />
                      <DownloadButton label="Copy CSS" onClick={copyCss} />
                      <DownloadButton label="Copy Tailwind" onClick={copyTw} />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Bottom nav */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => go(stepIdx - 1)}
                disabled={stepIdx === 0}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
              <span className="text-xs text-slate-400">
                {Math.min(stepIdx + 1, steps.length)} / {steps.length}
              </span>
              <button
                onClick={() => go(stepIdx + 1)}
                disabled={stepIdx === steps.length - 1}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: c.primary }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Right: live preview — fixed-height, internally scrollable so it stays
              beside the controls and changes are visible without scrolling the page */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              Live Preview
              {isBusinessMulti ? " · Site (sections appear as you select them)" : isLayer2 ? " · Primitives" : isLayer3 ? " · Page Assembly" : ""}
            </p>
            <div ref={previewRef} className="h-[70vh] overflow-y-auto rounded-xl border border-slate-200" style={{ backgroundColor: "#F8F9FB" }}>
              {renderPreview()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function setFieldRefActive(spec: DesignSpec, field: string, value: string): boolean {
  if (field.startsWith("sections.")) {
    const key = field.replace("sections.", "") as keyof DesignSpec["sections"];
    return spec.sections[key] === value;
  }
  if (field === "forms" || field === "contentSections") {
    return spec[field as "forms" | "contentSections"].includes(value);
  }
  return (spec[field as keyof DesignSpec] as unknown as string) === value;
}

export default DesignStudioWizard;