import { query, queryOne } from "@/server/db";

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

  async accept(token: string): Promise<PublisherInviteRow> {
    const rows = await query<PublisherInviteRow>(
      `UPDATE app.publisher_invites SET status = 'accepted' WHERE token = $1 AND status = 'pending' AND expires_at > now() RETURNING *`,
      [token],
    );
    return rows[0];
  }
}

export const publisherInvites = new PublisherInviteRepository();
