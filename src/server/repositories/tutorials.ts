import { BaseRepository } from "./base";
import { query, queryOne } from "@/server/db";
import type { PoolClient } from "pg";

export interface TutorialRow {
  id: string;
  agency_id: string;
  title: string;
  content: string;
  category: string;
  video_url: string | null;
  duration_seconds: number | null;
  tags: string[];
  thumbnail_url: string | null;
  order_index: number;
  published: boolean;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface TutorialProgressRow {
  tutorial_id: string;
  user_id: string;
  watched_seconds: number;
  watched_percent: number;
  completed: boolean;
  updated_at: string;
}

export type TutorialWithProgress = TutorialRow & {
  watched_percent: number | null;
  completed: boolean | null;
};

export class TutorialRepository extends BaseRepository<TutorialRow> {
  protected schema = "app";
  protected table = "tutorials";

  async findByAgency(agencyId: string): Promise<TutorialRow[]> {
    const { rows } = await super.findMany({
      filters: { agency_id: agencyId },
      sortBy: "created_at",
      order: "desc",
    });
    return rows;
  }

  /** Agent-visible: published only, manual order first (P2.2). */
  async findPublished(agencyId: string, client?: PoolClient): Promise<TutorialRow[]> {
    return query<TutorialRow>(
      `SELECT * FROM app.tutorials
        WHERE agency_id = $1 AND published = true AND deleted_at IS NULL
        ORDER BY order_index ASC, created_at DESC`,
      [agencyId],
      client,
    );
  }

  /** Published list with the viewer's progress joined (one query, no N+1). */
  async findPublishedWithProgress(
    agencyId: string,
    userId: string,
    client?: PoolClient,
  ): Promise<TutorialWithProgress[]> {
    return query<TutorialWithProgress>(
      `SELECT t.*,
              tp.watched_percent AS watched_percent,
              tp.completed AS completed
         FROM app.tutorials t
         LEFT JOIN app.tutorial_progress tp
           ON tp.tutorial_id = t.id AND tp.user_id = $2
        WHERE t.agency_id = $1 AND t.published = true AND t.deleted_at IS NULL
        ORDER BY t.order_index ASC, t.created_at DESC`,
      [agencyId, userId],
      client,
    );
  }

  async create(data: {
    agency_id: string;
    title: string;
    content: string;
    category?: string;
    video_url?: string;
    duration_seconds?: number;
    tags?: string[];
    thumbnail_url?: string | null;
    order_index?: number;
    published?: boolean;
    required?: boolean;
  }): Promise<TutorialRow> {
    return super.create(data);
  }

  async update(
    id: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      video_url?: string | null;
      duration_seconds?: number | null;
      tags?: string[];
      thumbnail_url?: string | null;
      order_index?: number;
      published?: boolean;
      required?: boolean;
    },
    agencyId: string,
  ): Promise<TutorialRow> {
    return super.update(id, { ...data, updated_at: new Date().toISOString() }, agencyId);
  }

  /**
   * Record watch progress (90%+ flips completed). Monotonic-ish: seconds and
   * percent only move forward unless explicitly reset with a lower value via
   * the `reset` flag (admin rewatch campaigns). Completed, once true, stays
   * true unless reset.
   */
  async recordProgress(
    tutorialId: string,
    userId: string,
    data: { watched_seconds: number; watched_percent: number; reset?: boolean },
    client?: PoolClient,
  ): Promise<TutorialProgressRow> {
    const percent = Math.max(0, Math.min(100, Math.round(data.watched_percent)));
    const completed = percent >= 90;
    const rows = await query<TutorialProgressRow>(
      `INSERT INTO app.tutorial_progress (tutorial_id, user_id, watched_seconds, watched_percent, completed, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (tutorial_id, user_id) DO UPDATE SET
         watched_seconds = CASE WHEN $6 THEN EXCLUDED.watched_seconds ELSE GREATEST(app.tutorial_progress.watched_seconds, EXCLUDED.watched_seconds) END,
         watched_percent = CASE WHEN $6 THEN EXCLUDED.watched_percent ELSE GREATEST(app.tutorial_progress.watched_percent, EXCLUDED.watched_percent) END,
         completed = CASE WHEN $6 THEN EXCLUDED.completed ELSE (app.tutorial_progress.completed OR EXCLUDED.completed) END,
         updated_at = now()
       RETURNING *`,
      [tutorialId, userId, Math.max(0, Math.round(data.watched_seconds)), percent, completed, Boolean(data.reset)],
      client,
    );
    return rows[0]!;
  }

  async progressFor(
    tutorialId: string,
    userId: string,
    client?: PoolClient,
  ): Promise<TutorialProgressRow | null> {
    return queryOne<TutorialProgressRow>(
      `SELECT * FROM app.tutorial_progress WHERE tutorial_id = $1 AND user_id = $2`,
      [tutorialId, userId],
      client,
    );
  }
}

export const tutorials = new TutorialRepository();
