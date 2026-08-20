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

// Süreç-içi görsel önbelleği.
//
// Aynı avatar sayfadaki onlarca kartta ve HER ziyaretçide tekrar tekrar
// isteniyor; `Cache-Control` yalnız ZATEN gelmiş bir tarayıcıyı kurtarıyor,
// ilk isteği değil. Önbelleksiz her yeni ziyaretçi X'e ~200 istek attırıyordu
// ve yoğunlukta X geçici 502 döndürüp kartlarda görsel düşürüyordu (E2E'de
// paralel koşularda tekrarlanabilir şekilde görüldü).
//
// Sınırlı ve basit tutuluyor: ekleme sırası = tahliye sırası (FIFO). LRU'ya
// gerek yok, avatar kümesi zaten küçük ve yavaş değişiyor.
const CACHE_MAX_ENTRIES = 400;
const CACHE_MAX_BYTES = 64 * 1024 * 1024;
const cache = new Map<string, { buf: ArrayBuffer; type: string }>();
let cacheBytes = 0;

function cacheGet(key: string) {
  return cache.get(key);
}

function cachePut(key: string, buf: ArrayBuffer, type: string) {
  // Tek bir dev görsel önbelleği kilitlemesin.
  if (buf.byteLength > CACHE_MAX_BYTES / 8) return;
  while (cache.size >= CACHE_MAX_ENTRIES || cacheBytes + buf.byteLength > CACHE_MAX_BYTES) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    const victim = cache.get(oldest.value);
    if (victim) cacheBytes -= victim.buf.byteLength;
    cache.delete(oldest.value);
  }
  cache.set(key, { buf, type });
  cacheBytes += buf.byteLength;
}

const imageHeaders = (type: string, hit: boolean) => ({
  "Content-Type": type,
  // Tweet görseli değişmez; uzun önbellek vekilin maliyetini sıfıra yakın tutar.
  "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "X-Content-Type-Options": "nosniff",
  "X-Cache": hit ? "HIT" : "MISS",
});
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

  const cached = cacheGet(target.toString());
  if (cached) {
    return new NextResponse(cached.buf, { status: 200, headers: imageHeaders(cached.type, true) });
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

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return new NextResponse("too large", { status: 413 });

    cachePut(target.toString(), buf, type);
    return new NextResponse(buf, { status: 200, headers: imageHeaders(type, false) });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
