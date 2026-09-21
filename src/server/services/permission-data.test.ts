import { describe, expect, it } from "vitest";
import { hasPermission, canAccessRoute, getPermittedResources } from "./permission-data";
import type { Role, Resource, Action } from "./permission-data";

describe("hasPermission", () => {
  it("admin can manage any resource", () => {
    expect(hasPermission("admin", "agents", "manage")).toBe(true);
    expect(hasPermission("admin", "leads", "create")).toBe(true);
    expect(hasPermission("admin", "wallet", "view")).toBe(true);
    expect(hasPermission("admin", "users", "delete")).toBe(true);
  });

  it("admin inherits all actions via manage", () => {
    expect(hasPermission("admin", "agents", "create")).toBe(true);
    expect(hasPermission("admin", "calls", "delete")).toBe(true);
  });

  it("admin manages agencies and users", () => {
    expect(hasPermission("admin", "agency", "view")).toBe(true);
    expect(hasPermission("admin", "agency", "manage")).toBe(true);
    expect(hasPermission("admin", "users", "view")).toBe(true);
    expect(hasPermission("admin", "users", "manage")).toBe(true);
  });

  it("agent can recharge via checkout but cannot manage wallet (self-mint blocked)", () => {
    expect(hasPermission("agent", "wallet", "recharge")).toBe(true);
    expect(hasPermission("agent", "wallet", "view")).toBe(true);
    expect(hasPermission("agent", "wallet", "manage")).toBe(false);
    expect(hasPermission("admin", "wallet", "recharge")).toBe(true);
    expect(hasPermission("publisher", "wallet", "recharge")).toBe(false);
  });

  it("agent can manage affiliate", () => {
    expect(hasPermission("agent", "affiliate", "manage")).toBe(true);
  });

  it("removed roles have no permissions (three roles only)", () => {
    const deadRoles = ["super_admin", "agency", "manager", "finance"] as string[];
    for (const dead of deadRoles) {
      expect(hasPermission(dead as Role, "wallet", "view")).toBe(false);
      expect(hasPermission(dead as Role, "agents", "manage")).toBe(false);
    }
  });

  it("agent cannot create or delete leads", () => {
    expect(hasPermission("agent", "leads", "view")).toBe(true);
    expect(hasPermission("agent", "leads", "create")).toBe(false);
    expect(hasPermission("agent", "leads", "delete")).toBe(false);
  });

  it("returns false for undefined resource", () => {
    expect(hasPermission("agent", "cms" as Resource, "view")).toBe(false);
  });

  it("returns false for undefined action", () => {
    expect(hasPermission("publisher", "wallet", "manage" as Action)).toBe(false);
  });
});

describe("canAccessRoute", () => {
  it("allows admin on any path", () => {
    expect(canAccessRoute("admin", "agents")).toBe(true);
    expect(canAccessRoute("admin", "settings")).toBe(true);
  });

  it("denies publisher on agents route", () => {
    expect(canAccessRoute("publisher", "agents")).toBe(false);
  });

  it("allows unknown routes for any role", () => {
    expect(canAccessRoute("agent", "unknown-page")).toBe(true);
  });

  it("handles nested paths", () => {
    expect(canAccessRoute("agent", "agents/123")).toBe(true);
    expect(canAccessRoute("publisher", "agents/123")).toBe(false);
  });

  it("strips leading slash", () => {
    expect(canAccessRoute("publisher", "/agents")).toBe(false);
  });
});

describe("getPermittedResources", () => {
  it("admin has all 16 resources", () => {
    const resources = getPermittedResources("admin");
    expect(resources).toContain("agents");
    expect(resources).toContain("users");
    expect(resources).toContain("agency");
    expect(resources).toContain("cms");
    expect(resources).toContain("features");
    expect(resources).toContain("skills");
    expect(resources).toContain("publishers");
    expect(resources.length).toBe(16);
  });

  it("publisher has only 2 resources", () => {
    const resources = getPermittedResources("publisher");
    expect(resources).toEqual(["publishers", "publisher-portal"]);
  });

  it("agent has 9 resources", () => {
    const resources = getPermittedResources("agent");
    expect(resources).toContain("leads");
    expect(resources).toContain("calls");
    expect(resources).toContain("wallet");
    expect(resources).toContain("reports");
    expect(resources).toContain("membership");
    expect(resources).toContain("affiliate");
    expect(resources).toContain("settings");
    expect(resources).toContain("features");
    expect(resources).toContain("skills");
  });
});
