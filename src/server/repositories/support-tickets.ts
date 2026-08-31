import { query, queryOne } from "@/server/db";

export interface SupportTicketRow {
  id: string;
  agency_id: string;
  requester_membership_id: string;
  assignee_membership_id: string | null;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
}

export interface SupportReplyRow {
  id: string;
  ticket_id: string;
  author_membership_id: string;
  body: string;
  created_at: string;
}

export class SupportTicketRepository {
  async create(data: {
    agency_id: string;
    requester_membership_id: string;
    subject: string;
    priority?: string;
  }): Promise<SupportTicketRow> {
    const row = await queryOne<SupportTicketRow>(
      `INSERT INTO app.support_tickets (agency_id, requester_membership_id, subject, priority)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.agency_id, data.requester_membership_id, data.subject, data.priority ?? "normal"],
    );
    return row!;
  }

  async findManyForAgency(agencyId: string, status?: string): Promise<SupportTicketRow[]> {
    if (status) {
      return query<SupportTicketRow>(
        "SELECT * FROM app.support_tickets WHERE agency_id = $1 AND status = $2 ORDER BY created_at DESC",
        [agencyId, status],
      );
    }
    return query<SupportTicketRow>(
      "SELECT * FROM app.support_tickets WHERE agency_id = $1 ORDER BY created_at DESC",
      [agencyId],
    );
  }

  async findByIdForAgency(id: string, agencyId: string): Promise<SupportTicketRow | null> {
    return queryOne<SupportTicketRow>(
      "SELECT * FROM app.support_tickets WHERE id = $1 AND agency_id = $2",
      [id, agencyId],
    );
  }

  async setStatus(id: string, status: string, agencyId?: string): Promise<SupportTicketRow | null> {
    if (agencyId) {
      return queryOne<SupportTicketRow>(
        `UPDATE app.support_tickets SET status = $2, updated_at = now()
         WHERE id = $1 AND agency_id = $3 RETURNING *`,
        [id, status, agencyId],
      );
    }
    return queryOne<SupportTicketRow>(
      `UPDATE app.support_tickets SET status = $2, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, status],
    );
  }

  async addReply(ticketId: string, authorMembershipId: string, body: string): Promise<SupportReplyRow> {
    const row = await queryOne<SupportReplyRow>(
      `INSERT INTO app.support_ticket_replies (ticket_id, author_membership_id, body)
       VALUES ($1, $2, $3) RETURNING *`,
      [ticketId, authorMembershipId, body],
    );
    return row!;
  }

  async repliesFor(ticketId: string): Promise<SupportReplyRow[]> {
    return query<SupportReplyRow>(
      "SELECT * FROM app.support_ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC",
      [ticketId],
    );
  }
}

export const supportTickets = new SupportTicketRepository();
