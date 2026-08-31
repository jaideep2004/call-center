import { NextResponse } from "next/server";
import { apiHandler, fail } from "@/server/api-utils";
import { recordings } from "@/server/repositories";
import { resolveRecordingStreamUrl } from "@/server/services/recording-store";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const recording = await recordings.findById(id, context.agencyId ?? undefined);
  if (!recording) return fail("Recording not found", 404);

  const ext = recording.content_type?.split("/")[1] ?? "wav";

  // Stored URLs are presigned and expire — always re-sign a fresh one when possible.
  let url: string;
  try {
    url = await resolveRecordingStreamUrl(recording);
  } catch {
    return fail("Could not refresh recording URL", 502);
  }

  const response = await fetch(url);
  if (!response.ok) return fail("Failed to fetch recording", 502);

  const headers = new Headers(response.headers);
  headers.set("Content-Disposition", `attachment; filename="recording-${id}.${ext}"`);

  return new NextResponse(response.body, { status: 200, headers });
}, { resource: "calls", action: "view" });
