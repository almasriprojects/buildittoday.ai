// Minimal HTML/CSS/JS tokenizer for the admin code view.
//
// Deliberately not a dependency: the alternative is shipping a full editor
// (CodeMirror/Monaco) for one read-mostly screen. This produces spans that a
// <pre> renders behind a transparent <textarea>, the standard overlay trick.

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ESC[c]);
}

function span(cls: string, text: string) {
  return `<span class="${cls}">${esc(text)}</span>`;
}

/** Highlight a CSS body (contents of a <style> block or a style attribute). */
function css(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    // comment
    if (src.startsWith("/*", i)) {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += span("tok-comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    // at-rule
    if (src[i] === "@") {
      const m = /^@[\w-]+/.exec(src.slice(i));
      if (m) {
        out += span("tok-at", m[0]);
        i += m[0].length;
        continue;
      }
    }
    // property: value  (only inside a block)
    const prop = /^([\w-]+)(\s*:\s*)/.exec(src.slice(i));
    if (prop && lastMeaningful(out) !== ",") {
      out += span("tok-prop", prop[1]) + esc(prop[2]);
      i += prop[0].length;
      const semi = src.indexOf(";", i);
      const brace = src.indexOf("}", i);
      let end = semi === -1 ? brace : brace === -1 ? semi : Math.min(semi, brace);
      if (end === -1) end = src.length;
      out += span("tok-val", src.slice(i, end));
      i = end;
      continue;
    }
    // selector run up to { or ;
    const nxt = src.slice(i).search(/[{;]/);
    if (nxt > 0) {
      out += span("tok-sel", src.slice(i, i + nxt));
      i += nxt;
      continue;
    }
    out += esc(src[i]);
    i++;
  }
  return out;
}

function lastMeaningful(html: string) {
  const plain = html.replace(/<[^>]*>/g, "");
  return plain.trimEnd().slice(-1);
}

/** Highlight JS well enough to read: comments, strings, keywords. */
function js(src: string): string {
  const KEYWORDS =
    /\b(var|let|const|function|return|if|else|for|while|new|this|typeof|try|catch|throw|class|do|in|of|null|true|false|undefined)\b/g;
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("//", i)) {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      out += span("tok-comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    if (src.startsWith("/*", i)) {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += span("tok-comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    const q = src[i];
    if (q === '"' || q === "'" || q === "`") {
      let j = i + 1;
      while (j < src.length && (src[j] !== q || src[j - 1] === "\\")) j++;
      out += span("tok-str", src.slice(i, Math.min(j + 1, src.length)));
      i = j + 1;
      continue;
    }
    const chunkEnd = src.slice(i).search(/["'`\/]|$/);
    const chunk = src.slice(i, chunkEnd > 0 ? i + chunkEnd : src.length);
    if (!chunk) {
      out += esc(src[i]);
      i++;
      continue;
    }
    out += esc(chunk).replace(KEYWORDS, (k) => `<span class="tok-kw">${k}</span>`);
    i += chunk.length;
  }
  return out;
}

/** Highlight a full HTML document, delegating <style> and <script> bodies. */
export function highlightHtml(src: string): string {
  let out = "";
  let i = 0;

  while (i < src.length) {
    // comment
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i);
      const stop = end === -1 ? src.length : end + 3;
      out += span("tok-comment", src.slice(i, stop));
      i = stop;
      continue;
    }

    if (src[i] === "<") {
      const close = src.indexOf(">", i);
      if (close === -1) {
        out += esc(src.slice(i));
        break;
      }
      const raw = src.slice(i, close + 1);
      const nameM = /^<\/?\s*([\w:-]+)/.exec(raw);
      const tag = nameM ? nameM[1].toLowerCase() : "";

      // the tag itself: name + attributes
      out += raw.replace(
        /^(<\/?)([\w:-]+)((?:[^>]*?))(\/?>)$/,
        (_all, open: string, name: string, attrs: string, end: string) =>
          esc(open) +
          span("tok-tag", name) +
          attrs.replace(
            /([\w:-]+)(\s*=\s*)("[^"]*"|'[^']*')?/g,
            (_m, an: string, eq: string, av: string | undefined) =>
              span("tok-attr", an) + esc(eq) + (av ? span("tok-str", av) : "")
          ) +
          esc(end)
      );
      i = close + 1;

      // raw-text elements: hand the body to the right highlighter
      if (tag === "style" || tag === "script") {
        const closeTag = `</${tag}`;
        const bodyEnd = src.toLowerCase().indexOf(closeTag, i);
        const stop = bodyEnd === -1 ? src.length : bodyEnd;
        const body = src.slice(i, stop);
        out += tag === "style" ? css(body) : js(body);
        i = stop;
      }
      continue;
    }

    const nextTag = src.indexOf("<", i);
    const stop = nextTag === -1 ? src.length : nextTag;
    out += esc(src.slice(i, stop));
    i = stop;
  }

  return out;
}

/**
 * Expand minified CSS inside <style> blocks onto readable lines.
 * Only touches CSS — reflowing HTML risks changing rendered whitespace.
 */
export function formatEmbeddedCss(html: string): string {
  return html.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_all, open: string, body: string, close: string) => {
      if (/\n\s*\n/.test(body) && body.split("\n").length > body.length / 120) {
        return open + body + close; // already looks formatted
      }
      let depth = 0;
      let out = "";
      for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (c === "{") {
          depth++;
          out += " {\n" + "  ".repeat(depth);
        } else if (c === "}") {
          depth = Math.max(0, depth - 1);
          out = out.replace(/[ \t]+$/, "");
          out += "\n" + "  ".repeat(depth) + "}\n" + "  ".repeat(depth);
        } else if (c === ";") {
          out += ";\n" + "  ".repeat(depth);
        } else if (c === "\n") {
          continue;
        } else {
          out += c;
        }
      }
      const tidy = out
        .split("\n")
        .map((l) => l.replace(/\s+$/, ""))
        .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
        .join("\n");
      return open + "\n" + tidy.trim() + "\n" + close;
    }
  );
}
