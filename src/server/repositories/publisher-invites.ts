import { query, queryOne } from "@/server/db";
import { ConflictError } from "@/server/errors";

export interface PublisherInviteRow {
  id: string;
  publisher_id: string;
  email: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export class PublisherInviteRepository {
  async findByToken(token: string): Promise<PublisherInviteRow | null> {
    return queryOne<PublisherInviteRow>(
      "SELECT * FROM app.publisher_invites WHERE token = $1 LIMIT 1",
      [token],
    );
  }

  async findPendingByPublisher(publisherId: string): Promise<PublisherInviteRow | null> {
    return queryOne<PublisherInviteRow>(
      `SELECT * FROM app.publisher_invites
       WHERE publisher_id = $1 AND status = 'pending' AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [publisherId],
    );
  }

  async create(data: {
    publisher_id: string;
    email: string;
    token: string;
  }): Promise<PublisherInviteRow> {
    const row = await queryOne<PublisherInviteRow>(
      `INSERT INTO app.publisher_invites (publisher_id, email, token) VALUES ($1, $2, $3) RETURNING *`,
      [data.publisher_id, data.email, data.token],
    );
    return row!;
  }

  /**
   * Atomically accept a pending invite. Throws ConflictError when the row was
   * already accepted, expired, or doesn't exist (no rows returned by the
   * CAS UPDATE). This makes concurrent double-accept produce 409 instead of
   * surfacing as 500 from the route handler.
   */
  async accept(token: string): Promise<PublisherInviteRow> {
    const rows = await query<PublisherInviteRow>(
      `UPDATE app.publisher_invites SET status = 'accepted' WHERE token = $1 AND status = 'pending' AND expires_at > now() RETURNING *`,
      [token],
    );
    const row = rows[0];
    if (!row) {
      // Distinguish "not found" from "already accepted / expired" so the
      // route can return 404 vs 409.
      const existing = await this.findByToken(token);
      if (!existing) throw new ConflictError("Invite not found");
      if (existing.status !== "pending") throw new ConflictError("Invite already used");
      if (new Date(existing.expires_at) < new Date()) throw new ConflictError("Invite expired");
      throw new ConflictError("Invite could not be accepted");
    }
    return row;
  }
}

export const publisherInvites = new PublisherInviteRepository();
