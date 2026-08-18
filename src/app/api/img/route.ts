// Görsel vekili. ⚠️ Bir kez KALDIRILDI, sonra geri alındı — gerekçeyi bilmeden
// tekrar silme:
//   Eskiden yayıncı CDN'lerinden lisansı BİLİNMEYEN haber fotoğrafları buradan
//   geçiyordu. Sorun vekilin kendisi değildi; vekil görseli indirip KENDİ alan
//   adımızdan kopya servis ettiği için "sadece gömüyoruz" savunmasını da
//   ortadan kaldırıyordu (bkz Svensson/BestWater çizgisi).
//   Artık yalnız CC0/BY/BY-SA lisanslı görseller kullanılıyor ve bu lisanslar
//   çoğaltma + yeniden dağıtıma AÇIKÇA izin veriyor → itiraz düşüyor. Vekil
//   ise okuyucunun IP'sini Flickr/Wikimedia'ya sızdırmamak (gizlilik sayfası)
//   ve önbellek için duruyor.
export const runtime = "nodejs";
export const revalidate = false;

const MAX_BYTES = 8_000_000;

function isPrivateV4(ip: string): boolean {
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(ip)) return true;
  const m = ip.match(/^172\.(\d+)\./);
  return !!(m && +m[1] >= 16 && +m[1] <= 31);
}

// IPv4-mapped IPv6'yı dotted IPv4'e çevir: hem ::ffff:127.0.0.1 hem de
// Node'un normalize ettiği hex form ::ffff:7f00:1 desteklenir.
function mappedV4(h: string): string | null {
  const dotted = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted) return dotted[1];
  const hex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16), lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, ""); // IPv6 literal köşeli parantezleri at
  if (h === "localhost" || h === "0.0.0.0") return true;
  if (isPrivateV4(h)) return true;
  const mapped = mappedV4(h);
  if (mapped && isPrivateV4(mapped)) return true;
  // IPv6: loopback (::1), unique-local (fc00::/7 → fc/fd), link-local (fe80::/10)
  if (h === "::1" || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h)) return true;
  return false;
}

function blocked(target: URL): boolean {
  return target.protocol !== "https:" || isPrivateHost(target.hostname);
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  if (!u) return new Response("bad", { status: 400 });
  let target: URL;
  try { target = new URL(u); } catch { return new Response("bad url", { status: 400 }); }
  if (blocked(target)) return new Response("blocked", { status: 400 });

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 8000);
  try {
    // redirect: "manual" → her redirect adımını blocklist'e karşı kendimiz doğrularız (SSRF koruması)
    let r: Response;
    let current = target;
    for (let hops = 0; ; hops++) {
      r = await fetch(current, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MagiWireBot/1.0; +https://news.magnusmagi.com)" },
      });
      if (r.status < 300 || r.status >= 400) break;
      const loc = r.headers.get("location");
      if (!loc || hops >= 3) return new Response("blocked", { status: 400 });
      let next: URL;
      try { next = new URL(loc, current); } catch { return new Response("blocked", { status: 400 }); }
      if (blocked(next)) return new Response("blocked", { status: 400 });
      current = next;
    }
    if (!r.ok) return new Response("upstream", { status: 502 });
    const ct = r.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return new Response("not image", { status: 415 });
    // Önce Content-Length ile erken reddet (belleğe almadan)
    const len = Number(r.headers.get("content-length") || 0);
    if (len > MAX_BYTES) return new Response("too large", { status: 413 });
    if (!r.body) return new Response("upstream", { status: 502 });
    // Gövdeyi sayaçla akıt; limiti aşınca iptal et (Content-Length yoksa da korur, OOM önler)
    const reader = r.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) { await reader.cancel(); return new Response("too large", { status: 413 }); }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
    return new Response(out, { headers: { "Content-Type": ct, "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" } });
  } catch {
    return new Response("error", { status: 502 });
  } finally {
    clearTimeout(to);
  }
}
