import { describe, expect, it } from "vitest";
import { originalForFailedAsset } from "./derived-image-fallback";

describe("originalForFailedAsset", () => {
  it("maps a failed derived file to the catalogue's original", () => {
    expect(
      originalForFailedAsset(
        "https://parfumsdefoda.com/products/derived/pf090/card-800.avif",
        "/products/PF090.png",
      ),
    ).toBe("/products/PF090.png");
  });

  it("ignores a failed original: there is nothing left to fall back to", () => {
    expect(originalForFailedAsset("https://x.test/products/PF090.png", "/products/PF090.png")).toBeNull();
  });

  it("ignores an image with no original recorded", () => {
    expect(originalForFailedAsset("https://x.test/products/derived/pf090/card-800.avif", null)).toBeNull();
  });

  it("ignores empty input", () => {
    expect(originalForFailedAsset(undefined, "/products/PF090.png")).toBeNull();
  });
});
