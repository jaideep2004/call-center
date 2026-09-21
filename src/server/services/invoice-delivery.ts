import { query, queryOne } from "@/server/db";
import { sendEmail, smtpConfigured } from "@/server/email";
import { EMAIL_SUBJECTS, weeklyInvoiceEmail } from "@/server/email-templates";

export interface InvoiceDeliveryResult {
  sent: boolean;
  recipients: string[];
  reason?: "already-sent" | "not-found" | "not-pending" | "no-recipients" | "smtp-unconfigured" | "send-failed";
}

interface WeeklyInvoiceRow {
  id: string;
  agency_id: string;
  total_cents: number;
  currency: string;
  status: string;
  display_code: string | null;
  sent_at: string | null;
}

function dashboardUrl(): string {
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://coveragecalls.com").replace(/\/$/, "");
  return `${base}/dashboard/wallet`;
}

/**
 * Email a generated weekly invoice to the agency head + active agents.
 * Idempotent: invoices already marked sent are skipped, and the sent marker
 * is only written after sendEmail succeeds (a re-run retries failures).
 * Never throws — callers treat delivery as best-effort next to invoice creation.
 */
export async function sendWeeklyInvoice(invoiceId: string): Promise<InvoiceDeliveryResult> {
  const invoice = await queryOne<WeeklyInvoiceRow>(
    `SELECT id, agency_id, total_cents, currency, status, display_code, sent_at
     FROM app.invoices WHERE id = $1`,
    [invoiceId],
  );
  if (!invoice) return { sent: false, recipients: [], reason: "not-found" };
  if (invoice.sent_at) return { sent: false, recipients: [], reason: "already-sent" };
  if (invoice.status !== "pending") return { sent: false, recipients: [], reason: "not-pending" };
  if (!smtpConfigured()) {
    console.warn(`[invoice-delivery] SMTP unconfigured — invoice ${invoiceId} created but not emailed`);
    return { sent: false, recipients: [], reason: "smtp-unconfigured" };
  }

  const agency = await queryOne<{ name: string }>(
    `SELECT name FROM app.agencies WHERE id = $1`,
    [invoice.agency_id],
  );
  // Head always gets it; every active agent member gets it (roles are
  // admin/agent/publisher only — heads are agents via head_membership_id).
  const recipientRows = await query<{ email: string }>(
    `SELECT DISTINCT u.email
     FROM app.memberships m
     JOIN "user" u ON u.id = m.user_id
     WHERE m.agency_id = $1 AND m.status = 'active'
       AND u.email IS NOT NULL AND u.email <> ''
       AND (m.role = 'agent'
            OR m.id = (SELECT head_membership_id FROM app.agencies WHERE id = $1))`,
    [invoice.agency_id],
  );
  const recipients = [...new Set(recipientRows.map((r) => r.email.trim().toLowerCase()))].filter(Boolean);
  if (recipients.length === 0) {
    console.warn(`[invoice-delivery] no recipient emails for agency ${invoice.agency_id} — invoice ${invoiceId} created but not emailed`);
    return { sent: false, recipients: [], reason: "no-recipients" };
  }

  const feeRows = await query<{ kind: string; count: string; total: string }>(
    `SELECT kind, COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS total
     FROM app.agent_fees WHERE invoice_id = $1 GROUP BY kind`,
    [invoiceId],
  );
  let dialerCents = 0;
  let softwareCents = 0;
  let feeCount = 0;
  for (const f of feeRows) {
    feeCount += Number(f.count);
    if (f.kind === "dialer") dialerCents += Number(f.total);
    else softwareCents += Number(f.total);
  }

  const invoiceRef = invoice.display_code ?? invoice.id.slice(0, 8);
  const html = weeklyInvoiceEmail({
    agencyName: agency?.name ?? "there",
    invoiceRef,
    totalCents: invoice.total_cents,
    feeCount,
    dialerCents,
    softwareCents,
    dashboardUrl: dashboardUrl(),
  });

  try {
    for (const to of recipients) {
      await sendEmail({ to, subject: `${EMAIL_SUBJECTS.weeklyInvoice} — ${invoiceRef}`, html });
    }
  } catch (e) {
    // Leave sent_at NULL so the next run retries; the invoice itself stands.
    console.warn(`[invoice-delivery] send failed for invoice ${invoiceId}:`, String(e).slice(0, 200));
    return { sent: false, recipients: [], reason: "send-failed" };
  }

  await query(
    `UPDATE app.invoices SET sent_at = now(), sent_to = $2
     WHERE id = $1 AND sent_at IS NULL`,
    [invoiceId, recipients],
  );
  return { sent: true, recipients };
}
