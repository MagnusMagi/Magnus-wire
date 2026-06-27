import type { MetadataRoute } from "next";
import { allPages } from "content-collections";
import { getDispatches } from "@/lib/dispatches";
import { TOPIC_SLUGS, REGION_SLUGS } from "@/lib/site";
import { LOCALES } from "@/lib/i18n";

const BASE = "https://news.magnusmagi.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dispatches = await getDispatches("tr");
  const out: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    out.push({ url: `${BASE}/${locale}`, changeFrequency: "hourly", priority: 1 });
    for (const s of [...TOPIC_SLUGS, ...REGION_SLUGS]) {
      out.push({ url: `${BASE}/${locale}/${s}`, changeFrequency: "hourly", priority: 0.7 });
    }
    for (const d of dispatches) {
      out.push({ url: `${BASE}/${locale}/dispatch/${d.slug}`, lastModified: new Date(d.publishedAt), changeFrequency: "daily", priority: 0.8 });
    }
    for (const p of allPages) {
      out.push({ url: `${BASE}/${locale}/${p.slug}`, changeFrequency: "monthly", priority: 0.3 });
    }
  }
  return out;
}
