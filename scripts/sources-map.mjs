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
  "UI / UX": "tasarim", "DIY": "tasarim",
  // "Photography" 2026-08-24'e kadar tasarim'e düşüyordu; artık kendi bölümü var.
  "Photography": "fotograf", "PhotographySchool": "fotograf",
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

// Kıta haritası. Ülke düzeyindeki üç bölge (Türkiye, Estonya, ABD) yukarıdaki
// REGION_EXACT'te ve DAHA SPESİFİK oldukları için önce onlara bakılır.
const CONTINENT = {
  avrupa: ["France", "Germany", "Italy", "Spain", "Poland", "Netherlands",
    "Ireland", "Portugal", "Denmark", "Finland", "Croatia", "Hungary",
    "Ukraine", "United Kingdom", "Russia"],
  asya: ["India", "Philippines", "Japan", "China", "South Korea", "Singapore",
    "Indonesia", "Thailand", "Vietnam", "Bangladesh", "Pakistan", "Iran",
    "Israel", "Saudi Arabia", "Taiwan", "Hong Kong SAR China", "Middle East"],
  amerika: ["Mexico", "Brazil", "Canada", "Argentina"],
  afrika: ["South Africa", "Nigeria", "Egypt", "Kenya"],
  okyanusya: ["Australia", "New Zealand"],
};
const COUNTRY_CONTINENT = new Map(
  Object.entries(CONTINENT).flatMap(([region, countries]) => countries.map((c) => [c, region])),
);

// "Genel" ve "Dünya" başlıkları belirli bir ülkenin yayını değil, küresel
// kaynaklar. Ülke olarak "Global" işaretlenirler (null DEĞİL): ingest bu bilgiyi
// AI'ya ipucu veriyor ve "ülkesi bilinmiyor" ile "küresel yayın" farklı şeyler.
const GLOBAL_SCOPE = new Set(["Genel", "Dünya"]);

export function mapCountry(country) {
  return !country || GLOBAL_SCOPE.has(country) ? "Global" : country;
}

// Bölge burada YEDEK üretir, zorlama değil: ingest önce AI'nın haber içeriğinden
// çıkardığı bölgeye bakar, yalnız o kararsız kalınca buraya düşer.
export function mapRegion(country) {
  // Spesifik ülke bölgeleri kıtadan önce gelir (ABD → abd, Amerika DEĞİL).
  if (REGION_EXACT[country]) return REGION_EXACT[country];
  const continent = COUNTRY_CONTINENT.get(country);
  if (continent) return continent;
  // Küresel kaynaklar ve haritada olmayan ülkeler "dunya" yedeğine düşer.
  return "dunya";
}

export function mapSection(category) {
  return CATEGORY_TO_SECTION[category] ?? null;
}

// kaynaklar.md aynı feed'i iki kez listeliyor: normal ve `?v=2` cache-busting
// ekiyle (1395 satırın 647'si böyle bir ikiz). Aynı feed'i iki kez çekmek
// çekimlerin ~%45'ini boşa harcayıp rotasyon devrini iki katına çıkarıyordu.
export function normalizeFeedUrl(url) {
  return url.trim().replace(/[?&]v=2$/, "");
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
      url: normalizeFeedUrl(url),
      name: name.trim(),
      // Orijinal kategori saklanır: eşleme değişince "hangi satırlar bu
      // kategoriden geldi" sorusu markdown'ı yeniden ayrıştırmadan cevaplanabilsin.
      category: category ?? null,
      section: mapSection(category),
      region: mapRegion(country),
      country: mapCountry(country),
      lang: lang.trim(),
      active: mark === "✅",
    });
  }
  return rows;
}

// ── Alan adından ülke tahmini ────────────────────────────────────────────
// Hem backfill hem de import bunu kullanır: kaynaklar.md'de OLMAYAN kürasyonlu
// feed'lerin ülkesi başka türlü boş kalıyordu ve her yeniden içe aktarımda
// backfill'in doldurduğu değerler null'a geri yazılıyordu.
const TLD_COUNTRY = {
  ".com.tr": "Türkiye", ".net.tr": "Türkiye", ".org.tr": "Türkiye", ".tr": "Türkiye",
  ".ee": "Estonia",
  ".co.uk": "United Kingdom", ".uk": "United Kingdom",
  ".de": "Germany", ".fr": "France", ".it": "Italy", ".es": "Spain",
  ".nl": "Netherlands", ".pl": "Poland", ".ie": "Ireland", ".pt": "Portugal",
  ".dk": "Denmark", ".fi": "Finland", ".ua": "Ukraine", ".ru": "Russia",
  ".in": "India", ".ph": "Philippines", ".mx": "Mexico", ".au": "Australia",
  ".com.au": "Australia", ".ca": "Canada", ".za": "South Africa", ".br": "Brazil",
  ".jp": "Japan", ".kr": "South Korea", ".cn": "China", ".sg": "Singapore",
  ".nz": "New Zealand", ".ng": "Nigeria", ".pk": "Pakistan", ".bd": "Bangladesh",
  ".ir": "Iran", ".il": "Israel", ".eg": "Egypt", ".ke": "Kenya",
  ".sa": "Saudi Arabia", ".tw": "Taiwan", ".th": "Thailand", ".vn": "Vietnam",
  ".hu": "Hungary", ".hr": "Croatia", ".ar": "Argentina", ".id": "Indonesia",
};

const HOST_COUNTRY = {
  "webrazzi.com": "Türkiye",
  "www.technopat.net": "Türkiye",
  "www.teknoblog.com": "Türkiye",
  "estonianworld.com": "Estonia",
  "feeds.bbci.co.uk": "United Kingdom",
  "www.theguardian.com": "United Kingdom",
  "rss.dw.com": "Germany",
};

export function guessCountry(url) {
  let host;
  try { host = new URL(url).hostname; } catch { return "Global"; }
  if (HOST_COUNTRY[host]) return HOST_COUNTRY[host];
  const hit = Object.keys(TLD_COUNTRY).filter((t) => host.endsWith(t)).sort((a, b) => b.length - a.length)[0];
  if (hit) return TLD_COUNTRY[hit];
  // Kalanlar küresel yayın sayılır — yanlış ülke yazmaktansa "Global".
  return "Global";
}
