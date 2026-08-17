import { NextResponse, type NextRequest } from "next/server";
import { SITE_COOKIE, verifySiteSessionToken } from "@/lib/siteGateAuth";

// Kapıdan muaf uçlar: her biri KENDİ kimlik doğrulamasını yapar, site cookie'sine
// bağlanamazlar çünkü çağıran tarayıcı oturumu değil.
//   /api/revalidate      — x-revalidate-secret (cron ingest, 127.0.0.1)
//   /api/newsletter/send — x-newsletter-secret (cron/manuel tetik)
//   /api/push/send       — x-newsletter-secret (cron/manuel tetik)
//   /api/confirm         — HMAC imzalı token (e-postadaki onay linki)
//   /api/unsubscribe     — HMAC imzalı token (e-postadaki iptal linki, RFC 8058 POST dahil)
const SELF_AUTH_PATHS = [
  "/api/revalidate",
  "/api/newsletter/send",
  "/api/push/send",
  "/api/confirm",
  "/api/unsubscribe",
] as const;

// Site geneli giriş kapısı. /admin ve /giris kendi akışlarını yönetir, buradan muaf.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/giris" ||
    pathname.startsWith("/api/site/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    SELF_AUTH_PATHS.some((p) => pathname === p)
  ) {
    return NextResponse.next();
  }

  const authed = await verifySiteSessionToken(req.cookies.get(SITE_COOKIE)?.value);
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/giris";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon).*)"],
};
