import { apiHandler, ok, paginated, fail } from "@/server/api-utils";
import { invoices } from "@/server/repositories";
import { validate, createInvoiceSchema, paginationSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);
  const status = url.searchParams.get("status") ?? undefined;

  // Platform admin sees every agency's invoices; everyone else is confined to
  // their own agency (and fails closed without one).
  const isAdmin = context.user?.role === "admin";
  const scopeAgency = isAdmin ? undefined : (context.agencyId ?? undefined);
  if (!isAdmin && !scopeAgency) return fail("Agency scope required", 403);

  const { rows, pagination } = await invoices.findMany({
    pagination: { page, limit },
    agencyId: scopeAgency,
    status,
  });

  return paginated(rows, pagination);
}, { resource: "calls", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createInvoiceSchema, await req.json());
  const invoice = await invoices.create({ ...body, agency_id: context.agencyId ?? body.agency_id });
  return ok(invoice);
}, { resource: "calls", action: "manage", allowHead: true });
