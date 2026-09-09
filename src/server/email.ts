import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.warn("SMTP not configured — email not sent to", to);
    return;
  }
  // Gmail SMTP rejects mismatched From domains unless alias is verified.
  // For Gmail, we must send from the Gmail address itself; use EMAIL_FROM as replyTo for branding.
  const rawFrom = process.env.EMAIL_FROM || "Coverage Calls <noreply@coveragecalls.com>";
  const smtpUser = process.env.SMTP_USER || "";
  const fromDomain = rawFrom.includes("<") ? rawFrom.match(/<[^@]+@([^>]+)>/)?.[1] : rawFrom.split("@")[1];
  const smtpDomain = smtpUser.split("@")[1];
  const isGmailMismatch =
    smtpUser.includes("@gmail.com") && fromDomain && smtpDomain && fromDomain !== smtpDomain;
  const from = isGmailMismatch ? `Coverage Calls <${smtpUser}>` : rawFrom;
  const replyTo = isGmailMismatch ? rawFrom : undefined;
  const appUrl = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://coveragecalls.com").replace(/\/$/, "");
  // Generate text version from html (simple strip) if not provided
  const textBody = text || html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 4000);
  const headers: Record<string, string> = {
    "X-Mailer": "Coverage Calls Mailer",
    "List-Unsubscribe": `<${appUrl}/unsubscribe?email=${encodeURIComponent(to)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    Precedence: "bulk",
    "X-Auto-Response-Suppress": "All",
  };
  try {
    await transport.sendMail({
      from,
      to,
      subject,
      html,
      text: textBody,
      replyTo,
      headers,
      // Ensure proper encoding and priority
      priority: "normal" as const,
    });
  } catch (err) {
    console.error(`[email] send failed to=${to} subject="${subject}"`, err);
    throw err;
  }
}

export function smtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
