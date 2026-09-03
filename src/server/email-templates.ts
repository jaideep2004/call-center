export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const EMAIL_SUBJECTS = {
  verify: "Verify your email — Coverage Calls",
  reset: "Reset your password — Coverage Calls",
  agencyInvite: "You're invited to join Coverage Calls",
  publisherInvite: "Your Coverage Calls publisher portal is ready",
};

interface LayoutOptions {
  preheader: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote?: string;
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
const BG = "#F4F5F7";
const CARD = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT = "#111827";
const MUTED = "#6B7280";
const ACCENT = "#7C3AED";

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px auto 0;">
      <tr>
        <td align="center" style="border-radius: 8px;">
          <a href="${href}" style="display: inline-block; background: ${ACCENT}; color: #FFFFFF; font-family: ${FONT}; font-size: 15px; font-weight: 700; line-height: 1; padding: 14px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.02em;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function emailLayout({ preheader, bodyHtml, cta, footerNote }: LayoutOptions): string {
  const footer = footerNote ?? "If you didn't expect this email, you can safely ignore it.";
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Coverage Calls</title>
</head>
<body style="margin:0; padding:0; background:${BG};">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <tr>
            <td align="center" style="padding: 0 0 24px;">
              <span style="font-family: ${FONT}; font-size: 22px; font-weight: 800; letter-spacing: 0.04em; color: ${TEXT};">
                COVERAGE CALLS<span style="color: ${ACCENT};">&#9650;</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 14px; padding: 36px 40px;">
              <div style="font-family: ${FONT}; color: ${TEXT}; font-size: 15px; line-height: 1.65;">
                ${bodyHtml}
              </div>
              ${cta ? ctaButton(cta.label, cta.href) : ""}
              ${cta ? `<p style="font-family: ${FONT}; color: ${MUTED}; font-size: 12px; line-height: 1.6; margin: 14px 0 0; text-align: center; word-break: break-all;"><a href="${cta.href}" style="color: ${MUTED};">${cta.href}</a></p>` : ""}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 0 0;">
              <p style="font-family: ${FONT}; color: ${MUTED}; font-size: 12px; line-height: 1.6; margin: 0;">
                Coverage Calls — call operations
              </p>
              <p style="font-family: ${FONT}; color: ${MUTED}; font-size: 12px; line-height: 1.6; margin: 6px 0 0;">
                ${escapeHtml(footer)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmail(url: string): string {
  return emailLayout({
    preheader: "Confirm your email address to activate your Coverage Calls account.",
    bodyHtml: `
      <h1 style="font-family: ${FONT}; font-size: 20px; font-weight: 700; margin: 0 0 12px; color: ${TEXT};">Verify your email</h1>
      <p style="margin: 0 0 12px;">Welcome to Coverage Calls. Click the button below to confirm your email address and activate your account.</p>
      <p style="margin: 0; color: ${MUTED}; font-size: 13px;">This link expires in 1 hour.</p>`,
    cta: { label: "Verify email", href: url },
    footerNote: "If you didn't create a Coverage Calls account, no action is needed.",
  });
}

export function resetPasswordEmail(url: string): string {
  return emailLayout({
    preheader: "Reset your Coverage Calls password. This link expires in 1 hour.",
    bodyHtml: `
      <h1 style="font-family: ${FONT}; font-size: 20px; font-weight: 700; margin: 0 0 12px; color: ${TEXT};">Reset your password</h1>
      <p style="margin: 0 0 12px;">We received a request to reset the password for your Coverage Calls account. Click the button below to choose a new one.</p>
      <p style="margin: 0; color: ${MUTED}; font-size: 13px;">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>`,
    cta: { label: "Reset password", href: url },
  });
}

export function agencyInviteEmail(url: string, agencyName?: string): string {
  return emailLayout({
    preheader: "You've been invited to join an agency on Coverage Calls.",
    bodyHtml: `
      <h1 style="font-family: ${FONT}; font-size: 20px; font-weight: 700; margin: 0 0 12px; color: ${TEXT};">You're invited</h1>
      <p style="margin: 0 0 12px;">${agencyName ? `You've been invited to join <strong>${escapeHtml(agencyName)}</strong> on Coverage Calls.` : "You've been invited to join an agency on Coverage Calls."}</p>
      <p style="margin: 0 0 12px;">Create your account to accept the invitation.</p>
      <p style="margin: 0; color: ${MUTED}; font-size: 13px;">This invite expires in 7 days.</p>`,
    cta: { label: "Create your account", href: url },
  });
}

export function publisherInviteEmail(url: string, publisherName?: string): string {
  return emailLayout({
    preheader: "Your Coverage Calls publisher portal is ready — track your calls and earnings.",
    bodyHtml: `
      <h1 style="font-family: ${FONT}; font-size: 20px; font-weight: 700; margin: 0 0 12px; color: ${TEXT};">Your publisher portal is ready</h1>
      <p style="margin: 0 0 12px;">${publisherName ? `Hi ${escapeHtml(publisherName)},` : "Hi,"}</p>
      <p style="margin: 0 0 12px;">Your Coverage Calls publisher account has been set up. Click the button below to register and access your portal, where you can track your campaigns, calls, and earnings.</p>
      <p style="margin: 0; color: ${MUTED}; font-size: 13px;">This invite expires in 7 days.</p>`,
    cta: { label: "Open your publisher portal", href: url },
  });
}
