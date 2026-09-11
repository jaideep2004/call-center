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

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const BG = "#F6F7FB";
const CARD = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT = "#111827";
const MUTED = "#6B7280";
const ACCENT = "#7C3AED";

// Use absolute production logo URL as requested — ensures Gmail can fetch it (no env-dependent relative path)
const LOGO_URL = "https://coveragecalls.com/images/coveragecallsfinal.png";
const APP_URL = "https://coveragecalls.com";

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || APP_URL).replace(/\/$/, "");
}

function logoUrl(): string {
  // Always return absolute production logo; fallback to env only if custom brand needed
  return LOGO_URL;
}

function ctaButton(label: string, href: string): string {
  const safeLabel = escapeHtml(label);
  // Bulletproof button: Gmail-safe solid #7C3AED, 48px tall (16px font + 16px vertical padding), min-width 240, inline-block, centered table.
  // Solid color only, inline CSS, mso v:roundrect fallback for Outlook.
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 28px auto 0; border-collapse: separate;">
      <tr>
        <td align="center" bgcolor="${ACCENT}" style="border-radius: 10px; background-color: ${ACCENT}; background: ${ACCENT};">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="14%" strokecolor="${ACCENT}" fillcolor="${ACCENT}">
            <center style="color:#ffffff;font-family:${FONT};font-size:16px;font-weight:700;letter-spacing:0.02em;">${safeLabel}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}" target="_blank" rel="noopener" style="display: inline-block; min-width: 240px; background-color: ${ACCENT}; background: ${ACCENT}; color: #FFFFFF; font-family: ${FONT}; font-size: 16px; font-weight: 700; line-height: 16px; mso-line-height-rule: exactly; padding: 16px 32px; border-radius: 10px; text-decoration: none; text-align: center; mso-padding-alt: 0; letter-spacing: 0.02em; border: 1px solid ${ACCENT};">${safeLabel}</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

export function emailLayout({ preheader, bodyHtml, cta, footerNote }: LayoutOptions): string {
  const footer = footerNote ?? "If you didn't expect this email, you can safely ignore it.";
  const logo = logoUrl();
  const base = appBaseUrl();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Coverage Calls</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .cc-card { padding: 28px 22px 24px !important; }
      .cc-header { padding: 24px 20px 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${BG}; background:${BG};">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:transparent; opacity:0;">${escapeHtml(preheader)} &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">COVERAGE CALLS</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG}; background:${BG}; width:100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 32px 16px 40px; background-color:${BG}; background:${BG};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: separate;">
          <!-- Header: white, light-safe, logo centered -->
          <tr>
            <td align="center" class="cc-header" style="background-color:${CARD}; background:${CARD}; border: 1px solid ${BORDER}; border-bottom: none; border-radius: 16px 16px 0 0; padding: 32px 24px 20px; box-shadow: 0 1px 2px rgba(16,12,42,0.04);">
              <a href="${base}" target="_blank" rel="noopener" style="text-decoration: none; display: inline-block;">
                <img src="${logo}" alt="Coverage Calls" width="180" height="40" style="display: block; width: 180px; height: auto; max-width: 180px; border: 0; outline: none; text-decoration: none;" />
              </a>
              <p style="font-family: ${FONT}; color: ${MUTED}; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; margin: 12px 0 0; line-height: 1; font-weight: 600;">Call Operations Platform</p>
            </td>
          </tr>
          <!-- Hairline divider -->
          <tr>
            <td style="background-color:${CARD}; background:${CARD}; border-left: 1px solid ${BORDER}; border-right: 1px solid ${BORDER}; padding: 0; font-size: 0; line-height: 0;">
              <div style="height: 1px; line-height: 1px; background-color:${BORDER}; background:${BORDER}; font-size: 0; mso-line-height-rule: exactly;">&nbsp;</div>
            </td>
          </tr>
          <!-- Card body: white #FFFFFF, padding 36-40, shadow, rounded bottom -->
          <tr>
            <td class="cc-card" style="background-color:${CARD}; background:${CARD}; border: 1px solid ${BORDER}; border-top: none; border-radius: 0 0 16px 16px; padding: 36px 40px 32px; box-shadow: 0 4px 24px rgba(16,12,42,0.06);">
              <div style="font-family: ${FONT}; color: ${TEXT}; font-size: 15px; line-height: 1.7;">
                ${bodyHtml}
              </div>
              ${cta ? ctaButton(cta.label, cta.href) : ""}
              ${cta ? `<div style="margin: 24px 0 0; padding: 14px 16px; background-color:#F9FAFB; background:#F9FAFB; border: 1px solid ${BORDER}; border-radius: 10px;"><p style="font-family: ${FONT}; color: ${MUTED}; font-size: 11px; line-height: 1.5; margin: 0 0 6px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">Or copy this link</p><p style="font-family: ${FONT}; color: ${MUTED}; font-size: 12px; line-height: 1.6; margin: 0; word-break: break-all;"><a href="${cta.href}" target="_blank" rel="noopener" style="color: ${ACCENT}; text-decoration: underline; word-break: break-all;">${cta.href}</a></p></div>` : ""}
            </td>
          </tr>
          <!-- Footer note -->
          <tr>
            <td align="center" style="padding: 22px 16px 0;">
              <p style="font-family: ${FONT}; color: ${MUTED}; font-size: 12px; line-height: 1.6; margin: 0; max-width: 460px;">
                ${escapeHtml(footer)}
              </p>
              <p style="font-family: ${FONT}; color: #9CA3AF; font-size: 11px; line-height: 1.6; margin: 14px 0 0;">
                Coverage Calls, Inc. &middot; 123 Market Street, Suite 400 &middot; San Francisco, CA 94105<br />
                <a href="${base}" target="_blank" rel="noopener" style="color: ${MUTED}; text-decoration: underline;">coveragecalls.com</a> &nbsp;&middot;&nbsp; <a href="${base}/privacy" target="_blank" rel="noopener" style="color: ${MUTED}; text-decoration: underline;">Privacy</a> &nbsp;&middot;&nbsp; <a href="${base}/terms" target="_blank" rel="noopener" style="color: ${MUTED}; text-decoration: underline;">Terms</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 0 0;">
              <p style="font-family: ${FONT}; color: #9CA3AF; font-size: 11px; line-height: 1.6; margin: 0;">&copy; ${new Date().getFullYear()} Coverage Calls. All rights reserved.</p>
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
      <h1 style="font-family: ${FONT}; font-size: 22px; font-weight: 700; margin: 0 0 14px; color: ${TEXT}; line-height: 1.3;">Verify your email</h1>
      <p style="font-family: ${FONT}; margin: 0 0 12px; color: ${TEXT}; font-size: 15px; line-height: 1.7;">Welcome to Coverage Calls. Click the button below to confirm your email address and activate your account.</p>
      <p style="font-family: ${FONT}; margin: 0; color: ${MUTED}; font-size: 13px; line-height: 1.6;">This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.</p>`,
    cta: { label: "Verify email", href: url },
    footerNote: "If you didn't create a Coverage Calls account, no action is needed.",
  });
}

export function resetPasswordEmail(url: string): string {
  return emailLayout({
    preheader: "Reset your Coverage Calls password. This link expires in 1 hour.",
    bodyHtml: `
      <h1 style="font-family: ${FONT}; font-size: 22px; font-weight: 700; margin: 0 0 14px; color: ${TEXT}; line-height: 1.3;">Reset your password</h1>
      <p style="font-family: ${FONT}; margin: 0 0 12px; color: ${TEXT}; font-size: 15px; line-height: 1.7;">We received a request to reset the password for your Coverage Calls account. Click the button below to choose a new one.</p>
      <p style="font-family: ${FONT}; margin: 0; color: ${MUTED}; font-size: 13px; line-height: 1.6;">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>`,
    cta: { label: "Reset password", href: url },
  });
}

export function agencyInviteEmail(url: string, agencyName?: string): string {
  return emailLayout({
    preheader: "You've been invited to join an agency on Coverage Calls.",
    bodyHtml: `
      <h1 style="font-family: ${FONT}; font-size: 22px; font-weight: 700; margin: 0 0 14px; color: ${TEXT}; line-height: 1.3;">You're invited</h1>
      <p style="font-family: ${FONT}; margin: 0 0 12px; color: ${TEXT}; font-size: 15px; line-height: 1.7;">${agencyName ? `You've been invited to join <strong style="color:${TEXT}; font-weight: 700;">${escapeHtml(agencyName)}</strong> on Coverage Calls.` : "You've been invited to join an agency on Coverage Calls."}</p>
      <p style="font-family: ${FONT}; margin: 0 0 12px; color: ${TEXT}; font-size: 15px; line-height: 1.7;">Create your account to accept the invitation.</p>
      <p style="font-family: ${FONT}; margin: 0; color: ${MUTED}; font-size: 13px; line-height: 1.6;">This invite expires in 7 days.</p>`,
    cta: { label: "Create your account", href: url },
  });
}

export function publisherInviteEmail(url: string, publisherName?: string): string {
  return emailLayout({
    preheader: "Your Coverage Calls publisher portal is ready — track your calls and earnings.",
    bodyHtml: `
      <h1 style="font-family: ${FONT}; font-size: 22px; font-weight: 700; margin: 0 0 14px; color: ${TEXT}; line-height: 1.3;">Your publisher portal is ready</h1>
      <p style="font-family: ${FONT}; margin: 0 0 12px; color: ${TEXT}; font-size: 15px; line-height: 1.7;">${publisherName ? `Hi ${escapeHtml(publisherName)},` : "Hi there,"}</p>
      <p style="font-family: ${FONT}; margin: 0 0 12px; color: ${TEXT}; font-size: 15px; line-height: 1.7;">Your Coverage Calls publisher account has been set up. Click the button below to register and access your portal, where you can track your campaigns, calls, and earnings.</p>
      <p style="font-family: ${FONT}; margin: 0; color: ${MUTED}; font-size: 13px; line-height: 1.6;">This invite expires in 7 days.</p>`,
    cta: { label: "Open your publisher portal", href: url },
  });
}
