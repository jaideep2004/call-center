import { query } from "@/server/db";
import { created, fail, publicApiHandler } from "@/server/api-utils";
import { validate, contactMessageSchema } from "@/server/validate";
import { createRateLimiter, clientIp } from "@/server/rate-limit";

// Public endpoint is spammable by design — throttle per IP (Redis-backed, memory fallback).
const contactLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export const POST = publicApiHandler(async (req) => {
  if (!(await contactLimiter(clientIp(req)))) {
    return fail("Too many submissions — try again in a minute", 429);
  }

  const body = validate(contactMessageSchema, await req.json());

  const rows = await query<{ id: string }>(
    `INSERT INTO app.contact_messages (name, email, phone, agency, call_volume, inquiry_type, message)
     VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), $7)
     RETURNING id`,
    [body.name, body.email, body.phone, body.agency, body.callVolume, body.inquiryType, body.message],
  );

  return created({ id: rows[0].id }, "Message received — our team will respond shortly");
});
