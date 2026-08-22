"use client";

import { motion } from "framer-motion";
import { automationModules, howWeWork, values } from "@/lib/site-data";
import { defaultColors, type ThemeColors } from "./craft-demos";

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

export function AutomationsSection({ colors = defaultColors }: { colors?: ThemeColors }) {
  const c = colors;
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.dark }}>
      <div className="container-max">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primaryLight }}>Automations</span>
          <h2 className="text-3xl md:text-5xl font-light text-on-dark-white">A website that works the way a good employee would</h2>
          <p className="mt-4 text-lg text-on-dark">Pick your modules. Take one. Take all eight. Starting at <span style={{ color: c.primaryLight }}>$2,500</span>.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {automationModules.map((m, i) => (
            <motion.div key={m.num} {...fadeUp} transition={{ delay: (i % 4) * 0.08, duration: 0.6 }}
              className="rounded-2xl border p-6" style={{ backgroundColor: "#221E1C", borderColor: "#44403C" }}
            >
              <div className="text-xs font-semibold mb-2" style={{ color: c.primaryLight }}>Module {m.num}</div>
              <h3 className="text-base font-medium mb-2 text-on-dark-white">{m.title}</h3>
              <p className="text-sm leading-relaxed text-light">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowWeWorkSection({ colors = defaultColors }: { colors?: ThemeColors }) {
  const c = colors;
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>How We Work</span>
          <h2 className="text-3xl md:text-5xl font-light" style={{ color: c.dark }}>Hire the assistant that never sleeps</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {howWeWork.map((s, i) => (
            <motion.div key={s.num} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.6 }}
              className="rounded-2xl border p-6" style={{ backgroundColor: c.lightAlt, borderColor: c.border }}
            >
              <div className="text-3xl font-light mb-3" style={{ color: c.primary }}>{s.num}</div>
              <h3 className="text-base font-medium mb-2" style={{ color: c.dark }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: c.textOnLight }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection({ colors = defaultColors }: { colors?: ThemeColors }) {
  const c = colors;
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.lightAlt }}>
      <div className="container-max max-w-4xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>About</span>
          <h2 className="text-3xl md:text-5xl font-light mb-4" style={{ color: c.dark }}>Built by BuildItToday.ai</h2>
          <p className="text-lg leading-relaxed" style={{ color: c.textOnLight }}>
            We&rsquo;re a small team obsessed with getting small businesses online fast — without the six-week agency runaround. Every site we build gets the same standard: custom design, real copy, and delivered in days, not months.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {values.map((v, i) => (
            <motion.div key={v.title} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.6 }}
              className="rounded-2xl border p-6" style={{ backgroundColor: c.lightAlt, borderColor: c.border }}
            >
              <h3 className="text-lg font-medium mb-2" style={{ color: c.primary }}>{v.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: c.textOnLight }}>{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection({ colors = defaultColors }: { colors?: ThemeColors }) {
  const c = colors;
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max text-center max-w-3xl mx-auto">
        <motion.div {...fadeUp}>
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>Contact</span>
          <h2 className="text-3xl md:text-5xl font-light mb-6" style={{ color: c.dark }}>Book a Website Call</h2>
          <p className="text-lg leading-relaxed mb-8" style={{ color: c.textOnLight }}>
            Thirty minutes. Already have a site? We&rsquo;ll review it and show you clear ways to turn more visitors into booked calls. Starting fresh? We&rsquo;ll map the site you need so you launch ready to earn them.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="/auth/register" className="inline-flex items-center justify-center px-10 h-12 rounded-full text-base font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: c.primary }}>
              Book a Website Call
            </a>
            <a href="mailto:hello@buildittoday.ai" className="inline-flex items-center justify-center px-10 h-12 rounded-full text-base font-medium border transition-colors" style={{ borderColor: c.border, color: c.dark }}>
              Email Us
            </a>
          </div>
          <p className="mt-6 text-sm" style={{ color: c.textMuted }}>30 min · complimentary call · Times in America/New_York</p>
        </motion.div>
      </div>
    </section>
  );
}