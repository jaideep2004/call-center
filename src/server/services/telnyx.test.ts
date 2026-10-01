import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkTelnyxConnection, telnyxPresence } from "./telnyx";

const realFetch = globalThis.fetch;
const originalKey = process.env.TELNYX_API_KEY;
const originalConn = process.env.TELNYX_CONNECTION_ID;
const originalPub = process.env.TELNYX_PUBLIC_KEY;
const originalSip = process.env.TELNYX_WEBRTC_SIP_USER;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.TELNYX_API_KEY = "KEYtest123";
  delete process.env.TELNYX_CONNECTION_ID;
  delete process.env.TELNYX_PUBLIC_KEY;
  delete process.env.TELNYX_WEBRTC_SIP_USER;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (originalKey === undefined) delete process.env.TELNYX_API_KEY;
  else process.env.TELNYX_API_KEY = originalKey;
  if (originalConn === undefined) delete process.env.TELNYX_CONNECTION_ID;
  else process.env.TELNYX_CONNECTION_ID = originalConn;
  if (originalPub === undefined) delete process.env.TELNYX_PUBLIC_KEY;
  else process.env.TELNYX_PUBLIC_KEY = originalPub;
  if (originalSip === undefined) delete process.env.TELNYX_WEBRTC_SIP_USER;
  else process.env.TELNYX_WEBRTC_SIP_USER = originalSip;
});

describe("checkTelnyxConnection", () => {
  it("reports not-configured when the API key is missing (no network call)", async () => {
    delete process.env.TELNYX_API_KEY;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const status = await checkTelnyxConnection();
    expect(status).toMatchObject({ configured: false, ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(telnyxPresence().api_key).toBe(false);
  });

  it("verifies against the live API and flags missing companion vars", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: [] }), { status: 200 })) as unknown as typeof fetch;
    const status = await checkTelnyxConnection();
    expect(status).toMatchObject({ configured: true, ok: true });
    expect(typeof status.latency_ms).toBe("number");
    expect(status.message).toMatch(/TELNYX_CONNECTION_ID/);
  });

  it("is clean when every companion var is set", async () => {
    process.env.TELNYX_CONNECTION_ID = "conn-1";
    process.env.TELNYX_PUBLIC_KEY = "pub";
    process.env.TELNYX_WEBRTC_SIP_USER = "user";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: [] }), { status: 200 })) as unknown as typeof fetch;
    const status = await checkTelnyxConnection();
    expect(status).toMatchObject({ configured: true, ok: true, message: "Connected" });
  });

  it("maps 401 to an invalid-key message (never throws)", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ errors: [] }), { status: 401 })) as unknown as typeof fetch;
    const status = await checkTelnyxConnection();
    expect(status).toMatchObject({ configured: true, ok: false });
    expect(status.message).toMatch(/Invalid Telnyx API key/);
  });

  it("surfaces network failures as a message, not an exception", async () => {
    globalThis.fetch = (async () => {
      throw new Error("fetch failed");
    }) as unknown as typeof fetch;
    const status = await checkTelnyxConnection();
    expect(status).toMatchObject({ configured: true, ok: false, latency_ms: null });
    expect(status.message).toMatch(/fetch failed/);
  });
});
