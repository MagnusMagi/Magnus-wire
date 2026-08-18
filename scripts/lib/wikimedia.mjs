// Wikimedia Commons görsel arama — ikinci kaynak.
//
// Openverse'e göre güçlü yanı: VARLIKLARDA (bina, kurum, araç, coğrafya,
// tarihî olay) jenerik stoktan çok daha isabetli ve Commons yalnız ÖZGÜR
// içerik barındırıyor. Zayıf yanı: estetik daha düzensiz, atıf zorunlu.
//
// ⚠️ `gsrnamespace=6` ŞART (File alanı). Bu parametre olmadan arama ana
// alanda yapılıyor ve HER ZAMAN 0 sonuç dönüyor — ilk denemede tam bu
// yüzden "Wikimedia çalışmıyor" sanılmıştı.
const UA = "MagiWireBot/1.0 (+https://news.magnusmagi.com)";
const API = "https://commons.wikimedia.org/w/api.php";

// Commons zaten yalnız özgür lisans kabul ediyor ama emin olmak için beyaz
// liste: ticari kullanıma VE türeve izin verenler. NC/ND ya da "fair use"
// benzeri bir ibare görürsek atlıyoruz.
function licenseOk(short) {
  const s = String(short || "").trim().toLowerCase();
  if (!s) return false;
  if (/\bnc\b|noncommercial|\bnd\b|noderiv|fair use|non-free/.test(s)) return false;
  return /^(public domain|cc0|pdm|cc pd)/.test(s) || /^cc by(-sa)?[\s\d.]*$/.test(s);
}

const stripHtml = (x) => String(x || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function searchWikimedia(query, { timeoutMs = 9000 } = {}) {
  if (!query) return [];
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: query,
    gsrnamespace: "6", gsrlimit: "20",
    prop: "imageinfo", iiprop: "url|extmetadata|size|mime",
    iiurlwidth: "1200", format: "json", origin: "*",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${API}?${params}`, { signal: ctrl.signal, headers: { "User-Agent": UA } });
    if (!r.ok) return [];
    const j = await r.json();
    const out = [];
    for (const p of Object.values(j.query?.pages || {})) {
      const i = p.imageinfo?.[0];
      if (!i) continue;
      if (!/^image\/(jpeg|png|webp)$/.test(i.mime || "")) continue;   // SVG/TIFF vb. atla
      const m = i.extmetadata || {};
      const short = m.LicenseShortName?.value;
      if (!licenseOk(short)) continue;
      // thumburl: 1200px'e indirilmiş sürüm — orijinal bazen 20 MB+.
      const url = i.thumburl || i.url;
      if (!url) continue;
      out.push({
        url,
        width: Number(i.thumbwidth || i.width) || 0,
        credit: {
          creator: stripHtml(m.Artist?.value) || "bilinmiyor",
          license: stripHtml(short),
          licenseUrl: m.LicenseUrl?.value || "https://commons.wikimedia.org/wiki/Commons:Licensing",
          sourceUrl: i.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title || "")}`,
          title: String(p.title || "").replace(/^File:/, ""),
          provider: "wikimedia",
          query,
        },
      });
    }
    return out;
  } catch { return []; } finally { clearTimeout(timer); }
}
