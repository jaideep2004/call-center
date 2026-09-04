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
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.warn("SMTP not configured — email not sent to", to);
    return;
  }
  // Gmail SMTP rejects mismatched From domains unless alias is verified.
  // Fall back to SMTP_USER when EMAIL_FROM domain differs to ensure delivery.
  const rawFrom = process.env.EMAIL_FROM || "noreply@coveragecalls.com";
  const smtpUser = process.env.SMTP_USER || "";
  const fromDomain = rawFrom.includes("<") ? rawFrom.match(/<[^@]+@([^>]+)>/)?.[1] : rawFrom.split("@")[1];
  const smtpDomain = smtpUser.split("@")[1];
  const from =
    smtpUser.includes("@gmail.com") && fromDomain && smtpDomain && fromDomain !== smtpDomain
      ? `${smtpUser} <${smtpUser}>`
      : rawFrom;
  try {
    await transport.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error(`[email] send failed to=${to} subject="${subject}"`, err);
    throw err;
  }
}

export function smtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
