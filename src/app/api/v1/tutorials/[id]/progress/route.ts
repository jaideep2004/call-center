import { apiHandler, ok, fail } from "@/server/api-utils";
import { validate, tutorialProgressSchema } from "@/server/validate";
import { tutorials } from "@/server/repositories";

export const runtime = "nodejs";

/**
 * Tutorial watch progress (P2.2, v1 badge only — never gates Go Live).
 * The viewer is always the session user (body user ids are never trusted).
 * 90%+ flips `completed` server-side; values only move forward unless reset.
 */
export const PATCH = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const userId = context.user?.id;
  if (!userId) return fail("Authentication required", 401);
  if (!context.agencyId) return fail("Agency required", 403);
  const body = validate(tutorialProgressSchema, await req.json());
  const tutorial = await tutorials.findById(id, context.agencyId).catch(() => null);
  if (!tutorial) return fail("Tutorial not found", 404);
  const row = await tutorials.recordProgress(id, userId, body);
  return ok(row, row.completed ? "Tutorial completed" : "Progress saved");
}, { resource: "agents", action: "view" });

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const userId = context.user?.id;
  if (!userId) return fail("Authentication required", 401);
  const row = await tutorials.progressFor(id, userId);
  return ok(row);
}, { resource: "agents", action: "view" });
