"use client";

import { motion } from "framer-motion";
import { BookingCalendar } from "./booking-calendar";
import { defaultColors, type ThemeColors } from "./craft-demos";

interface BookingSectionProps {
  colors?: ThemeColors;
}

export function BookingSection({ colors = defaultColors }: BookingSectionProps) {
  const c = colors;
  return (
    // Every "Book a call" button on the page targets this anchor. Before, they
    // all pointed at /auth/register — a password form — so nobody who wanted a
    // call could reach the calendar sitting right here.
    <section id="book" className="scroll-mt-20 py-24 md:py-32" style={{ backgroundColor: c.light }}>
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:sticky lg:top-24"
          >
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: c.primary }}>
              Book a Website Call
            </span>
            <h2 className="text-3xl md:text-5xl font-light mb-6" style={{ color: c.dark }}>
              Book a Website Call
            </h2>
            <p className="text-lg leading-relaxed mb-6" style={{ color: c.textOnLight }}>
              Thirty minutes. Already have a site? We&rsquo;ll review it and show you clear ways to turn more visitors into booked calls. Starting fresh? We&rsquo;ll map the site you need so you launch ready to earn them.
            </p>
            <div className="flex items-center gap-3 mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ backgroundColor: `${c.primary}15`, color: c.primary }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                30 min · complimentary call
              </span>
              <span className="text-sm" style={{ color: c.textMuted }}>Times in America/New_York</span>
            </div>
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <BookingCalendar colors={c} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}