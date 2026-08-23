"use client";

import { useState } from "react";
import { HEADLINE, money } from "@/lib/pricing";

export function ClaimForm({
  businessName,
  demoSlug,
}: {
  businessName: string | null;
  demoSlug: string | null;
}) {
  const [name, setName] = useState(businessName ?? "");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: name, email, demoSlug }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "We couldn't start checkout. Please try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="claim-business" className="block text-sm font-medium text-neutral-700">
            Business name
          </label>
          <input
            id="claim-business"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            placeholder="Your business, LLC"
          />
        </div>
        <div>
          <label htmlFor="claim-email" className="block text-sm font-medium text-neutral-700">
            Your email
          </label>
          <input
            id="claim-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            placeholder="you@example.com"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-900 px-8 text-base font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Starting checkout…" : `Claim this website — ${money(HEADLINE.setup)}`}
      </button>

      <p className="text-sm text-neutral-500">
        Secure payment through Stripe. You&apos;ll confirm your details before anything goes live.
      </p>
    </form>
  );
}
