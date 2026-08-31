const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:3001";
const GATEWAY_PUBLISH_TOKEN = process.env.GATEWAY_PUBLISH_TOKEN;

export async function publishCallEvent(membershipId: string, event: string, data: unknown) {
  try {
    await fetch(`${GATEWAY_URL}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(GATEWAY_PUBLISH_TOKEN ? { Authorization: `Bearer ${GATEWAY_PUBLISH_TOKEN}` } : {}),
      },
      body: JSON.stringify({ membershipId, event, data }),
    });
  } catch {
    console.warn("Gateway event bridge not available");
  }
}
