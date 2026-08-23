"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { defaultColors, type ThemeColors } from "./craft-demos";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
// Spelled out for the confirmation line. The grid headers stay abbreviated.
const WEEKDAYS_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// 30-minute slots, 1:30 PM – 4:30 PM (America/New_York)
const TIME_SLOTS = ["1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"];

interface BookingCalendarProps {
  colors?: ThemeColors;
}

export function BookingCalendar({ colors = defaultColors }: BookingCalendarProps) {
  const c = colors;
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  // The calendar previously discarded the chosen slot and sent people to
  // /auth/register — a booking nobody would ever receive. These drive a real
  // request that lands in booking_requests.
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDay || !selectedSlot) return;
    setSaving(true);
    setError(null);
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, date: iso, slot: selectedSlot }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save your request.");
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDate = selectedDay
    ? `${WEEKDAYS_FULL[new Date(viewYear, viewMonth, selectedDay).getDay()]}, ${MONTHS[viewMonth]} ${selectedDay}`
    : null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: c.lightAlt, borderColor: c.border }}>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Calendar */}
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${c.primary}15`, color: c.primary }}
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-base font-medium" style={{ color: c.dark }}>
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${c.primary}15`, color: c.primary }}
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: c.textMuted }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const isPast = isCurrentMonth && day < today.getDate();
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  disabled={isPast}
                  onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
                  className={`h-9 rounded-lg text-sm transition-all duration-200 ${
                    isPast ? "opacity-30 cursor-not-allowed" : "hover:scale-105"
                  }`}
                  style={{
                    backgroundColor: isSelected ? c.primary : "transparent",
                    color: isSelected ? "#fff" : c.textOnLight,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l" style={{ borderColor: c.border, backgroundColor: c.light }}>
          <div className="text-sm font-medium mb-1" style={{ color: c.dark }}>
            {/* The weekday was hardcoded to "Friday" and prepended to a string
                that already carried one, so every date read "Friday, Su,
                August 23" — on a Sunday. */}
            {selectedDate ?? "Select a day"}
          </div>
          <div className="text-xs mb-5" style={{ color: c.textMuted }}>America/New_York</div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDay ?? "none"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-2"
            >
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`h-10 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    selectedSlot === slot ? "text-white shadow-md" : "hover:scale-[1.02]"
                  }`}
                  style={{
                    backgroundColor: selectedSlot === slot ? c.primary : c.lightAlt,
                    borderColor: selectedSlot === slot ? c.primary : c.border,
                    color: selectedSlot === slot ? "#fff" : c.textOnLight,
                  }}
                >
                  {slot}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>

          {confirmed ? (
            <div className="mt-6 rounded-xl border p-4 text-center" style={{ borderColor: c.primary }}>
              <p className="text-sm font-medium" style={{ color: c.dark }}>
                Request sent — {selectedSlot}
              </p>
              <p className="mt-1 text-xs" style={{ color: c.textMuted }}>
                We&apos;ll confirm by email. If that time stops working, just reply.
              </p>
            </div>
          ) : showForm && selectedSlot ? (
            <form onSubmit={submitBooking} className="mt-6 space-y-2.5">
              <input
                required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                style={{ borderColor: c.border, backgroundColor: c.lightAlt, color: c.textOnLight }}
              />
              <input
                required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                style={{ borderColor: c.border, backgroundColor: c.lightAlt, color: c.textOnLight }}
              />
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                style={{ borderColor: c.border, backgroundColor: c.lightAlt, color: c.textOnLight }}
              />
              {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
              <button
                type="submit" disabled={saving}
                className="h-12 w-full rounded-full text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: c.primary }}
              >
                {saving ? "Sending…" : `Request ${selectedSlot}`}
              </button>
            </form>
          ) : (
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                disabled={!selectedSlot}
                className="h-12 w-full rounded-full text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: c.primary }}
              >
                {selectedSlot ? `Confirm ${selectedSlot}` : "Select a time"}
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs" style={{ color: c.textMuted }}>
            Complimentary call. No charge to you.
          </p>
        </div>
      </div>
    </div>
  );
}