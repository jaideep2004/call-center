import { describe, expect, it } from "vitest";
import { hasPermission, canAccessRoute, getPermittedResources } from "./permission-data";
import type { Role, Resource, Action } from "./permission-data";

describe("hasPermission", () => {
  it("super_admin can manage any resource", () => {
    expect(hasPermission("super_admin", "agents", "manage")).toBe(true);
    expect(hasPermission("super_admin", "leads", "create")).toBe(true);
    expect(hasPermission("super_admin", "wallet", "view")).toBe(true);
    expect(hasPermission("super_admin", "users", "delete")).toBe(true);
  });

  it("admin inherits all actions via manage", () => {
    expect(hasPermission("admin", "agents", "create")).toBe(true);
    expect(hasPermission("admin", "calls", "delete")).toBe(true);
  });

  it("admin can only view agency and users (no manage)", () => {
    expect(hasPermission("admin", "agency", "view")).toBe(true);
    expect(hasPermission("admin", "agency", "manage")).toBe(false);
    expect(hasPermission("admin", "users", "view")).toBe(true);
    expect(hasPermission("admin", "users", "manage")).toBe(false);
  });

  it("agent can recharge via checkout but cannot manage wallet (self-mint blocked)", () => {
    expect(hasPermission("agent", "wallet", "recharge")).toBe(true);
    expect(hasPermission("agent", "wallet", "view")).toBe(true);
    expect(hasPermission("agent", "wallet", "manage")).toBe(false);
    expect(hasPermission("admin", "wallet", "recharge")).toBe(true);
    expect(hasPermission("finance", "wallet", "recharge")).toBe(false);
  });

  it("agent can manage affiliate", () => {
    expect(hasPermission("agent", "affiliate", "manage")).toBe(true);
  });

  it("finance has readonly access to wallet, revenue, reports, calls", () => {
    expect(hasPermission("finance", "wallet", "view")).toBe(true);
    expect(hasPermission("finance", "revenue", "view")).toBe(true);
    expect(hasPermission("finance", "reports", "view")).toBe(true);
    expect(hasPermission("finance", "calls", "view")).toBe(true);
    expect(hasPermission("finance", "agents", "view")).toBe(false);
  });

  it("manager cannot create or delete leads", () => {
    expect(hasPermission("manager", "leads", "assign")).toBe(true);
    expect(hasPermission("manager", "leads", "view")).toBe(true);
    expect(hasPermission("manager", "leads", "create")).toBe(false);
    expect(hasPermission("manager", "leads", "delete")).toBe(false);
  });

  it("returns false for undefined resource", () => {
    expect(hasPermission("agent", "cms" as Resource, "view")).toBe(false);
  });

  it("returns false for undefined action", () => {
    expect(hasPermission("finance", "wallet", "manage" as Action)).toBe(false);
  });
});

describe("canAccessRoute", () => {
  it("allows super_admin on any path", () => {
    expect(canAccessRoute("super_admin", "agents")).toBe(true);
    expect(canAccessRoute("super_admin", "settings")).toBe(true);
  });

  it("denies finance on agents route", () => {
    expect(canAccessRoute("finance", "agents")).toBe(false);
  });

  it("allows unknown routes for any role", () => {
    expect(canAccessRoute("agent", "unknown-page")).toBe(true);
  });

  it("handles nested paths", () => {
    expect(canAccessRoute("manager", "agents/123")).toBe(true);
    expect(canAccessRoute("finance", "agents/123")).toBe(false);
  });

  it("strips leading slash", () => {
    expect(canAccessRoute("finance", "/agents")).toBe(false);
  });
});

describe("getPermittedResources", () => {
  it("super_admin has all 16 resources", () => {
    const resources = getPermittedResources("super_admin");
    expect(resources).toContain("agents");
    expect(resources).toContain("users");
    expect(resources).toContain("agency");
    expect(resources).toContain("cms");
    expect(resources).toContain("features");
    expect(resources).toContain("skills");
    expect(resources).toContain("publishers");
    expect(resources.length).toBe(16);
  });

  it("finance has only 7 resources", () => {
    const resources = getPermittedResources("finance");
    expect(resources).toEqual(["wallet", "revenue", "reports", "calls", "features", "skills", "publishers"]);
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
