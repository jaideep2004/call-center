import { describe, it, expect, vi, beforeEach } from "vitest";

const findRecordingMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));
const findCallMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  recordings: { findById: findRecordingMock },
  agents: { findByMembershipId: findAgentMock },
  calls: { findById: findCallMock },
}));

vi.mock("@/server/services/recording-store", () => ({
  resolveRecordingStreamUrl: vi.fn(async () => "https://cdn.example.com/r.mp3"),
}));

let ctxIsHead = false;

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-1", role: "agent" },
            agencyId: "agency-1",
            membership: { id: "m-1", agency_id: "agency-1", role: "agent" },
            isHead: ctxIsHead,
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

// global fetch mock for the proxy-download
const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

const { GET } = await import("./route");

function get() {
  return GET(
    new Request("http://x/api/v1/recordings/r-1/download", { method: "GET" }),
    { params: Promise.resolve({ id: "r-1" }) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
  findRecordingMock.mockResolvedValue({ id: "r-1", call_id: "call-1", agency_id: "agency-1" });
  findCallMock.mockResolvedValue({ id: "call-1", agent_id: "agent-own", agency_id: "agency-1" });
  fetchMock.mockResolvedValue(new Response("audio-bytes", { status: 200, headers: { "Content-Type": "audio/mpeg" } }));
});

describe("GET /recordings/[id]/download ownership", () => {
  it("serves the owner's own recording", async () => {
    const res = await get();
    expect(res.status).toBe(200);
  });

  it("404s a teammate's recording for plain agents", async () => {
    findCallMock.mockResolvedValue({ id: "call-1", agent_id: "agent-victim", agency_id: "agency-1" });
    const res = await get();
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("heads bypass ownership", async () => {
    ctxIsHead = true;
    findCallMock.mockResolvedValue({ id: "call-1", agent_id: "agent-victim", agency_id: "agency-1" });
    const res = await get();
    expect(res.status).toBe(200);
  });
});
