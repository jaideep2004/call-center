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
