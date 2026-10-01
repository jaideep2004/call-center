const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:3001";
const GATEWAY_PUBLISH_TOKEN = process.env.GATEWAY_PUBLISH_TOKEN;

// Fail-loud in production: the localhost default is dev-only. Without
// GATEWAY_URL set, call popups/events silently never reach agents.
if (process.env.NODE_ENV === "production" && !process.env.GATEWAY_URL) {
  console.warn("[event-bridge] GATEWAY_URL unset in production — defaulting to http://localhost:3001; set it to the gateway origin or live call events will not publish");
}

export async function publishCallEvent(membershipId: string, event: string, data: unknown) {
  // Publish failures are LOUD (not a quiet warn): a dead bridge means zero
  // call popups for every agent, and the :3001-vs-:3002 outage hid behind the
  // old message. The call still rings via Telnyx; only the realtime popup is lost.
  try {
    const res = await fetch(`${GATEWAY_URL}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(GATEWAY_PUBLISH_TOKEN ? { Authorization: `Bearer ${GATEWAY_PUBLISH_TOKEN}` } : {}),
      },
      body: JSON.stringify({ membershipId, event, data }),
    });
    if (!res.ok) {
      console.error(`[event-bridge] publish ${event} -> ${GATEWAY_URL} HTTP ${res.status} — agent popup NOT delivered`);
    }
  } catch (e: unknown) {
    console.error(`[event-bridge] publish ${event} -> ${GATEWAY_URL} failed (${e instanceof Error ? e.message : String(e)}) — agent popup NOT delivered; check GATEWAY_URL/REALTIME_PORT vs the gateway's actual port`);
  }
}
