import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("outputs header and rows", () => {
    const result = toCsv(
      [{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }],
      [{ key: "name", label: "Name" }, { key: "age", label: "Age" }],
    );
    expect(result).toBe("Name,Age\r\nAlice,30\r\nBob,25");
  });

  it("escapes commas", () => {
    const result = toCsv(
      [{ city: "New York, NY" }],
      [{ key: "city", label: "City" }],
    );
    expect(result).toBe('City\r\n"New York, NY"');
  });

  it("escapes quotes", () => {
    const result = toCsv(
      [{ note: 'He said "hello"' }],
      [{ key: "note", label: "Note" }],
    );
    expect(result).toBe('Note\r\n"He said ""hello"""');
  });

  it("handles empty rows", () => {
    const result = toCsv([], [{ key: "a", label: "A" }]);
    expect(result).toBe("A");
  });

  it("handles null values", () => {
    const result = toCsv(
      [{ name: "Alice", age: null }],
      [{ key: "name", label: "Name" }, { key: "age", label: "Age" }],
    );
    expect(result).toBe("Name,Age\r\nAlice,");
  });
});
