import { describe, expect, it } from "vitest";
import { AppError, AuthError, ForbiddenError, NotFoundError, ValidationError, ConflictError, RateLimitError } from "./errors";

describe("AppError", () => {
  it("sets message, status, and name", () => {
    const err = new AppError("test", 418, ["e1"]);
    expect(err.message).toBe("test");
    expect(err.status).toBe(418);
    expect(err.errors).toEqual(["e1"]);
    expect(err.name).toBe("AppError");
  });

  it("defaults to status 500 and no errors", () => {
    const err = new AppError("oops");
    expect(err.status).toBe(500);
    expect(err.errors).toBeUndefined();
  });
});

describe("AuthError", () => {
  it("sets status 401 with default message", () => {
    const err = new AuthError();
    expect(err.status).toBe(401);
    expect(err.message).toBe("Authentication required");
    expect(err).toBeInstanceOf(AppError);
  });

  it("accepts custom message", () => {
    const err = new AuthError("Custom");
    expect(err.message).toBe("Custom");
    expect(err.status).toBe(401);
  });
});

describe("ForbiddenError", () => {
  it("sets status 403 with default message", () => {
    const err = new ForbiddenError();
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("NotFoundError", () => {
  it("sets status 404 with default message", () => {
    const err = new NotFoundError();
    expect(err.status).toBe(404);
    expect(err.message).toBe("Resource not found");
  });
});

describe("ValidationError", () => {
  it("sets status 422 with default message", () => {
    const err = new ValidationError();
    expect(err.status).toBe(422);
    expect(err.message).toBe("Validation failed");
    expect(err.errors).toBeUndefined();
  });

  it("passes errors array", () => {
    const err = new ValidationError("bad input", ["field: required"]);
    expect(err.errors).toEqual(["field: required"]);
  });
});

describe("ConflictError", () => {
  it("sets status 409 with default message", () => {
    const err = new ConflictError();
    expect(err.status).toBe(409);
    expect(err.message).toBe("Resource already exists");
  });
});

describe("RateLimitError", () => {
  it("sets status 429 with default message", () => {
    const err = new RateLimitError();
    expect(err.status).toBe(429);
    expect(err.message).toBe("Too many requests");
  });
});
