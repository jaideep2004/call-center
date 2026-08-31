import { apiHandler, ok, noContent } from "@/server/api-utils";
import { skills } from "@/server/repositories";
import { validate, updateSkillSchema } from "@/server/validate";

export const PATCH = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const body = validate(updateSkillSchema, await req.json());
  const row = await skills.update(id, body);
  return ok(row, "Skill updated");
}, { resource: "skills", action: "manage" });

export const DELETE = apiHandler(async (req, { params }) => {
  const { id } = await params;
  await skills.softDelete(id);
  return noContent();
}, { resource: "skills", action: "manage" });
