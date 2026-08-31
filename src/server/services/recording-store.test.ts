import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { mockProvider } from "@/domain/telephony";

const { findByCallIdMock, createMock, fetchRecordingMock, sendMock } = vi.hoisted(() => ({
  findByCallIdMock: vi.fn(),
  createMock: vi.fn(),
  fetchRecordingMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock("@/server/repositories", () => ({
  recordings: { findByCallId: findByCallIdMock, create: createMock },
}));

vi.mock("@/server/telephony-registry", () => ({
  getTelephonyProvider: vi.fn(() => ({ ...mockProvider, fetchRecording: fetchRecordingMock })),
}));

vi.mock("pg-boss", () => ({
  PgBoss: class {
    async start() {}
    async send(name: string, data: unknown, options: unknown) {
      sendMock(name, data, options);
    }
  },
}));

const { storeRecording, enqueueRecordingStore, resolveRecordingStreamUrl } = await import("@/server/services/recording-store");

const input = {
  callId: "call-1",
  agencyId: "agency-1",
  provider: "mock",
  recordingId: "rec-1",
  providerCallId: "caller-leg-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
});

describe("storeRecording", () => {
  it("fetches and creates a recording row when none exists", async () => {
    findByCallIdMock.mockResolvedValue(null);
    fetchRecordingMock.mockResolvedValue({ url: "https://x/rec.wav", contentType: "audio/wav", durationSeconds: 31 });

    await storeRecording(input);

    expect(fetchRecordingMock).toHaveBeenCalledWith({ recordingId: "rec-1", providerCallId: "caller-leg-1" });
    expect(createMock).toHaveBeenCalledWith({
      agency_id: "agency-1",
      call_id: "call-1",
      storage_path: "https://x/rec.wav",
      content_type: "audio/wav",
      duration_seconds: 31,
      provider: "mock",
      provider_recording_id: "rec-1",
    });
  });

  it("returns the existing row without calling the provider (idempotent)", async () => {
    const existing = { id: "row-1", call_id: "call-1" };
    findByCallIdMock.mockResolvedValue(existing);

    const result = await storeRecording(input);

    expect(result).toBe(existing);
    expect(fetchRecordingMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("propagates provider fetch errors so the job can retry", async () => {
    findByCallIdMock.mockResolvedValue(null);
    fetchRecordingMock.mockRejectedValue(new Error("Telnyx api down"));

    await expect(storeRecording(input)).rejects.toThrow("Telnyx api down");
  });
});

describe("resolveRecordingStreamUrl", () => {
  it("re-signs a fresh URL when the row carries a provider recording id", async () => {
    fetchRecordingMock.mockResolvedValue({ url: "https://fresh/rec.wav", contentType: "audio/wav" });

    const url = await resolveRecordingStreamUrl({
      provider: "mock",
      provider_recording_id: "rec-1",
      storage_path: "https://expired/rec.wav",
    });

    expect(url).toBe("https://fresh/rec.wav");
    expect(fetchRecordingMock).toHaveBeenCalledWith({ recordingId: "rec-1" });
  });

  it("falls back to the stored path for legacy rows without a recording id", async () => {
    const url = await resolveRecordingStreamUrl({ provider: "mock", provider_recording_id: null, storage_path: "https://stored/rec.wav" });
    expect(url).toBe("https://stored/rec.wav");
    expect(fetchRecordingMock).not.toHaveBeenCalled();
  });
});

describe("enqueueRecordingStore", () => {
  it("sends a store-recording job with retry options", async () => {
    await enqueueRecordingStore(input);

    expect(sendMock).toHaveBeenCalledWith("store-recording", input, {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
    });
  });
});