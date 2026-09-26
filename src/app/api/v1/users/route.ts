import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";

export const GET = apiHandler(async () => {
  const rows = await query<{ id: string; name: string; email: string; role: string | null; createdAt: string }>(
    `SELECT id, name, email, role, "createdAt" FROM "user" ORDER BY email ASC`,
  );
  return ok(rows);
}, { resource: "users", action: "view" });
