import { query, queryOne } from "@/server/db";

export interface NotificationRow {
  id: string;
  agency_id: string | null;
  topic: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  dispatched_at: string | null;
}

export class NotificationRepository {
  async findMany(limit = 50, agencyId?: string): Promise<NotificationRow[]> {
    if (agencyId) {
      return query<NotificationRow>(
        "SELECT * FROM app.outbox WHERE agency_id = $1 ORDER BY occurred_at DESC LIMIT $2",
        [agencyId, limit],
      );
    }
    return query<NotificationRow>(
      "SELECT * FROM app.outbox ORDER BY occurred_at DESC LIMIT $1",
      [limit],
    );
  }

  /**
   * Viewer-scoped feed for GET /api/v1/notifications. Admin is platform-level
   * and sees every row. Agents/publishers see their agency's rows plus global
   * (agency_id IS NULL) platform announcements.
   */
  async findForViewer(limit = 50, agencyId?: string | null, isAdmin = false): Promise<NotificationRow[]> {
    if (isAdmin) {
      return query<NotificationRow>(
        "SELECT * FROM app.outbox ORDER BY occurred_at DESC LIMIT $1",
        [limit],
      );
    }
    if (agencyId) {
      return query<NotificationRow>(
        "SELECT * FROM app.outbox WHERE agency_id = $1 OR agency_id IS NULL ORDER BY occurred_at DESC LIMIT $2",
        [agencyId, limit],
      );
    }
    return query<NotificationRow>(
      "SELECT * FROM app.outbox WHERE agency_id IS NULL ORDER BY occurred_at DESC LIMIT $1",
      [limit],
    );
  }

  async findUnread(): Promise<NotificationRow[]> {
    return query<NotificationRow>(
      "SELECT * FROM app.outbox WHERE dispatched_at IS NULL ORDER BY occurred_at DESC LIMIT 20",
    );
  }

  async create(data: { agency_id?: string; topic: string; payload: Record<string, unknown> }): Promise<NotificationRow> {
    const row = await queryOne<NotificationRow>(
      `INSERT INTO app.outbox (agency_id, topic, payload) VALUES ($1, $2, $3) RETURNING *`,
      [data.agency_id ?? null, data.topic, JSON.stringify(data.payload)],
    );
    return row!;
  }

  async markDispatched(id: string): Promise<void> {
    await query("UPDATE app.outbox SET dispatched_at = NOW() WHERE id = $1", [id]);
  }

  /**
   * Idempotent viewer-scoped mark-read: repeated calls succeed and only touch
   * rows visible to the viewer. Returns the row, or null when the id is
   * unknown or belongs to another agency.
   */
  async markDispatchedScoped(
    id: string,
    agencyId?: string | null,
    isAdmin = false,
  ): Promise<NotificationRow | null> {
    if (isAdmin || !agencyId) {
      if (isAdmin) {
        return queryOne<NotificationRow>(
          "UPDATE app.outbox SET dispatched_at = NOW() WHERE id = $1 RETURNING *",
          [id],
        );
      }
      return queryOne<NotificationRow>(
        "UPDATE app.outbox SET dispatched_at = NOW() WHERE id = $1 AND agency_id IS NULL RETURNING *",
        [id],
      );
    }
    return queryOne<NotificationRow>(
      "UPDATE app.outbox SET dispatched_at = NOW() WHERE id = $1 AND (agency_id = $2 OR agency_id IS NULL) RETURNING *",
      [id, agencyId],
    );
  }

  async markAllDispatched(): Promise<void> {
    await query("UPDATE app.outbox SET dispatched_at = NOW() WHERE dispatched_at IS NULL");
  }

  /**
   * Idempotent viewer-scoped mark-all-read. Returns the number of rows flipped
   * from unread to read (already-read rows are untouched).
   */
  async markAllDispatchedScoped(agencyId?: string | null, isAdmin = false): Promise<number> {
    if (isAdmin) {
      const rows = await query<{ id: string }>(
        "UPDATE app.outbox SET dispatched_at = NOW() WHERE dispatched_at IS NULL RETURNING id",
      );
      return rows.length;
    }
    if (agencyId) {
      const rows = await query<{ id: string }>(
        "UPDATE app.outbox SET dispatched_at = NOW() WHERE dispatched_at IS NULL AND (agency_id = $1 OR agency_id IS NULL) RETURNING id",
        [agencyId],
      );
      return rows.length;
    }
    const rows = await query<{ id: string }>(
      "UPDATE app.outbox SET dispatched_at = NOW() WHERE dispatched_at IS NULL AND agency_id IS NULL RETURNING id",
    );
    return rows.length;
  }
}

export const notifications = new NotificationRepository();
