import { apiHandler, ok, paginated, fail } from "@/server/api-utils";
import { walletEntries, agents } from "@/server/repositories";
import { validate, createWalletEntrySchema, paginationSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);

  // Plain agents see ONLY their own ledger rows — an agency-wide filter
  // would leak teammates' top-ups and charges. Heads/admins keep the full
  // agency view (the Ledger page needs it).
  let agentId: string | undefined;
  if (context.user?.role !== "admin" && !context.isHead) {
    const me = context.membership ? await agents.findByMembershipId(context.membership.id).catch(() => null) : null;
    if (!me) return fail("Agent profile not found", 403);
    agentId = me.id;
  }

  const { rows, pagination } = await walletEntries.findMany({
    pagination: { page, limit },
    filters: {
      ...(context.agencyId ? { agency_id: context.agencyId } : {}),
      ...(agentId ? { agent_id: agentId } : {}),
    },
  });

  return paginated(rows, pagination);
}, { resource: "wallet", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createWalletEntrySchema, await req.json());
  const entry = await walletEntries.create({ ...body, agency_id: context.agencyId ?? body.agency_id });
  return ok(entry);
}, { resource: "wallet", action: "manage" });
