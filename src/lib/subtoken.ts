import crypto from "node:crypto";

// Abonelik onay/iptal bağlantıları için imzalı (HMAC-SHA256) token.
// Format (base64url): "<purpose>:<email>:<sig>"  — purpose ∈ {confirm, unsub}
function secret(): string {
  return process.env.SUBSCRIBE_TOKEN_SECRET || "";
}

export function signToken(email: string, purpose: "confirm" | "unsub"): string {
  const payload = `${purpose}:${email.toLowerCase()}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyToken(token: string, purpose: "confirm" | "unsub"): string | null {
  if (!secret()) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const first = decoded.indexOf(":");
    const last = decoded.lastIndexOf(":");
    if (first < 0 || last <= first) return null;
    const p = decoded.slice(0, first);
    const email = decoded.slice(first + 1, last);
    const sig = decoded.slice(last + 1);
    if (p !== purpose) return null;
    const expected = crypto.createHmac("sha256", secret()).update(`${p}:${email}`).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return email;
  } catch {
    return null;
  }
}
