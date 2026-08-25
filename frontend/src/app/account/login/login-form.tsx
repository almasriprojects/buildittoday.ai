"use client";

import { useState } from "react";

export function AccountLoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send the link.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the link.");
    } finally {
      setBusy(false);
    }
  }

  // Deliberately the same confirmation whether or not the address is on file —
  // the API answers identically, and contradicting it here would undo that.
  if (sent) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="font-medium text-emerald-900">Check your inbox</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
          If <strong>{email}</strong> is on file, a sign-in link is on its way. It works once and
          expires in an hour.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="mt-4 text-sm font-medium text-emerald-900 underline"
        >
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
        Email address
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourbusiness.com"
        className="mt-2 h-12 w-full rounded-lg border border-neutral-300 px-4 text-base outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !email.includes("@")}
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-neutral-900 px-6 text-base font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
