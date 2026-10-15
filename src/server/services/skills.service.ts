import { ValidationError } from "@/server/errors";
import { skills } from "@/server/repositories";

export async function assertValidSkills(
  skillNames: string[],
  options?: { includeExclusive?: boolean },
): Promise<string[]> {
  if (!skillNames || skillNames.length === 0) return skillNames;
  const valid = new Set(await skills.findNames(options));
  const invalid = skillNames.filter((name) => !valid.has(name));
  if (invalid.length > 0) {
    throw new ValidationError(`Unknown skills: ${invalid.join(", ")}`);
  }
  return skillNames;
}
