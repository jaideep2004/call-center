import { describe, expect, it } from "vitest";
import { assertPermission } from "./permission.service";
import { ForbiddenError } from "@/server/errors";

describe("assertPermission", () => {
  it("does not throw when permission is granted", () => {
    expect(() => assertPermission("super_admin", "agents", "manage")).not.toThrow();
  });

  it("does not throw when role has manage access", () => {
    expect(() => assertPermission("admin", "leads", "create")).not.toThrow();
  });

  it("throws ForbiddenError when permission is missing", () => {
    expect(() => assertPermission("finance", "agents", "view")).toThrow(ForbiddenError);
  });

  it("includes resource, action, and role in error message", () => {
    try {
      assertPermission("agent", "cms", "manage");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      const e = err as ForbiddenError;
      expect(e.message).toContain("cms");
      expect(e.message).toContain("manage");
      expect(e.message).toContain("agent");
    }
  });
});
