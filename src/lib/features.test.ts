import { describe, expect, it } from "vitest";
import {
  featureFlags,
  isAssistantEnabled,
  isPremiumEnabled,
} from "./features";

describe("featureFlags", () => {
  it("treats a missing key as enabled (backward compatible)", () => {
    expect(featureFlags()).toEqual({ premium: true, assistant: true });
    expect(featureFlags({})).toEqual({ premium: true, assistant: true });
    expect(featureFlags({ features: {} })).toEqual({
      premium: true,
      assistant: true,
    });
    expect(featureFlags(null)).toEqual({ premium: true, assistant: true });
  });

  it("honours explicit off values from the settings fixture", () => {
    const fixture = { features: { premium: false, assistant: false } };
    expect(featureFlags(fixture)).toEqual({
      premium: false,
      assistant: false,
    });
    expect(isPremiumEnabled(fixture)).toBe(false);
    expect(isAssistantEnabled(fixture)).toBe(false);
  });

  it("honours explicit on values", () => {
    const fixture = { features: { premium: true, assistant: true } };
    expect(isPremiumEnabled(fixture)).toBe(true);
    expect(isAssistantEnabled(fixture)).toBe(true);
  });

  it("treats each flag independently", () => {
    expect(featureFlags({ features: { premium: false } })).toEqual({
      premium: false,
      assistant: true,
    });
    expect(featureFlags({ features: { assistant: false } })).toEqual({
      premium: true,
      assistant: false,
    });
  });
});
