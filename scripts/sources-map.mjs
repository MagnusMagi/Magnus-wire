// kaynaklar.md taksonomisi → Magnus Wire taksonomisi eşlemesi.
//
// kaynaklar.md 51 kategori ve 46 "bölge" taşıyor; site 19 konu ve 5 bölge
// tanıyor (src/lib/site.ts). Eşleme TEK yer burası — kategori bir bölüme
// oturmuyorsa `null` bırakılır ve sınıflandırmayı ingest'teki AI yapar.

// Kategori → site section slug'ı. null = zorlama yok, AI sınıflasın.
export const CATEGORY_TO_SECTION = {
  // haber
  "Gündem": "gundem", "Son Dakika": "gundem", "News": "gundem",
  "Dünya": "gundem", "Siyaset": "gundem",
  // teknoloji
  "Yapay Zeka": "yapay-zeka",
  "Programming": "yazilim", "Web Development": "yazilim",
  "Android Development": "yazilim", "iOS Development": "yazilim",
  "Android": "donanim", "Apple": "donanim",
  // "Tech"/"Teknoloji" genel başlıklar — donanım/yazılım/AI hepsini karıştırıyor,
  // zorlamak yerine AI'ya bırakılır.
  "Tech": null, "Teknoloji": null,
  "Kripto": "kripto", "Siber Güvenlik": "siber",
  // bilim
  "Science": "bilim", "Bilim": "bilim", "Çevre": "bilim",
  "Sağlık": "bilim", "Enerji": "bilim",
  "Space": "uzay", "Uzay": "uzay",
  // ekonomi
  // ⚠️ "Personal finance" BİLEREK finans değil yasam: bu kaynaklar haber değil
  // affiliate/listicle üretiyor ("Walmart'ta 5 dolardan başlayan fırsatlar",
  // "Webull 12 ücretsiz hisse") ve Borsa'daki "Piyasa Haberleri"ni kirletiyordu.
  "Personal finance": "yasam",
  "Business & Economy": "finans", "Ekonomi": "finans",
  "Startups": "girisim",
  "Savunma": "savunma",
  // ilgi alanları
  "Gaming": "oyun",
  "Cars": "otomobil",
  "Cricket": "spor", "Football": "spor", "Tennis": "spor",
  "Sports": "spor", "Spor": "spor",
  "Movies": "kultur", "Television": "kultur", "Books": "kultur",
  "Music": "kultur", "History": "kultur",
  "Interior design": "tasarim", "Architecture": "tasarim",
  "UI / UX": "tasarim", "DIY": "tasarim", "Photography": "tasarim",
  "Food": "yasam", "Travel": "yasam", "Beauty": "yasam",
  "Fashion": "yasam", "Funny": "yasam",
  // /hava canlı hava panosu, haber listesi değil — bu kaynağı zorlamıyoruz.
  "Hava Durumu": null,
};

// Sitenin bölge sayfası olan ülkeler.
const REGION_EXACT = {
  "Türkiye": "turkiye",
  "Estonia": "estonya",
  "United States": "abd",
};

const EUROPE = new Set([
  "France", "Germany", "Italy", "Spain", "Poland", "Netherlands", "Ireland",
  "Portugal", "Denmark", "Finland", "Croatia", "Hungary", "Ukraine",
  "United Kingdom",
]);

// "Genel" = bölgesiz global kaynak; "Dünya" = dünya haberleri → ikisi de
// bölge zorlamaz (AI habere göre karar verir).
const NO_REGION = new Set(["Genel", "Dünya"]);

export function mapRegion(country) {
  if (!country || NO_REGION.has(country)) return null;
  if (REGION_EXACT[country]) return REGION_EXACT[country];
  if (EUROPE.has(country)) return "avrupa";
  // Kalan 28 ülke (India, Philippines, Mexico, Australia...) için ayrı sayfa yok;
  // hepsi "dunya" bölgesine düşer, ülke adı etiket olarak korunur.
  return "dunya";
}

export function mapSection(category) {
  return CATEGORY_TO_SECTION[category] ?? null;
}

// `## Bölge (N)` → `### Kategori (N)` → `- ✅ **Ad** — <url> _(dil: xx)_`
export function parseSourcesMarkdown(text) {
  const rows = [];
  let country = null;
  let category = null;
  for (const line of text.split("\n")) {
    const h2 = line.match(/^## (.+?) \((\d+)\)\s*$/);
    if (h2) { country = h2[1]; category = null; continue; }
    const h3 = line.match(/^### (.+?) \((\d+)\)\s*$/);
    if (h3) { category = h3[1]; continue; }
    const item = line.match(/^- (.) \*\*(.+?)\*\* — <(.+?)> _\(dil: (.+?)\)_/);
    if (!item) continue;
    const [, mark, name, url, lang] = item;
    rows.push({
      url: url.trim(),
      name: name.trim(),
      // Orijinal kategori saklanır: eşleme değişince "hangi satırlar bu
      // kategoriden geldi" sorusu markdown'ı yeniden ayrıştırmadan cevaplanabilsin.
      category: category ?? null,
      section: mapSection(category),
      region: mapRegion(country),
      country: NO_REGION.has(country) ? null : country,
      lang: lang.trim(),
      active: mark === "✅",
    });
  }
  return rows;
}
