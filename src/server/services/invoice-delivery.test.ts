import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/email", () => ({
  sendEmail: vi.fn(),
  smtpConfigured: vi.fn(),
}));

import { query, queryOne } from "@/server/db";
import { sendEmail, smtpConfigured } from "@/server/email";
import { sendWeeklyInvoice } from "./invoice-delivery";

const PENDING_INVOICE = {
  id: "inv-1",
  agency_id: "agency-1",
  total_cents: 7500,
  currency: "USD",
  status: "pending",
  display_code: "IN-0007",
  sent_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(smtpConfigured).mockReturnValue(true);
});

function mockHappyPath() {
  vi.mocked(queryOne)
    .mockResolvedValueOnce(PENDING_INVOICE) // invoice
    .mockResolvedValueOnce({ name: "Acme Agency" }); // agency
  vi.mocked(query)
    .mockResolvedValueOnce([{ email: "Head@Example.com" }, { email: "agent@example.com" }, { email: "head@example.com" }]) // recipients
    .mockResolvedValueOnce([
      { kind: "dialer", count: "2", total: "5000" },
      { kind: "software", count: "1", total: "2500" },
    ]) // fee breakdown
    .mockResolvedValueOnce([]); // sent_at marker update
}

describe("sendWeeklyInvoice", () => {
  it("emails head + agents once and marks the invoice sent", async () => {
    mockHappyPath();
    const res = await sendWeeklyInvoice("inv-1");
    expect(res.sent).toBe(true);
    expect(res.recipients).toEqual(["head@example.com", "agent@example.com"]);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const [call] = vi.mocked(sendEmail).mock.calls;
    expect(call[0].subject).toContain("IN-0007");
    expect(call[0].html).toContain("$75.00");
    // sent marker written only after successful send
    const updateCall = vi.mocked(query).mock.calls[2][0] as string;
    expect(updateCall).toContain("sent_at");
    expect(vi.mocked(query).mock.calls[2][1]).toEqual(["inv-1", ["head@example.com", "agent@example.com"]]);
  });

  it("skips invoices that are already marked sent", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ ...PENDING_INVOICE, sent_at: "2026-09-21T00:00:00Z" });
    const res = await sendWeeklyInvoice("inv-1");
    expect(res).toEqual({ sent: false, recipients: [], reason: "already-sent" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does not mark sent when SMTP is unconfigured", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(PENDING_INVOICE);
    vi.mocked(smtpConfigured).mockReturnValue(false);
    const res = await sendWeeklyInvoice("inv-1");
    expect(res.reason).toBe("smtp-unconfigured");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("leaves the invoice unsent when delivery fails so the next run retries", async () => {
    mockHappyPath();
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("smtp down"));
    const res = await sendWeeklyInvoice("inv-1");
    expect(res).toEqual({ sent: false, recipients: [], reason: "send-failed" });
    // 2 query calls only (recipients + breakdown) — no sent_at update
    expect(vi.mocked(query).mock.calls.length).toBe(2);
  });

  it("returns not-found for unknown invoice ids", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const res = await sendWeeklyInvoice("nope");
    expect(res.reason).toBe("not-found");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
