import { apiHandler, ok } from "@/server/api-utils";
import { ForbiddenError } from "@/server/errors";
import { query, queryOne } from "@/server/db";
import { validate, makeAdminSchema } from "@/server/validate";

export const runtime = "nodejs";

export const POST = apiHandler(async (req, context) => {
  const body = validate(makeAdminSchema, await req.json());
  const userId = context.user?.id;
  if (!userId) return ok(null, "You must be signed in to promote an account");

  // Self-service only — never promote another account.
  if (body.user_id !== userId) {
    throw new ForbiddenError("You can only promote your own account");
  }

  // Bootstrap gate. In production SETUP_TOKEN is mandatory: without it the
  // endpoint is locked (fail closed) so the first registered user can never
  // self-promote. With the token it must be provided via the x-setup-token
  // header (server-to-server, e.g. curl). In development the endpoint only
  // works until the first super admin exists — after that it is locked.
  const expectedToken = process.env.SETUP_TOKEN;
  if (process.env.NODE_ENV === "production" && !expectedToken) {
    throw new ForbiddenError("Setup is locked — SETUP_TOKEN not configured");
  }
  if (expectedToken) {
    if ((req.headers.get("x-setup-token") ?? "") !== expectedToken) {
      throw new ForbiddenError("Missing or invalid setup token");
    }
  } else {
    const admins = await query<{ id: string }>(
      "SELECT id FROM app.memberships WHERE role = 'super_admin' AND status = 'active' LIMIT 1",
    );
    const callerIsAdmin = await queryOne<{ id: string }>(
      "SELECT id FROM app.memberships WHERE user_id = $1 AND role = 'super_admin' AND status = 'active' LIMIT 1",
      [userId],
    );
    if (admins.length > 0 && !callerIsAdmin) {
      throw new ForbiddenError("Setup is locked — a super admin already exists");
    }
  }

  const agencies = await query<{ id: string }>("SELECT id FROM app.agencies LIMIT 1");
  if (agencies.length === 0) return ok(null, "No agency found. Run `npm run seed` first.");

  const agencyId = agencies[0].id;
  const existing = await query<{ id: string }>(
    "SELECT id FROM app.memberships WHERE user_id = $1 AND agency_id = $2",
    [userId, agencyId],
  );
  const finalRole = body.role ?? "super_admin";
  if (existing.length > 0) {
    await query("UPDATE app.memberships SET role = $1, status = 'active' WHERE id = $2", [finalRole, existing[0].id]);
  } else {
    await query(
      "INSERT INTO app.memberships (agency_id, user_id, role, status) VALUES ($1, $2, $3, 'active')",
      [agencyId, userId, finalRole],
    );
  }
  await query('UPDATE "user" SET role = $1 WHERE id = $2', [finalRole, userId]);
  return ok({ promoted: true, role: finalRole });
});
