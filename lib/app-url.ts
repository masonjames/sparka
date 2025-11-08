import { env } from "@/lib/env";

const FALLBACK_LOCAL_URL = "http://localhost:3000";

const normalizeToOrigin = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return null;
  }
};

const baseUrlCandidates = [
  normalizeToOrigin(env.APP_BASE_URL),
  normalizeToOrigin(env.VERCEL_PROJECT_PRODUCTION_URL),
  normalizeToOrigin(env.VERCEL_URL),
].filter(Boolean) as string[];

export const appBaseUrl = baseUrlCandidates[0] ?? FALLBACK_LOCAL_URL;

const additionalOrigins = env.AUTH_TRUSTED_ORIGINS
  ? env.AUTH_TRUSTED_ORIGINS.split(",")
      .map((origin) => normalizeToOrigin(origin))
      .filter(Boolean)
  : [];

const rawCookieDomain = env.AUTH_COOKIE_DOMAIN?.trim() || null;
const normalizedCookieDomain =
  rawCookieDomain && rawCookieDomain !== "."
    ? rawCookieDomain.startsWith(".")
      ? rawCookieDomain
      : `.${rawCookieDomain}`
    : null;
const cookieDomainHost = normalizedCookieDomain
  ? normalizedCookieDomain.replace(/^\./, "")
  : null;

const cookieDomainOrigins = cookieDomainHost
  ? [
      normalizeToOrigin(`https://${cookieDomainHost}`),
      `https://*.${cookieDomainHost}`,
    ]
  : [];

export const authTrustedOrigins = Array.from(
  new Set(
    [
      appBaseUrl,
      ...baseUrlCandidates.slice(1),
      ...additionalOrigins,
      ...cookieDomainOrigins,
    ].filter(Boolean),
  ),
);

export const authCookieDomain = normalizedCookieDomain ?? undefined;

export const buildAppUrl = (path: string) => new URL(path, `${appBaseUrl}/`).toString();
