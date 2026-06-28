import { getDispatches } from "@/lib/dispatches";
import { LOCALES } from "@/lib/i18n";

export const revalidate = 1800;
const BASE = "https://news.magnusmagi.com";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const cutoff = Date.now() - 48 * 3600 * 1000;
  const lists = await Promise.all(LOCALES.map((lc) => getDispatches(lc, 100)));
  const urls = LOCALES.flatMap((lc, i) =>
    lists[i]
      .filter((d) => Date.parse(d.publishedAt) >= cutoff)
      .map((d) => `  <url>
    <loc>${BASE}/${lc}/dispatch/${d.slug}</loc>
    <news:news>
      <news:publication><news:name>MagiWire</news:name><news:language>${lc}</news:language></news:publication>
      <news:publication_date>${new Date(d.publishedAt).toISOString()}</news:publication_date>
      <news:title>${esc(d.title)}</news:title>
    </news:news>
  </url>`),
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
