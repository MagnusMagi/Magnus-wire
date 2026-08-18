import { supabaseServer } from "./supabase";
import { t, type Locale } from "./i18n";

/** CC atfı için gereken alanlar; lisans şartı olduğu için görselle birlikte saklanır. */
export interface HeroCredit {
  creator: string; license: string; licenseUrl?: string;
  sourceUrl?: string; title?: string; provider?: string; query?: string;
}

export interface Dispatch {
  slug: string; kicker: string; section: string; region: string | null;
  /** Bilinen bir çatışmaya ait mi (bkz site.ts CONFLICTS). Çoğu telde null. */
  conflict: string | null;
  heroCredit: HeroCredit | null;
  title: string; summary: string; body: string; keyFacts: string[];
  tags: string[]; hero: string | null; live: boolean; author: string;
  readMinutes: number; publishedAt: string; date: string; time: string;
  sourceUrl: string | null; sourceName: string | null;
  /**
   * Gövde gerçekten istenen dilde mi? Ingest yalnız TR gövdesi üretiyor;
   * EN/ET gövdesi talep üzerine çevrilene kadar TR'ye düşer (bkz lib/translate).
   * Detay sayfası buna bakıp çeviriyi tetikliyor.
   */
  bodyTranslated: boolean;
}

const TZ = "Europe/Istanbul";
const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

interface LocalContent { title?: string; summary?: string; body?: string; keyFacts?: string[]; }
interface Row {
  slug: string; kicker: string; section: string; region: string | null;
  conflict: string | null; hero_credit: HeroCredit | null;
  title: string; summary: string; body: string;
  tags: string[] | null; hero: string | null; live: boolean | null;
  author: string | null; published_at: string;
  source_url: string | null; source_name: string | null;
  content: Record<string, LocalContent> | null;
}

function mapRow(r: Row, locale: Locale): Dispatch {
  const c = r.content?.[locale] ?? r.content?.tr ?? {};
  const title = c.title ?? r.title;
  const summary = c.summary ?? r.summary;
  const body = c.body ?? r.body;
  const keyFacts = (c.keyFacts ?? r.content?.tr?.keyFacts ?? []).filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  // TR her zaman "çevrilmiş" sayılır (kaynak dil). Diğer diller için gövde,
  // ancak o dilin kendi content bloğundan geldiyse çeviridir.
  const bodyTranslated = locale === "tr" || Boolean(r.content?.[locale]?.body);
  const d = new Date(r.published_at);
  const words = (body || "").trim().split(/\s+/).length;
  return {
    slug: r.slug, kicker: r.kicker, section: r.section, region: r.region ?? null,
    conflict: r.conflict ?? null, heroCredit: r.hero_credit ?? null,
    title, summary, body, keyFacts,
    tags: r.tags ?? [], hero: r.hero, live: r.live ?? false, author: r.author ?? "Tel Masası",
    readMinutes: Math.max(1, Math.round(words / 200)),
    publishedAt: r.published_at, date: dateFmt.format(d), time: timeFmt.format(d),
    sourceUrl: r.source_url ?? null, sourceName: r.source_name ?? null,
    bodyTranslated,
  };
}

const COLS = "slug,kicker,section,region,conflict,hero_credit,title,summary,body,tags,hero,live,author,published_at,source_url,source_name,content";

export async function getDispatches(locale: Locale, limit = 60): Promise<Dispatch[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("dispatches").select(COLS).order("published_at", { ascending: false }).limit(limit);
  if (error) { console.error("getDispatches:", error.message); return []; }
  return (data as Row[]).map((r) => mapRow(r, locale));
}

export async function getDispatch(locale: Locale, slug: string): Promise<Dispatch | undefined> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("dispatches").select(COLS).eq("slug", slug).maybeSingle();
  if (error || !data) return undefined;
  return mapRow(data as Row, locale);
}

export async function dispatchesBySection(locale: Locale, section: string): Promise<Dispatch[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("dispatches").select(COLS).eq("section", section).order("published_at", { ascending: false }).limit(60);
  if (error || !data) return [];
  return (data as Row[]).map((r) => mapRow(r, locale));
}

export async function dispatchesByRegion(locale: Locale, region: string): Promise<Dispatch[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("dispatches").select(COLS).eq("region", region).order("published_at", { ascending: false }).limit(60);
  if (error || !data) return [];
  return (data as Row[]).map((r) => mapRow(r, locale));
}

export async function dispatchesByConflict(locale: Locale, conflict: string, limit = 60): Promise<Dispatch[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("dispatches").select(COLS).eq("conflict", conflict).order("published_at", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return (data as Row[]).map((r) => mapRow(r, locale));
}

/**
 * Savaş hub'ı için: her çatışmanın tel sayısı + en yeni teli.
 * Tek sorgu — cephe başına ayrı sorgu atmak N+1 olurdu ve toplam tel sayısı
 * (bugün ~250) tek seferde rahatça okunuyor.
 */
export async function conflictSummary(locale: Locale): Promise<Record<string, { count: number; latest: Dispatch | null }>> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("dispatches").select(COLS)
    .not("conflict", "is", null).order("published_at", { ascending: false }).limit(400);
  if (error || !data) return {};
  const out: Record<string, { count: number; latest: Dispatch | null }> = {};
  for (const r of data as Row[]) {
    const k = r.conflict as string;
    if (!out[k]) out[k] = { count: 0, latest: mapRow(r, locale) };  // sıralı geldiği için ilki en yenisi
    out[k].count++;
  }
  return out;
}

export function agoLabel(d: Dispatch, anchorTs: number, locale: Locale): string {
  const diffMin = Math.round((anchorTs - Date.parse(d.publishedAt)) / 60000);
  if (diffMin <= 0) return t(locale, "agoNow");
  if (diffMin < 60) return `${diffMin} ${t(locale, "agoMin")}`;
  return `${Math.round(diffMin / 60)} ${t(locale, "agoHour")}`;
}

export function latestTs(list: Dispatch[]): number {
  return list.length ? Date.parse(list[0].publishedAt) : 0;
}

export async function searchDispatches(locale: Locale, opts: { q?: string; tag?: string }): Promise<Dispatch[]> {
  const sb = supabaseServer();
  let query = sb.from("dispatches").select(COLS).order("published_at", { ascending: false }).limit(60);
  const tag = (opts.tag || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const q = (opts.q || "").slice(0, 60).replace(/[(),%*:\\"]/g, " ").trim();
  if (tag) query = query.contains("tags", [tag]);
  // Değerleri çift tırnağa alıyoruz; q'dan virgül/parantez/tırnak vb. zaten temizlendi (PostgREST filtre enjeksiyon koruması).
  else if (q) query = query.or(`title.ilike."%${q}%",summary.ilike."%${q}%",body.ilike."%${q}%"`);
  else return [];
  const { data, error } = await query;
  if (error) { console.error("searchDispatches:", error.message); return []; }
  return (data as Row[]).map((r) => mapRow(r, locale));
}

export async function getMostRead(locale: Locale, limit = 5): Promise<Dispatch[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("dispatches").select(COLS).order("views", { ascending: false }).order("published_at", { ascending: false }).limit(limit);
  if (error || !data) { if (error) console.error("getMostRead:", error.message); return []; }
  return (data as Row[]).map((r) => mapRow(r, locale));
}

export async function getTrendingTags(limit = 60): Promise<{ tag: string; count: number }[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("dispatches").select("tags").limit(500);
  if (error || !data) return [];
  const counts = new Map<string, number>();
  for (const r of data as { tags: string[] | null }[]) for (const tg of r.tags || []) counts.set(tg, (counts.get(tg) || 0) + 1);
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function dispatchesBySourceHost(locale: Locale, host: string, limit = 60): Promise<Dispatch[]> {
  const sb = supabaseServer();
  const clean = host.toLowerCase().replace(/[^a-z0-9.-]/g, "");
  if (!clean) return [];
  const { data, error } = await sb.from("dispatches").select(COLS).ilike("source_url", `%${clean}%`).order("published_at", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return (data as Row[]).map((r) => mapRow(r, locale));
}
