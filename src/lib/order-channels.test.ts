import { describe, expect, it } from "vitest";
import { resolveOrderChannelMode } from "./order-channels";

describe("resolveOrderChannelMode", () => {
  it("is live when nothing is configured", () => {
    // Passing `undefined` means "read the ambient variable", so this assertion
    // owns that variable: the suite itself runs with ORDER_CHANNELS_MODE=log
    // (the guidance that every run must be unable to reach a real channel).
    const saved = process.env.ORDER_CHANNELS_MODE;
    delete process.env.ORDER_CHANNELS_MODE;
    try {
      expect(resolveOrderChannelMode(undefined, "development")).toBe("live");
      expect(resolveOrderChannelMode("", "test")).toBe("live");
    } finally {
      if (saved === undefined) delete process.env.ORDER_CHANNELS_MODE;
      else process.env.ORDER_CHANNELS_MODE = saved;
    }
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
