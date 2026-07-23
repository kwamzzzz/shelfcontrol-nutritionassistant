const MAX_URL_LENGTH = 2_048;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home",
  ".lan",
  ".test",
  ".invalid",
  ".example",
  ".home.arpa",
  ".in-addr.arpa",
  ".ip6.arpa",
  ".onion",
];

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export type DnsRecordType = "A" | "AAAA";
export type ResolveDns = (
  hostname: string,
  recordType: DnsRecordType,
) => Promise<string[]>;

interface SafeFetchOptions {
  resolveDns: ResolveDns;
  fetchImpl?: typeof fetch;
  maxRedirects?: number;
  maxResponseBytes?: number;
  timeoutMs?: number;
}

export interface SafeHtmlResponse {
  html: string;
  finalUrl: string;
}

const parseIpv4 = (address: string): number[] | null => {
  const parts = address.split(".");
  if (parts.length !== 4) return null;

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return Number.NaN;
    return Number(part);
  });

  return octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    ? octets
    : null;
};

const parseIpv6 = (address: string): number[] | null => {
  let normalized = address.toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  if (normalized.includes("%")) return null;

  const ipv4Match = normalized.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (ipv4Match) {
    const ipv4 = parseIpv4(ipv4Match[1]);
    if (!ipv4) return null;
    const replacement = `${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
    normalized = `${normalized.slice(0, -ipv4Match[1].length)}${replacement}`;
  }

  if ((normalized.match(/::/g) ?? []).length > 1) return null;
  const [leftRaw, rightRaw] = normalized.split("::");
  const left = leftRaw ? leftRaw.split(":") : [];
  const right = rightRaw ? rightRaw.split(":") : [];
  if ([...left, ...right].some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return null;
  }

  const missingGroups = 8 - left.length - right.length;
  if (normalized.includes("::")) {
    if (missingGroups < 1) return null;
  } else if (missingGroups !== 0) {
    return null;
  }

  return [
    ...left.map((group) => Number.parseInt(group, 16)),
    ...Array.from({ length: missingGroups }, () => 0),
    ...right.map((group) => Number.parseInt(group, 16)),
  ];
};

const isPublicIpv4 = (address: string): boolean => {
  const octets = parseIpv4(address);
  if (!octets) return false;
  const [a, b, c] = octets;

  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a >= 224) return false;

  return true;
};

const isPublicIpv6 = (address: string): boolean => {
  const groups = parseIpv6(address);
  if (!groups) return false;

  const isUnspecified = groups.every((group) => group === 0);
  const isLoopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  if (isUnspecified || isLoopback) return false;

  const isIpv4Embedded = groups.slice(0, 6).every((group) => group === 0)
    || (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff);
  if (isIpv4Embedded) {
    const embedded = [
      groups[6] >> 8,
      groups[6] & 0xff,
      groups[7] >> 8,
      groups[7] & 0xff,
    ].join(".");
    return isPublicIpv4(embedded);
  }

  const first = groups[0];
  if ((first & 0xfe00) === 0xfc00) return false; // Unique local (fc00::/7).
  if ((first & 0xffc0) === 0xfe80) return false; // Link-local (fe80::/10).
  if ((first & 0xffc0) === 0xfec0) return false; // Deprecated site-local.
  if ((first & 0xff00) === 0xff00) return false; // Multicast.
  if (first === 0x0100 && groups.slice(1, 4).every((group) => group === 0)) return false;
  if (first === 0x2001 && groups[1] === 0x0db8) return false; // Documentation.
  if (first === 0x2001 && groups[1] === 0) return false; // Teredo.
  if (first === 0x2002) return false; // Deprecated 6to4.
  if (first === 0x0064 && groups[1] === 0xff9b && groups[2] === 1) return false;

  // Only globally routable unicast addresses (2000::/3) are valid targets.
  return (first & 0xe000) === 0x2000;
};

export const isPublicIpAddress = (address: string): boolean => {
  const normalized = address.startsWith("[") && address.endsWith("]")
    ? address.slice(1, -1)
    : address;
  return normalized.includes(":")
    ? isPublicIpv6(normalized)
    : isPublicIpv4(normalized);
};

const isIpAddress = (hostname: string): boolean => {
  const normalized = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  return parseIpv4(normalized) !== null || parseIpv6(normalized) !== null;
};

const resolveAllAddresses = async (
  hostname: string,
  resolveDns: ResolveDns,
): Promise<string[]> => {
  const results = await Promise.allSettled([
    resolveDns(hostname, "A"),
    resolveDns(hostname, "AAAA"),
  ]);

  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
};

export const assertSafePublicUrl = async (
  rawUrl: string,
  resolveDns: ResolveDns,
): Promise<URL> => {
  if (typeof rawUrl !== "string" || rawUrl.length === 0 || rawUrl.length > MAX_URL_LENGTH) {
    throw new UnsafeUrlError("The recipe URL is invalid.");
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("The recipe URL is invalid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only HTTP and HTTPS recipe URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("Recipe URLs cannot include credentials.");
  }
  if (url.port) {
    throw new UnsafeUrlError("Recipe URLs must use the standard HTTP or HTTPS port.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (
    hostname === "localhost"
    || !hostname.includes(".")
    || BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new UnsafeUrlError("Local and private hostnames are not allowed.");
  }

  if (isIpAddress(hostname)) {
    if (!isPublicIpAddress(hostname)) {
      throw new UnsafeUrlError("Local and private network addresses are not allowed.");
    }
    return url;
  }

  const addresses = await resolveAllAddresses(hostname, resolveDns);
  if (addresses.length === 0) {
    throw new UnsafeUrlError("The recipe hostname could not be resolved.");
  }
  if (addresses.some((address) => !isPublicIpAddress(address))) {
    throw new UnsafeUrlError("The recipe hostname resolves to a non-public network.");
  }

  return url;
};

const readLimitedText = async (
  response: Response,
  maxResponseBytes: number,
): Promise<string> => {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
    throw new UnsafeUrlError("The recipe page is too large to import.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxResponseBytes) {
        await reader.cancel();
        throw new UnsafeUrlError("The recipe page is too large to import.");
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    reader.releaseLock();
  }
};

export const fetchPublicHtml = async (
  rawUrl: string,
  options: SafeFetchOptions,
): Promise<SafeHtmlResponse> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let currentUrl = rawUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const safeUrl = await assertSafePublicUrl(currentUrl, options.resolveDns);
    safeUrl.hash = "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(safeUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ShelfControlBot/1.0; +https://shelf-control.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirectCount === maxRedirects) {
          throw new UnsafeUrlError("The recipe URL redirected too many times.");
        }
        const location = response.headers.get("location");
        if (!location) {
          throw new UnsafeUrlError("The recipe page returned an invalid redirect.");
        }
        currentUrl = new URL(location, safeUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch URL (${response.status})`);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (
        contentType
        && !contentType.includes("text/html")
        && !contentType.includes("application/xhtml+xml")
      ) {
        throw new UnsafeUrlError("The recipe URL did not return an HTML page.");
      }

      return {
        html: await readLimitedText(response, maxResponseBytes),
        finalUrl: safeUrl.toString(),
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new UnsafeUrlError("The recipe page took too long to respond.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new UnsafeUrlError("The recipe URL redirected too many times.");
};
