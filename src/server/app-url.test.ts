import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAppBaseUrl } from "./app-url";

const savedApp = process.env.APP_BASE_URL;
const savedPublic = process.env.NEXT_PUBLIC_APP_URL;

function restore() {
  if (savedApp === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = savedApp;
  if (savedPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = savedPublic;
}

beforeEach(() => {
  delete process.env.APP_BASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
});
afterEach(restore);

describe("getAppBaseUrl", () => {
  it("prefers APP_BASE_URL over request origin", () => {
    process.env.APP_BASE_URL = "https://coveragecalls.com";
    expect(getAppBaseUrl("http://localhost:30001")).toBe("https://coveragecalls.com");
  });

  it("falls back to NEXT_PUBLIC_APP_URL when APP_BASE_URL is unset", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.example.com";
    expect(getAppBaseUrl("http://localhost:30001")).toBe("https://staging.example.com");
  });

  it("falls back to the request origin when no env is set", () => {
    expect(getAppBaseUrl("http://localhost:30001")).toBe("http://localhost:30001");
  });

  it("falls back to the local dev default with no env and no origin", () => {
    expect(getAppBaseUrl()).toBe("http://localhost:30001");
  });

  it("strips trailing slashes", () => {
    process.env.APP_BASE_URL = "https://coveragecalls.com///";
    expect(getAppBaseUrl()).toBe("https://coveragecalls.com");
  });

  it("ignores blank env values", () => {
    process.env.APP_BASE_URL = "   ";
    expect(getAppBaseUrl("http://localhost:30001")).toBe("http://localhost:30001");
  });
});
