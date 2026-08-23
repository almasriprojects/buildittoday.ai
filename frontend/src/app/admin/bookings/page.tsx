"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyPanel } from "@/components/admin/empty-panel";

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  requested_date: string;
  requested_slot: string;
  status: string;
  demo_slug: string | null;
  notes: string | null;
  created_at: string;
};

const NEXT_ACTION: Record<string, { label: string; status: string; cls: string }[]> = {
  new: [
    { label: "Confirm", status: "confirmed", cls: "bg-emerald-600 text-white hover:bg-emerald-700" },
    { label: "Cancel", status: "cancelled", cls: "border text-muted-foreground hover:text-foreground" },
  ],
  confirmed: [
    { label: "Mark done", status: "completed", cls: "bg-foreground text-background hover:opacity-90" },
    { label: "No-show", status: "no_show", cls: "border text-muted-foreground hover:text-foreground" },
  ],
};

const TONE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-red-100 text-red-700",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/pipeline")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
    } finally {
      setBusy(null);
    }
  }

  const pending = bookings.filter((b) => b.status === "new");
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.requested_date) >= new Date(new Date().toDateString())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Call Requests</h1>
        <p className="mt-1 text-muted-foreground">
          People who asked for a call from the website. Newest requests need a reply first.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting Reply" value={pending.length} hint="not yet confirmed" />
        <StatCard label="Upcoming" value={upcoming.length} hint="confirmed, still to happen" />
        <StatCard label="Total Requests" value={bookings.length} />
      </div>

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}

      {!loading && bookings.length === 0 && (
        <EmptyPanel
          title="No call requests yet"
          body="When someone picks a time on the homepage calendar, the request appears here with their contact details."
          action={{ href: "/", label: "View the booking calendar" }}
        />
      )}

      {!loading && bookings.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {new Date(`${b.requested_date}T12:00:00`).toLocaleDateString(undefined, {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">{b.requested_slot} ET</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.name}</div>
                    {b.business_name && (
                      <div className="text-xs text-muted-foreground">{b.business_name}</div>
                    )}
                    {b.demo_slug && (
                      <a
                        href={`/admin/sites/${b.demo_slug}`}
                        className="text-xs text-primary underline-offset-4 hover:underline"
                      >
                        their demo →
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${b.email}`} className="block text-primary underline-offset-4 hover:underline">
                      {b.email}
                    </a>
                    {b.phone && (
                      <a href={`tel:${b.phone}`} className="block text-xs text-muted-foreground">
                        {b.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[b.status] ?? TONE.completed}`}>
                      {b.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {(NEXT_ACTION[b.status] ?? []).map((a) => (
                        <button
                          key={a.status}
                          onClick={() => setStatus(b.id, a.status)}
                          disabled={busy === b.id}
                          className={`inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium transition disabled:opacity-50 ${a.cls}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
