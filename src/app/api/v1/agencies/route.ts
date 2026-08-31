import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { agencies, systemSettings } from "@/server/repositories";
import { validate, createAgencySchema } from "@/server/validate";
import { transaction } from "@/server/db";

export const runtime = "nodejs";

export const GET = apiHandler(async (_req, context) => {
  const { rows } = await agencies.findMany({ pagination: { page: 1, limit: 100 } });
  return ok(rows);
}, { resource: "agency", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createAgencySchema, await req.json());
  const isAgent = context.user?.role === "agent";

  if (isAgent) {
    const allowed = await systemSettings.getBoolean("allow_agent_agency_creation");
    if (!allowed) {
      return fail("Agency creation is disabled by the platform admin", 403);
    }
    if (!context.membership) {
      return fail("No membership found for your account", 400);
    }
    if (context.agencyId) {
      return fail("You already belong to an agency", 400);
    }
  }

  const agency = await transaction(async (client) => {
    const agencyRow = await agencies.create({
      name: body.name,
      slug: body.slug,
    }, client);
    if (isAgent && context.membership) {
      await client.query(
        `UPDATE app.agencies SET head_membership_id = $1 WHERE id = $2`,
        [context.membership.id, agencyRow.id],
      );
      await client.query(
        `UPDATE app.memberships SET agency_id = $1, role = 'agency', status = 'active' WHERE id = $2`,
        [agencyRow.id, context.membership.id],
      );
      await client.query(`UPDATE "user" SET role = 'agency' WHERE id = $1`, [context.user!.id]);
    }
    return agencyRow;
  });

  return created(agency, isAgent ? "Agency created — you are now the agency head" : "Agency created");
}, { resource: "agency", action: "create" });
