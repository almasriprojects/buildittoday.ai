"use client";

import { motion } from "framer-motion";
import { defaultColors } from "@/components/main/craft-demos";
import { ENTRY } from "@/lib/pricing";

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

const services = [
  { title: "Website Design & Development", desc: "Custom-built websites tailored to your business, not templates." },
  { title: "Mobile-Responsive Design", desc: "Your site looks great on every device — phone, tablet, desktop." },
  { title: "Contact Forms & Lead Capture", desc: "Turn visitors into customers with built-in contact forms." },
  { title: "Google Maps Integration", desc: "Help customers find you with embedded maps and directions." },
  { title: "SEO Optimization", desc: "Basic SEO setup so Google can find your business." },
  { title: "Performance Optimization", desc: "Fast-loading sites that keep visitors engaged." },
  { title: "One-Year Hosting Included", desc: "We host your site for free for the first year." },
  { title: "Monthly Maintenance Plans", desc: `Keep your site updated from $${ENTRY.monthly}/month.` },
];

export function ServicesContent() {
  const c = defaultColors;
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max max-w-5xl mx-auto">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>Our Services</span>
          <h2 className="text-3xl md:text-5xl font-light mb-4" style={{ color: c.dark }}>Everything you need to get online</h2>
          <p className="text-lg leading-relaxed" style={{ color: c.textOnLight }}>
            Everything you need to get your small business online and attracting customers.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ delay: (i % 2) * 0.1, duration: 0.6 }}
              className="rounded-2xl border p-8 flex flex-col"
              style={{ backgroundColor: c.lightAlt, borderColor: c.border }}
            >
              <div className="flex items-start gap-4">
                <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${c.primary}22` }}>
                  <svg className="w-4 h-4" style={{ color: c.primary }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </span>
                <div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: c.dark }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: c.textOnLight }}>{s.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}