import type { DesignSpec } from "@/lib/intake-config";
import { resolveColors, resolveDarkCanvas, primitiveGroups, fontStack, fontOptions, resolveType } from "@/lib/intake-config";

interface Props {
  spec: DesignSpec;
}

// Map primitive group key -> DesignSpec field name
const primitiveField: Record<string, keyof DesignSpec> = {
  buttons: "buttonStyle",
  inputs: "inputStyle",
  display: "displayStyle",
  feedback: "feedbackStyle",
  navigation: "navStyle",
  overlays: "overlayStyle",
  data: "dataStyle",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
      {children}
    </span>
  );
}

// ─── Full Component Showcase (all primitives) ───

export function ComponentShowcase({ spec }: Props) {
  const c = resolveColors(spec);
  const isDark = spec.mode === "dark";
  const dc = resolveDarkCanvas(spec);

  const bg = isDark ? dc.bg : c.light;
  const fg = isDark ? dc.fg : c.dark;
  const cardBg = isDark ? dc.card : c.lightAlt;
  const border = isDark ? dc.border : c.border;
  const muted = c.textMuted;
  const radius = spec.radius === "0px" ? 0 : spec.radius === "6px" ? 6 : spec.radius === "12px" ? 12 : 24;
  const shadow =
    spec.shadow === "flat"
      ? "none"
      : spec.shadow === "subtle"
      ? "0 4px 12px rgba(0,0,0,0.06)"
      : spec.shadow === "medium"
      ? "0 10px 30px rgba(0,0,0,0.1)"
      : "0 24px 60px rgba(0,0,0,0.18)";
  const borderColor = spec.border === "borderless" ? "transparent" : border;
  const fontFamily = fontStack[spec.font].body;
  const headingFont = fontStack[spec.font].heading;
  const type = resolveType(spec);

  // Heading style applied to all "display" text: buttons, badges, nav, tabs, table headers, section labels
  const headingStyle: React.CSSProperties = {
    fontFamily: type.headingFont,
    fontWeight: type.headingWeight,
    fontStyle: type.headingStyle,
    letterSpacing: type.letterSpacing,
    textTransform: type.headingCase,
  };
  const bodyStyle: React.CSSProperties = {
    fontFamily: type.bodyFont,
    fontWeight: type.bodyWeight,
  };

  const btnBase: React.CSSProperties = {
    borderRadius: radius / 1.2,
    boxShadow: shadow,
  };

  return (
    <div style={{ backgroundColor: bg, borderRadius: 16, padding: 32, fontFamily }}>
      {/* Typography specimen */}
      <div className="mb-8 p-6" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
        <SectionLabel>Typography Specimen — {fontOptions.find((o) => o.value === spec.font)?.label}</SectionLabel>
        <h2 className="text-3xl md:text-4xl leading-tight mb-3" style={{ color: fg, ...headingStyle }}>
          Websites that work as hard as you do.
        </h2>
        <p className="text-sm leading-relaxed mb-4" style={{ color: muted, ...bodyStyle }}>
          This is the body text in {fontStack[spec.font].body}. Headlines use {fontStack[spec.font].heading}. Every heading, button, and paragraph across your site inherits this pairing.
        </p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: c.primary + "1A", color: c.primary, ...headingStyle }}>Heading: {fontStack[spec.font].heading}</span>
          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: fg, ...bodyStyle }}>Body: {fontStack[spec.font].body}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <span
          className="px-3 py-1 text-[11px] font-semibold rounded-full"
          style={{ backgroundColor: c.primary, color: "#fff" }}
        >
          @shadcn/ui primitives
        </span>
        <span className="text-xs" style={{ color: muted }}>
          Real-time token inheritance applied
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* 1. Buttons */}
        <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
          <SectionLabel>1. Button Variants & States</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <button style={{ backgroundColor: c.primary, color: "#fff", padding: "8px 16px", fontSize: 12, borderRadius: btnBase.borderRadius, border: "none", cursor: "pointer", ...headingStyle }}>Primary</button>
            <button style={{ backgroundColor: "rgba(0,0,0,0.08)", color: fg, padding: "8px 16px", fontSize: 12, borderRadius: btnBase.borderRadius, border: "none", cursor: "pointer", ...headingStyle }}>Secondary</button>
            <button style={{ backgroundColor: "transparent", color: fg, padding: "8px 16px", fontSize: 12, borderRadius: btnBase.borderRadius, border: `1px solid ${border}`, cursor: "pointer", ...headingStyle }}>Outline</button>
            <button style={{ backgroundColor: "transparent", color: fg, padding: "8px 16px", fontSize: 12, borderRadius: btnBase.borderRadius, border: "none", cursor: "pointer", borderBottom: `1px dashed ${border}`, ...headingStyle }}>Ghost</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button style={{ backgroundColor: "#EF4444", color: "#fff", padding: "8px 16px", fontSize: 12, borderRadius: btnBase.borderRadius, border: "none", cursor: "pointer", ...headingStyle }}>Destructive</button>
            <button style={{ color: c.primary, padding: "8px 16px", fontSize: 12, borderRadius: btnBase.borderRadius, border: "none", background: "transparent", cursor: "pointer", textDecoration: "underline", ...headingStyle }}>Link</button>
            <button style={{ backgroundColor: "transparent", color: fg, padding: "8px", fontSize: 12, borderRadius: btnBase.borderRadius, border: `1px solid ${border}`, cursor: "pointer", ...headingStyle }}>🔍</button>
          </div>
        </div>

        {/* 2. Form Fields */}
        <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
          <SectionLabel>Form Fields & Controls</SectionLabel>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Text Input"
              style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "8px 12px", fontSize: 12, color: fg, outline: "none" }}
            />
            <textarea
              rows={2}
              placeholder="Textarea"
              style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "8px 12px", fontSize: 12, color: fg, outline: "none", resize: "vertical" }}
            />
            <div className="flex items-center gap-3" style={{ fontSize: 12, color: muted }}>
              <input type="checkbox" defaultChecked style={{ accentColor: c.primary }} />
              <span>Checkbox Checked</span>
              <input type="checkbox" style={{ accentColor: c.primary }} />
              <span>Unchecked</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: muted }}>
              <input type="radio" defaultChecked style={{ accentColor: c.primary }} /> Radio
              <input type="radio" style={{ accentColor: c.primary }} /> Radio
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: muted, fontSize: 12 }}>
              <span>Switch Toggle</span>
              <span style={{ display: "inline-block", width: 32, height: 18, borderRadius: 99, backgroundColor: c.primary, position: "relative" }}>
                <span style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: 99, backgroundColor: "#fff" }} />
              </span>
            </div>
          </div>
        </div>

        {/* 3. Badges & Feedback */}
        <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
          <SectionLabel>Badges, Cards & Feedback</SectionLabel>
          <div className="flex flex-wrap gap-2 mb-4" style={{ fontSize: 11 }}>
            <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: fg, ...headingStyle }}>Default Tag</span>
            <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: c.primary, color: "#fff", ...headingStyle }}>Active Tag</span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: `1px solid ${border}`, color: fg, ...headingStyle }}>Outline Tag</span>
          </div>
          <div className="p-3 rounded-md flex items-start gap-2 text-xs" style={{ backgroundColor: "rgba(234,179,8,0.12)", color: fg }}>
            <span>⚠️</span>
            <span>System Alert / Toast Box</span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: "72%", backgroundColor: c.primary }} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">72% Progress</div>
          </div>
        </div>

        {/* 4. Navigation & Structure */}
        <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
          <SectionLabel>Navigation & Structure</SectionLabel>
          <div className="flex gap-1 text-xs mb-4">
            <span className="px-3 py-1.5 rounded-t-md" style={{ backgroundColor: c.primary, color: "#fff", ...headingStyle }}>Tab 1</span>
            <span className="px-3 py-1.5 rounded-t-md" style={{ color: muted, ...headingStyle }}>Tab 2</span>
            <span className="px-3 py-1.5 rounded-t-md" style={{ color: muted, ...headingStyle }}>Tab 3</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: fg }}>Accordion Item — Open</div>
            <div className="p-3 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: muted }}>Accordion Item — Closed</div>
          </div>
          <div className="mt-4 text-[11px] flex items-center gap-2" style={{ color: muted }}>
            <span>Breadcrumbs:</span>
            <span style={{ color: c.primary }}>Home</span>
            <span>/</span>
            <span>Products</span>
            <span>/</span>
            <span>Detail</span>
          </div>
        </div>

        {/* 5. Overlays & Dialogs */}
        <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
          <SectionLabel>Overlays & Dialogs</SectionLabel>
          <div className="p-4 rounded-lg" style={{ backgroundColor: bg, border: `1px solid ${border}`, boxShadow: "0 20px 50px rgba(0,0,0,0.18)" }}>
            <div className="flex items-start justify-between mb-2">
              <strong className="text-xs" style={{ color: fg, ...headingStyle }}>Modal Dialog</strong>
              <span style={{ color: muted, fontSize: 12, cursor: "pointer" }}>✕</span>
            </div>
            <p className="text-[11px] mb-3" style={{ color: muted }}>Dialog content with actions and description placeholder text.</p>
            <div className="flex gap-2">
              <button style={{ backgroundColor: c.primary, color: "#fff", padding: "6px 12px", fontSize: 11, borderRadius: radius / 2, border: "none", cursor: "pointer" }}>Confirm</button>
              <button style={{ backgroundColor: "transparent", color: fg, padding: "6px 12px", fontSize: 11, borderRadius: radius / 2, border: `1px solid ${border}`, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-md text-[10px]" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: fg }}>Sheet</span>
            <span className="px-2.5 py-1 rounded-md text-[10px]" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: fg }}>AlertDialog</span>
            <span className="px-2.5 py-1 rounded-md text-[10px]" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: fg }}>Bottom Drawer</span>
          </div>
        </div>

        {/* 6. Tables & Data Display */}
        <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
          <SectionLabel>Tables & Data Display</SectionLabel>
          <div className="rounded-md overflow-hidden text-xs" style={{ border: `1px solid ${border}` }}>
            <div className="grid grid-cols-3 gap-2 px-3 py-2" style={{ backgroundColor: bg, color: fg, ...headingStyle }}>
              <span>Name</span>
              <span>Status</span>
              <span>Value</span>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 px-3 py-2" style={{ borderTop: `1px solid ${border}`, color: muted }}>
                <span>Row {i + 1}</span>
                <span style={{ color: c.primary }}>Active</span>
                <span>${(i + 1) * 100}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected primitive badges */}
      <div className="mt-8 pt-4" style={{ borderTop: `1px solid ${border}` }}>
        <SectionLabel>Selected component groups</SectionLabel>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {primitiveGroups.map((g) => {
            const selected = String(spec[primitiveField[g.key]]);
            const label = g.options.find((o) => o.value === selected)?.label ?? selected;
            return (
              <span
                key={g.key}
                className="px-3 py-1.5 rounded-full font-medium"
                style={{ backgroundColor: c.primary + "1A", color: c.primary }}
              >
                {g.title}: {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
