import { describe, it, expect } from "vitest";
import { renderScriptTemplate, scriptPlaceholders } from "./script-renderer";

describe("renderScriptTemplate", () => {
  it("replaces known placeholders with values", () => {
    const content = "Hi {{agent_name}}, call {{phone}}. NPN {{npn}}.";
    const out = renderScriptTemplate(content, { agent_name: "Jane", phone: "(555) 123-4567", npn: "12345678" });
    expect(out).toBe("Hi Jane, call (555) 123-4567. NPN 12345678.");
  });

  it("supports spacing inside braces", () => {
    expect(renderScriptTemplate("{{ agent_name }}", { agent_name: "Joe" })).toBe("Joe");
  });

  it("leaves unknown variables untouched so agents can fill manually", () => {
    const out = renderScriptTemplate("State {{state}}, beneficiary {{beneficiary}}");
    expect(out).toBe("State {{state}}, beneficiary {{beneficiary}}");
  });

  it("replaces only when the value is non-empty", () => {
    expect(renderScriptTemplate("{{npn}}", { npn: "" })).toBe("{{npn}}");
  });

  it("returns empty string for empty content", () => {
    expect(renderScriptTemplate("")).toBe("");
  });

  it("exposes the supported placeholder names", () => {
    expect(scriptPlaceholders()).toEqual(["agent_name", "phone", "npn", "state", "beneficiary"]);
  });
});