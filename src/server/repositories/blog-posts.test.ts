import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}));

import { query, queryOne } from "@/server/db";
import { blogPosts } from "./blog-posts";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(query).mockResolvedValue([]);
});

function sql(): string {
  return [
    ...vi.mocked(queryOne).mock.calls.map((c) => String(c[0])),
    ...vi.mocked(query).mock.calls.map((c) => String(c[0])),
  ].join("\n");
}

describe("blog post public feed safety", () => {
  it("findPublished never leaks drafts", async () => {
    await blogPosts.findPublished({});
    expect(sql()).toContain("published = true");
  });

  it("findPublishedBySlug enforces published", async () => {
    await blogPosts.findPublishedBySlug("hello");
    expect(sql()).toContain("AND published = true");
  });

  it("related excludes the post itself and stays in-category", async () => {
    await blogPosts.related({ id: "p1", category: "Growth" } as never, 3);
    const s = sql();
    expect(s).toContain("id <> $1");
    expect(s).toContain("category = $2");
    expect(s).toContain("published = true");
  });

  it("search filters title and excerpt", async () => {
    await blogPosts.findPublished({ search: "medicare" });
    expect(sql()).toContain("title ILIKE");
    expect(sql()).toContain("excerpt ILIKE");
  });
});
