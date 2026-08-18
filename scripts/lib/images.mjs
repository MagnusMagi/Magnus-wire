// Temsili görsel arama — iki kaynak, tek arayüz.
//
// Openverse  : geniş ve estetik olarak daha düzgün (Flickr ağırlıklı).
// Wikimedia  : VARLIKLARDA (bina, kurum, araç, coğrafya) daha isabetli;
//              Commons yalnız özgür içerik barındırıyor.
// İkisi PARALEL sorgulanır, adaylar birleştirilir ve slug'a göre seçilir.
//
// ⚠️ Neden birleştirip seçiyoruz: ilk sürüm tek kaynaktan HEP İLK sonucu
// alıyordu ve 272 haber yalnız 49 farklı görsel paylaşıyordu (sorgu başına
// 13 habere aynı kare). Havuzu büyütmek + seed ile seçmek çeşitliliği
// aday sayısı kadar katlıyor, üstelik deterministik kalıyor.
import { searchOpenverse, pickQuery, isSensitive } from "./openverse.mjs";
import { searchWikimedia } from "./wikimedia.mjs";

export { pickQuery, isSensitive };

function seedIndex(seed, n) {
  if (n <= 1) return 0;
  let h = 2166136261;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % n;
}

// ⚠️ ALAKA SIRASI KORUNMALI. İlk sürüm 20-40 adayın TAMAMINDAN rastgele
// seçiyordu; çeşitlilik geldi ama kalite düştü — arama motorunun ilk
// sonuçları en alakalısıdır, 17. sıradaki genelde konuyla ilgisiz bir kare
// oluyor (ölçüldü: "server room" sorgusuna boş bir teknik dolap fotoğrafı).
// Bu yüzden seçim havuzu her kaynağın BAŞINDAN alınır ve seed yalnız o dar
// havuzda gezer: hem alakalı kalır hem haberler aynı kareye yığılmaz.
const HEAD = Number(process.env.IMAGE_HEAD || 6);   // kaynak başına aday
const MIN_W = Number(process.env.IMAGE_MIN_WIDTH || 800);

export async function searchImage(query, { seed = "", timeoutMs = 9000 } = {}) {
  if (!query) return null;
  // Biri yavaşsa/patlarsa diğeri yine sonuç versin diye paralel ve bağımsız.
  const [ov, wm] = await Promise.all([
    searchOpenverse(query, { timeoutMs }).catch(() => []),
    searchWikimedia(query, { timeoutMs }).catch(() => []),
  ]);
  // Küçük görseller kapak olarak kullanılamıyor (bulanık) ve genelde ikonlar,
  // ekran görüntüleri ya da amblemler oluyor — alaka açısından da zayıflar.
  const big = (l) => l.filter((x) => !x.width || x.width >= MIN_W);
  const all = [...big(ov).slice(0, HEAD), ...big(wm).slice(0, HEAD)];
  if (!all.length) {
    const fallback = [...ov.slice(0, HEAD), ...wm.slice(0, HEAD)];   // boyut filtresi her şeyi elediyse
    return fallback.length ? fallback[seedIndex(seed, fallback.length)] : null;
  }
  return all[seedIndex(seed, all.length)];
}
