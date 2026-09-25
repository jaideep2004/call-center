import { describe, it, expect, vi, beforeEach } from "vitest";

const syncMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/retreaver-recordings", () => ({
  syncRecordingsFromRetreaver: syncMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-a", role: "admin" },
            agencyId: null,
            membership: null,
            isHead: false,
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const { POST } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  syncMock.mockResolvedValue({ synced: 4 });
});

describe("POST /recordings/sync-from-retreaver", () => {
  it("syncs platform-wide for admins and reports the count", async () => {
    const res = await POST(
      new Request("http://x/api/v1/recordings/sync-from-retreaver", { method: "POST" }),
      { params: Promise.resolve({}) } as never,
    );
    expect(res.status).toBe(200);
    expect(syncMock).toHaveBeenCalledWith(undefined);
    const body = await res.json();
    expect(body.data).toEqual({ synced: 4 });
  });
});
