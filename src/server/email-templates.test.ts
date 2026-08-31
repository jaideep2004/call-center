import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  emailLayout,
  verificationEmail,
  resetPasswordEmail,
  agencyInviteEmail,
  publisherInviteEmail,
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
  it("includes the invite link and agency name", () => {
    const html = agencyInviteEmail("https://app.example.com/register?invite=abc123", "Acme Insurance");
    expect(html).toContain("register?invite=abc123");
    expect(html).toContain("Acme Insurance");
    expect(html).toContain("Create your account");
    expect(html).toContain("expires in 7 days");
  });

  it("escapes the agency name", () => {
    const html = agencyInviteEmail("https://app.example.com/register?invite=abc", `<b>Evil</b>`);
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
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
  });
});
