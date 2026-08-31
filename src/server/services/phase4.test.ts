import { describe, it, expect } from "vitest";
import { isQualifiedOutcome, leadStatusForOutcome, QUALIFIED_OUTCOMES } from "@/server/constants";
import { toExcelBuffer } from "@/lib/excel";
import { createDispositionSchema } from "@/server/validate";

describe("qualified outcome helpers", () => {
  it("treats sold and follow_up as qualified", () => {
    expect(isQualifiedOutcome("sold")).toBe(true);
    expect(isQualifiedOutcome("follow_up")).toBe(true);
  });

  it("rejects unqualified outcomes", () => {
    for (const o of ["not_interested", "no_answer", "dead_call", "dead_air", "disqualified"]) {
      expect(isQualifiedOutcome(o)).toBe(false);
    }
  });

  it("maps outcomes to lead statuses", () => {
    expect(leadStatusForOutcome("sold")).toBe("converted");
    expect(leadStatusForOutcome("follow_up")).toBe("qualified");
    expect(leadStatusForOutcome("no_answer")).toBe("new");
  });

  it("lists exactly the qualified outcomes", () => {
    expect(QUALIFIED_OUTCOMES).toEqual(["sold", "follow_up"]);
  });
});

describe("disposition premium validation", () => {
  it("requires annual premium when sold", () => {
    const result = createDispositionSchema.safeParse({ outcome: "sold" });
    expect(result.success).toBe(false);
  });

  it("accepts positive premium when sold", () => {
    const result = createDispositionSchema.safeParse({ outcome: "sold", annual_premium_cents: 125000 });
    expect(result.success).toBe(true);
  });

  it("rejects premium on non-sold outcomes", () => {
    const result = createDispositionSchema.safeParse({ outcome: "follow_up", annual_premium_cents: 125000 });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive premium", () => {
    const result = createDispositionSchema.safeParse({ outcome: "sold", annual_premium_cents: 0 });
    expect(result.success).toBe(false);
  });

  it("allows dispositions without premium", () => {
    const result = createDispositionSchema.safeParse({ outcome: "no_answer" });
    expect(result.success).toBe(true);
  });
});

describe("excel export", () => {
  it("produces a valid xlsx zip buffer", async () => {
    const buffer = await toExcelBuffer(
      [{ id: "1", name: "Ada", amount: 10 }],
      [{ key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "amount", label: "Amount" }],
    );
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K' — zip magic
    expect(buffer.length).toBeGreaterThan(100);
  });

  it("handles empty rows", async () => {
    const buffer = await toExcelBuffer([], [{ key: "id", label: "ID" }]);
    expect(buffer[0]).toBe(0x50);
  });
});
