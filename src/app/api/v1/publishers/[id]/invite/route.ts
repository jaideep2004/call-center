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
    console.error("Failed to send publisher invite email:", err);
  }

  return ok({ link: result.link, emailed: true }, "Publisher portal invite emailed");
}, { resource: "publishers", action: "manage" });
