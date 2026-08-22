"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, XCircle, MapPin, Search, Sparkles, SkipForward, Send, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineStep {
  label: string;
  done: boolean;
  blocked?: boolean;
  running?: boolean;
}

export interface PipelineNotification {
  type: "running" | "success" | "error" | "info";
  title: string;
  detail?: string;
  startedAt?: string;
  duration?: string;
}

interface PipelineStatusProps {
  steps: PipelineStep[];
  onAction: (action: string) => void;
  processing: string | null;
  notification?: PipelineNotification | null;
}

const ACTION_BUTTONS: { action: string; label: string; icon: typeof Sparkles }[] = [
  { action: "classify", label: "Classify", icon: Sparkles },
  { action: "maps", label: "Maps Check", icon: MapPin },
  { action: "skip", label: "Skip Trace", icon: SkipForward },
  { action: "generate", label: "Generate Site", icon: Search },
  { action: "enrich", label: "Enrich", icon: Send },
];

export function PipelineStatus({ steps, onAction, processing, notification }: PipelineStatusProps) {
  return (
    <div className="space-y-6">
      {/* Action status / notification card — always visible until next action */}
      {notification && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            notification.type === "running" && "border-blue-200 bg-blue-50",
            notification.type === "success" && "border-emerald-200 bg-emerald-50",
            notification.type === "error" && "border-red-200 bg-red-50",
            notification.type === "info" && "border-slate-200 bg-slate-50"
          )}
        >
          <div className="flex items-start gap-2">
            {notification.type === "running" ? (
              <Loader2 className="w-4 h-4 mt-0.5 text-blue-500 animate-spin shrink-0" />
            ) : notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
            ) : notification.type === "error" ? (
              <XCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  "font-medium",
                  notification.type === "success" && "text-emerald-800",
                  notification.type === "error" && "text-red-800",
                  notification.type === "running" && "text-blue-800",
                  notification.type === "info" && "text-slate-700"
                )}
              >
                {notification.title}
              </p>
              {notification.detail && (
                <p className="mt-0.5 text-xs text-slate-600 break-words">{notification.detail}</p>
              )}
              {(notification.startedAt || notification.duration) && (
                <p className="mt-1 text-[11px] text-slate-400">
                  {notification.startedAt && `Started ${notification.startedAt}`}
                  {notification.startedAt && notification.duration && " · "}
                  {notification.duration && `Took ${notification.duration}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pipeline steps */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Pipeline Status</h3>
        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.label} className="flex items-start gap-2">
              {step.running ? (
                <Loader2 className="w-4 h-4 mt-0.5 text-blue-500 animate-spin shrink-0" />
              ) : step.done ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
              ) : step.blocked ? (
                <XCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" />
              )}
              <div>
                <p className={cn("text-sm", step.done ? "text-slate-600" : "text-slate-900 font-medium")}>
                  {step.label}
                </p>
                {step.blocked && (
                  <p className="text-xs text-red-500 mt-0.5">DataSkip balance required</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Actions</h3>
        <div className="space-y-2">
          {ACTION_BUTTONS.map((btn) => (
            <Button
              key={btn.action}
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onAction(btn.action)}
              disabled={processing !== null}
            >
              <btn.icon className="w-3.5 h-3.5 mr-2" />
              {processing === btn.action ? "Running..." : btn.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}