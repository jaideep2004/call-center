import { BaseRepository } from "./base";
import { query, queryOne } from "@/server/db";
import type { PoolClient } from "pg";

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  author_role: string;
  author_avatar: string | null;
  read_minutes: number;
  featured: boolean;
  published: boolean;
  published_at: string | null;
  body_markdown: string;
  created_at: string;
  updated_at: string;
}

export interface BlogPostInput {
  slug: string;
  title: string;
  excerpt?: string;
  cover_image?: string | null;
  category?: string;
  tags?: string[];
  author_name?: string;
  author_role?: string;
  author_avatar?: string | null;
  read_minutes?: number;
  featured?: boolean;
  published?: boolean;
  published_at?: string | null;
  body_markdown?: string;
}

const PUBLIC_COLUMNS = `id, slug, title, excerpt, cover_image, category, tags,
  author_name, author_role, author_avatar, read_minutes, featured, published,
  published_at, body_markdown, created_at, updated_at`;

export class BlogPostRepository extends BaseRepository<BlogPostRow> {
  protected schema = "app";
  protected table = "blog_posts";

  async findBySlug(slug: string): Promise<BlogPostRow | null> {
    return queryOne<BlogPostRow>(`SELECT * FROM app.blog_posts WHERE slug = $1`, [slug]);
  }

  /** Public feed: published only, newest first. Never leaks drafts. */
  async findPublished(params: { category?: string; search?: string; limit?: number } = {}): Promise<BlogPostRow[]> {
    const conditions = ["published = true"];
    const values: unknown[] = [];
    let i = 1;
    if (params.category) {
      conditions.push(`category = $${i++}`);
      values.push(params.category);
    }
    if (params.search) {
      conditions.push(`(title ILIKE $${i} OR excerpt ILIKE $${i})`);
      values.push(`%${params.search}%`);
      i++;
    }
    const limit = Math.min(params.limit ?? 50, 100);
    return query<BlogPostRow>(
      `SELECT ${PUBLIC_COLUMNS} FROM app.blog_posts
       WHERE ${conditions.join(" AND ")}
       ORDER BY COALESCE(published_at, created_at) DESC LIMIT ${limit}`,
      values,
    );
  }

  async findPublishedBySlug(slug: string): Promise<BlogPostRow | null> {
    return queryOne<BlogPostRow>(
      `SELECT ${PUBLIC_COLUMNS} FROM app.blog_posts WHERE slug = $1 AND published = true`,
      [slug],
    );
  }

  async categories(): Promise<string[]> {
    const rows = await query<{ category: string }>(
      `SELECT DISTINCT category FROM app.blog_posts WHERE published = true ORDER BY category ASC`,
    );
    return rows.map((r) => r.category);
  }

  async related(post: BlogPostRow, limit = 3): Promise<BlogPostRow[]> {
    return query<BlogPostRow>(
      `SELECT ${PUBLIC_COLUMNS} FROM app.blog_posts
       WHERE published = true AND id <> $1 AND category = $2
       ORDER BY COALESCE(published_at, created_at) DESC LIMIT $3`,
      [post.id, post.category, limit],
    );
  }

  async createPost(data: BlogPostInput, client?: PoolClient): Promise<BlogPostRow> {
    return super.create({ ...data } as Record<string, unknown>, client);
  }

  async updateById(id: string, data: Partial<BlogPostInput>): Promise<BlogPostRow> {
    return super.update(id, { ...data, updated_at: new Date().toISOString() } as Record<string, unknown>);
  }
}

export const blogPosts = new BlogPostRepository();
