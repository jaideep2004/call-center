import { apiHandler, ok, created } from "@/server/api-utils";
import { featureRequests } from "@/server/repositories";
import { validate, createFeatureRequestSchema } from "@/server/validate";

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search") ?? undefined;
  const { rows, pagination } = await featureRequests.findMany({
    filters: status ? { status } : undefined,
    search,
    sortBy: status === "open" ? "votes" : "created_at",
    pagination: { page: 1, limit: 100 },
  });
  return ok(rows, "Success", { pagination });
}, { resource: "features", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createFeatureRequestSchema, await req.json());
  const row = await featureRequests.create({
    user_id: context.user!.id,
    title: body.title,
    description: body.description ?? null,
  });
  return created(row, "Feature request submitted");
}, { resource: "features", action: "create" });
