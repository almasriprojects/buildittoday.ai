"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { defaultColors, type ThemeColors } from "@/components/main/craft-demos";

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

const faqs = [
  { q: "How long does it take?", a: "One week from approval to launch. We start building as soon as you provide your business information." },
  { q: "Can I make changes later?", a: "Yes! You can request changes at any time. Standard change requests are $200 each. Higher-tier plans include free updates." },
  { q: "What if I don't like it?", a: "We offer 3 free revisions to make sure you're happy with your website. We work closely with you until it's perfect." },
  { q: "Do you include hosting?", a: "Yes, one year of hosting is included in the price. After that, hosting is $50/month which includes maintenance and updates." },
  { q: "Is it mobile-friendly?", a: "100%. Every website we build is fully responsive and tested on mobile devices first." },
  { q: "What about SEO?", a: "Basic SEO is built into every site we create — meta tags, proper heading structure, fast load times, and Google Maps integration." },
  { q: "Can I use my own domain?", a: "Absolutely. We can connect your existing domain or help you register a new one." },
  { q: "What payment options do you offer?", a: "We accept credit cards via Stripe. Payment is due upon completion and launch of your website." },
];

export default function FAQPage() {
  const c = defaultColors;
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max max-w-3xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>FAQ</span>
          <h2 className="text-3xl md:text-5xl font-light mb-4" style={{ color: c.dark }}>Frequently Asked Questions</h2>
          <p className="text-lg leading-relaxed" style={{ color: c.textOnLight }}>Everything you need to know about our service.</p>
        </motion.div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.05, duration: 0.6 }}>
              <FAQItem question={faq.q} answer={faq.a} colors={c} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer, colors }: { question: string; answer: string; colors: ThemeColors }) {
  const c = colors;
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-2xl border p-6 cursor-pointer transition-shadow hover:shadow-md"
      style={{ backgroundColor: c.lightAlt, borderColor: c.border }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex justify-between items-start gap-4">
        <h3 className="text-lg font-medium flex-1" style={{ color: c.dark }}>{question}</h3>
        <span className="text-2xl flex-shrink-0" style={{ color: c.primary }}>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: c.textOnLight }}>{answer}</p>
      )}
    </div>
  );
}