"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// DemoGate — shows a sign-up form until the visitor has unlocked THIS demo.
// On submit it POSTs to /api/signup, stores the returned token in a
// per-lead cookie (unlocking one lead's demo must not unlock any other),
// then reveals the full demo (children). The cookie persists so returning
// visitors see the demo immediately.
//
// The unlock check only runs client-side (useEffect, after mount) rather
// than during the initial render — reading document.cookie during the
// render itself made the server (no cookie access) and client (has the
// cookie) produce different markup on first paint, which is a React
// hydration error. Starting both renders "locked" and unlocking via effect
// avoids that; it costs one harmless extra render for returning visitors.
export function DemoGate({
  businessName,
  demoSlug,
  src,
  children,
}: {
  businessName: string;
  demoSlug: string;
  src?: string;
  children: React.ReactNode;
}) {
  const cookieName = `demo_unlocked_${demoSlug}`;
  const [unlocked, setUnlocked] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const alreadyUnlocked = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith(`${cookieName}=`));
    if (alreadyUnlocked) setUnlocked(true);
  }, [cookieName]);

  if (unlocked) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoSlug, fullName, email, src }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to unlock the preview.");
        return;
      }
      // Store the unlock token in a cookie scoped to this lead (30 days).
      document.cookie = `${cookieName}=${data.token}; path=/; max-age=2592000; samesite=lax`;
      setUnlocked(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-center">{businessName}</h1>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Your website preview is ready. Enter your details to see it.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="fullName">Full Name</label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Unlocking..." : "View My Preview"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          This is a free preview website built for {businessName}. No payment required to view.
        </p>
      </div>
    </div>
  );
}