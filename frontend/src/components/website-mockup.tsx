"use client";

// A realistic, CSS-built browser mockup of a business website.
// Renders a mini site (nav, hero, content) in the business's brand colors.

export interface MockupConfig {
  name: string;
  url: string;
  brand: string; // primary brand color
  brandDark: string; // darker shade
  accent: string; // secondary accent
  bg: string; // page background
  layout: "hero" | "split" | "cards" | "menu" | "gallery" | "services" | "booking" | "repair";
  tagline: string;
}

interface WebsiteMockupProps {
  config: MockupConfig;
  className?: string;
}

function BrowserChrome({ url, brand }: { url: string; brand: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      </div>
      <div className="flex-1 mx-2 flex items-center gap-1.5 px-3 py-1 bg-white rounded-md border border-gray-200">
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 8a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0115.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
        <span className="text-[10px] text-gray-500 truncate">{url}</span>
      </div>
    </div>
  );
}

function MiniNav({ name, brand, dark }: { name: string; brand: string; dark: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: dark ? brand : "#FFFFFF" }}>
      <span className="text-[9px] font-bold tracking-tight" style={{ color: dark ? "#FFFFFF" : brand }}>
        {name}
      </span>
      <div className="flex gap-2">
        {["Home", "About", "Contact"].map((l) => (
          <span key={l} className="text-[7px]" style={{ color: dark ? "rgba(255,255,255,0.7)" : "#9CA3AF" }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniButton({ brand, label }: { brand: string; label: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[7px] font-semibold text-white"
      style={{ backgroundColor: brand }}
    >
      {label}
    </span>
  );
}

function MiniImage({ bg, h = "h-10" }: { bg: string; h?: string }) {
  return (
    <div className={`${h} rounded-md flex items-center justify-center`} style={{ backgroundColor: bg }}>
      <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function MiniLayout({ config }: { config: MockupConfig }) {
  const { brand, brandDark, accent, bg, layout, name, tagline } = config;

  switch (layout) {
    case "split":
      return (
        <div className="grid grid-cols-2 gap-2 p-3" style={{ backgroundColor: bg }}>
          <div className="flex flex-col justify-center gap-1.5">
            <span className="text-[9px] font-bold" style={{ color: brandDark }}>{name}</span>
            <div className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.8 }} />
            <div className="h-1 w-3/5 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.4 }} />
            <div className="mt-1"><MiniButton brand={brand} label="Book Now" /></div>
          </div>
          <MiniImage bg={accent} h="h-16" />
        </div>
      );

    case "cards":
      return (
        <div className="p-3" style={{ backgroundColor: bg }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold" style={{ color: brandDark }}>{name}</span>
            <MiniButton brand={brand} label="Order" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-md p-1.5" style={{ backgroundColor: "#FFFFFF" }}>
                <div className="h-6 rounded-sm mb-1" style={{ backgroundColor: accent, opacity: 0.7 - i * 0.15 }} />
                <div className="h-1 w-full rounded-full mb-0.5" style={{ backgroundColor: brandDark, opacity: 0.5 }} />
                <div className="h-1 w-2/3 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.3 }} />
              </div>
            ))}
          </div>
        </div>
      );

    case "menu":
      return (
        <div className="p-3" style={{ backgroundColor: bg }}>
          <div className="text-center mb-2">
            <span className="text-[9px] font-bold" style={{ color: brandDark }}>{name}</span>
            <div className="h-1 w-1/2 mx-auto rounded-full mt-1" style={{ backgroundColor: brandDark, opacity: 0.4 }} />
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-md px-2 py-1" style={{ backgroundColor: "#FFFFFF" }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: accent }} />
                  <div className="h-1 w-10 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.5 }} />
                </div>
                <span className="text-[7px] font-semibold" style={{ color: brand }}>$</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "gallery":
      return (
        <div className="p-3" style={{ backgroundColor: bg }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold" style={{ color: brandDark }}>{name}</span>
            <MiniButton brand={brand} label="Gallery" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 rounded-sm" style={{ backgroundColor: i % 2 === 0 ? accent : brand, opacity: 0.8 }} />
            ))}
          </div>
        </div>
      );

    case "services":
      return (
        <div className="p-3" style={{ backgroundColor: bg }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold" style={{ color: brandDark }}>{name}</span>
            <MiniButton brand={brand} label="Get Quote" />
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ backgroundColor: "#FFFFFF" }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: accent, opacity: 0.3 }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brand }} />
                </span>
                <div className="flex-1">
                  <div className="h-1 w-16 rounded-full mb-0.5" style={{ backgroundColor: brandDark, opacity: 0.6 }} />
                  <div className="h-1 w-10 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "booking":
      return (
        <div className="p-3" style={{ backgroundColor: bg }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold" style={{ color: brandDark }}>{name}</span>
            <MiniButton brand={brand} label="Book" />
          </div>
          <div className="rounded-md p-2" style={{ backgroundColor: "#FFFFFF" }}>
            <div className="h-1 w-1/2 rounded-full mb-2" style={{ backgroundColor: brandDark, opacity: 0.5 }} />
            <div className="grid grid-cols-4 gap-1 mb-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-4 rounded-sm flex items-center justify-center" style={{ backgroundColor: i === 3 ? brand : accent, opacity: i === 3 ? 1 : 0.3 }}>
                  <span className="text-[6px] text-white font-semibold">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="h-1 w-2/3 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.3 }} />
          </div>
        </div>
      );

    case "repair":
      return (
        <div className="p-3" style={{ backgroundColor: bg }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold" style={{ color: brandDark }}>{name}</span>
            <MiniButton brand={brand} label="Call Now" />
          </div>
          <div className="rounded-md p-2 mb-2" style={{ backgroundColor: "#FFFFFF" }}>
            <div className="h-1.5 w-3/4 rounded-full mb-1" style={{ backgroundColor: brandDark, opacity: 0.7 }} />
            <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.4 }} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: accent, opacity: 0.4 }}>
              <svg className="w-3 h-3" style={{ color: brandDark }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: brand, opacity: 0.8 }} />
          </div>
        </div>
      );

    // hero (default)
    default:
      return (
        <div className="p-3" style={{ backgroundColor: bg }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold" style={{ color: brandDark }}>{name}</span>
            <MiniButton brand={brand} label="Learn More" />
          </div>
          <div className="rounded-md p-2 mb-2" style={{ backgroundColor: "#FFFFFF" }}>
            <div className="h-1.5 w-3/4 rounded-full mb-1" style={{ backgroundColor: brandDark, opacity: 0.7 }} />
            <div className="h-1 w-1/2 rounded-full mb-2" style={{ backgroundColor: brandDark, opacity: 0.4 }} />
            <div className="h-6 rounded-sm" style={{ backgroundColor: accent, opacity: 0.5 }} />
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.3 }} />
            <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.3 }} />
            <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: brandDark, opacity: 0.3 }} />
          </div>
        </div>
      );
  }
}

export function WebsiteMockup({ config, className = "" }: WebsiteMockupProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white ${className}`}>
      <BrowserChrome url={config.url} brand={config.brand} />
      <MiniNav name={config.name} brand={config.brand} dark={false} />
      <MiniLayout config={config} />
    </div>
  );
}