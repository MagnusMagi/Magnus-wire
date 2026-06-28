import type { Locale } from "./i18n";

export const SITE = { name: "Magnus Wire", domain: "news.magnusmagi.com" } as const;

export type SectionKind = "topic" | "region";
export interface Section {
  slug: string;
  kind: SectionKind;
  label: Record<Locale, string>;
}

export const TOPICS: Section[] = [
  { slug: "gundem", kind: "topic", label: { tr: "Gündem", en: "Headlines", et: "Päevakaja" } },
  { slug: "finans", kind: "topic", label: { tr: "Finans", en: "Finance", et: "Rahandus" } },
  { slug: "yapay-zeka", kind: "topic", label: { tr: "Yapay Zeka", en: "AI", et: "Tehisintellekt" } },
  { slug: "yazilim", kind: "topic", label: { tr: "Yazılım", en: "Software", et: "Tarkvara" } },
  { slug: "donanim", kind: "topic", label: { tr: "Donanım", en: "Hardware", et: "Riistvara" } },
  { slug: "bilim", kind: "topic", label: { tr: "Bilim", en: "Science", et: "Teadus" } },
  { slug: "borsa", kind: "topic", label: { tr: "Borsa", en: "Markets", et: "Börs" } },
  { slug: "hava", kind: "topic", label: { tr: "Hava", en: "Weather", et: "Ilm" } },
  { slug: "kripto", kind: "topic", label: { tr: "Kripto", en: "Crypto", et: "Krüpto" } },
  { slug: "siber", kind: "topic", label: { tr: "Siber", en: "Cyber", et: "Küber" } },
  { slug: "uzay", kind: "topic", label: { tr: "Uzay", en: "Space", et: "Kosmos" } },
];

export const REGIONS: Section[] = [
  { slug: "estonya", kind: "region", label: { tr: "Estonya", en: "Estonia", et: "Eesti" } },
  { slug: "turkiye", kind: "region", label: { tr: "Türkiye", en: "Turkey", et: "Türgi" } },
  { slug: "avrupa", kind: "region", label: { tr: "Avrupa", en: "Europe", et: "Euroopa" } },
  { slug: "abd", kind: "region", label: { tr: "ABD", en: "USA", et: "USA" } },
];

export const ALL_SECTIONS: Section[] = [...TOPICS, ...REGIONS];
export const TOPIC_SLUGS = TOPICS.map((s) => s.slug);
export const REGION_SLUGS = REGIONS.map((s) => s.slug);

export function sectionLabel(slug: string, locale: Locale): string {
  const s = ALL_SECTIONS.find((x) => x.slug === slug);
  return s ? s.label[locale] : slug;
}
export function sectionKind(slug: string): SectionKind | null {
  return ALL_SECTIONS.find((x) => x.slug === slug)?.kind ?? null;
}

// Kurumsal alt menü (slug + i18n anahtarı)
export const FOOTER_LINKS: { slug: string; key: string }[] = [
  { slug: "hakkimizda", key: "about" },
  { slug: "iletisim", key: "contact" },
  { slug: "kunye", key: "imprint" },
  { slug: "gizlilik", key: "privacy" },
  { slug: "cerezler", key: "cookies" },
];
