import type { Locale } from "./i18n";

export const SITE = { name: "MagiWire", domain: "news.magnusmagi.com" } as const;

export type SectionKind = "topic" | "region";
export interface Section {
  slug: string;
  kind: SectionKind;
  label: Record<Locale, string>;
}

// Nav sırası: önce haber/teknoloji çekirdeği, sonra ilgi alanları, en sonda
// canlı-veri panoları (borsa/hava/deprem — bunlar haber listesi değil).
export const TOPICS: Section[] = [
  { slug: "gundem", kind: "topic", label: { tr: "Gündem", en: "Headlines", et: "Päevakaja" } },
  { slug: "yapay-zeka", kind: "topic", label: { tr: "Yapay Zeka", en: "AI", et: "Tehisintellekt" } },
  { slug: "yazilim", kind: "topic", label: { tr: "Yazılım", en: "Software", et: "Tarkvara" } },
  { slug: "donanim", kind: "topic", label: { tr: "Donanım", en: "Hardware", et: "Riistvara" } },
  { slug: "girisim", kind: "topic", label: { tr: "Girişim", en: "Startups", et: "Idufirmad" } },
  { slug: "bilim", kind: "topic", label: { tr: "Bilim", en: "Science", et: "Teadus" } },
  { slug: "uzay", kind: "topic", label: { tr: "Uzay", en: "Space", et: "Kosmos" } },
  { slug: "kripto", kind: "topic", label: { tr: "Kripto", en: "Crypto", et: "Krüpto" } },
  { slug: "siber", kind: "topic", label: { tr: "Siber", en: "Cyber", et: "Küber" } },
  { slug: "savunma", kind: "topic", label: { tr: "Savunma", en: "Defence", et: "Kaitse" } },
  { slug: "otomobil", kind: "topic", label: { tr: "Otomobil", en: "Cars", et: "Autod" } },
  { slug: "oyun", kind: "topic", label: { tr: "Oyun", en: "Gaming", et: "Mängud" } },
  { slug: "spor", kind: "topic", label: { tr: "Spor", en: "Sports", et: "Sport" } },
  { slug: "kultur", kind: "topic", label: { tr: "Kültür", en: "Culture", et: "Kultuur" } },
  { slug: "tasarim", kind: "topic", label: { tr: "Tasarım", en: "Design", et: "Disain" } },
  { slug: "yasam", kind: "topic", label: { tr: "Yaşam", en: "Life", et: "Elu" } },
  { slug: "borsa", kind: "topic", label: { tr: "Borsa", en: "Markets", et: "Börs" } },
  { slug: "hava", kind: "topic", label: { tr: "Hava", en: "Weather", et: "Ilm" } },
  { slug: "deprem", kind: "topic", label: { tr: "Deprem", en: "Earthquakes", et: "Maavärinad" } },
];

// Bölgeler iki katmanlı: önce ilgi odağımızdaki ülkeler (Türkiye, Estonya, ABD),
// sonra kıtalar. DAHA SPESİFİK OLAN KAZANIR — bir ABD haberi `abd`ye gider,
// `amerika`ya değil; Türkiye haberi `turkiye`ye gider, `avrupa`ya değil.
// `dunya` yalnız gerçekten küresel/ülkesiz haberler için yedek olarak kalır.
export const REGIONS: Section[] = [
  { slug: "turkiye", kind: "region", label: { tr: "Türkiye", en: "Turkey", et: "Türgi" } },
  { slug: "estonya", kind: "region", label: { tr: "Estonya", en: "Estonia", et: "Eesti" } },
  { slug: "avrupa", kind: "region", label: { tr: "Avrupa", en: "Europe", et: "Euroopa" } },
  { slug: "abd", kind: "region", label: { tr: "ABD", en: "USA", et: "USA" } },
  { slug: "asya", kind: "region", label: { tr: "Asya", en: "Asia", et: "Aasia" } },
  { slug: "amerika", kind: "region", label: { tr: "Amerika", en: "Americas", et: "Ameerika" } },
  { slug: "afrika", kind: "region", label: { tr: "Afrika", en: "Africa", et: "Aafrika" } },
  { slug: "okyanusya", kind: "region", label: { tr: "Okyanusya", en: "Oceania", et: "Okeaania" } },
  { slug: "dunya", kind: "region", label: { tr: "Dünya", en: "World", et: "Maailm" } },
];

// Nav'da görünmeyen ama içerik etiketi olarak yaşayan bölümler.
// "finans" sayfası kaldırıldı (borsa yeterli) ama dispatch'ler hâlâ bu bölüme
// sınıflanıyor ve Borsa'da "Piyasa Haberleri" olarak gösteriliyor → etiketi gerekli.
export const CONTENT_SECTIONS: Section[] = [
  { slug: "finans", kind: "topic", label: { tr: "Finans", en: "Finance", et: "Rahandus" } },
];

// Canlı veri panoları — haber listesi değil, araç. TOPICS içinde kalıyorlar
// (rota ve etiket çözümü değişmesin) ama SUNUMDA ayrılıyorlar: haber
// kategorileriyle aynı şeritte durunca 20 öğelik nav ~1559px'e ulaşıyor ve
// 1440px ekranda son beş başlık ekran dışında kalıyordu.
export const DASHBOARD_SLUGS = ["borsa", "hava", "deprem"] as const;
export const NEWS_TOPICS: Section[] = TOPICS.filter(
  (s) => !DASHBOARD_SLUGS.includes(s.slug as (typeof DASHBOARD_SLUGS)[number]),
);
export const DASHBOARDS: Section[] = TOPICS.filter((s) =>
  DASHBOARD_SLUGS.includes(s.slug as (typeof DASHBOARD_SLUGS)[number]),
);

// ── Savaş / çatışma boyutu ────────────────────────────────────────────────
// `section` ve `region`dan AYRI bir eksen: bir savaş haberi aynı anda `gundem`
// bölümüne ve `avrupa` bölgesine aittir; çatışma etiketi onların YERİNE geçmez,
// üzerine biner. Bu yüzden TOPICS'e eklenmiyor — eklenseydi ingest haberi
// `savas` bölümüne atayıp `gundem`den çıkarırdı.
export const CONFLICTS: Section[] = [
  { slug: "rusya-ukrayna", kind: "topic", label: { tr: "Rusya–Ukrayna", en: "Russia–Ukraine", et: "Venemaa–Ukraina" } },
  { slug: "usa-iran", kind: "topic", label: { tr: "ABD–İran", en: "US–Iran", et: "USA–Iraan" } },
];
export const CONFLICT_SLUGS = CONFLICTS.map((c) => c.slug);
export const isConflictSlug = (x: string): boolean => CONFLICT_SLUGS.includes(x);
export const conflictLabel = (slug: string, locale: Locale): string =>
  CONFLICTS.find((c) => c.slug === slug)?.label[locale] ?? slug;

// Nav'ın PANO grubunda görünen ama içerik BÖLÜMÜ olmayan sayfalar.
// TOPICS'e eklenmiyor: ingest oraya haber sınıflandırmamalı, /[slug] rotası da
// bunları kategori sanmamalı — yalnız sunum katmanında görünürler.
export const EXTRA_PANELS: Section[] = [
  { slug: "hikayeler", kind: "topic", label: { tr: "Hikayeler", en: "Stories", et: "Lood" } },
  { slug: "savas", kind: "topic", label: { tr: "Savaş", en: "War", et: "Sõda" } },
];

export const ALL_SECTIONS: Section[] = [...TOPICS, ...REGIONS, ...CONTENT_SECTIONS];
export const TOPIC_SLUGS = TOPICS.map((s) => s.slug);
export const REGION_SLUGS = REGIONS.map((s) => s.slug);

export function sectionLabel(slug: string, locale: Locale): string {
  const s = ALL_SECTIONS.find((x) => x.slug === slug);
  return s ? s.label[locale] : slug;
}
export function sectionKind(slug: string): SectionKind | null {
  return ALL_SECTIONS.find((x) => x.slug === slug)?.kind ?? null;
}

// Bazı içerik bölümlerinin kendi sayfası yok; canonical sayfaya yönlendirilir.
// (finans → borsa: next.config'teki 308 redirect + Borsa'daki "Piyasa Haberleri").
// İç linkler doğrudan hedefe işaret etsin ki redirect hop'u olmasın.
const SECTION_PAGE_ALIAS: Record<string, string> = { finans: "borsa" };
export function sectionHref(locale: Locale, slug: string): string {
  return `/${locale}/${SECTION_PAGE_ALIAS[slug] ?? slug}`;
}

// Kurumsal alt menü (slug + i18n anahtarı)
export const FOOTER_LINKS: { slug: string; key: string }[] = [
  { slug: "hakkimizda", key: "about" },
  { slug: "iletisim", key: "contact" },
  { slug: "kunye", key: "imprint" },
  { slug: "gizlilik", key: "privacy" },
  { slug: "cerezler", key: "cookies" },
];
