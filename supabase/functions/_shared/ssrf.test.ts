import { describe, expect, it, vi } from "vitest";
import {
  assertSafePublicUrl,
  fetchPublicHtml,
  isPublicIpAddress,
  UnsafeUrlError,
  type ResolveDns,
} from "./ssrf";

const publicDns: ResolveDns = async (_hostname, recordType) =>
  recordType === "A" ? ["93.184.216.34"] : ["2606:2800:220:1:248:1893:25c8:1946"];

describe("isPublicIpAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "100.64.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "198.51.100.4",
    "224.0.0.1",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("rejects non-public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it.each([
    "8.8.8.8",
    "93.184.216.34",
    "2001:4860:4860::8888",
    "2606:4700:4700::1111",
  ])("accepts public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(true);
  });
});

describe("assertSafePublicUrl", () => {
  it("accepts an HTTPS URL whose DNS records are all public", async () => {
    await expect(assertSafePublicUrl("https://recipes.example.org/dinner", publicDns))
      .resolves.toMatchObject({ hostname: "recipes.example.org" });
  });

  it.each([
    "file:///etc/passwd",
    "http://localhost/admin",
    "http://metadata.internal/latest",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://[::1]/",
    "https://user:password@example.org/",
    "https://example.org:8443/",
  ])("rejects unsafe URL %s", async (url) => {
    await expect(assertSafePublicUrl(url, publicDns)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects a hostname when any DNS answer is private", async () => {
    const mixedDns: ResolveDns = async (_hostname, recordType) =>
      recordType === "A" ? ["93.184.216.34", "10.0.0.5"] : [];

    await expect(assertSafePublicUrl("https://example.org", mixedDns))
      .rejects.toThrow("non-public network");
  });
});

describe("fetchPublicHtml", () => {
  it("uses manual redirects and revalidates every redirect target", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      }));

    await expect(fetchPublicHtml("https://example.org/recipe", {
      resolveDns: publicDns,
      fetchImpl,
    })).rejects.toBeInstanceOf(UnsafeUrlError);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });

  it("returns a bounded HTML response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<h1>Recipe</h1>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }));

    await expect(fetchPublicHtml("https://example.org/recipe", {
      resolveDns: publicDns,
      fetchImpl,
    })).resolves.toEqual({
      html: "<h1>Recipe</h1>",
      finalUrl: "https://example.org/recipe",
    });
  });

  it("rejects an oversized streamed response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("123456", {
      status: 200,
      headers: { "content-type": "text/html" },
    }));

    await expect(fetchPublicHtml("https://example.org/recipe", {
      resolveDns: publicDns,
      fetchImpl,
      maxResponseBytes: 5,
    })).rejects.toThrow("too large");
  });

  it("rejects non-HTML content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    await expect(fetchPublicHtml("https://example.org/recipe", {
      resolveDns: publicDns,
      fetchImpl,
    })).rejects.toThrow("did not return an HTML");
  });

  it("aborts a request that exceeds the timeout", async () => {
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      })
    );

    await expect(fetchPublicHtml("https://example.org/recipe", {
      resolveDns: publicDns,
      fetchImpl,
      timeoutMs: 1,
    })).rejects.toThrow("took too long");
  });
});
