import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";

export const GET = apiHandler(async () => {
  try {
    const rows = await query<{ id: string; name: string; email: string; role: string | null; createdAt: string; phone_number: string | null }>(
      `SELECT id, name, email, role, "createdAt", phone_number FROM "user" ORDER BY email ASC`,
    );
    return ok(rows.map((r) => ({ ...r, phone_number: r.phone_number ?? null })));
  } catch (e: unknown) {
    // Migration-skew guard (0071): serve the list without phones rather
    // than 500ing the whole Users page when the column is missing.
    if ((e as { code?: string })?.code !== "42703") throw e;
    const rows = await query<{ id: string; name: string; email: string; role: string | null; createdAt: string }>(
      `SELECT id, name, email, role, "createdAt" FROM "user" ORDER BY email ASC`,
    );
    return ok(rows.map((r) => ({ ...r, phone_number: null })));
  }
}, { resource: "users", action: "view" });
