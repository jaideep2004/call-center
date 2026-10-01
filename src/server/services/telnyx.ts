/**
 * Telnyx connection status — the admin Settings page pings the LIVE Telnyx
 * API so the badge reflects a real key, not an assumption. Secrets are never
 * returned; only presence booleans leave the server.
 */

export interface TelnyxConnectionStatus {
  /** TELNYX_API_KEY is set (without it nothing Telnyx-side can work). */
  configured: boolean;
  /** The live API ping succeeded with the configured key. */
  ok: boolean;
  latency_ms: number | null;
  message: string;
  details: {
    api_key: boolean;
    connection_id: boolean;
    public_key: boolean;
    webrtc_sip_user: boolean;
  };
}

export function telnyxPresence() {
  return {
    api_key: Boolean(process.env.TELNYX_API_KEY),
    connection_id: Boolean(process.env.TELNYX_CONNECTION_ID),
    public_key: Boolean(process.env.TELNYX_PUBLIC_KEY),
    webrtc_sip_user: Boolean(process.env.TELNYX_WEBRTC_SIP_USER),
  };
}

export async function checkTelnyxConnection(timeoutMs = 15_000): Promise<TelnyxConnectionStatus> {
  const details = telnyxPresence();
  if (!details.api_key) {
    return {
      configured: false,
      ok: false,
      latency_ms: null,
      message: "Telnyx not configured (TELNYX_API_KEY missing)",
      details,
    };
  }
  // Least-privilege live ping: list one phone number. 2xx proves the key is
  // valid; 401/403 proves it is not. No numbers are created, bought, or billed.
  const start = Date.now();
  try {
    const res = await fetch("https://api.telnyx.com/v2/phone_numbers?page%5Bsize%5D=1", {
      headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latency_ms = Date.now() - start;
    if (res.ok) {
      const missing = [
        !details.connection_id && "TELNYX_CONNECTION_ID",
        !details.public_key && "TELNYX_PUBLIC_KEY (webhooks unverifiable)",
        !details.webrtc_sip_user && "TELNYX_WEBRTC_SIP_USER (WebRTC dial will fail)",
      ].filter(Boolean) as string[];
      return {
        configured: true,
        ok: true,
        latency_ms,
        message: missing.length > 0 ? `Connected — missing: ${missing.join(", ")}` : "Connected",
        details,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return { configured: true, ok: false, latency_ms, message: "Invalid Telnyx API key (rejected by Telnyx)", details };
    }
    if (res.status === 429) {
      return { configured: true, ok: false, latency_ms, message: "Rate limited by Telnyx — retry shortly", details };
    }
    return { configured: true, ok: false, latency_ms, message: `Telnyx error ${res.status}`, details };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      latency_ms: null,
      message: String(error).slice(0, 200),
      details,
    };
  }
}
