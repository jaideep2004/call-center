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

  async markAllDispatched(): Promise<void> {
    await query("UPDATE app.outbox SET dispatched_at = NOW() WHERE dispatched_at IS NULL");
  }
}

export const notifications = new NotificationRepository();
