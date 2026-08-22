"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { crafts } from "@/lib/site-data";
import { CraftDemoRenderer, type ThemeColors, defaultColors } from "./craft-demos";

interface CraftsShowcaseProps {
  colors?: ThemeColors;
}

export function CraftsShowcase({ colors = defaultColors }: CraftsShowcaseProps) {
  const c = colors;
  const [active, setActive] = useState(0);
  const craft = crafts[active];

  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>
            The Ten Crafts
          </span>
          <h2 className="text-3xl md:text-5xl font-light" style={{ color: c.dark }}>
            Ten crafts go into a site that sells
          </h2>
          <p className="mt-4 text-lg" style={{ color: c.textOnLight }}>
            Scroll through them, or jump to the one you care about. Every section below is the real thing running, not a screenshot.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-12"
        >
          {crafts.map((cr, i) => (
            <button
              key={cr.num}
              onClick={() => setActive(i)}
              className={`group rounded-2xl p-4 text-left border transition-all duration-300 ${i === active ? "shadow-lg -translate-y-1" : "hover:-translate-y-0.5"}`}
              style={{ backgroundColor: c.lightAlt, borderColor: i === active ? c.primary : c.border }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: i === active ? c.primary : c.textMuted }}>{cr.num}</div>
              <div className="text-sm font-medium" style={{ color: c.dark }}>{cr.title}</div>
              <div className="text-xs mt-1" style={{ color: c.textMuted }}>Jump to it →</div>
            </button>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div key={craft.num} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl font-light" style={{ color: c.primary }}>{craft.num}</span>
              <div className="h-[1px] flex-1" style={{ backgroundColor: c.border }} />
            </div>
            <h3 className="text-3xl md:text-4xl font-light mb-3" style={{ color: c.dark }}>{craft.title}</h3>
            <p className="text-lg font-medium mb-4" style={{ color: c.primary }}>{craft.tagline}</p>
            <p className="text-base leading-relaxed mb-6" style={{ color: c.textOnLight }}>{craft.copy}</p>
            <a href="/auth/register" className="inline-flex items-center justify-center px-8 h-12 rounded-full text-base font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: c.primary }}>
              Book a call
            </a>
          </motion.div>

          <motion.div key={`demo-${craft.num}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <AnimatePresence mode="wait">
              <motion.div key={craft.num} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
                <CraftDemoRenderer demo={craft.demo} colors={c} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}