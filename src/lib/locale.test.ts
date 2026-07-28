import { describe, it, expect } from "vitest";
import { t } from "./locale";
import type { LocaleMessages } from "@/types/services";

const messages = {
  nav: { home: "الرئيسية" },
  cart: { title: "سلة التسوق", empty: "السلة فارغة" },
} as unknown as LocaleMessages;

describe("t", () => {
  it("resolves dot-path", () => {
    expect(t(messages, "nav.home")).toBe("الرئيسية");
  });

  it("resolves nested path", () => {
    expect(t(messages, "cart.title")).toBe("سلة التسوق");
  });

  it("returns fallback for missing key", () => {
    expect(t(messages, "missing.key", "fallback")).toBe("fallback");
  });

  it("returns path as fallback when no fallback provided", () => {
    expect(t(messages, "missing.key")).toBe("missing.key");
  });
});
