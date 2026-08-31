import { describe, expect, it } from "vitest";
import { uuidSchema, emailSchema, phoneSchema, paginationSchema, sortSchema, searchSchema, validate } from "./validate";
import { ValidationError } from "./errors";

describe("uuidSchema", () => {
  it("accepts valid UUID v4", () => {
    expect(uuidSchema.parse("550e8400-e29b-41d4-a716-446655440000")).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects invalid strings", () => {
    expect(() => uuidSchema.parse("not-a-uuid")).toThrow();
    expect(() => uuidSchema.parse("")).toThrow();
  });
});

describe("emailSchema", () => {
  it("accepts valid emails", () => {
    expect(emailSchema.parse("test@example.com")).toBe("test@example.com");
  });

  it("rejects invalid emails", () => {
    expect(() => emailSchema.parse("not-email")).toThrow();
    expect(() => emailSchema.parse("")).toThrow();
  });

  it("rejects emails over 255 chars", () => {
    const long = "a".repeat(252) + "@b.co";
    expect(() => emailSchema.parse(long)).toThrow();
  });

});

describe("phoneSchema", () => {
  it("accepts E.164 format", () => {
    expect(phoneSchema.parse("+12125551234")).toBe("+12125551234");
    expect(phoneSchema.parse("+449876543210")).toBe("+449876543210");
  });

  it("rejects non-E.164 formats", () => {
    expect(() => phoneSchema.parse("2125551234")).toThrow();
    expect(() => phoneSchema.parse("+12")).toThrow();
    expect(() => phoneSchema.parse("abc")).toThrow();
  });
});

describe("paginationSchema", () => {
  it("applies defaults", () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it("coerces string numbers", () => {
    const result = paginationSchema.parse({ page: "2", limit: "10" });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });

  it("rejects limit > 100", () => {
    expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
  });

  it("rejects non-positive page", () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
  });
});

describe("sortSchema", () => {
  it("defaults order to desc", () => {
    const result = sortSchema.parse({});
    expect(result.order).toBe("desc");
    expect(result.sortBy).toBeUndefined();
  });

  it("accepts asc order", () => {
    const result = sortSchema.parse({ sortBy: "name", order: "asc" });
    expect(result.sortBy).toBe("name");
    expect(result.order).toBe("asc");
  });

  it("rejects invalid order", () => {
    expect(() => sortSchema.parse({ order: "invalid" })).toThrow();
  });

  it("rejects SQL injection attempts in sortBy", () => {
    expect(() => sortSchema.parse({ sortBy: "started_at; DROP TABLE app.calls" })).toThrow();
    expect(() => sortSchema.parse({ sortBy: "started_at desc, (SELECT 1)" })).toThrow();
    expect(() => sortSchema.parse({ sortBy: "created_at FROM app.calls--" })).toThrow();
  });

  it("accepts plain column names", () => {
    expect(sortSchema.parse({ sortBy: "created_at" }).sortBy).toBe("created_at");
    expect(sortSchema.parse({ sortBy: "started_at" }).sortBy).toBe("started_at");
  });
});

describe("searchSchema", () => {
  it("parses optional search", () => {
    expect(searchSchema.parse({ search: "foo" }).search).toBe("foo");
    expect(searchSchema.parse({}).search).toBeUndefined();
  });

  it("rejects search over 255 chars", () => {
    expect(() => searchSchema.parse({ search: "x".repeat(256) })).toThrow();
  });
});

describe("validate", () => {
  it("returns parsed data on success", () => {
    const result = validate(uuidSchema, "550e8400-e29b-41d4-a716-446655440000");
    expect(result).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("throws ValidationError on failure", () => {
    try {
      validate(uuidSchema, "bad");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).status).toBe(422);
      expect((err as ValidationError).errors?.length).toBeGreaterThan(0);
    }
  });

  it("includes field path in error messages", () => {
    try {
      validate(paginationSchema, { page: -1 });
      expect.unreachable();
    } catch (err) {
      const e = err as ValidationError;
      expect(e.errors?.some((msg) => msg.includes("page"))).toBe(true);
    }
  });
});
