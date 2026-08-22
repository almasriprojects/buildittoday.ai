"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { processSteps10 } from "@/lib/process-steps";
import { defaultColors, type ThemeColors } from "./craft-demos";

// Extra detail shown when a step is expanded
const stepDetails: Record<string, string> = {
  "01": "A relaxed 30-minute call. We learn your business, your customers, and what makes you different — so everything we build after this is shaped by real answers, not guesses.",
  "02": "We map your site structure, pages, and conversion goals. Every page gets a clear job, so visitors always know where to go and what to do next.",
  "03": "A unique, on-brand design — never a template. We craft the look and feel and show it to you before any code is written.",
  "04": "You review the design and we refine it together. Three rounds of revisions are included, no questions asked, until it feels exactly right.",
  "05": "Clean, fast, mobile-responsive code that loads in under 2 seconds. Built to rank and built to convert.",
  "06": "Sharp, conversion-focused copy and your real photos and details placed throughout — so the site sounds like you, not a template.",
  "07": "Technical SEO, Google Search Console, and analytics set up so you can see exactly where your visitors come from and what they do.",
  "08": "We test on every device and browser, fix any issues, and make sure everything works flawlessly before launch.",
  "09": "Your site goes live on your own domain with SSL, hosting, and everything configured. You're officially online.",
  "10": "We monitor, update, and support your site so it keeps performing while you run your business. You're never on your own.",
};

interface Process10GridProps {
  colors?: ThemeColors;
}

export function Process10Grid({ colors = defaultColors }: Process10GridProps) {
  const c = colors;
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.dark }}>
      <div className="container-max">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primaryLight }}>
            How We Build Your Website
          </span>
          <h2 className="text-3xl md:text-5xl font-light text-on-dark-white">
            Ten steps from idea to launch
          </h2>
          <p className="mt-4 text-lg text-on-dark">
            All ten steps, always visible. Click any step to expand the detail — the rest stay right where they are.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {processSteps10.map((step, i) => {
            const isOpen = expanded === i;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 5) * 0.08, duration: 0.5 }}
                className="relative"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className={`w-full text-left rounded-2xl border p-5 transition-all duration-300 ${
                    isOpen ? "shadow-lg -translate-y-1" : "hover:-translate-y-0.5"
                  }`}
                  style={{
                    backgroundColor: isOpen ? "#2A2624" : "#221E1C",
                    borderColor: isOpen ? c.primary : "#44403C",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-light select-none" style={{ color: isOpen ? c.primaryLight : "#A8A29E" }}>
                      {step.num}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                      style={{ backgroundColor: isOpen ? c.primary : `${c.primary}33`, color: isOpen ? "#fff" : c.primaryLight }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </span>
                  </div>
                  <h3 className="text-base font-medium mb-1 text-on-dark-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-light">{step.desc}</p>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t border-on-dark">
                          <p className="text-sm leading-relaxed text-light">
                            {stepDetails[step.num]}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mt-16"
        >
          <a
            href="/auth/register"
            className="inline-flex items-center justify-center px-8 h-12 rounded-full text-base font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: c.primary }}
          >
            Start Step 1 — Book Your Free Call
          </a>
        </motion.div>
      </div>
    </section>
  );
}