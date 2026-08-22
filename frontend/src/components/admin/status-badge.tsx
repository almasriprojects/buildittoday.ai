"use client";

import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  churned: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-slate-100 text-slate-600",
  // Lead target_fit
  yes: "bg-green-100 text-green-700",
  maybe: "bg-yellow-100 text-yellow-700",
  no: "bg-red-100 text-red-700",
  // Lead contact_status
  new: "bg-blue-100 text-blue-700",
  matched: "bg-green-100 text-green-700",
  already_has_website: "bg-slate-100 text-slate-600",
  not_yet_indexed: "bg-slate-100 text-slate-600",
  // Lead booleans
  true: "bg-green-100 text-green-700",
  false: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex px-2 py-1 rounded-full text-xs font-medium", statusStyles[status] ?? "bg-slate-100 text-slate-600")}>
      {status}
    </span>
  );
}