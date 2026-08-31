import { apiHandler, ok } from "@/server/api-utils";
import { systemSettings } from "@/server/repositories";
import { z } from "zod";
import { validate } from "@/server/validate";

const updateSystemSettingsSchema = z.object({
  allow_agent_agency_creation: z.boolean().optional(),
});

export const GET = apiHandler(async () => {
  const allowAgentAgencyCreation = await systemSettings.getBoolean("allow_agent_agency_creation");
  return ok({
    allow_agent_agency_creation: allowAgentAgencyCreation,
  });
}, { resource: "settings", action: "view" });

export const PATCH = apiHandler(async (req) => {
  const body = validate(updateSystemSettingsSchema, await req.json());
  if (body.allow_agent_agency_creation !== undefined) {
    await systemSettings.set("allow_agent_agency_creation", body.allow_agent_agency_creation);
  }
  return ok({
    allow_agent_agency_creation: await systemSettings.getBoolean("allow_agent_agency_creation"),
  }, "System settings updated");
}, { resource: "settings", action: "manage" });
