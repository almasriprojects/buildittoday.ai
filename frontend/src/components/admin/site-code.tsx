"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, RotateCcw, AlertTriangle, Check, WrapText, Sparkles } from "lucide-react";
import { highlightHtml, formatEmbeddedCss } from "@/lib/html-highlight";
import { CodeOutline } from "./code-outline";

export function SiteCode({ slug, onSaved }: { slug: string; onSaved: () => void }) {
  const [original, setOriginal] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [wrap, setWrap] = useState(false);
  const [caretLine, setCaretLine] = useState<number | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/demo-sites/${slug}/html`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setOriginal(d.html);
        setValue(d.html);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const dirty = original !== null && value !== original;
  const lineCount = useMemo(() => (value ? value.split("\n").length : 0), [value]);
  const highlighted = useMemo(() => highlightHtml(value), [value]);

  // The <pre> sits behind a transparent <textarea>; they must scroll together.
  function syncScroll() {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutRef.current) gutRef.current.scrollTop = ta.scrollTop;
  }

  const LINE_H = 12.5 * 1.65; // font-size x line-height, must match the CSS below

  function jumpTo(line: number) {
    const ta = taRef.current;
    if (!ta) return;
    const offset = value.split("\n").slice(0, line - 1).join("\n").length + (line > 1 ? 1 : 0);
    ta.focus();
    ta.setSelectionRange(offset, offset);
    // put the target a third of the way down rather than at the very top
    ta.scrollTop = Math.max(0, (line - 1) * LINE_H - ta.clientHeight / 3);
    syncScroll();
    setCaretLine(line);
  }

  function trackCaret() {
    const ta = taRef.current;
    if (!ta) return;
    setCaretLine(value.slice(0, ta.selectionStart).split("\n").length);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/demo-sites/${slug}/html`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: value }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save.");
      setOriginal(value);
      setWarnings(d.warnings ?? []);
      setSavedAt(new Date());
      // Storage takes a beat to propagate a write; reloading the preview
      // instantly can read the pre-save version and look like the save failed.
      setTimeout(onSaved, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = taRef.current;
      if (!ta) return;
      const { selectionStart: s, selectionEnd: en } = ta;
      setValue(value.slice(0, s) + "  " + value.slice(en));
      requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (dirty && !saving) save();
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading source…</div>;
  }

  const shared =
    "font-mono text-[12.5px] leading-[1.65] " +
    (wrap ? "whitespace-pre-wrap break-words " : "whitespace-pre ");

  return (
    <div className="flex flex-col">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 border-b bg-muted/40 px-4 py-2.5">
        <span className="font-mono text-[11px] text-muted-foreground">
          {lineCount.toLocaleString()} lines · {(value.length / 1024).toFixed(1)} KB
        </span>
        {dirty && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            unsaved
          </span>
        )}
        {savedAt && !dirty && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
            <Check className="h-3 w-3" /> saved {savedAt.toLocaleTimeString()}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setWrap((w) => !w)}
            aria-pressed={wrap}
            title="Toggle line wrapping"
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition ${
              wrap ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <WrapText className="h-3.5 w-3.5" /> Wrap
          </button>
          <button
            onClick={() => setValue(formatEmbeddedCss(value))}
            title="Expand minified CSS onto readable lines"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" /> Format CSS
          </button>
          <button
            onClick={() => original !== null && setValue(original)}
            disabled={!dirty || saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Revert
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save & publish"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-b bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="border-b bg-amber-50 px-4 py-2.5">
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" /> Saved, but check these
          </p>
          <ul className="space-y-0.5 pl-5 text-xs text-amber-900">
            {warnings.map((w) => (
              <li key={w} className="list-disc">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* editor */}
      <div className="code-editor relative flex h-[720px] overflow-hidden bg-[#0d1117]">
        <CodeOutline html={value} activeLine={caretLine} onJump={jumpTo} />

        {/* line numbers */}
        <div
          ref={gutRef}
          aria-hidden="true"
          className="hide-scrollbar shrink-0 select-none overflow-hidden border-r border-white/10 bg-[#0b0f14] px-3 py-4 text-right font-mono text-[12.5px] leading-[1.65] text-white/25"
        >
          {Array.from({ length: lineCount }, (_, n) => (
            <div
              key={n}
              className={caretLine === n + 1 ? "text-sky-300" : undefined}
            >
              {n + 1}
            </div>
          ))}
        </div>

        <div className="relative flex-1">
          <pre
            ref={preRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-auto p-4 ${shared}`}
            dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
          />
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKey}
            onClick={trackCaret}
            onKeyUp={trackCaret}
            spellCheck={false}
            wrap={wrap ? "soft" : "off"}
            aria-label="Page HTML source"
            className={`absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent p-4 text-transparent caret-white outline-none ${shared}`}
          />
        </div>
      </div>

      <p className="border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
        Saving overwrites the live page this lead would see. ⌘S / Ctrl+S to save.
      </p>

      <style jsx global>{`
        .code-editor .tok-tag { color: #7ee787; }
        .code-editor .tok-attr { color: #79c0ff; }
        .code-editor .tok-str { color: #a5d6ff; }
        .code-editor .tok-comment { color: #6e7681; font-style: italic; }
        .code-editor .tok-sel { color: #d2a8ff; }
        .code-editor .tok-prop { color: #79c0ff; }
        .code-editor .tok-val { color: #ffa657; }
        .code-editor .tok-at { color: #ff7b72; }
        .code-editor .tok-kw { color: #ff7b72; }
        .code-editor pre { color: #c9d1d9; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; }
      `}</style>
    </div>
  );
}
