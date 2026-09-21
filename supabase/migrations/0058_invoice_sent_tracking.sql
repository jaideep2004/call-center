-- 0058: track automatic weekly-invoice delivery (Phase 5, auto-send).
-- generateWeeklyInvoices emails the pending invoice to the agency head +
-- active agents right after creating it. sent_at/sent_to make delivery
-- idempotent: re-runs never resend an already-sent invoice.
alter table app.invoices add column if not exists sent_at timestamptz;
alter table app.invoices add column if not exists sent_to text[];
