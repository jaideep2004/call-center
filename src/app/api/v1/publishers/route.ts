import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { publishers } from "@/server/repositories";
import { validate, createPublisherSchema } from "@/server/validate";

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";
  const rows = activeOnly ? await publishers.findActive() : await publishers.findAll();
  return ok(rows);
}, { resource: "publishers", action: "view" });

export const POST = apiHandler(async (req) => {
  const body = validate(createPublisherSchema, await req.json());
  if (body.email) {
    const dupe = await publishers.findByEmail(body.email);
    if (dupe) return fail("A publisher with this email already exists", 409);
  }
  try {
    const row = await publishers.create(body);
    return created(row, "Publisher created");
  } catch (e) {
    // Race with a concurrent create — the 0066 partial unique index wins.
    if ((e as { code?: string })?.code === "23505") {
      return fail("A publisher with this email already exists", 409);
    }
    throw e;
  }
}, { resource: "publishers", action: "manage" });
