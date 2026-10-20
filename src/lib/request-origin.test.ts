import { afterEach, describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./request-origin";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/orders", {
    method: "POST",
    headers,
  });
}

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe("isSameOriginRequest", () => {
  it("allows a request with no Origin header (server-to-server, curl)", () => {
    expect(isSameOriginRequest(makeRequest({ host: "localhost:3000" }))).toBe(
      true,
    );
  });

  it("allows a matching Origin and Host", () => {
    expect(
      isSameOriginRequest(
        makeRequest({
          host: "localhost:3000",
          origin: "http://localhost:3000",
        }),
      ),
    ).toBe(true);
  });

  it("allows a matching x-forwarded-host (behind a proxy)", () => {
    expect(
      isSameOriginRequest(
        makeRequest({
          host: "10.0.0.5:3000",
          "x-forwarded-host": "parfumsdefoda.com",
          origin: "https://parfumsdefoda.com",
        }),
      ),
    ).toBe(true);
  });

  it("rejects a foreign Origin", () => {
    expect(
      isSameOriginRequest(
        makeRequest({
          host: "parfumsdefoda.com",
          origin: "https://evil.example",
        }),
      ),
    ).toBe(false);
  });

  it("rejects a malformed Origin", () => {
    expect(
      isSameOriginRequest(
        makeRequest({ host: "parfumsdefoda.com", origin: "not a url" }),
      ),
    ).toBe(false);
  });

  it("allows the configured site URL even when the host differs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.parfumsdefoda.com";
    expect(
      isSameOriginRequest(
        makeRequest({
          host: "internal-proxy:8080",
          origin: "https://www.parfumsdefoda.com",
        }),
      ),
    ).toBe(true);
  });
});
