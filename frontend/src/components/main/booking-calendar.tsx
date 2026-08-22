"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { defaultColors, type ThemeColors } from "./craft-demos";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
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
    ? `${WEEKDAYS[new Date(viewYear, viewMonth, selectedDay).getDay()]}, ${MONTHS[viewMonth]} ${selectedDay}`
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
            {selectedDate ? `Friday, ${selectedDate}` : "Select a day"}
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

          <div className="mt-6">
            <a
              href="/auth/register"
              className={`w-full inline-flex items-center justify-center h-12 rounded-full text-base font-medium text-white transition-opacity ${
                selectedSlot ? "hover:opacity-90" : "opacity-40 pointer-events-none"
              }`}
              style={{ backgroundColor: c.primary }}
            >
              {selectedSlot ? `Confirm ${selectedSlot}` : "Select a time"}
            </a>
          </div>

          <p className="mt-4 text-center text-xs" style={{ color: c.textMuted }}>
            Complimentary call. No charge to you.
          </p>
        </div>
      </div>
    </div>
  );
}