import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GA4_STATE_COOKIE = "baltazar_ga4_oauth_state";
export const GA4_CONNECTION_COOKIE = "baltazar_ga4_connection";
export const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export type Ga4Connection = {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export function ga4Config(origin: string) {
  const clientId = process.env.GOOGLE_GA4_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GA4_CLIENT_SECRET;
  const stateSecret = process.env.GOOGLE_GA4_OAUTH_STATE_SECRET;
  if (!clientId || !clientSecret || !stateSecret) {
    throw new Error("GA4 OAuth is not configured. Add GOOGLE_GA4_CLIENT_ID, GOOGLE_GA4_CLIENT_SECRET, and GOOGLE_GA4_OAUTH_STATE_SECRET.");
  }
  return {
    clientId,
    clientSecret,
    stateSecret,
    redirectUri: process.env.GOOGLE_GA4_REDIRECT_URI || `${origin}/api/integrations/ga4/callback`,
  };
}

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function createOAuthState(clientId: string, secret: string) {
  const payload = encode(JSON.stringify({ clientId, nonce: randomBytes(18).toString("hex"), createdAt: Date.now() }));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readOAuthState(value: string, secret: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = decode(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const parsed = JSON.parse(decode(payload).toString("utf8")) as { clientId?: string; createdAt?: number };
  if (!parsed.clientId || !parsed.createdAt || Date.now() - parsed.createdAt > 10 * 60_000) return null;
  return { clientId: parsed.clientId };
}

function encryptionKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptConnection(connection: Ga4Connection, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(connection), "utf8"), cipher.final()]);
  return [encode(iv), encode(cipher.getAuthTag()), encode(encrypted)].join(".");
}

export function decryptConnection(value: string | undefined, secret: string): Ga4Connection | null {
  try {
    if (!value) return null;
    const [iv, tag, encrypted] = value.split(".");
    if (!iv || !tag || !encrypted) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), decode(iv));
    decipher.setAuthTag(decode(tag));
    const payload = Buffer.concat([decipher.update(decode(encrypted)), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(payload) as Ga4Connection;
    return parsed.clientId && parsed.accessToken && parsed.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

export async function refreshGa4Connection(connection: Ga4Connection, config: ReturnType<typeof ga4Config>) {
  if (connection.expiresAt > Date.now() + 60_000) return connection;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) throw new Error("Google Analytics authorization expired. Connect GA4 again.");
  return { ...connection, accessToken: payload.access_token, expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000 };
}

export const ga4CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 24 * 60 * 60,
};
