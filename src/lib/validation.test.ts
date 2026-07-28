import { describe, it, expect } from "vitest";
import { isValidEgyptianPhone } from "./validation";

describe("isValidEgyptianPhone", () => {
  it("accepts 01xxxxxxxxx format", () => {
    expect(isValidEgyptianPhone("01234567890")).toBe(true);
  });

  it("accepts +20xxxxxxxxxx format", () => {
    expect(isValidEgyptianPhone("+201234567890")).toBe(true);
  });

  it("accepts 0020xxxxxxxxxx format", () => {
    expect(isValidEgyptianPhone("00201234567890")).toBe(true);
  });

  it("accepts with spaces and dashes", () => {
    expect(isValidEgyptianPhone("012 345 67890")).toBe(true);
    expect(isValidEgyptianPhone("012-345-67890")).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(isValidEgyptianPhone("12345")).toBe(false);
    expect(isValidEgyptianPhone("010123456789")).toBe(false);
    expect(isValidEgyptianPhone("")).toBe(false);
    expect(isValidEgyptianPhone("abcdefghij")).toBe(false);
  });
});
