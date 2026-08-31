import { apiHandler, ok, created } from "@/server/api-utils";
import { skills } from "@/server/repositories";
import { validate, createSkillSchema, slugify } from "@/server/validate";

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";
  const rows = activeOnly ? await skills.findActive() : await skills.findAll();
  return ok(rows);
}, { resource: "skills", action: "view" });

export const POST = apiHandler(async (req) => {
  const body = validate(createSkillSchema, await req.json());
  const row = await skills.create({
    name: body.name,
    slug: body.slug ?? slugify(body.name),
    active: body.active ?? true,
    sort: body.sort ?? 0,
  });
  return created(row, "Skill created");
}, { resource: "skills", action: "manage" });
