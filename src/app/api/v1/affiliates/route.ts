import { apiHandler, ok, created } from "@/server/api-utils";
import { affiliates } from "@/server/repositories";
import { validate, createAffiliateSchema } from "@/server/validate";

export const GET = apiHandler(async () => {
  const rows = await affiliates.findMany();
  return ok(rows);
}, { resource: "affiliate", action: "view" });

export const POST = apiHandler(async (req) => {
  const body = validate(createAffiliateSchema, await req.json());
  const affiliate = await affiliates.create(body);
  return created(affiliate);
}, { resource: "affiliate", action: "create" });
