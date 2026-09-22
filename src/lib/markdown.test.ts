import { describe, it, expect } from "vitest";
import { renderMarkdown, extractToc, slugifyHeading } from "./markdown";

describe("renderMarkdown", () => {
  it("escapes raw HTML first (XSS-safe)", () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nHello');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders headings with anchor ids", () => {
    const html = renderMarkdown("## 1. The Hidden Hardware Tax");
    expect(html).toContain('<h2 id="the-hidden-hardware-tax">');
  });

  it("renders quotes, lists, and inline formatting", () => {
    const html = renderMarkdown("> wise words\n\n- one\n- two\n\nSome **bold** and *italic* and [link](https://example.com)");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("href='https://example.com'");
  });

  it("rejects non-http link targets", () => {
    const html = renderMarkdown("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });
});

describe("extractToc", () => {
  it("picks ## and ### headings in order with depths", () => {
    const toc = extractToc("# Title\n\n## First Part\n\n### Deep Dive\n\n## Second Part");
    expect(toc).toEqual([
      { id: "first-part", label: "First Part", depth: 1 },
      { id: "deep-dive", label: "Deep Dive", depth: 2 },
      { id: "second-part", label: "Second Part", depth: 1 },
    ]);
  });

  it("slugifies consistently with rendered ids", () => {
    expect(slugifyHeading("1. The Hidden Hardware Tax")).toBe("the-hidden-hardware-tax");
  });
});
