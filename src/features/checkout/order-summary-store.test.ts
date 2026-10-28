import { describe, expect, it } from "vitest";
import {
  ORDER_SUMMARY_STORAGE_KEY,
  parseOrderSummary,
  readOrderSummary,
  writeOrderSummary,
} from "./order-summary-store";
import type { OrderSummary } from "./order-summary-store";

const summary: OrderSummary = {
  orderNumber: "PDF-20261028-00123",
  customerFirstName: "أحمد",
  lines: [{ name: "عطر تجريبي", sizeLabel: "50 مل", quantity: 2, unitPrice: 500 }],
  total: 1100,
};

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
  };
}

describe("order summary session store", () => {
  it("writes and reads a minimal order summary", () => {
    const storage = createMemoryStorage();
    expect(writeOrderSummary(storage, summary)).toBe(true);
    expect(readOrderSummary(storage)).toEqual(summary);
  });

  it("returns null for an absent summary, invalid JSON, or malformed data", () => {
    expect(readOrderSummary(createMemoryStorage())).toBeNull();
    expect(parseOrderSummary("not-json")).toBeNull();
    expect(parseOrderSummary(JSON.stringify({ ...summary, lines: [{ ...summary.lines[0], quantity: 0 }] }))).toBeNull();
  });

  it("rejects invalid writes and tolerates unavailable session storage", () => {
    const storage = createMemoryStorage();
    expect(writeOrderSummary(storage, { ...summary, orderNumber: "invalid" })).toBe(false);
    expect(readOrderSummary({ getItem: () => { throw new Error("blocked"); } })).toBeNull();
    expect(writeOrderSummary({ setItem: () => { throw new Error("blocked"); } }, summary)).toBe(false);
    expect(ORDER_SUMMARY_STORAGE_KEY).toBe("parfumsdefoda-last-order");
  });
});
