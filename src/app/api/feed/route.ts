import { dispatchesBySection, dispatchesByRegion, type Dispatch } from "@/lib/dispatches";
import { TOPIC_SLUGS, REGION_SLUGS } from "@/lib/site";
import { isLocale, type Locale } from "@/lib/i18n";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const locale = (isLocale(sp.get("locale") || "") ? sp.get("locale")! : "tr") as Locale;
  const raw = (sp.get("sections") || "").split(",").map((s) => s.trim().replace(/[^a-z-]/g, "")).filter(Boolean).slice(0, 14);
  const sections = [...new Set(raw)].filter((s) => TOPIC_SLUGS.includes(s) || REGION_SLUGS.includes(s));
  if (!sections.length) return Response.json({ items: [] });

  const lists = await Promise.all(
    sections.map((s) => (TOPIC_SLUGS.includes(s) ? dispatchesBySection(locale, s) : dispatchesByRegion(locale, s))),
  );
  const seen = new Set<string>();
  const merged: Dispatch[] = [];
  for (const list of lists) for (const d of list) { if (!seen.has(d.slug)) { seen.add(d.slug); merged.push(d); } }
  merged.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const items = merged.slice(0, 40).map((d) => ({
    slug: d.slug, title: d.title, summary: d.summary?.slice(0, 200) || "",
    time: d.time, section: d.section, sourceUrl: d.sourceUrl, sourceName: d.sourceName,
  }));
  return Response.json({ items });
}
