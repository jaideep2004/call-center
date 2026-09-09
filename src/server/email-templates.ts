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
const BG = "#0F0A1E";
const CARD = "#FFFFFF";
const BORDER = "#E9E5F5";
const TEXT = "#1A1033";
const MUTED = "#6B7280";
const ACCENT = "#7C3AED";
const ACCENT_DARK = "#6D28D9";
const SUBTLE_BG = "#F8F7FB";

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://coveragecalls.com").replace(/\/$/, "");
}

function logoUrl(): string {
  return `${appBaseUrl()}/images/coveragecallsfinal.png`;
}

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px auto 0;">
      <tr>
        <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%);">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="10%" strokecolor="${ACCENT}" fillcolor="${ACCENT}"><center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;">${escapeHtml(label)}</center></v:roundrect><![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}" style="display: inline-block; background: linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%); color: #FFFFFF; font-family: ${FONT}; font-size: 15px; font-weight: 700; line-height: 1; padding: 15px 36px; border-radius: 10px; text-decoration: none; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">
            ${escapeHtml(label)}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

export function emailLayout({ preheader, bodyHtml, cta, footerNote }: LayoutOptions): string {
  const footer = footerNote ?? "If you didn't expect this email, you can safely ignore it.";
  const logo = logoUrl();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
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
</head>
<body style="margin:0; padding:0; background:${BG};">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(preheader)}&#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>
  <!-- Preheader spacer for Gmail -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Header with logo -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1A1033 0%, #2D1B4E 100%); max-width: 600px; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 28px 24px 24px; border-bottom: 1px solid rgba(168,85,247,0.15);">
              <a href="${appBaseUrl()}" style="text-decoration: none; display: inline-block;">
                <img src="${logo}" alt="Coverage Calls" width="180" height="36" style="display: block; width: 180px; height: auto; max-width: 180px; border: 0; outline: none;" />
              </a>
              <p style="font-family: ${FONT}; color: rgba(255,255,255,0.6); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; margin: 10px 0 0;">Call Operations Platform</p>
            </td>
          </tr>
        </table>
        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: ${SUBTLE_BG}; padding: 24px 16px 32px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
                <tr>
                  <td style="background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 16px; padding: 36px 36px 32px; box-shadow: 0 4px 24px rgba(26,16,51,0.08);">
                    <div style="font-family: ${FONT}; color: ${TEXT}; font-size: 15px; line-height: 1.7;">
                      ${bodyHtml}
                    </div>
                    ${cta ? ctaButton(cta.label, cta.href) : ""}
                    ${cta ? `<div style="margin: 20px 0 0; padding: 12px 16px; background: ${SUBTLE_BG}; border: 1px solid ${BORDER}; border-radius: 8px;"><p style="font-family: ${FONT}; color: ${MUTED}; font-size: 11px; line-height: 1.5; margin: 0 0 6px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;">Or copy this link</p><p style="font-family: ${FONT}; color: ${MUTED}; font-size: 12px; line-height: 1.5; margin: 0; word-break: break-all;"><a href="${cta.href}" style="color: ${ACCENT}; text-decoration: none; border-bottom: 1px dotted ${ACCENT};">${cta.href}</a></p></div>` : ""}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 24px 0 0;">
                    <p style="font-family: ${FONT}; color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.6; margin: 0; max-width: 420px;">
                      ${escapeHtml(footer)}
                    </p>
                    <p style="font-family: ${FONT}; color: rgba(255,255,255,0.35); font-size: 11px; line-height: 1.6; margin: 12px 0 0;">
                      Coverage Calls, Inc. · 123 Market Street, Suite 400 · San Francisco, CA 94105<br />
                      <a href="${appBaseUrl()}" style="color: rgba(255,255,255,0.5); text-decoration: underline;">coveragecalls.com</a> · <a href="${appBaseUrl()}/privacy" style="color: rgba(255,255,255,0.5);">Privacy</a> · <a href="${appBaseUrl()}/terms" style="color: rgba(255,255,255,0.5);">Terms</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- Footer spacer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 16px 24px 32px;">
              <p style="font-family: ${FONT}; color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Coverage Calls. All rights reserved.</p>
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
