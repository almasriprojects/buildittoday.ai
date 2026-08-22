"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Braces,
  FileCode2,
  Heading,
  LayoutPanelTop,
  ListTree,
  Play,
  Square,
} from "lucide-react";
import { buildOutline, findIssues, type OutlineNode } from "@/lib/html-outline";

const ICONS: Record<OutlineNode["kind"], typeof Square> = {
  landmark: LayoutPanelTop,
  section: Square,
  block: Braces,
  asset: Play,
  heading: Heading,
};

const KIND_COLOR: Record<OutlineNode["kind"], string> = {
  landmark: "text-sky-400",
  section: "text-emerald-400",
  block: "text-violet-400",
  asset: "text-amber-400",
  heading: "text-neutral-400",
};

export function CodeOutline({
  html,
  activeLine,
  onJump,
}: {
  html: string;
  activeLine: number | null;
  onJump: (line: number) => void;
}) {
  const [tab, setTab] = useState<"outline" | "issues">("outline");
  const outline = useMemo(() => buildOutline(html), [html]);
  const issues = useMemo(() => findIssues(html), [html]);
  const errorCount = issues.filter((i) => i.severity === "error").length;

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#0b0f14]">
      <div className="flex border-b border-white/10">
        {(
          [
            ["outline", "Structure", ListTree, outline.length],
            ["issues", "Problems", AlertCircle, issues.length],
          ] as const
        ).map(([id, label, Icon, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium transition ${
              tab === id
                ? "bg-white/10 text-white"
                : "text-white/45 hover:text-white/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] ${
                  id === "issues" && errorCount > 0
                    ? "bg-red-500/25 text-red-300"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-1.5">
        {tab === "outline" ? (
          outline.length === 0 ? (
            <Empty>No structure found</Empty>
          ) : (
            outline.map((n, i) => {
              const Icon = ICONS[n.kind];
              const active = activeLine !== null && activeLine === n.line;
              return (
                <button
                  key={`${n.line}-${i}`}
                  onClick={() => onJump(n.line)}
                  title={`<${n.tag}> — line ${n.line}`}
                  className={`group flex w-full items-center gap-1.5 py-[3px] pr-2 text-left text-[11.5px] transition ${
                    active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                  }`}
                  style={{ paddingLeft: 8 + Math.min(n.depth, 6) * 9 }}
                >
                  <Icon className={`h-3 w-3 shrink-0 ${KIND_COLOR[n.kind]}`} />
                  <span className="truncate">{n.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-white/25 group-hover:text-white/45">
                    {n.line}
                  </span>
                </button>
              );
            })
          )
        ) : issues.length === 0 ? (
          <Empty>
            <span className="text-emerald-400">No problems found</span>
          </Empty>
        ) : (
          issues.map((is, i) => (
            <button
              key={i}
              onClick={() => is.line && onJump(is.line)}
              disabled={!is.line}
              className={`flex w-full items-start gap-1.5 px-2.5 py-1.5 text-left text-[11px] leading-snug transition ${
                is.line ? "hover:bg-white/5" : "cursor-default"
              }`}
            >
              {is.severity === "error" ? (
                <AlertCircle className="mt-[1px] h-3 w-3 shrink-0 text-red-400" />
              ) : (
                <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0 text-amber-400" />
              )}
              <span className="text-white/75">{is.message}</span>
              {is.line && (
                <span className="ml-auto shrink-0 font-mono text-[10px] text-white/25">
                  {is.line}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-white/10 px-2.5 py-2 text-[10px] text-white/30">
        <FileCode2 className="h-3 w-3" />
        {outline.length} nodes
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-6 text-center text-[11px] text-white/35">{children}</p>;
}
