"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

export function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = isHome && !scrolled;

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
        transparent
          ? "bg-transparent border-b border-transparent"
          : "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-subtle"
      }`}
    >
      <div className="container-max flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className={`text-xl font-bold ${transparent ? "text-white" : "text-primary"}`}>
            BuildItToday
            <span className={transparent ? "text-white/80" : "text-foreground"}>.ai</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/intake"
            className={`text-sm font-medium transition-colors ${
              transparent ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Design Studio
          </Link>
          <Link
            href="/services"
            className={`text-sm font-medium transition-colors ${
              transparent ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Services
          </Link>
          <Link
            href="/pricing"
            className={`text-sm font-medium transition-colors ${
              transparent ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/faq"
            className={`text-sm font-medium transition-colors ${
              transparent ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            FAQ
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <a
            href="tel:+13055050153"
            className={`hidden lg:block text-sm font-medium transition-colors ${
              transparent ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            (305) 505-0153
          </a>
          <Link href="/auth/login">
            <Button
              variant="outline"
              size="sm"
              className={transparent ? "border-white/40 text-white bg-transparent hover:bg-white/10 hover:text-white" : ""}
            >
              Login
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="sm">See Your Free Demo</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
