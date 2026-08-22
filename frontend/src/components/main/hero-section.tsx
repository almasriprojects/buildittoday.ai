"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { defaultColors, type ThemeColors } from "./craft-demos";

interface HeroSectionProps {
  colors?: ThemeColors;
}

export function HeroSection({ colors = defaultColors }: HeroSectionProps) {
  const c = colors;

  return (
    <section className="relative -mt-16 min-h-screen flex items-center overflow-hidden bg-bg-card-dark">
      {/* Full-bleed photography */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/hero-photo.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
        {/* Dark gradient scrim for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(105deg, rgba(28,25,23,0.92) 0%, rgba(28,25,23,0.75) 32%, rgba(28,25,23,0.35) 55%, rgba(28,25,23,0.15) 75%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(0deg, rgba(28,25,23,0.6) 0%, transparent 30%)`,
          }}
        />
      </div>

      <div className="container-max relative z-10 py-32 md:py-40">
        <div className="max-w-2xl">
          {/* Glass card */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md p-8 md:p-12 shadow-lg">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="w-12 h-[1px]" style={{ backgroundColor: c.primary }} />
              <span className="text-sm font-medium tracking-wide text-on-dark">
                Websites for Florida Small Businesses
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-4xl sm:text-5xl md:text-6xl font-light leading-[0.95] tracking-tight text-on-dark-white"
            >
              Websites that
              <br />
              <span className="font-normal italic" style={{ color: c.primaryLight }}>work as hard</span>
              <br />
              as you do.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-8 text-lg md:text-xl max-w-xl leading-relaxed font-light text-on-dark"
            >
              We design and build websites for small businesses — custom, fast, and yours to keep.
              Launch in one week, from <strong className="text-on-dark-white">$1,500</strong>.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <a
                href="/auth/register"
                className="inline-flex items-center justify-center px-8 h-12 rounded-full text-base font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: c.primary }}
              >
                Book a Free Call
              </a>
              <a
                href="/demo"
                className="inline-flex items-center justify-center px-8 h-12 rounded-full text-base font-medium border border-white/30 text-on-dark-white transition-colors hover:bg-white/10"
              >
                View Our Work
              </a>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-12 pt-6 border-t border-white/15 flex flex-wrap gap-x-8 gap-y-4 text-sm text-light"
            >
              <span>Live site in one week</span>
              <span>•</span>
              <span>You own the code</span>
              <span>•</span>
              <span>No contract — cancel anytime</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-[1px] h-12 relative bg-white/30"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.primary }} />
        </motion.div>
      </div>
    </section>
  );
}
