// Document outline for the admin code editor: the structural landmarks of a
// generated page, each mapped back to the line it starts on.

export type OutlineNode = {
  line: number; // 1-indexed
  depth: number;
  tag: string;
  label: string;
  kind: "landmark" | "section" | "block" | "asset" | "heading";
};

export type CodeIssue = {
  line: number | null;
  severity: "error" | "warn";
  message: string;
};

// Elements that carry meaning when scanning a generated page.
const LANDMARKS = new Set(["head", "body", "header", "nav", "main", "footer"]);
const BLOCKS = new Set(["section", "article", "aside", "form"]);
const ASSETS = new Set(["style", "script", "video", "iframe"]);
const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function attr(tagText: string, name: string): string | null {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tagText);
  return m ? (m[2] ?? m[3] ?? "") : null;
}

function hasAttr(tagText: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`, "i").test(tagText);
}

/** Human label for a node — what it is, in the page's own terms. */
function labelFor(tag: string, tagText: string): string {
  const id = attr(tagText, "id");
  const cls = attr(tagText, "class");

  if (hasAttr(tagText, "data-hero")) return "Hero";
  if (hasAttr(tagText, "data-media-sequence")) return "Media sequence";
  if (hasAttr(tagText, "data-claim-modal")) return "Claim modal";
  if (hasAttr(tagText, "data-menu-target")) return "Nav menu";
  if (hasAttr(tagText, "data-progress")) return "Scroll progress bar";
  if (tag === "video" && (cls ?? "").includes("hero-bg")) return "Hero video";

  if (id) return `#${id}`;
  if (cls) {
    const first = cls.split(/\s+/).filter(Boolean)[0];
    if (first) return `.${first}`;
  }
  return tag;
}

export function buildOutline(html: string): OutlineNode[] {
  const nodes: OutlineNode[] = [];
  const stack: string[] = [];
  const tagRe = /<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;

  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const whole = m[0];
    const tag = m[1].toLowerCase();
    const rest = m[2] ?? "";
    const isClose = whole.startsWith("</");
    const selfClosing = rest.trimEnd().endsWith("/") || VOID.has(tag);

    if (isClose) {
      const i = stack.lastIndexOf(tag);
      if (i !== -1) stack.length = i;
      continue;
    }

    const line = html.slice(0, m.index).split("\n").length;
    const depth = stack.length;

    let kind: OutlineNode["kind"] | null = null;
    if (LANDMARKS.has(tag)) kind = "landmark";
    else if (BLOCKS.has(tag)) kind = "section";
    else if (ASSETS.has(tag)) kind = "asset";
    else if (/^h[1-3]$/.test(tag)) kind = "heading";
    else if (
      tag === "div" &&
      (hasAttr(whole, "data-claim-modal") ||
        hasAttr(whole, "data-progress") ||
        hasAttr(whole, "data-media-sequence"))
    ) {
      kind = "block";
    }

    if (kind) {
      nodes.push({ line, depth, tag, label: labelFor(tag, whole), kind });
    }

    if (!selfClosing) stack.push(tag);
  }

  return nodes;
}

/**
 * Structural problems worth flagging while editing. Mirrors the server-side
 * save check, but runs live so you see a break before you publish it.
 */
export function findIssues(html: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const lineOf = (re: RegExp) => {
    const m = re.exec(html);
    return m ? html.slice(0, m.index).split("\n").length : null;
  };

  const required: [RegExp, string][] = [
    [/<video[^>]*class=["'][^"']*hero-bg/i, "hero video (.hero-bg)"],
    [/class=["'][^"']*hero-scrim/i, "hero scrim overlay"],
    [/data-claim-modal/i, "claim modal"],
    [/data-claim-trigger/i, "claim trigger on a CTA"],
    [/data-menu-toggle/i, "mobile menu toggle"],
    [/data-menu-target/i, "mobile menu target"],
    [/data-current-year/i, "auto-updating copyright year"],
    [/__motionRuntimeV2/i, "motion runtime script"],
    [/data-progress/i, "scroll progress bar"],
  ];
  for (const [re, label] of required) {
    if (!re.test(html)) issues.push({ line: null, severity: "error", message: `Missing ${label}` });
  }

  if (/class=["'][^"']*\bbtn-primary\b/.test(html)) {
    issues.push({
      line: lineOf(/class=["'][^"']*\bbtn-primary\b/),
      severity: "warn",
      message: ".btn-primary has no CSS rule — use .btn",
    });
  }

  const msItems = (html.match(/class=["'][^"']*\bms-item\b/g) || []).length;
  if (/data-media-sequence/i.test(html) && msItems < 2) {
    issues.push({
      line: lineOf(/data-media-sequence/i),
      severity: "warn",
      message: `Media sequence has ${msItems} item — needs 2+`,
    });
  }

  const open = (html.match(/<div\b/gi) || []).length;
  const close = (html.match(/<\/div>/gi) || []).length;
  if (open !== close) {
    issues.push({
      line: null,
      severity: "error",
      message: `Unbalanced <div>: ${open} open, ${close} closing`,
    });
  }

  if (!/<\/html>\s*$/i.test(html.trimEnd())) {
    issues.push({ line: null, severity: "error", message: "Document doesn't end with </html>" });
  }

  return issues;
}
