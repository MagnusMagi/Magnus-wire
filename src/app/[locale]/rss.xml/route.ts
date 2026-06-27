import { getDispatches } from "@/lib/dispatches";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 3600;
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const BASE = "https://news.magnusmagi.com";
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const items = await getDispatches(locale, 40);
  const body = items
    .map(
      (d) => `    <item>
      <title>${esc(d.title)}</title>
      <link>${BASE}/${locale}/dispatch/${d.slug}</link>
      <guid isPermaLink="true">${BASE}/${locale}/dispatch/${d.slug}</guid>
      <pubDate>${new Date(d.publishedAt).toUTCString()}</pubDate>
      <description>${esc(d.summary)}</description>
    </item>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Magnus Wire (${locale.toUpperCase()})</title>
    <link>${BASE}/${locale}</link>
    <description>Otomatik, kişisel teknoloji tel servisi — RSS + yapay zekâ.</description>
    <language>${locale}</language>
${body}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
