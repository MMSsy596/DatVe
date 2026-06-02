import crypto from "node:crypto";
import { headers } from "next/headers";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function cleanupExpiredEntries(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export async function getRequestMeta(request: Request) {
  const headerStore = await headers();
  const forwardedFor =
    request.headers.get("x-forwarded-for") ??
    headerStore.get("x-forwarded-for") ??
    "";
  const ip =
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    headerStore.get("x-real-ip") ||
    "127.0.0.1";
  const origin = request.headers.get("origin") ?? headerStore.get("origin");
  const host = request.headers.get("host") ?? headerStore.get("host");
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return { ip, origin, host, userAgent };
}

export async function enforceRateLimit(request: Request, namespace: string, limit: number, windowMs: number) {
  const meta = await getRequestMeta(request);
  const key = `${namespace}:${meta.ip}`;
  const now = Date.now();
  cleanupExpiredEntries(now);

  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new Error("Bạn gửi yêu cầu quá nhanh. Thử lại sau ít phút.");
  }

  current.count += 1;
}

export function createNonce(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

export function safeRedirectUrl(candidate: string, fallback: string) {
  try {
    const url = new URL(candidate);
    if (url.protocol === "cineplus:" || url.protocol === "datve:" || url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function normalizeOrigin(origin: string | null, host: string | null) {
  const envOrigin = process.env.PUBLIC_API_ORIGIN ?? process.env.APP_ORIGIN;
  if (envOrigin) return envOrigin.replace(/\/+$/, "");
  if (origin) return origin;
  if (host) {
    const isLocal = /^localhost[:\d]*$/i.test(host) || /^\d+\.\d+\.\d+\.\d+[:\d]*$/.test(host);
    return `${isLocal ? "http" : "https"}://${host}`;
  }
  return "http://localhost:3001";
}
