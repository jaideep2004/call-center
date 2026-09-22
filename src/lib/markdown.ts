"use client";

export interface TocItem {
  id: string;
  label: string;
  depth: number;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/** Extract `## ` / `### ` headings (in order) for the table of contents. */
export function extractToc(md: string): TocItem[] {
  const items: TocItem[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    const depth = m[1].length - 1;
    const label = m[2].replace(/^\d+\.\s*/, "").trim();
    const plain = label.replace(/\*\*/g, "");
    items.push({ id: slugifyHeading(plain), label: plain, depth });
  }
  return items;
}

function inline(md: string): string {
  let h = md;
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Links allowlisted to http(s) only — anything else degrades to plain label text.
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, target: string) =>
    /^https?:\/\//.test(target)
      ? `<a href='${target}' target='_blank' rel='noreferrer'>${label}</a>`
      : label,
  );
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  return h;
}

/**
 * Minimal markdown → sanitized HTML. Escapes raw HTML FIRST (XSS-safe by
 * construction), then supports headings, quotes, lists, bold/italic/links.
 * Shared by the blog single-post page and the CMS preview.
 */
export function renderMarkdown(md: string): string {
  const escaped = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = escaped.split("\n");
  const out: string[] = [];
  let inList = false;
  let inQuote = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    const li = line.match(/^(?:- |\* )(.+)$/);
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (h3) {
      closeList(); closeQuote();
      out.push(`<h3 id="${slugifyHeading(h3[1])}">${inline(h3[1])}</h3>`);
    } else if (h2) {
      closeList(); closeQuote();
      out.push(`<h2 id="${slugifyHeading(h2[1])}">${inline(h2[1])}</h2>`);
    } else if (h1) {
      closeList(); closeQuote();
      out.push(`<h1 id="${slugifyHeading(h1[1])}">${inline(h1[1])}</h1>`);
    } else if (quote) {
      closeList();
      if (!inQuote) {
        out.push("<blockquote>");
        inQuote = true;
      }
      out.push(`<p>${inline(quote[1])}</p>`);
    } else if (li) {
      closeQuote();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
    } else if (line.trim() === "") {
      closeList(); closeQuote();
    } else {
      closeList(); closeQuote();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  closeQuote();
  return out.join("\n");
}
