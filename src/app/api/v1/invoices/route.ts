import { apiHandler, ok, paginated } from "@/server/api-utils";
import { invoices } from "@/server/repositories";
import { validate, createInvoiceSchema, paginationSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);
  const status = url.searchParams.get("status") ?? undefined;

  const { rows, pagination } = await invoices.findMany({
    pagination: { page, limit },
    agencyId: context.agencyId ?? undefined,
    status,
  });

  return paginated(rows, pagination);
}, { resource: "calls", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createInvoiceSchema, await req.json());
  const invoice = await invoices.create({ ...body, agency_id: context.agencyId ?? body.agency_id });
  return ok(invoice);
}, { resource: "calls", action: "create" });
