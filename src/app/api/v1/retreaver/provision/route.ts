import { apiHandler, ok } from "@/server/api-utils";
import { validate, provisionPublisherSchema } from "@/server/validate";
import { provisionPublisher } from "@/server/services/retreaver";

export const POST = apiHandler(async (req) => {
  const body = validate(provisionPublisherSchema, await req.json());
  const row = await provisionPublisher(body.publisher_id);
  return ok(row, "Publisher provisioned on Retreaver");
}, { resource: "publishers", action: "manage" });
