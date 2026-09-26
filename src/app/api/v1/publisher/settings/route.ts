import { apiHandler, ok, fail } from "@/server/api-utils";
import { publishers } from "@/server/repositories";
import { getPublisherForUser } from "@/server/services/publisher-portal";
import { validate, updatePublisherSelfSchema } from "@/server/validate";

export const GET = apiHandler(async (_req, { user }) => {
  if (!user) return fail("Authentication required", 401);
  const publisher = await getPublisherForUser(user.id);
  if (!publisher) return fail("Publisher account not found", 404);
  return ok({
    id: publisher.id,
    name: publisher.name,
    email: publisher.email,
    afid: publisher.afid,
    fixed_price_cents: publisher.fixed_price_cents,
    retreaver_status: publisher.retreaver_status,
  });
}, { resource: "publisher-portal", action: "view" });

/** Publisher self-service: email only. Name/status/pricing are admin-managed. */
export const PATCH = apiHandler(async (req, { user }) => {
  if (!user) return fail("Authentication required", 401);
  const publisher = await getPublisherForUser(user.id);
  if (!publisher) return fail("Publisher account not found", 404);
  const body = validate(updatePublisherSelfSchema, await req.json());
  const dupe = await publishers.findByEmail(body.email);
  if (dupe && dupe.id !== publisher.id) {
    return fail("A publisher with this email already exists", 409);
  }
  try {
    const updated = await publishers.update(publisher.id, { email: body.email });
    return ok({ id: updated.id, name: updated.name, email: updated.email }, "Settings saved");
  } catch (e) {
    if ((e as { code?: string })?.code === "23505") {
      return fail("A publisher with this email already exists", 409);
    }
    throw e;
  }
}, { resource: "publisher-portal", action: "view" });
