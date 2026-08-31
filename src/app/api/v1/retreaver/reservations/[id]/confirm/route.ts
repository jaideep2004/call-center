import { apiHandler, ok } from "@/server/api-utils";
import { confirmRtbReservation } from "@/server/services/retreaver-rtb";

export const POST = apiHandler(async (_req, { params }) => {
  const { id } = await params;
  const row = await confirmRtbReservation(id);
  return ok(row, "RTB reservation confirmed");
}, { resource: "publishers", action: "manage" });
