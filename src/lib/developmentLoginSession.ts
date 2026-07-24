import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const DEVELOPMENT_LOGIN_COOKIE = "baltz-dev-session";
const DEVELOPMENT_LOGIN_MAX_AGE_SECONDS = 12 * 60 * 60;

function signingSecret() {
  return process.env.DEV_LOGIN_COOKIE_SECRET || "baltz-local-development-session";
}

function signature(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url");
}

export function createDevelopmentLoginToken(email: string) {
  const payload = Buffer.from(JSON.stringify({
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + DEVELOPMENT_LOGIN_MAX_AGE_SECONDS * 1000,
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function developmentLoginCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: false,
    path: "/",
    maxAge: DEVELOPMENT_LOGIN_MAX_AGE_SECONDS,
  };
}

export function readDevelopmentLoginEmail(request: Request) {
  if (process.env.NODE_ENV === "production") return null;
  const cookie = request.headers.get("cookie") || "";
  const encoded = cookie
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(`${DEVELOPMENT_LOGIN_COOKIE}=`))
    ?.slice(DEVELOPMENT_LOGIN_COOKIE.length + 1);
  if (!encoded) return null;
  const [payload, receivedSignature] = decodeURIComponent(encoded).split(".");
  if (!payload || !receivedSignature) return null;
  const expectedSignature = signature(payload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: unknown; expiresAt?: unknown };
    return typeof value.email === "string"
      && typeof value.expiresAt === "number"
      && value.expiresAt > Date.now()
      ? value.email.trim().toLowerCase()
      : null;
  } catch {
    return null;
  }
}
