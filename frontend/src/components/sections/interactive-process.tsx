"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Interactive color palette for the Design phase ---
const paletteSwatches = [
  { name: "Terracotta", accent: "#E87053", ink: "#1C1917", paper: "#F9F5F0" },
  { name: "Ink", accent: "#1C1917", ink: "#1C1917", paper: "#F9F5F0" },
  { name: "Paper", accent: "#F3EEE6", ink: "#1C1917", paper: "#F3EEE6" },
  { name: "Forest", accent: "#2F6E63", ink: "#1C1917", paper: "#F3F8F6" },
  { name: "Wood", accent: "#8A4A30", ink: "#1C1917", paper: "#FBF6F0" },
];

// --- Typography options for the Design phase ---
const typeOptions = [
  { name: "Crafted brand", serif: "Fraunces", sans: "Outfit", desc: "Warm optics earn trust before the pitch." },
  { name: "Luxury hospitality", serif: "Playfair Display", sans: "Montserrat", desc: "Refined and elegant for premium service." },
  { name: "Product & precision", serif: "Source Serif", sans: "Inter", desc: "Clean, technical, and precise." },
];

// --- Phase data with interactive demos ---
interface Phase {
  num: string;
  title: string;
  tagline: string;
  copy: string;
  demo: "palette" | "type" | "layout" | "content" | "seo" | "qa" | "launch" | "support" | "strategy" | "discovery";
}

const phases: Phase[] = [
  {
    num: "01",
    title: "Discovery",
    tagline: "We learn before we build.",
    copy: "We learn about your business, your customers, and what makes you different. This shapes everything we build.",
    demo: "discovery",
  },
  {
    num: "02",
    title: "Strategy",
    tagline: "A plan with a purpose.",
    copy: "We map out your site structure, pages, and conversion goals so every element has a clear job.",
    demo: "strategy",
  },
  {
    num: "03",
    title: "Design",
    tagline: "Taste is a business asset.",
    copy: "Design isn't decoration. Buyers decide whether you look worth their money in about a second — and a considered brand wins that second. Tap a swatch to retint this panel live.",
    demo: "palette",
  },
  {
    num: "04",
    title: "Design Review",
    tagline: "Your eyes on the design.",
    copy: "You review the design and we refine it together until it feels exactly right for your business.",
    demo: "type",
  },
  {
    num: "05",
    title: "Development",
    tagline: "Clean, fast, real code.",
    copy: "We build your site with clean, fast, mobile-responsive code that loads in under 2 seconds.",
    demo: "layout",
  },
  {
    num: "06",
    title: "Content & Copy",
    tagline: "Words that sell.",
    copy: "We write sharp, conversion-focused copy and place your real photos and details throughout.",
    demo: "content",
  },
  {
    num: "07",
    title: "SEO & Analytics",
    tagline: "Found on Google.",
    copy: "We set up technical SEO, Google Search Console, and analytics so you can track every visitor.",
    demo: "seo",
  },
  {
    num: "08",
    title: "Testing & QA",
    tagline: "Flawless on every device.",
    copy: "We test on every device and browser, fix any issues, and make sure everything works flawlessly.",
    demo: "qa",
  },
  {
    num: "09",
    title: "Launch",
    tagline: "Live on your domain.",
    copy: "Your site goes live on your own domain with SSL, hosting, and everything configured.",
    demo: "launch",
  },
  {
    num: "10",
    title: "Ongoing Support",
    tagline: "We keep it performing.",
    copy: "We monitor, update, and support your site so it keeps performing while you run your business.",
    demo: "support",
  },
];

// --- Interactive demo renderers ---

function PaletteDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22` }}>
      {/* Mini site preview retinted live */}
      <div className="p-5" style={{ backgroundColor: paper }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: ink }}>Your Brand</span>
          <div className="flex gap-3">
            {["Home", "About", "Contact"].map((l) => (
              <span key={l} className="text-xs" style={{ color: `${ink}88` }}>{l}</span>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="h-2 w-3/4 rounded-full mb-2" style={{ backgroundColor: ink }} />
          <div className="h-2 w-1/2 rounded-full mb-3" style={{ backgroundColor: `${ink}55` }} />
          <span className="inline-block px-4 py-2 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: accent }}>
            Get Started
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg" style={{ backgroundColor: `${accent}${i === 1 ? "66" : "33"}` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TypeDemo({ serif, sans, accent, ink, paper }: { serif: string; sans: string; accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-6">
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Serif — Headlines</span>
          <div className="text-3xl font-bold mt-1" style={{ fontFamily: `'${serif}', serif`, color: ink }}>
            Crafted brand
          </div>
        </div>
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Sans — Body</span>
          <div className="text-base mt-1" style={{ fontFamily: `'${sans}', sans-serif`, color: `${ink}aa` }}>
            Warm optics earn trust before the pitch. A soft, optical serif feels handmade and considered.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: accent, color: "#fff" }}>{serif}</span>
          <span className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: `${ink}33`, color: ink }}>{sans}</span>
        </div>
      </div>
    </div>
  );
}

function LayoutDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: ink }}>Responsive</span>
          <div className="flex gap-1">
            <span className="w-6 h-4 rounded-sm border" style={{ borderColor: `${ink}44` }} />
            <span className="w-8 h-4 rounded-sm border" style={{ borderColor: `${ink}44` }} />
            <span className="w-12 h-4 rounded-sm border" style={{ borderColor: `${ink}44` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="col-span-2 h-16 rounded-lg" style={{ backgroundColor: `${accent}44` }} />
          <div className="h-16 rounded-lg" style={{ backgroundColor: `${accent}22` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg" style={{ backgroundColor: `${ink}${i === 1 ? "33" : "18"}` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-5">
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Headline</span>
          <div className="text-xl font-bold mt-1" style={{ color: ink }}>Get more calls this week.</div>
        </div>
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Body</span>
          <div className="text-sm mt-1 leading-relaxed" style={{ color: `${ink}aa` }}>
            Numbers + first-person CTAs win. Headlines with numbers outperform vague claims by ~36%.
          </div>
        </div>
        <span className="inline-block px-4 py-2 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: accent }}>
          Book a Free Call
        </span>
      </div>
    </div>
  );
}

function SeoDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28C840" }} />
          <span className="text-xs font-semibold" style={{ color: ink }}>Google Search Console</span>
        </div>
        <div className="space-y-2">
          {[
            { label: "Technical SEO", w: "w-3/4" },
            { label: "Structured data", w: "w-2/3" },
            { label: "Sitemap", w: "w-1/2" },
            { label: "Analytics tracking", w: "w-5/6" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
              <span className="text-xs" style={{ color: `${ink}88` }}>{row.label}</span>
              <div className={`h-1.5 rounded-full ${row.w}`} style={{ backgroundColor: `${accent}44` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QaDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: ink }}>Device Testing</span>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: "#28C84022", color: "#1E7A34" }}>All passing</span>
        </div>
        <div className="space-y-2">
          {["Desktop", "Tablet", "Mobile", "Safari", "Chrome"].map((d, i) => (
            <div key={d} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: `${ink}88` }}>{d}</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((s) => (
                  <span key={s} className="w-4 h-1.5 rounded-full" style={{ backgroundColor: s <= i ? "#28C840" : `${ink}22` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LaunchDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-5 text-center">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${accent}22` }}>
          <svg className="w-6 h-6" style={{ color: accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-lg font-bold" style={{ color: ink }}>Your site is live!</div>
        <div className="text-sm mb-4" style={{ color: `${ink}88` }}>yourbusiness.com</div>
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#28C840" }} />
          <span className="text-xs font-semibold" style={{ color: "#1E7A34" }}>SSL secured · Hosting active</span>
        </div>
      </div>
    </div>
  );
}

function SupportDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: ink }}>Ongoing Support</span>
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: `${accent}22`, color: accent }}>Active</span>
        </div>
        <div className="space-y-2">
          {["Updates & backups", "Security monitoring", "Performance checks", "Priority support"].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
              <span className="text-xs" style={{ color: `${ink}88` }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrategyDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-5">
        <div className="text-sm font-bold mb-3" style={{ color: ink }}>Site Map</div>
        <div className="space-y-1.5">
          {["Home", "Services", "About", "Contact", "Book Now"].map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <span className="text-xs" style={{ color: `${ink}55` }}>{i + 1}</span>
              <div className="flex-1 h-6 rounded-md flex items-center px-2" style={{ backgroundColor: `${accent}${i === 4 ? "44" : "18"}` }}>
                <span className="text-xs font-medium" style={{ color: ink }}>{p}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiscoveryDemo({ accent, ink, paper }: { accent: string; ink: string; paper: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${ink}22`, backgroundColor: paper }}>
      <div className="p-5">
        <div className="text-sm font-bold mb-3" style={{ color: ink }}>Discovery Questions</div>
        <div className="space-y-2">
          {["Who is your customer?", "What makes you different?", "What's your #1 goal?"].map((q) => (
            <div key={q} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}22` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
              </span>
              <span className="text-xs" style={{ color: `${ink}88` }}>{q}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main interactive component ---

interface InteractiveProcessProps {
  colors?: {
    primary: string;
    primaryLight: string;
    dark: string;
    light: string;
    lightAlt: string;
    textOnLight: string;
    textMuted: string;
    border: string;
  };
}

export function InteractiveProcess({ colors }: InteractiveProcessProps) {
  const c = colors ?? {
    primary: "#E87053",
    primaryLight: "#F0A892",
    dark: "#1C1917",
    light: "#FAF8F5",
    lightAlt: "#FFFFFF",
    textOnLight: "#5C554E",
    textMuted: "#8A8480",
    border: "#E8E2D8",
  };

  const [activePhase, setActivePhase] = useState(2); // default to Design (index 2)
  const [swatch, setSwatch] = useState(0);
  const [typeIdx, setTypeIdx] = useState(0);

  const phase = phases[activePhase];
  const activeSwatch = paletteSwatches[swatch];
  const activeType = typeOptions[typeIdx];

  // Colors used by the live demos (retint when swatch changes)
  const demoAccent = phase.demo === "palette" ? activeSwatch.accent : c.primary;
  const demoInk = phase.demo === "palette" ? activeSwatch.ink : c.dark;
  const demoPaper = phase.demo === "palette" ? activeSwatch.paper : c.lightAlt;

  const renderDemo = () => {
    switch (phase.demo) {
      case "palette":
        return <PaletteDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "type":
        return <TypeDemo serif={activeType.serif} sans={activeType.sans} accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "layout":
        return <LayoutDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "content":
        return <ContentDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "seo":
        return <SeoDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "qa":
        return <QaDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "launch":
        return <LaunchDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "support":
        return <SupportDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "strategy":
        return <StrategyDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
      case "discovery":
      default:
        return <DiscoveryDemo accent={demoAccent} ink={demoInk} paper={demoPaper} />;
    }
  };

  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>
            How We Build Your Website
          </span>
          <h2 className="text-3xl md:text-5xl font-light" style={{ color: c.dark }}>
            Ten phases, each one interactive
          </h2>
          <p className="mt-4 text-lg" style={{ color: c.textOnLight }}>
            Tap a phase to see exactly how we build your site — and try the tools yourself.
          </p>
        </motion.div>

        {/* Phase selector */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {phases.map((p, i) => (
            <button
              key={p.num}
              onClick={() => setActivePhase(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                i === activePhase ? "text-white shadow-md" : "hover:scale-105"
              }`}
              style={{
                backgroundColor: i === activePhase ? c.primary : c.lightAlt,
                color: i === activePhase ? "#fff" : c.textOnLight,
                border: `1px solid ${i === activePhase ? c.primary : c.border}`,
              }}
            >
              {p.num} · {p.title}
            </button>
          ))}
        </motion.div>

        {/* Active phase content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: copy */}
          <motion.div
            key={phase.num}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl font-light" style={{ color: c.primary }}>{phase.num}</span>
              <div className="h-[1px] flex-1" style={{ backgroundColor: c.border }} />
            </div>
            <h3 className="text-3xl md:text-4xl font-light mb-3" style={{ color: c.dark }}>
              {phase.title}
            </h3>
            <p className="text-lg font-medium mb-4" style={{ color: c.primary }}>
              {phase.tagline}
            </p>
            <p className="text-base leading-relaxed mb-6" style={{ color: c.textOnLight }}>
              {phase.copy}
            </p>

            {/* Phase-specific controls */}
            {phase.demo === "palette" && (
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: c.textMuted }}>
                  Accent — tap a swatch to retint this panel
                </div>
                <div className="flex gap-3">
                  {paletteSwatches.map((s, i) => (
                    <button
                      key={s.name}
                      onClick={() => setSwatch(i)}
                      className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                        i === swatch ? "scale-110 border-black/40" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: s.accent }}
                      title={s.name}
                    />
                  ))}
                </div>
                <div className="mt-2 text-sm" style={{ color: c.textMuted }}>
                  {paletteSwatches[swatch].name} · live
                </div>
              </div>
            )}

            {phase.demo === "type" && (
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: c.textMuted }}>
                  Typography — choose a pairing
                </div>
                <div className="flex flex-wrap gap-2">
                  {typeOptions.map((t, i) => (
                    <button
                      key={t.name}
                      onClick={() => setTypeIdx(i)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        i === typeIdx ? "text-white" : "hover:scale-105"
                      }`}
                      style={{
                        backgroundColor: i === typeIdx ? c.primary : c.lightAlt,
                        color: i === typeIdx ? "#fff" : c.textOnLight,
                        border: `1px solid ${i === typeIdx ? c.primary : c.border}`,
                      }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <a
              href="/auth/register"
              className="inline-flex items-center justify-center px-8 h-12 rounded-full text-base font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: c.primary }}
            >
              Book a call
            </a>
          </motion.div>

          {/* Right: live demo */}
          <motion.div
            key={`${phase.num}-${swatch}-${typeIdx}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${phase.num}-${swatch}-${typeIdx}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                {renderDemo()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}