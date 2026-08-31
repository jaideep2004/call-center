import { apiHandler, ok, paginated } from "@/server/api-utils";
import { walletEntries } from "@/server/repositories";
import { validate, createWalletEntrySchema, paginationSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);

  const { rows, pagination } = await walletEntries.findMany({
    pagination: { page, limit },
    filters: context.agencyId ? { agency_id: context.agencyId } : {},
  });

  return paginated(rows, pagination);
}, { resource: "wallet", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createWalletEntrySchema, await req.json());
  const entry = await walletEntries.create({ ...body, agency_id: context.agencyId ?? body.agency_id });
  return ok(entry);
}, { resource: "wallet", action: "manage" });
