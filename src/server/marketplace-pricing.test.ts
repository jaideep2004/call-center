import { describe, it, expect } from "vitest";
import { validate, createCampaignSchema, updateCampaignSchema } from "./validate";

describe("P1.1 marketplace pricing schemas", () => {
  it("accepts buyer price + max payout + visibility on create", () => {
    const out = validate(createCampaignSchema, {
      agency_id: "a1",
      name: "Medicare Short Buffer - 30 Seconds",
      price_cents: 1600,
      max_publisher_payout_cents: 1000,
      min_publisher_payout_cents: 1000,
      visibility: "default",
      is_exclusive: false,
    });
    expect(out.price_cents).toBe(1600);
    expect(out.max_publisher_payout_cents).toBe(1000);
    expect(out.visibility).toBe("default");
  });

  it("accepts payout/visibility patch on update", () => {
    const out = validate(updateCampaignSchema, {
      price_cents: 3500,
      max_publisher_payout_cents: 2000,
      visibility: "exclusive",
      is_exclusive: true,
    });
    expect(out.max_publisher_payout_cents).toBe(2000);
    expect(out.visibility).toBe("exclusive");
  });

  it("rejects negative payout", () => {
    expect(() =>
      validate(updateCampaignSchema, { max_publisher_payout_cents: -5 }),
    ).toThrow();
  });

  // 0072: price 0 reaches the DB CHECK and 500s (and poisons every later
  // edit to the row) — it must be rejected at validation with a 422.
  it("rejects price_cents 0 on create and update (DB CHECK parity)", () => {
    // validate() throws ValidationError("Validation failed", details) — the
    // $0.01 rule text lives in the details array; assert via errors.
    for (const schema of [createCampaignSchema, updateCampaignSchema]) {
      try {
        validate(schema, { agency_id: "a1", name: "x", price_cents: 0 });
        expect.unreachable("price 0 must be rejected");
      } catch (e: unknown) {
        const err = e as { message?: string; errors?: string[] };
        expect(err.message).toMatch(/Validation failed/);
        expect((err.errors ?? []).join(" ")).toMatch(/at least \$0\.01/);
      }
    }
  });

  it("accepts null/unset price (Retreaver-synced campaigns price later)", () => {
    const created = validate(createCampaignSchema, { agency_id: "a1", name: "x" });
    expect(created.price_cents).toBeUndefined();
    expect(validate(updateCampaignSchema, { price_cents: null }).price_cents).toBeNull();
    expect(validate(updateCampaignSchema, { price_cents: 1600 }).price_cents).toBe(1600);
  });

  it("margin guard: buyer bid must cover payout (pure check)", () => {
    const offers = [
      { bid: 1600, payout: 1000 },
      { bid: 3500, payout: 2000 },
      { bid: 2000, payout: 2200 },
    ];
    const ok = offers.filter((o) => o.bid - o.payout >= 0);
    expect(ok).toHaveLength(2);
  });
});
