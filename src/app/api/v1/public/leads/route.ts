import { createHash } from "node:crypto";
import { queryOne, query } from "@/server/db";
import { ok, fail, publicApiHandler } from "@/server/api-utils";
import { validate, publicLeadSchema } from "@/server/validate";
import { createRateLimiter, clientIp } from "@/server/rate-limit";

function hash(val: string) {
  return createHash("sha256").update(val.toLowerCase().trim()).digest("hex");
}

// Public endpoints are spammable by design — throttle per IP (Redis-backed, memory fallback).
const leadLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export const POST = publicApiHandler(async (req) => {
  if (!(await leadLimiter(clientIp(req)))) {
    return fail("Too many submissions — try again in a minute", 429);
  }

  const body = validate(publicLeadSchema, await req.json());

  const emailHash = hash(body.email);
  const phoneHash = hash(body.phone);

  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM app.leads WHERE email_hash = $1 OR phone_hash = $2 LIMIT 1",
    [emailHash, phoneHash],
  );
  if (existing) {
    return fail("A lead with this email or phone already exists", 409);
  }

  // Race-safe dedupe: the partial unique indexes (migration 0027) make a
  // concurrent duplicate insert a no-op instead of a second row. Untargeted
  // ON CONFLICT covers BOTH the email and phone unique indexes — a phone-only
  // duplicate returns 409 instead of a 500 unique violation.
  const inserted = await query(
    `INSERT INTO app.leads (agency_id, email_hash, phone_hash, source)
     VALUES (NULL, $1, $2, 'contact_form')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [emailHash, phoneHash],
  );
  if (inserted.length === 0) {
    return fail("A lead with this email or phone already exists", 409);
  }

  return ok(null, "Lead submitted successfully");
});
