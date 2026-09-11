import { apiHandler, ok } from "@/server/api-utils";
import { getCampaignRetreaverNumbers } from "@/server/services/retreaver-campaigns";

export const GET = apiHandler(async (_req, { params }) => {
  const { id } = await params;
  try {
    const numbers = await getCampaignRetreaverNumbers(id);
    return ok(numbers);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // If Retreaver returns 404 (campaign not found there) or not configured, return empty instead of 404
    // so UI shows "No numbers yet" rather than error toast.
    if (msg.includes("404") || msg.includes("not found") || msg.includes("not configured")) {
      return ok([]);
    }
    // For other errors, return empty with 200 to avoid blocking campaign page
    console.error("[GET /retreaver/numbers] fallback empty:", msg);
    return ok([]);
  }
}, { resource: "settings", action: "view" });
