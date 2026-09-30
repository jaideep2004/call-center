import { apiHandler, ok, fail } from "@/server/api-utils";
import { systemSettings, agencies } from "@/server/repositories";
import { z } from "zod";
import { validate } from "@/server/validate";

const updateSystemSettingsSchema = z.object({
  allow_agent_agency_creation: z.boolean().optional(),
  // Home agency for solo agents (Option A): approved signups with no team
  // auto-join it, so they can fund/subscribe/take calls without creating
  // one. Null/empty = unset (approval alone, as before).
  platform_agency_id: z.string().uuid().nullable().optional(),
});

export const GET = apiHandler(async () => {
  const allowAgentAgencyCreation = await systemSettings.getBoolean("allow_agent_agency_creation");
  const platformAgencyId = (await systemSettings.get("platform_agency_id")) as string | null;
  return ok({
    allow_agent_agency_creation: allowAgentAgencyCreation,
    platform_agency_id: typeof platformAgencyId === "string" ? platformAgencyId : null,
  });
}, { resource: "settings", action: "view" });

export const PATCH = apiHandler(async (req) => {
  const body = validate(updateSystemSettingsSchema, await req.json());
  if (body.allow_agent_agency_creation !== undefined) {
    await systemSettings.set("allow_agent_agency_creation", body.allow_agent_agency_creation);
  }
  if (body.platform_agency_id !== undefined) {
    if (body.platform_agency_id) {
      const target = await agencies.findById(body.platform_agency_id).catch(() => null);
      if (!target) return fail("Platform agency not found", 404);
    }
    await systemSettings.set("platform_agency_id", body.platform_agency_id);
  }
  const platformAgencyId = (await systemSettings.get("platform_agency_id")) as string | null;
  return ok({
    allow_agent_agency_creation: await systemSettings.getBoolean("allow_agent_agency_creation"),
    platform_agency_id: typeof platformAgencyId === "string" ? platformAgencyId : null,
  }, "System settings updated");
}, { resource: "settings", action: "manage" });
