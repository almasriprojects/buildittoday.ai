"use client";

import type { DesignSpec } from "@/lib/intake-config";
import { resolveColors, resolveDarkCanvas, sectionDefs, fontStack, resolveType } from "@/lib/intake-config";

interface Props {
  spec: DesignSpec;
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
      {children}
    </span>
  );
}

// ─── CSS-drawn image placeholder (no asset files needed) ───
function ImagePlaceholder({
  label,
  gradient,
  height = 220,
  radius,
  icon = "🖼️",
}: {
  label: string;
  gradient: string;
  height?: number;
  radius: number;
  icon?: string;
}) {
  return (
    <div
      className="w-full flex flex-col items-center justify-center gap-2 text-white"
      style={{
        height,
        borderRadius: radius,
        background: gradient,
        textShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
    </div>
  );
}

export function PageAssembly({ spec }: Props) {
  const c = resolveColors(spec);
  const isDark = spec.mode === "dark";
  const dc = resolveDarkCanvas(spec);
  const bg = isDark ? dc.bg : c.light;
  const fg = isDark ? dc.fg : c.dark;
  const cardBg = isDark ? dc.card : c.lightAlt;
  const border = isDark ? dc.border : c.border;
  const muted = c.textMuted;
  const radius = spec.radius === "0px" ? 0 : spec.radius === "6px" ? 6 : spec.radius === "12px" ? 12 : 24;
  const shadow =
    spec.shadow === "flat"
      ? "none"
      : spec.shadow === "subtle"
      ? "0 4px 12px rgba(0,0,0,0.06)"
      : spec.shadow === "medium"
      ? "0 10px 30px rgba(0,0,0,0.1)"
      : "0 24px 60px rgba(0,0,0,0.18)";
  const borderColor = spec.border === "borderless" ? "transparent" : border;
  const fontFamily = fontStack[spec.font].body;
  const type = resolveType(spec);

  const headingStyle: React.CSSProperties = {
    fontFamily: type.headingFont,
    fontWeight: type.headingWeight,
    fontStyle: type.headingStyle,
    letterSpacing: type.letterSpacing,
    textTransform: type.headingCase,
  };
  const bodyStyle: React.CSSProperties = {
    fontFamily: type.bodyFont,
    fontWeight: type.bodyWeight,
  };

  const heroVariant = spec.sections.hero;
  const headerVariant = spec.sections.header;
  const featuresVariant = spec.sections.features;
  const processVariant = spec.sections.process;
  const statsVariant = spec.sections.stats;
  const testimonialsVariant = spec.sections.testimonials;
  const pricingVariant = spec.sections.pricing;
  const faqVariant = spec.sections.faq;
  const teamVariant = spec.sections.team;
  const ctaVariant = spec.sections.cta;
  const footerVariant = spec.sections.footer;

  const imgGradient = `linear-gradient(135deg, ${c.primary} 0%, ${c.dark} 100%)`;
  const imgGradient2 = `linear-gradient(135deg, ${c.dark} 0%, ${c.primary} 100%)`;

  const navLinks = ["Home", "Services", "Pricing", "Contact"];
  const primaryBtn: React.CSSProperties = {
    backgroundColor: c.primary,
    color: "#fff",
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: radius / 1.2,
    border: "none",
    cursor: "pointer",
    ...headingStyle,
  };
  const ghostBtn: React.CSSProperties = {
    backgroundColor: "transparent",
    color: fg,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: radius / 1.2,
    border: `1px solid ${border}`,
    cursor: "pointer",
    ...headingStyle,
  };

  return (
    <div style={{ backgroundColor: bg, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", fontFamily }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ backgroundColor: cardBg, borderBottom: `1px solid ${borderColor}` }}>
        <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
        <span className="ml-4 flex-1 max-w-[320px] px-3 py-1 rounded-md text-[11px] text-slate-500" style={{ backgroundColor: isDark ? dc.bg : "#F1F5F9" }}>
          https://yourbusiness.com
        </span>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* ═══════════ HEADER (6 types) ═══════════ */}
        <div data-section="header">
          <SectionTag>Header / Navigation — {getLabel(headerVariant)}</SectionTag>

          {headerVariant === "topbar" && (
            <div className="flex items-center justify-between px-5 py-2 text-[10px]" style={{ backgroundColor: c.dark, color: "rgba(255,255,255,0.85)", borderRadius: radius / 1.5, marginBottom: 8 }}>
              <span>📞 (555) 123-4567</span>
              <span>✉️ hello@yourbusiness.com</span>
              <span>🕘 Mon–Fri 9am–6pm</span>
            </div>
          )}

          {headerVariant === "transparent" ? (
            <div className="flex items-center justify-between px-5 py-3" style={{ position: "relative", zIndex: 2 }}>
              <span className="font-bold text-sm" style={{ color: "#fff" }}>Brand™</span>
              <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.9)" }}>
                {navLinks.map((l) => <span key={l}>{l}</span>)}
              </div>
              <button style={{ ...primaryBtn, backgroundColor: "#fff", color: c.dark }}>Get Started</button>
            </div>
          ) : headerVariant === "floating" ? (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{
                backgroundColor: cardBg,
                borderRadius: 99,
                border: `1px solid ${borderColor}`,
                boxShadow: shadow,
                marginTop: -18,
              }}
            >
              <span className="font-bold text-sm" style={{ color: fg }}>Brand™</span>
              <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: muted }}>
                {navLinks.map((l) => <span key={l}>{l}</span>)}
              </div>
              <button style={primaryBtn}>Get Started</button>
            </div>
          ) : headerVariant === "centered" ? (
            <div className="flex flex-col items-center gap-3 px-5 py-4" style={{ backgroundColor: cardBg, borderRadius: radius / 1.5, border: `1px solid ${borderColor}` }}>
              <span className="font-bold text-sm" style={{ color: fg }}>Brand™</span>
              <div className="flex items-center gap-5 text-xs" style={{ color: muted }}>
                {navLinks.map((l) => <span key={l}>{l}</span>)}
              </div>
              <button style={primaryBtn}>Get Started</button>
            </div>
          ) : headerVariant === "sidebar" ? (
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-3 px-3 py-4" style={{ backgroundColor: cardBg, borderRadius: radius / 1.5, border: `1px solid ${borderColor}`, width: 64 }}>
                <span className="font-bold text-[10px]" style={{ color: fg }}>Brand™</span>
                {["🏠", "🛠️", "💬", "📞"].map((ic, i) => (
                  <span key={i} className="text-sm" style={{ color: i === 0 ? c.primary : muted }}>{ic}</span>
                ))}
              </div>
              <div className="flex-1 flex items-center justify-between px-5 py-3" style={{ backgroundColor: cardBg, borderRadius: radius / 1.5, border: `1px solid ${borderColor}` }}>
                <span className="text-xs" style={{ color: muted }}>Page content area</span>
                <button style={primaryBtn}>Get Started</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: cardBg, borderRadius: radius / 1.5, border: `1px solid ${borderColor}` }}>
              <span className="font-bold text-sm" style={{ color: fg }}>Brand™</span>
              <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: muted }}>
                {navLinks.map((l) => <span key={l}>{l}</span>)}
              </div>
              <button style={primaryBtn}>Get Started</button>
            </div>
          )}
        </div>

        {/* ═══════════ HERO (6 types) ═══════════ */}
        <div data-section="hero">
          <SectionTag>Hero Section — {getLabel(heroVariant)}</SectionTag>

          {heroVariant === "split" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
              <div className="p-8 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl leading-tight mb-3" style={{ color: fg, ...headingStyle }}>
                  Websites that <em style={{ color: c.primary }}>work as hard</em> as you do.
                </h2>
                <p className="text-xs md:text-sm mb-6" style={{ color: muted, ...bodyStyle }}>
                  Custom designed and built onto scalable component systems.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button style={primaryBtn}>Get a Free Quote</button>
                  <button style={ghostBtn}>View Portfolio</button>
                </div>
              </div>
              <ImagePlaceholder label="Your product / team photo" gradient={imgGradient} height={260} radius={0} icon="📸" />
            </div>
          ) : heroVariant === "video" ? (
            <div className="relative overflow-hidden" style={{ backgroundColor: c.dark, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
              <div className="p-8 md:p-10 text-center">
                <h2 className="text-2xl md:text-3xl leading-tight mb-3" style={{ color: "#fff", ...headingStyle }}>
                  See it in action
                </h2>
                <p className="text-xs md:text-sm mb-6 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.7)", ...bodyStyle }}>
                  A short brand video or product walkthrough.
                </p>
                <div className="flex items-center justify-center">
                  <span className="flex items-center justify-center w-14 h-14 rounded-full" style={{ backgroundColor: c.primary, color: "#fff", fontSize: 20, boxShadow: "0 0 0 8px rgba(255,255,255,0.15)" }}>
                    ▶
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${c.primary}, ${c.dark})` }} />
            </div>
          ) : heroVariant === "left" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
              <div className="p-8 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl leading-tight mb-3" style={{ color: fg, ...headingStyle }}>
                  Turn visitors into <em style={{ color: c.primary }}>customers</em>.
                </h2>
                <p className="text-xs md:text-sm mb-6" style={{ color: muted, ...bodyStyle }}>
                  Tell us about your project and get a free quote.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button style={primaryBtn}>Get a Free Quote</button>
                  <button style={ghostBtn}>Learn More</button>
                </div>
              </div>
              <div className="p-6 flex items-center justify-center" style={{ backgroundColor: bg }}>
                <div className="w-full max-w-[240px] p-5 space-y-3" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="block text-xs font-semibold" style={{ color: fg }}>Get your free quote</span>
                  <input type="text" placeholder="Name" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                  <input type="text" placeholder="Email" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                  <button style={{ ...primaryBtn, width: "100%" }}>Request Quote</button>
                </div>
              </div>
            </div>
          ) : heroVariant === "badge" ? (
            <div className="p-8 md:p-10 text-center" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold mb-4" style={{ backgroundColor: c.primary + "1A", color: c.primary }}>
                ★ Award-Winning Service
              </span>
              <h2 className="text-2xl md:text-4xl leading-tight mb-3" style={{ color: fg, ...headingStyle }}>
                Trusted by <em style={{ color: c.primary }}>500+</em> businesses.
              </h2>
              <p className="text-xs md:text-sm mb-6 max-w-md mx-auto" style={{ color: muted, ...bodyStyle }}>
                Custom websites that look great and convert visitors.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button style={primaryBtn}>Get Started</button>
                <button style={ghostBtn}>See Our Work</button>
              </div>
            </div>
          ) : heroVariant === "minimal" ? (
            <div className="p-10 md:p-14 text-center" style={{ backgroundColor: "transparent" }}>
              <h2 className="text-3xl md:text-5xl leading-tight mb-4" style={{ color: fg, ...headingStyle }}>
                Less noise. <em style={{ color: c.primary }}>More signal.</em>
              </h2>
              <p className="text-sm md:text-base mb-8 max-w-lg mx-auto" style={{ color: muted, ...bodyStyle }}>
                A clean, focused website that lets your work speak for itself.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button style={{ ...primaryBtn, padding: "10px 24px", fontSize: 13 }}>Start a Project</button>
                <button style={{ ...ghostBtn, padding: "10px 24px", fontSize: 13 }}>Contact</button>
              </div>
            </div>
          ) : (
            <div className="p-8 md:p-10 text-center" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
              <h2 className="text-2xl md:text-4xl leading-tight mb-3" style={{ color: fg, ...headingStyle }}>
                Websites that <em style={{ color: c.primary }}>work as hard</em> as you do.
              </h2>
              <p className="text-xs md:text-sm mb-6 max-w-md mx-auto" style={{ color: muted, ...bodyStyle }}>
                Custom designed and built onto scalable component systems.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button style={primaryBtn}>Get a Free Quote</button>
                <button style={ghostBtn}>View Portfolio</button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ FORMS (shown if selected) ═══════════ */}
        {spec.forms.length > 0 && (
          <div data-section="forms">
            <SectionTag>Forms & Lead Capture</SectionTag>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {spec.forms.includes("contact") && (
                <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="block text-xs font-semibold mb-3" style={{ color: fg }}>📧 Contact Form</span>
                  <div className="space-y-2">
                    <input type="text" placeholder="Name" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    <input type="text" placeholder="Email" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    <textarea rows={2} placeholder="Message" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none", resize: "vertical" }} />
                    <button style={{ ...primaryBtn, width: "100%" }}>Send Message</button>
                  </div>
                </div>
              )}
              {spec.forms.includes("booking") && (
                <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="block text-xs font-semibold mb-3" style={{ color: fg }}>📅 Booking / Appointment</span>
                  <div className="space-y-2">
                    <input type="text" placeholder="Your name" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Date" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                      <input type="text" placeholder="Time" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    </div>
                    <button style={{ ...primaryBtn, width: "100%" }}>Book Appointment</button>
                  </div>
                </div>
              )}
              {spec.forms.includes("quote") && (
                <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="block text-xs font-semibold mb-3" style={{ color: fg }}>📋 Quote Request</span>
                  <div className="space-y-2">
                    <input type="text" placeholder="Project details" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    <input type="text" placeholder="Budget" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    <button style={{ ...primaryBtn, width: "100%" }}>Request Quote</button>
                  </div>
                </div>
              )}
              {spec.forms.includes("newsletter") && (
                <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="block text-xs font-semibold mb-3" style={{ color: fg }}>📬 Newsletter Signup</span>
                  <div className="space-y-2">
                    <input type="text" placeholder="Email address" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    <button style={{ ...primaryBtn, width: "100%" }}>Subscribe</button>
                  </div>
                </div>
              )}
              {spec.forms.includes("payment") && (
                <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="block text-xs font-semibold mb-3" style={{ color: fg }}>💳 Payment / Checkout</span>
                  <div className="space-y-2">
                    <input type="text" placeholder="Card number" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="MM/YY" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                      <input type="text" placeholder="CVC" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    </div>
                    <button style={{ ...primaryBtn, width: "100%" }}>Pay Now</button>
                  </div>
                </div>
              )}
              {spec.forms.includes("multistep") && (
                <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="block text-xs font-semibold mb-3" style={{ color: fg }}>🪜 Multi-step Lead Form</span>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3].map((s) => (
                      <span key={s} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: s === 1 ? c.primary : "rgba(0,0,0,0.1)" }} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <input type="text" placeholder="Step 1: Your name" style={{ width: "100%", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: radius / 2, padding: "7px 10px", fontSize: 11, color: fg, outline: "none" }} />
                    <button style={{ ...primaryBtn, width: "100%" }}>Continue →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ LOGOS ═══════════ */}
        <div data-section="logos">
          <SectionTag>Logo Cloud / Trust</SectionTag>
          <div className="flex flex-wrap items-center justify-center gap-3 py-4" style={{ borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
            {["ACME", "NEXUS", "BLUELINE", "VOLTA", "ORBITA"].map((logo) => (
              <span key={logo} className="px-5 py-2 text-xs font-bold tracking-widest" style={{ color: muted, opacity: 0.7 }}>
                {logo}
              </span>
            ))}
          </div>
        </div>

        {/* ═══════════ FEATURES ═══════════ */}
        <div data-section="features">
          <SectionTag>Features & Value Props ({getLabel(featuresVariant)})</SectionTag>
          {featuresVariant === "rows" || featuresVariant === "list" ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`p-5 flex items-center gap-4 ${featuresVariant === "rows" && i % 2 === 1 ? "flex-row-reverse" : ""}`}
                  style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}
                >
                  <span className="text-2xl">{"⚡🛡️💡"[i]}</span>
                  <div>
                    <strong className="text-sm block" style={{ color: fg }}>Feature {i + 1}</strong>
                    <span className="text-[11px]" style={{ color: muted }}>Description of value proposition {i + 1}.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].slice(0, featuresVariant === "4col" ? 4 : 3).map((i) => (
                <div key={i} className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="text-xl block mb-2">{"⚡🔒🚀🎯🧩🔄"[i]}</span>
                  <strong className="text-xs block" style={{ color: fg }}>Feature</strong>
                  <span className="text-[10px]" style={{ color: muted }}>Value prop text.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════ PROCESS ═══════════ */}
        <div data-section="process">
          <SectionTag>How It Works / Process ({getLabel(processVariant)})</SectionTag>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["Discovery", "Design", "Refine", "Launch"].map((step, i) => (
              <div key={step} className="p-4 text-center" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                <span className="block text-2xl mb-2" style={{ color: c.primary }}>0{i + 1}</span>
                <span className="text-xs font-semibold" style={{ color: fg }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════ STATS (shown if selected) ═══════════ */}
        {spec.contentSections.includes("stats") && (
          <div data-section="stats">
            <SectionTag>Stats & Metrics ({getLabel(statsVariant)})</SectionTag>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[["500+", "Projects"], ["98%", "Satisfaction"], ["12yr", "Experience"], ["24/7", "Support"]].map(([num, label]) => (
                <div key={label} className="p-5 text-center" style={{ backgroundColor: statsVariant === "dark" ? c.dark : cardBg, borderRadius: radius, border: statsVariant === "dark" ? "none" : `1px solid ${borderColor}`, boxShadow: shadow, color: statsVariant === "dark" ? "#fff" : fg }}>
                  <span className="block text-2xl font-bold" style={{ color: statsVariant === "dark" ? "#fff" : c.primary, ...headingStyle }}>{num}</span>
                  <span className="text-[11px]" style={{ color: statsVariant === "dark" ? "rgba(255,255,255,0.7)" : muted }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ TESTIMONIALS (shown if selected) ═══════════ */}
        {spec.contentSections.includes("testimonials") && (
          <div data-section="testimonials">
            <SectionTag>Testimonials & Social Proof ({getLabel(testimonialsVariant)})</SectionTag>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((t) => (
                <div key={t} className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <div className="text-[#F59E0B] text-xs mb-2">★★★★★</div>
                  <p className="text-[11px] italic mb-3" style={{ color: muted }}>
                    &ldquo;This will be testimonial quote {t + 1} from a happy customer.&rdquo;
                  </p>
                  <span className="text-[11px] font-semibold" style={{ color: fg }}>Client {t + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ PRICING (shown if selected) ═══════════ */}
        {spec.contentSections.includes("pricing") && (
          <div data-section="pricing">
            <SectionTag>Pricing & Plans ({getLabel(pricingVariant)})</SectionTag>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[["Starter", "$99"], ["Pro", "$199"], ["Premium", "$399"]].map(([plan, price], i) => (
                <div key={plan} className="p-5 text-center" style={{ backgroundColor: i === 1 ? c.dark : cardBg, borderRadius: radius, border: i === 1 ? "none" : `1px solid ${borderColor}`, boxShadow: shadow, color: i === 1 ? "#fff" : fg }}>
                  <span className="block text-xs font-semibold mb-1" style={{ color: i === 1 ? "rgba(255,255,255,0.8)" : muted }}>{plan}</span>
                  <span className="block text-2xl font-bold mb-3" style={{ color: i === 1 ? "#fff" : c.primary, ...headingStyle }}>{price}<span className="text-[10px] font-normal">/mo</span></span>
                  <button style={i === 1 ? { ...primaryBtn, backgroundColor: "#fff", color: c.dark } : primaryBtn}>Choose {plan}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ BLOG (shown if selected) ═══════════ */}
        {spec.contentSections.includes("blog") && (
          <div data-section="blog">
            <SectionTag>Blog / News</SectionTag>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((b) => (
                <div key={b} className="p-4" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <ImagePlaceholder label={`Article ${b + 1} cover`} gradient={b % 2 === 0 ? imgGradient : imgGradient2} height={90} radius={radius / 1.5} icon="📰" />
                  <span className="block text-[11px] font-semibold mt-3" style={{ color: fg }}>Blog post title {b + 1}</span>
                  <span className="text-[10px]" style={{ color: muted }}>Short excerpt of the article goes here.</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ FAQ / HELP (6 types, shown if selected) ═══════════ */}
        {spec.contentSections.includes("faq") && (
        <div data-section="faq">
          <SectionTag>FAQ / Help — {getLabel(faqVariant)}</SectionTag>

          {faqVariant === "support" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 space-y-3" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                {["How do I get started?", "What does it cost?", "How long does it take?"].map((q, i) => (
                  <div key={i} className="p-3 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                    <span className="text-[11px] font-semibold block" style={{ color: fg }}>{q}</span>
                    <span className="text-[10px]" style={{ color: muted }}>Short answer to the question goes here.</span>
                  </div>
                ))}
              </div>
              <div className="p-5 flex flex-col items-center justify-center text-center" style={{ backgroundColor: c.dark, borderRadius: radius, boxShadow: shadow, color: "#fff" }}>
                <span className="text-3xl mb-2">💬</span>
                <span className="text-sm font-semibold mb-1">Still need help?</span>
                <span className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>Our team replies within 1 business day.</span>
                <button style={{ ...primaryBtn, backgroundColor: "#fff", color: c.dark }}>Contact Support</button>
              </div>
            </div>
          ) : faqVariant === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[["🚀", "Getting Started"], ["💳", "Billing"], ["🔧", "Troubleshooting"]].map(([ic, label]) => (
                <div key={label} className="p-5 text-center" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="text-2xl block mb-2">{ic}</span>
                  <span className="text-xs font-semibold block mb-1" style={{ color: fg }}>{label}</span>
                  <span className="text-[10px]" style={{ color: muted }}>Browse help articles in this category.</span>
                </div>
              ))}
            </div>
          ) : faqVariant === "2col" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["How do I get started?", "What does it cost?", "How long does it take?", "Do you offer support?"].map((q, i) => (
                <div key={i} className="p-4" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                  <span className="text-[11px] font-semibold block mb-1" style={{ color: fg }}>{q}</span>
                  <span className="text-[10px]" style={{ color: muted }}>Answer to the question goes here.</span>
                </div>
              ))}
            </div>
          ) : faqVariant === "tabs" ? (
            <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
              <div className="flex gap-1 text-xs mb-4">
                <span className="px-3 py-1.5 rounded-t-md" style={{ backgroundColor: c.primary, color: "#fff", ...headingStyle }}>General</span>
                <span className="px-3 py-1.5 rounded-t-md" style={{ color: muted, ...headingStyle }}>Billing</span>
                <span className="px-3 py-1.5 rounded-t-md" style={{ color: muted, ...headingStyle }}>Support</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: fg }}>How do I get started?</div>
                <div className="p-3 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: fg }}>What does it cost?</div>
              </div>
            </div>
          ) : faqVariant === "search" ? (
            <div className="p-5" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                <span style={{ color: muted }}>🔍</span>
                <input type="text" placeholder="Search help articles…" style={{ flex: 1, backgroundColor: "transparent", border: "none", outline: "none", fontSize: 12, color: fg }} />
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: fg }}>How do I get started?</div>
                <div className="p-3 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: fg }}>What does it cost?</div>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-2" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
              {["How do I get started?", "What does it cost?", "How long does it take?"].map((q, i) => (
                <div key={i} className="p-3 rounded-md" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                  <span className="text-[11px] font-semibold block" style={{ color: fg }}>{q} <span style={{ color: c.primary }}>▾</span></span>
                  <span className="text-[10px]" style={{ color: muted }}>Answer to the question goes here.</span>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ═══════════ TEAM (shown if selected) ═══════════ */}
        {spec.contentSections.includes("team") && (
        <div data-section="team">
          <SectionTag>Team & About ({getLabel(teamVariant)})</SectionTag>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((m) => (
              <div key={m} className="p-5 text-center" style={{ backgroundColor: cardBg, borderRadius: radius, border: `1px solid ${borderColor}`, boxShadow: shadow }}>
                <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-lg font-bold" style={{ background: imgGradient }}>
                  {["A", "B", "C"][m]}
                </div>
                <span className="block text-xs font-semibold" style={{ color: fg }}>Team Member {m + 1}</span>
                <span className="text-[10px]" style={{ color: muted }}>Role / Title</span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* ═══════════ CTA ═══════════ */}
        <div data-section="cta">
          <SectionTag>Call-to-Action / Lead Capture ({getLabel(ctaVariant)})</SectionTag>
          <div
            className="p-8 flex flex-wrap items-center justify-between gap-4"
            style={{
              backgroundColor: ctaVariant === "light" ? cardBg : c.dark,
              borderRadius: radius,
              border: ctaVariant === "light" ? `1px solid ${borderColor}` : "none",
              boxShadow: shadow,
              color: ctaVariant === "light" ? fg : "#FFFFFF",
            }}
          >
            <div>
              <h3 className="text-lg mb-1" style={{ color: ctaVariant === "light" ? fg : "#fff", ...headingStyle }}>
                Stop losing leads you earned
              </h3>
              <p className="text-xs" style={{ color: ctaVariant === "light" ? muted : "rgba(255,255,255,0.7)" }}>
                Turn visitors into scheduled appointments instantly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Enter email"
                style={{ backgroundColor: ctaVariant === "light" ? bg : "rgba(255,255,255,0.12)", border: `1px solid ${ctaVariant === "light" ? border : "rgba(255,255,255,0.3)"}`, borderRadius: radius / 1.5, padding: "9px 14px", fontSize: 11, color: ctaVariant === "light" ? fg : "#fff", outline: "none" }}
              />
              <button style={primaryBtn}>Get Started</button>
            </div>
          </div>
        </div>

        {/* ═══════════ FOOTER ═══════════ */}
        <div data-section="footer">
          <SectionTag>Footer ({getLabel(footerVariant)})</SectionTag>
          <div className="flex flex-wrap justify-between gap-6" style={{ backgroundColor: c.dark, color: "#fff", borderRadius: radius, padding: 24 }}>
            <div>
              <span className="font-bold text-sm block mb-2">Brand™</span>
              {footerVariant === "newsletter" ? (
                <div className="flex gap-2 mt-3">
                  <input type="text" placeholder="Email" style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: radius / 1.5, padding: "7px 12px", fontSize: 11, color: "#fff", outline: "none" }} />
                  <button style={{ ...primaryBtn, padding: "7px 14px", fontSize: 11 }}>Subscribe</button>
                </div>
              ) : (
                <div className="flex gap-6 text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <div><span className="block font-semibold text-white mb-2">About</span>Story</div>
                  <div><span className="block font-semibold text-white mb-2">Services</span>Web Dev</div>
                  <div><span className="block font-semibold text-white mb-2">Contact</span>Email</div>
                </div>
              )}
            </div>
            <div className="text-[10px] self-end" style={{ color: "rgba(255,255,255,0.5)" }}>
              © 2026 Brand™ — All rights reserved.
            </div>
          </div>
        </div>
      </div>

      {/* Selected sections summary */}
      <div className="px-6 pb-6" style={{ borderTop: `1px solid ${borderColor}` }}>
        <SectionTag>Page assembly — selected layouts</SectionTag>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {sectionDefs.map((s) => {
            const selected = spec.sections[s.key];
            const label = s.options.find((o) => o.value === selected)?.label ?? selected;
            return (
              <span key={s.key} className="px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: c.primary + "1A", color: c.primary }}>
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper to get the selected option label
function getLabel(value: string): string {
  const def = sectionDefs.find((s) => s.options.some((o) => o.value === value));
  return def?.options.find((o) => o.value === value)?.label ?? value;
}