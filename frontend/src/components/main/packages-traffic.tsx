"use client";

import { motion } from "framer-motion";
import { packages, trafficLayers } from "@/lib/site-data";
import { defaultColors, type ThemeColors } from "./craft-demos";

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

export function PackagesSection({ colors = defaultColors }: { colors?: ThemeColors }) {
  const c = colors;
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.lightAlt }}>
      <div className="container-max">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>Build Packages</span>
          <h2 className="text-3xl md:text-5xl font-light" style={{ color: c.dark }}>Three ways to work together</h2>
          <p className="mt-4 text-lg" style={{ color: c.textOnLight }}>All three are yours to keep. Every price here is a real starting point, not a &ldquo;contact us.&rdquo;</p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {packages.map((p, i) => (
            <motion.div key={p.name} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.7 }}
              className={`relative rounded-2xl border p-8 flex flex-col ${p.popular ? "shadow-xl" : ""}`}
              style={{ backgroundColor: c.lightAlt, borderColor: p.popular ? c.primary : c.border }}
            >
              {p.popular && (
                <span className="absolute -top-3 left-8 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: c.primary }}>Most popular</span>
              )}
              <h3 className="text-xl font-medium mb-1" style={{ color: c.dark }}>{p.name}</h3>
              <div className="mb-4">
                  <span className="text-4xl font-light" style={{ color: c.dark }}>{p.price}</span>
                  <span className="ml-2 text-sm" style={{ color: c.textMuted }}>once</span>
                  <div className="mt-1 text-sm" style={{ color: c.primary }}>then {p.monthly}</div>
                </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: c.textOnLight }}>{p.tagline}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm" style={{ color: c.textOnLight }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${c.primary}22` }}>
                      <svg className="w-2.5 h-2.5" style={{ color: c.primary }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={p.href ?? "/#book"} className="inline-flex items-center justify-center h-12 rounded-full text-base font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: c.primary }}>
                {p.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrafficSection({ colors = defaultColors }: { colors?: ThemeColors }) {
  const c = colors;
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>Growth & Traffic</span>
          <h2 className="text-3xl md:text-5xl font-light" style={{ color: c.dark }}>A launch is day one, not the finish line</h2>
          <p className="mt-4 text-lg" style={{ color: c.textOnLight }}>Traffic compounds — slowly, then suddenly. SEO + AEO with Ahrefs, Analytics + CRO with PostHog.</p>
          <div className="mt-6 text-4xl font-light" style={{ color: c.dark }}>Starting at <span style={{ color: c.primary }}>$2,000/mo</span></div>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {trafficLayers.map((t, i) => (
            <motion.div key={t.title} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.6 }}
              className="rounded-2xl border p-6" style={{ backgroundColor: c.lightAlt, borderColor: c.border }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium" style={{ color: c.dark }}>{t.title}</h3>
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: `${c.primary}22`, color: c.primary }}>{t.tool}</span>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: c.primary }}>{t.headline}</p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: c.textOnLight }}>{t.copy}</p>
              <p className="text-xs leading-relaxed" style={{ color: c.textMuted }}><strong style={{ color: c.textOnLight }}>Why it matters:</strong> {t.why}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}