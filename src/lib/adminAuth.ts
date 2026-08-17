import crypto from "node:crypto";

// Admin oturum çerezi: imzalı (HMAC-SHA256) "<expiry>:<sig>" token.
// Aynı imzalama deseni subtoken.ts'ten türetildi.
export const ADMIN_COOKIE = "admin_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "";
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const expiry = Date.now() + SESSION_MS;
  const sig = crypto.createHmac("sha256", secret()).update(String(expiry)).digest("base64url");
  return `${expiry}:${sig}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const sep = token.lastIndexOf(":");
  if (sep < 0) return false;
  const expiry = token.slice(0, sep);
  const sig = token.slice(sep + 1);
  if (Date.now() > Number(expiry)) return false;
  const expected = crypto.createHmac("sha256", secret()).update(expiry).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const SESSION_MAX_AGE_SECONDS = SESSION_MS / 1000;
