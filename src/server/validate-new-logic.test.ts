import { describe, it, expect } from "vitest";
import {
  validate,
  createTutorialSchema,
  updateTutorialSchema,
  tutorialProgressSchema,
  createCreativeSchema,
  updateCreativeSchema,
  reserveRtbSchema,
  agencyAllocationSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createPublisherSchema,
  updatePublisherSchema,
} from "./validate";

describe("tutorial schemas (P2.2 — new POST/PATCH validation)", () => {
  it("applies UI defaults on create", () => {
    const out = validate(createTutorialSchema, { title: "T", content: "C" });
    expect(out).toMatchObject({
      category: "general",
      tags: [],
      order_index: 0,
      published: false,
      required: false,
    });
  });

  it("accepts the full new-tutorial form payload", () => {
    const out = validate(createTutorialSchema, {
      title: "Onboarding",
      content: "Watch this",
      category: "onboarding",
      video_url: "https://cdn/x.mp4",
      duration_seconds: 120,
      tags: ["a", "b"],
      thumbnail_url: "https://cdn/t.png",
      order_index: 3,
      published: true,
      required: true,
    });
    expect(out.published).toBe(true);
    expect(out.order_index).toBe(3);
  });

  it("rejects empty title, bad thumbnail URL, negative order", () => {
    expect(() => validate(createTutorialSchema, { title: "", content: "C" })).toThrow();
    expect(() =>
      validate(createTutorialSchema, { title: "T", content: "C", thumbnail_url: "not-a-url" }),
    ).toThrow();
    expect(() =>
      validate(createTutorialSchema, { title: "T", content: "C", order_index: -1 }),
    ).toThrow();
  });

  it("update accepts a single-field patch and rejects bad category", () => {
    expect(validate(updateTutorialSchema, { published: true })).toEqual({ published: true });
    expect(() => validate(updateTutorialSchema, { category: "nope" })).toThrow();
    // agency_id can never be mass-assigned through the whitelisted schema
    expect(validate(updateTutorialSchema, { title: "Ok" })).not.toHaveProperty("agency_id");
  });

  it("progress schema clamps via bounds (999 + negatives rejected)", () => {
    expect(() => validate(tutorialProgressSchema, { watched_seconds: 10, watched_percent: 999 })).toThrow();
    expect(() => validate(tutorialProgressSchema, { watched_seconds: -1, watched_percent: 10 })).toThrow();
    expect(
      validate(tutorialProgressSchema, { watched_seconds: 45, watched_percent: 50 }).watched_percent,
    ).toBe(50);
  });
});

describe("creative schemas (P2.1)", () => {
  const IMG = { type: "image", title: "Ad", media_url: "https://cdn/x.png" } as const;

  it("defaults placement/priority/active", () => {
    const out = validate(createCreativeSchema, IMG);
    expect(out).toMatchObject({ placement: "agent_feed", priority: 0, active: true });
  });

  it("rejects bad media_url, bad cta_href, out-of-range priority, bad placement", () => {
    expect(() => validate(createCreativeSchema, { ...IMG, media_url: "nope" })).toThrow();
    expect(() => validate(createCreativeSchema, { ...IMG, cta_href: "nope" })).toThrow();
    expect(() => validate(createCreativeSchema, { ...IMG, priority: 1001 })).toThrow();
    expect(() => validate(createCreativeSchema, { ...IMG, placement: "banner" })).toThrow();
  });

  it("accepts scheduled video creatives + partial updates", () => {
    const out = validate(createCreativeSchema, {
      ...IMG,
      type: "video",
      media_url: "https://cdn/x.mp4",
      placement: "agent_hero",
      priority: 10,
      starts_at: "2026-01-01T00:00:00.000Z",
      ends_at: "2026-12-31T00:00:00.000Z",
    });
    expect(out.type).toBe("video");
    expect(validate(updateCreativeSchema, { active: false })).toEqual({ active: false });
  });
});

describe("marketplace + publisher schemas (P1.3/P1.4 + campaigns)", () => {
  it("reserveRtb uppercases caller_state and enforces 2 letters", () => {
    const out = validate(reserveRtbSchema, {
      publisher_campaign_id: "camp-pub",
      caller_state: "tx",
    });
    expect(out.caller_state).toBe("TX");
    expect(() => validate(reserveRtbSchema, { publisher_campaign_id: "x", caller_state: "TEXAS" })).toThrow();
  });

  it("reserveRtb accepts payout bounds + idempotency key", () => {
    const out = validate(reserveRtbSchema, {
      publisher_campaign_id: "camp-pub",
      caller_number: "+12145551234",
      publisher_payout_min_cents: 1000,
      publisher_payout_max_cents: 1800,
      idempotency_key: "ping-1",
    });
    expect(out.publisher_payout_max_cents).toBe(1800);
  });

  it("agency allocation accepts zero, rejects negatives", () => {
    expect(validate(agencyAllocationSchema, { agent_id: "a", allocated_cents: 0 }).allocated_cents).toBe(0);
    expect(() => validate(agencyAllocationSchema, { agent_id: "a", allocated_cents: -5 })).toThrow();
  });

  it("campaign schemas carry multi-publisher ids (array + null-clear)", () => {
    const created = validate(createCampaignSchema, {
      agency_id: "ag",
      name: "N",
      publisher_ids: ["p1", "p2"],
    });
    expect(created.publisher_ids).toEqual(["p1", "p2"]);
    const cleared = validate(updateCampaignSchema, { publisher_ids: null });
    expect(cleared.publisher_ids).toBeNull();
  });

  it("publisher schemas bound commission and price", () => {
    expect(() => validate(createPublisherSchema, { name: "P", commission_pct: 101 })).toThrow();
    expect(() => validate(createPublisherSchema, { name: "P", fixed_price_cents: 0 })).toThrow();
    expect(() => validate(updatePublisherSchema, { commission_pct: -1 })).toThrow();
    expect(validate(createPublisherSchema, { name: "P" }).commission_pct).toBe(0);
  });
});
