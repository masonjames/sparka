import { env } from "@/lib/env";

const FALLBACK_LOCAL_ORIGIN = "http://localhost:3000";
const HOSTNAME_REGEX = /^[a-z0-9.-]+$/i;
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const ORIGIN_PROTOCOL_REGEX = /^https?:\/\//i;

export type SharedCookieOptions = {
  domain?: string;
  secure: boolean;
  sameSite: "none" | "lax";
  path: string;
};

// Internal helpers stay un-exported to keep the public surface small.
function normalizeOrigin(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withProtocol = ORIGIN_PROTOCOL_REGEX.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeHostname(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const host = withoutProtocol.replace(/\/.*$/, "").replace(/^\.+/, "");
  if (!host || !HOSTNAME_REGEX.test(host)) {
    return null;
  }
  return host;
}

function normalizeCookieDomain(value?: string | null): string | null {
  const host = normalizeHostname(value);
  if (!host) {
    return null;
  }
  return `.${host}`;
}

function stripFirstLabel(host: string): string | null {
  if (IPV4_REGEX.test(host) || host === "localhost") {
    return null;
  }
  const parts = host.split(".");
  if (parts.length <= 1) {
    return null;
  }
  if (parts.length === 2) {
    return host;
  }
  return parts.slice(1).join(".");
}

/**
 * Determine the primary origin following precedence:
 * APP_BASE_URL_OVERRIDE > APP_BASE_URL (legacy) > Vercel envs > localhost fallback.
 */
const originCandidates = [
  normalizeOrigin(env.APP_BASE_URL_OVERRIDE),
  normalizeOrigin(env.APP_BASE_URL),
  normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL),
  normalizeOrigin(env.VERCEL_URL),
].filter((origin): origin is string => Boolean(origin));

export const appOrigin = originCandidates[0] ?? FALLBACK_LOCAL_ORIGIN;
export const appBaseUrl = `${appOrigin}/`;

const appOriginHost = (() => {
  try {
    return new URL(appOrigin).hostname;
  } catch {
    return "localhost";
  }
})();

const cookieDomainOverride =
  normalizeCookieDomain(env.AUTH_COOKIE_DOMAIN_OVERRIDE) ??
  normalizeCookieDomain(env.AUTH_COOKIE_DOMAIN);
const cookieDomainHost = cookieDomainOverride
  ? cookieDomainOverride.replace(/^\.+/, "")
  : null;

const resolvedApexDomain =
  normalizeHostname(env.APEX_DOMAIN) ??
  (cookieDomainHost && cookieDomainHost.includes(".")
    ? cookieDomainHost
    : null) ??
  stripFirstLabel(appOriginHost);

export const apexDomain = resolvedApexDomain ?? null;

const derivedSharedCookieDomain =
  cookieDomainOverride ?? (resolvedApexDomain ? `.${resolvedApexDomain}` : undefined);

export const sharedCookieDomain = derivedSharedCookieDomain;
export const authCookieDomain = sharedCookieDomain;

const manualTrustedOrigins = env.AUTH_TRUSTED_ORIGINS
  ? env.AUTH_TRUSTED_ORIGINS.split(",")
      .map((value) => normalizeOrigin(value))
      .filter((origin): origin is string => Boolean(origin))
  : [];

const apexOrigin = resolvedApexDomain
  ? normalizeOrigin(`https://${resolvedApexDomain}`)
  : null;
const cookieBaseOrigin = cookieDomainHost
  ? normalizeOrigin(`https://${cookieDomainHost}`)
  : null;
const wildcardCookieOrigin = cookieDomainHost
  ? `https://*.${cookieDomainHost}`
  : null;

const trustedOriginsSet = new Set<string>();
const pushOrigin = (value?: string | null) => {
  if (value) {
    trustedOriginsSet.add(value);
  }
};

pushOrigin(appOrigin);
for (const origin of originCandidates.slice(1)) {
  pushOrigin(origin);
}
for (const origin of manualTrustedOrigins) {
  pushOrigin(origin);
}
pushOrigin(apexOrigin);
pushOrigin(cookieBaseOrigin);
if (wildcardCookieOrigin) {
  trustedOriginsSet.add(wildcardCookieOrigin);
}

export const authTrustedOrigins = Array.from(trustedOriginsSet);

export function isTrustedAppOrigin(value: string): boolean {
  const normalized = normalizeOrigin(value);
  if (!normalized) {
    return false;
  }
  if (trustedOriginsSet.has(normalized)) {
    return true;
  }
  let candidateHost: string;
  try {
    candidateHost = new URL(normalized).hostname;
  } catch {
    return false;
  }
  if (candidateHost === appOriginHost) {
    return true;
  }
  if (apexDomain) {
    if (candidateHost === apexDomain || candidateHost.endsWith(`.${apexDomain}`)) {
      return true;
    }
  }
  if (cookieDomainHost) {
    if (
      candidateHost === cookieDomainHost ||
      candidateHost.endsWith(`.${cookieDomainHost}`)
    ) {
      return true;
    }
  }
  for (const origin of trustedOriginsSet) {
    const wildcardMatch = origin.match(/^https?:\/\/\*\.(.+)$/i);
    if (!wildcardMatch) {
      continue;
    }
    const suffix = wildcardMatch[1];
    if (suffix && candidateHost.endsWith(`.${suffix}`)) {
      return true;
    }
  }
  return false;
}

export const sharedCookieOptions: SharedCookieOptions = {
  domain: sharedCookieDomain,
  secure: typeof sharedCookieDomain === "string"
    ? true
    : appOrigin.startsWith("https://"),
  sameSite: typeof sharedCookieDomain === "string" ? "none" : "lax",
  path: "/",
};

/**
 * Returns shared cookie options merged with optional overrides.
 * Useful for callers that need to customize `path`, `expires`, etc.
 */
export function getSharedCookieOptions(
  overrides?: Partial<SharedCookieOptions>
): SharedCookieOptions {
  if (!overrides) {
    return { ...sharedCookieOptions };
  }
  return {
    ...sharedCookieOptions,
    ...overrides,
  };
}

export const buildAppUrl = (path: string) =>
  new URL(path, appBaseUrl).toString();

export type ResolveRequestAwareAppUrlOptions = {
  requestOrigin?: string | URL | null;
};

export type ResolveRequestAwareAppUrlResult = {
  url: string;
  origin: string;
  originSource: "runtime" | "env";
  runtimeOrigin: string | null;
};

function normalizeRequestOriginCandidate(
  value?: string | URL | null
): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return normalizeOrigin(value);
  }
  try {
    return normalizeOrigin(value.origin);
  } catch {
    return null;
  }
}

/**
 * Prefers the runtime request origin when it is trusted, falling back to the env-derived base URL.
 * Precedence: trusted runtime origin > env-derived app origin.
 */
export function resolveRequestAwareAppUrl(
  path: string,
  options?: ResolveRequestAwareAppUrlOptions
): ResolveRequestAwareAppUrlResult {
  const runtimeOrigin = normalizeRequestOriginCandidate(
    options?.requestOrigin ?? null
  );
  if (runtimeOrigin && isTrustedAppOrigin(runtimeOrigin)) {
    return {
      url: new URL(path, runtimeOrigin).toString(),
      origin: runtimeOrigin,
      originSource: "runtime",
      runtimeOrigin,
    };
  }
  const fallbackUrl = buildAppUrl(path);
  const fallbackOrigin = new URL(fallbackUrl).origin;
  return {
    url: fallbackUrl,
    origin: fallbackOrigin,
    originSource: "env",
    runtimeOrigin,
  };
}
