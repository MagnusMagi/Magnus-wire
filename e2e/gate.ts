import { readFileSync } from "node:fs";
import { join } from "node:path";
import { webcrypto as crypto } from "node:crypto";
import type { BrowserContext } from "@playwright/test";

// ⚠️ Tüm site bir parola kapısının arkasında (bkz src/middleware.ts). Kapıyı
// geçmeyen test, ölçmek istediği sayfayı DEĞİL giriş sayfasını ölçer ve
// sessizce "geçer". 2026-08-18'de tam bu oldu: 375px yatay taşma testi
// yeşildi, çünkü giriş sayfasında taşacak bir şey yoktu; deprem sayfasındaki
// gerçek kırılma aylarca görünmedi.
//
// Çerez, siteGateAuth.ts ile BİREBİR aynı biçimde üretilir (expiry:HMAC).
// UI'dan giriş yapmak yerine token basılıyor: form seçicilerine bağımlılık
// yok ve her testte tek bir ağ isteği bile gerekmiyor.
function envValue(key: string): string {
  try {
    // ⚠️ import.meta.url KULLANMA: Playwright bu dosyayı CJS'e çeviriyor,
    // ESM-only sözdizimi "exports is not defined" ile patlıyor.
    const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    return (env.match(new RegExp(`^${key}=(.*)$`, "m")) || [])[1] || "";
  } catch {
    return process.env[key] || "";
  }
}

export async function mintSiteSession(): Promise<string> {
  const secret = envValue("SITE_SESSION_SECRET") || process.env.SITE_SESSION_SECRET || "";
  if (!secret) throw new Error("SITE_SESSION_SECRET bulunamadı — kapı çerezi üretilemiyor");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(String(expiry)));
  const b64 = Buffer.from(new Uint8Array(sig)).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${expiry}:${b64}`;
}

export async function passGate(context: BrowserContext, baseURL = "http://127.0.0.1:3360") {
  const { hostname } = new URL(baseURL);
  await context.addCookies([{ name: "site_session", value: await mintSiteSession(), domain: hostname, path: "/" }]);
}
