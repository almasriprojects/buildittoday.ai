import Link from "next/link";
import { ENTRY, money } from "@/lib/pricing";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container-max py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="text-xl font-bold text-primary">
              BuildItToday<span className="text-foreground">.ai</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
              Custom websites for Florida small businesses, live on your own domain
              in one week. From {money(ENTRY.setup)} — no template, and you own the code.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/services" className="hover:text-foreground transition-colors">Services</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/demo" className="hover:text-foreground transition-colors">View Demos</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="tel:+13055050153" className="hover:text-foreground transition-colors">
                  (305) 505-0153
                </a>
              </li>
              <li>
                <a href="mailto:contact@buildittoday.ai" className="hover:text-foreground transition-colors">
                  contact@buildittoday.ai
                </a>
              </li>
              <li>Miami, FL</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} BuildItToday.ai. All rights reserved.</p>
          {/* Stripe requires both to be reachable from every page before it will
              approve a live account, and commercial email effectively does too. */}
          <nav className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}