import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, logOrderError } from "./logger";

describe("server log privacy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not serialize an order exception or stack", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logOrderError(new Error("customer phone 01012345678 and address Street 12"));
    const output = spy.mock.calls.flat().join(" ");
    expect(output).not.toContain("01012345678");
    expect(output).not.toContain("Street 12");
  });

  it("does not serialize arbitrary server exception details", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("chat.provider_error", new Error("prompt text and api-key-like secret"));
    const output = spy.mock.calls.flat().join(" ");
    expect(output).not.toContain("prompt text");
    expect(output).not.toContain("api-key-like secret");
  });
});
