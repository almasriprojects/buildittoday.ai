"use client";

import { useState } from "react";

/**
 * The one form a customer fills in. Everything here blocks the launch, and
 * nothing else is asked for — a longer form is a slower launch.
 */
export function OnboardingForm({
  defaults,
}: {
  defaults: {
    domain: string;
    phone: string;
    addressStreet: string;
    addressCity: string;
    addressZip: string;
  };
}) {
  const [form, setForm] = useState({ ...defaults, needsDomain: false, notes: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save that.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Got it — we&rsquo;re on it. You&rsquo;ll hear from us within one business day.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Domain you want to use
        </label>
        <input
          value={form.domain}
          onChange={(e) => set("domain", e.target.value)}
          disabled={form.needsDomain}
          placeholder="yourbusiness.com"
          className="mt-1.5 h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-neutral-900 disabled:bg-neutral-100"
        />
        <label className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={form.needsDomain}
            onChange={(e) => set("needsDomain", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300"
          />
          I don&rsquo;t have one yet — help me choose
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Phone for the site</label>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(305) 555-0100"
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Street address</label>
          <input
            value={form.addressStreet}
            onChange={(e) => set("addressStreet", e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">City</label>
          <input
            value={form.addressCity}
            onChange={(e) => set("addressCity", e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">ZIP</label>
          <input
            value={form.addressZip}
            onChange={(e) => set("addressZip", e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Anything you want changed on the site?
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={4}
          placeholder="Wrong services listed, photos to swap, hours, anything at all."
          className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy || (!form.domain.trim() && !form.needsDomain)}
        className="inline-flex h-11 items-center rounded-lg bg-neutral-900 px-6 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Saving…" : "Send this to the team"}
      </button>
    </form>
  );
}
