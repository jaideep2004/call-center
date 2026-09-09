import { apiHandler, ok } from "@/server/api-utils";
import { campaigns } from "@/server/repositories";
import { validate } from "@/server/validate";
import { z } from "zod";

const publisherIdsSchema = z.object({ publisher_ids: z.array(z.string().min(1)) });

export const GET = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  // Verify campaign exists and scoped
  await campaigns.findById(id, agencyId ?? undefined);
  const ids = await campaigns.getPublisherIds(id);
  return ok({ campaign_id: id, publisher_ids: ids });
}, { resource: "settings", action: "view" });

export const PUT = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  await campaigns.findById(id, agencyId ?? undefined);
  const body = validate(publisherIdsSchema, await req.json());
  const ids = await campaigns.setPublisherIds(id, body.publisher_ids);
  return ok({ campaign_id: id, publisher_ids: ids }, "Publishers updated");
}, { resource: "settings", action: "update" });
