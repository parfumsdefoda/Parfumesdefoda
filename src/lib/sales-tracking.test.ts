import { describe, it, expect, vi } from "vitest";
import { readProductSalesCounts, withTimeout } from "./sales-tracking";

describe("withTimeout", () => {
  it("returns the value when the promise settles first", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 100, "fallback")).resolves.toBe("ok");
  });

  it("falls back when the promise rejects", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 100, "fallback")).resolves.toBe(
      "fallback",
    );
  });

  it("falls back when the promise never settles", async () => {
    const started = Date.now();
    await expect(
      withTimeout(new Promise<string>(() => {}), 40, "fallback"),
    ).resolves.toBe("fallback");
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe("readProductSalesCounts", () => {
  it("does not touch Redis when it is not configured", async () => {
    const hgetall = vi.fn();
    const counts = await readProductSalesCounts({
      configured: false,
      reader: { hgetall },
    });

    expect(counts).toEqual({});
    expect(hgetall).not.toHaveBeenCalled();
  });

  it("returns the counts when Redis answers", async () => {
    const counts = await readProductSalesCounts({
      configured: true,
      reader: { hgetall: async () => ({ PF020: "45", PF040: 12, PF070: "n/a" }) },
    });

    expect(counts).toEqual({ PF020: 45, PF040: 12, PF070: 0 });
  });

  it("returns an empty object when Redis throws", async () => {
    const counts = await readProductSalesCounts({
      configured: true,
      reader: {
        hgetall: () => {
          throw new Error("offline");
        },
      },
    });

    expect(counts).toEqual({});
  });

  it("returns an empty object when Redis hangs, without hanging the render", async () => {
    const started = Date.now();
    const counts = await readProductSalesCounts({
      configured: true,
      timeoutMs: 30,
      reader: { hgetall: () => new Promise(() => {}) },
    });

    expect(counts).toEqual({});
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("returns an empty object when Redis answers with nothing", async () => {
    const counts = await readProductSalesCounts({
      configured: true,
      reader: { hgetall: async () => null },
    });
    expect(counts).toEqual({});
  });
});
