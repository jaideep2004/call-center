import { notifications } from "@/server/repositories";
import { sendEmail } from "@/server/email";
import { emailLayout } from "@/server/email-templates";
import { publishCallEvent } from "@/lib/event-bridge";

interface NotifyOptions {
  agencyId?: string | null;
  userId?: string | null;
  topic: string;
  payload: Record<string, unknown>;
  emailTo?: string | null;
  emailSubject?: string;
  emailHtml?: string;
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

function notificationEmailHtml(title: string, message: string, href?: string): string {
  const cta = href ? { label: "View in dashboard", href } : undefined;
  return emailLayout({
    preheader: message.slice(0, 90),
    bodyHtml: `<h1 style="font-family:${FONT};font-size:18px;font-weight:700;margin:0 0 10px;color:#111827;">${title}</h1><p style="margin:0;color:#374151;line-height:1.6;">${message}</p>`,
    cta,
  });
}

export async function notify(opts: NotifyOptions): Promise<void> {
  try {
    await notifications.create({ agency_id: opts.agencyId ?? undefined, topic: opts.topic, payload: { ...opts.payload, userId: opts.userId ?? undefined } });
  } catch (e) {
    console.warn("[notify] outbox insert failed", opts.topic, String(e).slice(0, 200));
  }
  // socket fan-out via gateway (best-effort)
  if (opts.userId) {
    try {
      await publishCallEvent(opts.userId, "notification:new", { topic: opts.topic });
    } catch {}
  } else if (opts.agencyId) {
    try {
      await publishCallEvent(opts.agencyId, "notification:new", { topic: opts.topic });
    } catch {}
  }
  if (opts.emailTo && opts.emailSubject) {
    const html = opts.emailHtml ?? notificationEmailHtml(opts.emailSubject, String(opts.payload.message ?? opts.topic), opts.payload.href ? String(opts.payload.href) : undefined);
    try {
      await sendEmail({ to: opts.emailTo, subject: opts.emailSubject, html });
    } catch (e) {
      console.warn("[notify] email failed", opts.emailTo, String(e).slice(0, 200));
    }
  }
}
