import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  emailLayout,
  verificationEmail,
  resetPasswordEmail,
  agencyInviteEmail,
  publisherInviteEmail,
  agentWelcomeEmail,
  agentApprovedEmail,
  memberAddedEmail,
  walletTopupEmail,
  subscriptionActiveEmail,
  supportTicketRaisedEmail,
  weeklyInvoiceEmail,
  EMAIL_SUBJECTS,
} from "./email-templates";

describe("escapeHtml", () => {
  it("escapes angle brackets, ampersands, and quotes", () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
  });
});

describe("emailLayout", () => {
  it("renders a branded card with preheader, body, CTA, and footer", () => {
    const html = emailLayout({
      preheader: "secret preview",
      bodyHtml: "<p>Hello</p>",
      cta: { label: "Do it", href: "https://app.example.com/x" },
    });
    expect(html).toContain("COVERAGE CALLS");
    expect(html).toContain("secret preview");
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain("Do it");
    expect(html).toContain("</a>");
    expect(html).toContain("https://app.example.com/x");
    expect(html).toContain("ignore it");
  });

  it("uses a wide card (680px) that fills desktop inboxes", () => {
    const html = emailLayout({ preheader: "p", bodyHtml: "<p>Hi</p>" });
    expect(html).toContain("max-width: 680px");
  });

  it("carries button padding on the td, never only the anchor (Gmail collapses anchor padding)", () => {
    const html = emailLayout({
      preheader: "p",
      bodyHtml: "<p>Hi</p>",
      cta: { label: "Create your account", href: "https://app.example.com/register?invite=abc" },
    });
    // padding + radius on the cell survive every Gmail render path
    expect(html).toMatch(/<td[^>]*padding:\s*16px 32px[^>]*>\s*<!--\[if mso\]/);
    // anchor is plain text styling — no layout responsibility
    const anchor = html.match(/<a href="https:\/\/app\.example\.com[^>]*>Create your account<\/a>/)?.[0] ?? "";
    expect(anchor).not.toContain("padding:");
  });
});

describe("verificationEmail", () => {
  it("contains the verify link and one-hour expiry note", () => {
    const html = verificationEmail("https://app.example.com/verify?token=abc");
    expect(html).toContain("https://app.example.com/verify?token=abc");
    expect(html).toContain("Verify email");
    expect(html).toContain("expires in 1 hour");
  });
});

describe("resetPasswordEmail", () => {
  it("contains the reset link and CTA", () => {
    const html = resetPasswordEmail("https://app.example.com/reset-password?token=xyz");
    expect(html).toContain("https://app.example.com/reset-password?token=xyz");
    expect(html).toContain("Reset password");
    expect(html).toContain("expires in 1 hour");
  });
});

describe("agencyInviteEmail", () => {
  it("invites to the app (not a specific agency) with the register link", () => {
    const html = agencyInviteEmail("https://app.example.com/register?invite=abc123");
    expect(html).toContain("register?invite=abc123");
    expect(html).toContain("join <strong");
    expect(html).toContain("Coverage Calls");
    expect(html).not.toContain("join an agency");
    expect(html).toContain("Create your account");
    expect(html).toContain("expires in 7 days");
  });
});

describe("publisherInviteEmail", () => {
  it("includes the invite link and publisher name", () => {
    const html = publisherInviteEmail("https://app.example.com/register?invite=abc123", "TV Traffic");
    expect(html).toContain("register?invite=abc123");
    expect(html).toContain("TV Traffic");
    expect(html).toContain("Open your publisher portal");
    expect(html).toContain("expires in 7 days");
  });
});

describe("subjects", () => {
  it("defines subjects for all email types", () => {
    expect(EMAIL_SUBJECTS.verify).toContain("Verify");
    expect(EMAIL_SUBJECTS.reset).toContain("Reset");
    expect(EMAIL_SUBJECTS.agencyInvite).toContain("invited");
    expect(EMAIL_SUBJECTS.publisherInvite).toContain("portal");
    expect(EMAIL_SUBJECTS.agentWelcome).toContain("Welcome");
    expect(EMAIL_SUBJECTS.agentApproved).toContain("approved");
    expect(EMAIL_SUBJECTS.memberAdded).toContain("added");
    expect(EMAIL_SUBJECTS.walletTopup).toContain("topped up");
    expect(EMAIL_SUBJECTS.subscriptionActive).toContain("activated");
    expect(EMAIL_SUBJECTS.ticketRaised).toContain("ticket");
  });
});

describe("money + ticket emails", () => {
  it("top-up receipt shows credit + fee, head copy names the agent", () => {
    const agent = walletTopupEmail({ dashboardUrl: "https://x/wallet", amountCents: 25000, feeCents: 750 });
    expect(agent).toContain("$250.00");
    expect(agent).toContain("$7.50");
    const head = walletTopupEmail({ dashboardUrl: "https://x/wallet", agentName: "Sam", amountCents: 25000, feeCents: 750, forHead: true });
    expect(head).toContain("Sam");
    expect(head).toContain("$250.00");
  });

  it("subscription mail names the plan when known", () => {
    const html = subscriptionActiveEmail({ dashboardUrl: "https://x", planName: "Pro 500" });
    expect(html).toContain("Pro 500");
    expect(html).toContain("topped-up wallet");
  });

  it("ticket mail frames requester vs head correctly and escapes input", () => {
    const mine = supportTicketRaisedEmail({ dashboardUrl: "https://x", subject: "Mic <broken>", priority: "high" });
    expect(mine).toContain("Ticket received");
    expect(mine).toContain("Mic &lt;broken&gt;");
    const head = supportTicketRaisedEmail({ dashboardUrl: "https://x", subject: "Mic issue", priority: "urgent", requesterName: "Sam", forHead: true });
    expect(head).toContain("needs attention");
    expect(head).toContain("Sam");
  });
});

describe("brand header", () => {
  it("renders the logo on violet, never on white, with no black surfaces", () => {
    const html = emailLayout({ preheader: "p", bodyHtml: "<p>Hi</p>" });
    // white wordmark sits on the violet gradient header
    expect(html).toContain("linear-gradient(135deg, #7C3AED");
    expect(html).toContain("coveragecallsfinal.png");
    // tagline is pure white on the violet header
    expect(html).toContain("color: #FFFFFF; font-size: 11px;");
    // Outlook fallback is violet, not black
    expect(html).toContain('bgcolor="#5B21B6"');
    expect(html).not.toContain("#000000");
    expect(html).not.toContain("background:#000");
  });

  it("never puts double quotes inside style attributes (breaks email rendering)", () => {
    // A `"` inside style="..." terminates the attribute in email clients,
    // silently dropping every declaration after it (colors, decoration).
    // Font names must use single quotes.
    const html = emailLayout({
      preheader: "p",
      bodyHtml: "<p>Hi</p>",
      cta: { label: "Go", href: "https://app.example.com/x" },
    });
    expect(html).not.toContain('"Segoe UI"');
    expect(html).toContain("'Segoe UI'");
  });

  it("styles the CTA anchor itself (white, bold, tracked) with padding on the cell", () => {
    const html = emailLayout({
      preheader: "p",
      bodyHtml: "<p>Hi</p>",
      cta: { label: "Create your account", href: "https://app.example.com/register?invite=abc" },
    });
    const anchor = html.match(/<a href="https:\/\/app\.example\.com[^>]*>Create your account<\/a>/)?.[0] ?? "";
    expect(anchor).toContain("color: #FFFFFF");
    expect(anchor).toContain("font-weight: 800");
    expect(anchor).toContain("letter-spacing: 0.02em");
    expect(anchor).not.toContain("padding:");
  });
});

describe("agent lifecycle emails", () => {
  it("welcome mail names the agency and links Take Calls", () => {
    const html = agentWelcomeEmail("https://app.example.com/dashboard/take-calls", "Acme", "Arjun");
    expect(html).toContain("Acme");
    expect(html).toContain("Arjun");
    expect(html).toContain("/dashboard/take-calls");
    expect(html).toContain("approves your profile");
  });

  it("approval mail tells the agent to go online", () => {
    const html = agentApprovedEmail("https://app.example.com/dashboard/take-calls", "Acme");
    expect(html).toContain("Acme");
    expect(html).toContain("Online");
    expect(html).toContain("/dashboard/take-calls");
  });

  it("member-added mail escapes the agency name", () => {
    const html = memberAddedEmail("https://app.example.com/dashboard", `<b>Evil</b>`);
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
  });

  it("invoice mail shows reference, total, and breakdown", () => {
    const html = weeklyInvoiceEmail({
      agencyName: "Acme",
      invoiceRef: "IN-0007",
      totalCents: 7500,
      feeCount: 3,
      dialerCents: 5000,
      softwareCents: 2500,
      dashboardUrl: "https://app.example.com/dashboard/wallet",
    });
    expect(html).toContain("IN-0007");
    expect(html).toContain("$75.00");
    expect(html).toContain("Dialer Fees $50.00");
    expect(html).toContain("Software Access $25.00");
  });
});
