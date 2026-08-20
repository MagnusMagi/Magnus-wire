import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// X medya vekili.
//
// ⚠️ Neden vekil? Avatar/görseli doğrudan pbs.twimg.com'dan çekmek her
// ziyaretçinin IP'sini ve Referer'ını X'e verirdi. Site bilinçli olarak hiçbir
// 3. parti isteği yapmıyor (gömme widget'ı da bu yüzden kullanılmadı) —
// görseller için istisna yapmak o kararı anlamsız kılardı.
//
// ⚠️ SSRF: `u` parametresi kullanıcıdan gelir. İzin listesi TAM HOST eşleşmesi
// yapar; "twimg.com ile bitiyor mu" gibi bir kontrol evil-twimg.com'a açık olurdu.
const ALLOWED_HOSTS = new Set(["pbs.twimg.com", "abs.twimg.com", "video.twimg.com"]);
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 2;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) return new NextResponse("missing u", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse("forbidden host", { status: 403 });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // ⚠️ Yönlendirme ELDE izlenir. `redirect:"follow"` vekili açık proxy'ye
    // çevirirdi (X'ten gelen bir 302 herhangi bir hedefe götürebilir);
    // `redirect:"error"` ise MEŞRU yönlendirmeleri kırıyordu — ölçüldü:
    // X, bazı video kapaklarını 307 ile kendi statik yer tutucusuna
    // yönlendiriyor ve kartta kırık görsel çıkıyordu. Doğrusu: izle, ama
    // HER ADIMDA hedefi izin listesine karşı yeniden doğrula.
    let current = target;
    let upstream = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      upstream = await fetch(current.toString(), {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { "User-Agent": "MagiWire/1.0 (+https://news.magnusmagi.com)" },
      });
      if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
      const loc = upstream.headers.get("location");
      if (!loc) return new NextResponse("bad redirect", { status: 502 });
      let next: URL;
      try {
        next = new URL(loc, current);
      } catch {
        return new NextResponse("bad redirect", { status: 502 });
      }
      if (next.protocol !== "https:" || !ALLOWED_HOSTS.has(next.hostname)) {
        return new NextResponse("forbidden redirect", { status: 403 });
      }
      current = next;
      upstream = null;
    }
    if (!upstream) return new NextResponse("too many redirects", { status: 502 });
    if (!upstream.ok) return new NextResponse("upstream error", { status: 502 });

    // X, telif şikâyeti olan videonun kapağını kendi "önizleme yok" grafiğiyle
    // değiştiriyor. Onu basmak yerine 404 dönüyoruz: istemci tarafı görseli
    // tamamen gizliyor, kartta anlamsız bir yer tutucu kalmıyor.
    if (current.pathname.includes("/static/dmca/")) {
      return new NextResponse("unavailable", { status: 404 });
    }

    const type = upstream.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return new NextResponse("not an image", { status: 415 });
    const len = Number(upstream.headers.get("content-length") || 0);
    if (len > MAX_BYTES) return new NextResponse("too large", { status: 413 });

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return new NextResponse("too large", { status: 413 });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": type,
        // Tweet görseli değişmez; uzun önbellek vekilin maliyetini sıfıra yakın tutar.
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
