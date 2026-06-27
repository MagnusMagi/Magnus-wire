import { LOCALES } from "./i18n";

export const SITE_URL = "https://news.magnusmagi.com";

// Çok dilli SEO: aynı yolun TR/EN/ET sürümleri + x-default (tr).
export function altLanguages(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const lc of LOCALES) languages[lc] = `${SITE_URL}/${lc}${path}`;
  languages["x-default"] = `${SITE_URL}/tr${path}`;
  return languages;
}
