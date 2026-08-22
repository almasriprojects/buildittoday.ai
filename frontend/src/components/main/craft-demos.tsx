"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { CraftDemo } from "@/lib/site-data";

// Shared theme colors shape used across main sections
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  dark: string;
  light: string;
  lightAlt: string;
  textOnLight: string;
  textMuted: string;
  border: string;
}

export const defaultColors: ThemeColors = {
  primary: "#E87053",
  primaryLight: "#F0A892",
  dark: "#1C1917",
  light: "#FAF8F5",
  lightAlt: "#FFFFFF",
  textOnLight: "#5C554E",
  textMuted: "#8A8480",
  border: "#E8E2D8",
};

// --- Design: color palette picker ---
const paletteSwatches = [
  { name: "Terracotta", accent: "#E87053", ink: "#1C1917", paper: "#F9F5F0" },
  { name: "Ink", accent: "#1C1917", ink: "#1C1917", paper: "#F9F5F0" },
  { name: "Paper", accent: "#F3EEE6", ink: "#1C1917", paper: "#F3EEE6" },
  { name: "Forest", accent: "#2F6E63", ink: "#1C1917", paper: "#F3F8F6" },
  { name: "Wood", accent: "#8A4A30", ink: "#1C1917", paper: "#FBF6F0" },
];

export function DesignDemo({ colors }: { colors: ThemeColors }) {
  const [swatch, setSwatch] = useState(0);
  const s = paletteSwatches[swatch];
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${s.ink}22` }}>
      <div className="p-5" style={{ backgroundColor: s.paper }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: s.ink }}>Your Brand</span>
          <div className="flex gap-3">
            {["Home", "About", "Contact"].map((l) => (
              <span key={l} className="text-xs" style={{ color: `${s.ink}88` }}>{l}</span>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="h-2 w-3/4 rounded-full mb-2" style={{ backgroundColor: s.ink }} />
          <div className="h-2 w-1/2 rounded-full mb-3" style={{ backgroundColor: `${s.ink}55` }} />
          <span className="inline-block px-4 py-2 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: s.accent }}>
            Get Started
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg" style={{ backgroundColor: `${s.accent}${i === 1 ? "66" : "33"}` }} />
          ))}
        </div>
      </div>
      <div className="p-4 flex items-center justify-between" style={{ backgroundColor: colors.lightAlt }}>
        <div className="flex gap-2">
          {paletteSwatches.map((p, i) => (
            <button
              key={p.name}
              onClick={() => setSwatch(i)}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${i === swatch ? "scale-110 border-black/40" : "border-transparent hover:scale-105"}`}
              style={{ backgroundColor: p.accent }}
              title={p.name}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: colors.textMuted }}>{s.name} · live</span>
      </div>
    </div>
  );
}

// --- Layout: flipper ---
export function LayoutDemo({ colors }: { colors: ThemeColors }) {
  const [layout, setLayout] = useState(0);
  const layouts = [
    { name: "Single column", desc: "One clear path" },
    { name: "Split", desc: "Copy + visual" },
    { name: "Card grid", desc: "Scanable options" },
  ];
  const l = layouts[layout];
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: colors.dark }}>{l.name}</span>
          <span className="text-xs" style={{ color: colors.textMuted }}>{l.desc}</span>
        </div>
        {layout === 0 && (
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded-full" style={{ backgroundColor: colors.dark }} />
            <div className="h-3 w-1/2 rounded-full" style={{ backgroundColor: `${colors.dark}55` }} />
            <div className="h-16 rounded-lg" style={{ backgroundColor: `${colors.primary}44` }} />
            <div className="h-16 rounded-lg" style={{ backgroundColor: `${colors.primary}22` }} />
          </div>
        )}
        {layout === 1 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full" style={{ backgroundColor: colors.dark }} />
              <div className="h-3 w-3/4 rounded-full" style={{ backgroundColor: `${colors.dark}55` }} />
              <div className="h-16 rounded-lg" style={{ backgroundColor: `${colors.primary}44` }} />
            </div>
            <div className="h-24 rounded-lg" style={{ backgroundColor: `${colors.primary}22` }} />
          </div>
        )}
        {layout === 2 && (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg" style={{ backgroundColor: `${colors.primary}${i === 1 ? "44" : "22"}` }} />
            ))}
          </div>
        )}
      </div>
      <div className="p-4 flex gap-2" style={{ backgroundColor: colors.light }}>
        {layouts.map((x, i) => (
          <button
            key={x.name}
            onClick={() => setLayout(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${i === layout ? "text-white" : ""}`}
            style={{ backgroundColor: i === layout ? colors.primary : colors.lightAlt, color: i === layout ? "#fff" : colors.textOnLight, border: `1px solid ${i === layout ? colors.primary : colors.border}` }}
          >
            {x.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Imagery: treatment switcher ---
export function ImageryDemo({ colors }: { colors: ThemeColors }) {
  const [treat, setTreat] = useState(0);
  const treatments = ["Real photo", "Art-directed", "Stock"];
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: colors.dark }}>Imagery</span>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: `${colors.primary}22`, color: colors.primary }}>
            {treat === 2 ? "−86% conversion" : treat === 1 ? "+86% conversion" : "Real proof"}
          </span>
        </div>
        <div className="h-32 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: treat === 2 ? `${colors.textMuted}33` : `${colors.primary}${treat === 1 ? "66" : "33"}` }}>
          <span className="text-3xl">{treat === 2 ? "📦" : treat === 1 ? "🎬" : "📸"}</span>
        </div>
        <div className="flex gap-2">
          {treatments.map((t, i) => (
            <button
              key={t}
              onClick={() => setTreat(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${i === treat ? "text-white" : ""}`}
              style={{ backgroundColor: i === treat ? colors.primary : colors.lightAlt, color: i === treat ? "#fff" : colors.textOnLight, border: `1px solid ${i === treat ? colors.primary : colors.border}` }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- 3D: rotating cube ---
export function ThreeDDemo({ colors }: { colors: ThemeColors }) {
  return (
    <div className="rounded-2xl overflow-hidden border flex items-center justify-center py-10" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="relative w-28 h-28" style={{ perspective: "600px" }}>
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateX: 360, rotateY: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          {["front", "back", "right", "left", "top", "bottom"].map((face, i) => (
            <div
              key={face}
              className="absolute inset-0 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{
                backgroundColor: colors.primary,
                transform: [
                  "translateZ(56px)",
                  "rotateY(180deg) translateZ(56px)",
                  "rotateY(90deg) translateZ(56px)",
                  "rotateY(-90deg) translateZ(56px)",
                  "rotateX(90deg) translateZ(56px)",
                  "rotateX(-90deg) translateZ(56px)",
                ][i],
              }}
            >
              {i + 1}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// --- Content: copy sharpener ---
export function ContentDemo({ colors }: { colors: ThemeColors }) {
  const [sharp, setSharp] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="p-5">
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.primary }}>Headline</span>
          <div className="text-xl font-bold mt-1 transition-all" style={{ color: colors.dark }}>
            {sharp ? "Get 3× more calls this week." : "We make websites for businesses."}
          </div>
        </div>
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.primary }}>CTA</span>
          <div className="text-sm mt-1 transition-all" style={{ color: colors.textOnLight }}>
            {sharp ? "Book my free call" : "Contact us today"}
          </div>
        </div>
        <button
          onClick={() => setSharp(!sharp)}
          className="px-4 py-2 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: colors.primary }}
        >
          {sharp ? "Revert to vague" : "Sharpen the copy"}
        </button>
      </div>
    </div>
  );
}

// --- Motion: pacing slider ---
export function MotionDemo({ colors }: { colors: ThemeColors }) {
  const [speed, setSpeed] = useState(1);
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: colors.dark }}>Motion pacing</span>
          <span className="text-xs" style={{ color: colors.textMuted }}>{speed}×</span>
        </div>
        <div className="h-20 rounded-xl flex items-center justify-center overflow-hidden mb-4" style={{ backgroundColor: colors.light }}>
          <motion.div
            className="w-10 h-10 rounded-full"
            style={{ backgroundColor: colors.primary }}
            animate={{ x: [-40, 40, -40] }}
            transition={{ duration: 2 / speed, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.5}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: colors.primary }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: colors.textMuted }}>
          <span>Calm</span>
          <span>Purposeful</span>
          <span>Fast</span>
        </div>
      </div>
    </div>
  );
}

// --- Performance: load-time slider ---
export function PerformanceDemo({ colors }: { colors: ThemeColors }) {
  const [load, setLoad] = useState(1.2);
  const conv = load <= 1 ? "+8.4%" : load <= 2 ? "baseline" : "−20%";
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: colors.dark }}>Load time</span>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: load <= 2 ? "#28C84022" : "#E5484D22", color: load <= 2 ? "#1E7A34" : "#C0392B" }}>
            {conv}
          </span>
        </div>
        <div className="text-4xl font-light mb-4" style={{ color: colors.dark }}>{load.toFixed(1)}s</div>
        <div className="h-2 rounded-full mb-4 overflow-hidden" style={{ backgroundColor: colors.border }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: load <= 2 ? "#28C840" : "#E5484D" }}
            animate={{ width: `${Math.min(100, load * 40)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.1}
          value={load}
          onChange={(e) => setLoad(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: colors.primary }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: colors.textMuted }}>
          <span>0.5s</span>
          <span>4s</span>
        </div>
      </div>
    </div>
  );
}

// --- Conversion: CTA hierarchy toggle ---
export function ConversionDemo({ colors }: { colors: ThemeColors }) {
  const [good, setGood] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: colors.dark }}>CTA hierarchy</span>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: good ? "#28C84022" : "#E5484D22", color: good ? "#1E7A34" : "#C0392B" }}>
            {good ? "1 primary CTA" : "competing asks"}
          </span>
        </div>
        <div className="space-y-3">
          {good ? (
            <>
              <div className="h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: colors.primary }}>
                Book a Free Call
              </div>
              <div className="h-10 rounded-full flex items-center justify-center text-xs border" style={{ borderColor: colors.border, color: colors.textMuted }}>
                Learn more
              </div>
            </>
          ) : (
            <>
              <div className="h-10 rounded-full flex items-center justify-center text-xs border" style={{ borderColor: colors.primary, color: colors.primary }}>
                Sign up now
              </div>
              <div className="h-10 rounded-full flex items-center justify-center text-xs border" style={{ borderColor: colors.primary, color: colors.primary }}>
                Download free guide
              </div>
              <div className="h-10 rounded-full flex items-center justify-center text-xs border" style={{ borderColor: colors.primary, color: colors.primary }}>
                Book a call
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setGood(!good)}
          className="mt-4 px-4 py-2 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: colors.primary }}
        >
          {good ? "Show competing asks" : "Show one clear path"}
        </button>
      </div>
    </div>
  );
}

// --- Build: HTTPS / code checklist ---
export function BuildDemo({ colors }: { colors: ThemeColors }) {
  const items = [
    { label: "HTTPS secured", ok: true },
    { label: "Core Web Vitals", ok: true },
    { label: "Real code in your GitHub", ok: true },
    { label: "No page-builder lock-in", ok: true },
  ];
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28C840" }} />
          <span className="text-sm font-bold" style={{ color: colors.dark }}>Build hygiene</span>
        </div>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.label} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#28C84022" }}>
                <svg className="w-2.5 h-2.5" style={{ color: "#1E7A34" }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </span>
              <span className="text-sm" style={{ color: colors.textOnLight }}>{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Speed to Lead: timer ---
export function SpeedDemo({ colors }: { colors: ThemeColors }) {
  const [mins, setMins] = useState(5);
  const mult = mins <= 5 ? "9×" : mins <= 15 ? "5×" : mins <= 30 ? "2×" : "1×";
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.lightAlt }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: colors.dark }}>Response time</span>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: `${colors.primary}22`, color: colors.primary }}>
            {mult} conversion
          </span>
        </div>
        <div className="text-4xl font-light mb-4" style={{ color: colors.dark }}>{mins} min</div>
        <input
          type="range"
          min={1}
          max={60}
          step={1}
          value={mins}
          onChange={(e) => setMins(parseInt(e.target.value))}
          className="w-full"
          style={{ accentColor: colors.primary }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: colors.textMuted }}>
          <span>1 min</span>
          <span>60 min</span>
        </div>
        <p className="text-xs mt-3 leading-relaxed" style={{ color: colors.textMuted }}>
          Under 5 minutes vs 30 minutes increases lead conversion ~9×.
        </p>
      </div>
    </div>
  );
}

// --- Router ---
export function CraftDemoRenderer({ demo, colors }: { demo: CraftDemo; colors: ThemeColors }) {
  switch (demo) {
    case "design":
      return <DesignDemo colors={colors} />;
    case "layout":
      return <LayoutDemo colors={colors} />;
    case "imagery":
      return <ImageryDemo colors={colors} />;
    case "3d":
      return <ThreeDDemo colors={colors} />;
    case "content":
      return <ContentDemo colors={colors} />;
    case "motion":
      return <MotionDemo colors={colors} />;
    case "performance":
      return <PerformanceDemo colors={colors} />;
    case "conversion":
      return <ConversionDemo colors={colors} />;
    case "build":
      return <BuildDemo colors={colors} />;
    case "speed":
      return <SpeedDemo colors={colors} />;
    default:
      return <DesignDemo colors={colors} />;
  }
}
