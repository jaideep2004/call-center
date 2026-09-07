import { apiHandler, ok } from "@/server/api-utils";
import { createPortalInvite } from "@/server/services/publisher-portal";
import { sendEmail } from "@/server/email";
import { EMAIL_SUBJECTS, publisherInviteEmail } from "@/server/email-templates";

export const POST = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const origin = new URL(req.url).origin;
  const result = await createPortalInvite(id, origin);

  try {
    await sendEmail({
      to: result.email,
      subject: EMAIL_SUBJECTS.publisherInvite,
      html: publisherInviteEmail(result.link, result.name),
    });
  } catch (err) {
    // Log the SMTP error code only — the full error may include the SMTP
    // connection URL (e.g. smtp://user:pass@host) and we never want creds
    // leaking to logs. err.code is the stable transport-level identifier.
    console.error(
      "[invite] publisher invite email send failed",
      { email: result.email, code: (err as { code?: string })?.code ?? "unknown" },
    );
  }

  return ok({ link: result.link, emailed: true }, "Publisher portal invite emailed");
}, { resource: "publishers", action: "manage" });
