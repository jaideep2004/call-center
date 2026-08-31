import { apiHandler, ok, created } from "@/server/api-utils";
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
  const row = await publishers.create(body);
  return created(row, "Publisher created");
}, { resource: "publishers", action: "manage" });
