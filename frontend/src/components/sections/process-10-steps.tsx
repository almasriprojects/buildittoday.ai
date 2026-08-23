"use client";

import { motion } from "framer-motion";
import { processSteps10 } from "@/lib/process-steps";

interface Process10StepsProps {
  // Optional theme colors — when provided, uses them; otherwise falls back to stone palette
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

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

export function Process10Steps({ colors }: Process10StepsProps) {
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

  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max">
        {/* Header */}
        <motion.div
          {...fadeInUp}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <span
            className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: c.primary }}
          >
            How We Build Your Website
          </span>
          <h2 className="text-3xl md:text-5xl font-light" style={{ color: c.dark }}>
            Ten steps from idea to launch
          </h2>
          <p className="mt-4 text-lg" style={{ color: c.textOnLight }}>
            A proven process that takes you from first call to a live, working website — with zero guesswork.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {processSteps10.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 5) * 0.1, duration: 0.6 }}
              className="group relative"
            >
              <div
                className="relative h-full rounded-2xl p-6 border transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  backgroundColor: c.lightAlt,
                  borderColor: c.border,
                }}
              >
                {/* Step number */}
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="text-3xl font-light select-none transition-colors duration-300"
                    style={{ color: c.textMuted }}
                  >
                    {step.num}
                  </span>
                  {/* Connector line */}
                  <div className="h-[1px] flex-1 ml-4" style={{ backgroundColor: c.border }} />
                </div>

                {/* Title */}
                <h3 className="text-base font-medium mb-2" style={{ color: c.dark }}>
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed" style={{ color: c.textOnLight }}>
                  {step.desc}
                </p>

                {/* Accent bar on hover */}
                <div
                  className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: c.primary }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div {...fadeInUp} className="text-center mt-16">
          <a
            href="/#book"
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