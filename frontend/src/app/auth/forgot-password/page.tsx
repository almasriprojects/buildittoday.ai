"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Always show the same confirmation, so this can't be used to discover
    // which email addresses have accounts.
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Reset your password
        </h1>

        {sent ? (
          <>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
              If an account exists for <strong className="text-neutral-900">{email}</strong>, we&apos;ve
              sent a reset link. Check your inbox — and your spam folder.
            </p>
            <Link
              href="/auth/login"
              className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-neutral-900 px-6 text-[15px] font-medium text-white transition hover:bg-neutral-700"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
              Enter your email and we&apos;ll send you a link to set a new one.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-neutral-900 px-6 text-[15px] font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-sm text-neutral-500">
              Remembered it?{" "}
              <Link href="/auth/login" className="font-medium text-neutral-900 underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
