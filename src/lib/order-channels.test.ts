import { describe, expect, it } from "vitest";
import { resolveOrderChannelMode } from "./order-channels";

describe("resolveOrderChannelMode", () => {
  it("is live when nothing is configured", () => {
    expect(resolveOrderChannelMode(undefined, "development")).toBe("live");
    expect(resolveOrderChannelMode("", "test")).toBe("live");
  });

  it("honours log and fail outside production, ignoring case and spaces", () => {
    expect(resolveOrderChannelMode("log", "development")).toBe("log");
    expect(resolveOrderChannelMode("  LOG ", "test")).toBe("log");
    expect(resolveOrderChannelMode("fail", "development")).toBe("fail");
  });

  it("refuses log and fail in production", () => {
    // A deployed store must always reach the owner: the variable may not be
    // able to silence a real order.
    expect(resolveOrderChannelMode("log", "production")).toBe("live");
    expect(resolveOrderChannelMode("fail", "production")).toBe("live");
  });

  it("treats an unknown value as live", () => {
    expect(resolveOrderChannelMode("preview", "development")).toBe("live");
    expect(resolveOrderChannelMode("no", "development")).toBe("live");
  });
});
