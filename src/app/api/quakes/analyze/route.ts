import { NextRequest, NextResponse } from "next/server";
import { getQuakes, type Quake, type QuakeSource } from "@/lib/quake";
import { clientIp, rateLimited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const LANG: Record<string, string> = { tr: "Turkish", en: "English", et: "Estonian" };

// Maliyeti sınırlamak için kaynak başına 10 dk bellek içi cache.
type Cached = { at: number; payload: unknown };
const cache = new Map<string, Cached>();
const TTL = 10 * 60 * 1000;

function regionKey(q: Quake): string {
  if (q.region) return q.region;
  // USGS "84 km NNW of Venetie, Alaska" → "Alaska"
  const comma = q.place.lastIndexOf(",");
  return comma >= 0 ? q.place.slice(comma + 1).trim() : q.place;
}

function buildStats(quakes: Quake[]) {
  const now = Date.now();
  const h24 = quakes.filter((q) => now - q.time <= 24 * 3600_000);
  const h3 = quakes.filter((q) => now - q.time <= 3 * 3600_000);
  const strongest = quakes.reduce<Quake | null>((a, b) => (a && a.mag >= b.mag ? a : b), null);
  const depths = quakes.map((q) => q.depth).filter((d): d is number => d != null);
  const avgDepth = depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : null;
  const shallow = depths.filter((d) => d < 10).length;
  const regions = new Map<string, number>();
  for (const q of h24) regions.set(regionKey(q), (regions.get(regionKey(q)) ?? 0) + 1);
  const topRegions = [...regions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, count]) => ({ name, count }));
  const bucket = (lo: number, hi: number) => quakes.filter((q) => q.mag >= lo && q.mag < hi).length;
  return {
    total: quakes.length,
    last24h: h24.length,
    last3h: h3.length,
    strongest: strongest ? { mag: strongest.mag, place: strongest.place, depth: strongest.depth } : null,
    avgDepth: avgDepth != null ? Math.round(avgDepth * 10) / 10 : null,
    shallowCount: shallow,
    mag: { "lt3": bucket(0, 3), "3to4": bucket(3, 4), "4to5": bucket(4, 5), "5plus": quakes.filter((q) => q.mag >= 5).length },
    topRegions,
  };
}

async function analyze(source: QuakeSource, locale: string) {
  const { quakes, asOf } = await getQuakes(source);
  if (quakes.length === 0) return { source, text: null, stats: null, asOf, error: "no-data" };
  const stats = buildStats(quakes);
  const top = quakes.slice(0, 15).map((q) => ({
    mag: q.mag, place: q.place, depthKm: q.depth, minsAgo: Math.round((Date.now() - q.time) / 60000),
  }));
  const sourceName = source === "kandilli" ? "Kandilli Observatory (Turkey region)" : "USGS (global, M2.5+)";
  const lang = LANG[locale] ?? "Turkish";

  const key = process.env.OPENAI_API_KEY;
  if (!key) return { source, text: null, stats, asOf, error: "no-key" };

  const system =
    `You are a seismology data analyst for a news wire. You receive aggregated statistics and a list of recent earthquakes from ${sourceName}. ` +
    `Write a concise, factual interpretation in ${lang}. Cover: (1) overall activity level in the last 24 hours, (2) the most active regions, ` +
    `(3) the most notable/strongest recorded events, (4) any depth or magnitude pattern worth noting. ` +
    `CRITICAL SAFETY RULE: earthquakes cannot be scientifically predicted. Do NOT forecast, predict, or imply when or where a future earthquake may occur, ` +
    `and never alarm the reader. Everything must be framed strictly as interpretation of already-observed past data. ` +
    `130-180 words. Use 2-3 short paragraphs or bullet lines. No markdown headers, no title.`;
  const user = JSON.stringify({ stats, recent: top });

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 420,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!r.ok) return { source, text: null, stats, asOf, error: "upstream" };
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content?.trim() || null;
    return { source, text, stats, asOf, error: text ? null : "empty" };
  } catch {
    return { source, text: null, stats, asOf, error: "fetch-failed" };
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("source");
  const source: QuakeSource = raw === "usgs" ? "usgs" : "kandilli";
  const locale = req.nextUrl.searchParams.get("locale") || "tr";
  const ck = `${source}:${locale}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.payload);
  // Cache miss = OpenAI maliyeti → IP başına dakikada 5 ile sınırla.
  if (rateLimited(`quake-ai:${clientIp(req)}`, 5)) return NextResponse.json({ error: "rate" }, { status: 429 });
  const payload = await analyze(source, locale);
  if (payload.text) cache.set(ck, { at: Date.now(), payload });
  return NextResponse.json(payload);
}
