// Site geneli giriş kapısı. Next.js middleware Edge runtime'da çalışabildiği için
// (node:crypto/Buffer garanti değil) Web Crypto (SubtleCrypto) kullanılır — hem
// middleware'de hem Node route handler'larında çalışır.
const enc = new TextEncoder();

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const SITE_COOKIE = "site_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün
export const SITE_SESSION_MAX_AGE_SECONDS = SESSION_MS / 1000;

export function checkSitePassword(candidate: string): boolean {
  const expected = process.env.SITE_PASSWORD || "";
  if (!expected) return false;
  return timingSafeEqual(candidate, expected);
}

export async function createSiteSessionToken(): Promise<string> {
  const secret = process.env.SITE_SESSION_SECRET || "";
  const expiry = Date.now() + SESSION_MS;
  const sig = await hmac(secret, String(expiry));
  return `${expiry}:${sig}`;
}

export async function verifySiteSessionToken(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.SITE_SESSION_SECRET || "";
  if (!token || !secret) return false;
  const sep = token.lastIndexOf(":");
  if (sep < 0) return false;
  const expiry = token.slice(0, sep);
  const sig = token.slice(sep + 1);
  if (Date.now() > Number(expiry)) return false;
  const expected = await hmac(secret, expiry);
  return timingSafeEqual(sig, expected);
}
