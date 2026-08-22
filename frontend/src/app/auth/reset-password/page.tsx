"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [linkValid, setLinkValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase puts the recovery token in the URL fragment, which never reaches
  // the server — so the session can only be established client-side.
  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setLinkValid(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setLinkValid(true);
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/admin"), 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Choose a new password</h1>

        {!ready && <p className="mt-4 text-[15px] text-neutral-600">Checking your link…</p>}

        {ready && !linkValid && !done && (
          <>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
              This reset link is invalid or has expired. Request a new one — links can only be used
              once.
            </p>
            <Link
              href="/auth/forgot-password"
              className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-neutral-900 px-6 text-[15px] font-medium text-white transition hover:bg-neutral-700"
            >
              Request a new link
            </Link>
          </>
        )}

        {ready && linkValid && !done && (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="pw" className="block text-sm font-medium text-neutral-700">
                New password
              </label>
              <input
                id="pw"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label htmlFor="pw2" className="block text-sm font-medium text-neutral-700">
                Confirm new password
              </label>
              <input
                id="pw2"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
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
              {loading ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}

        {done && (
          <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
            Password updated. Taking you to your dashboard…
          </p>
        )}
      </div>
    </main>
  );
}
