// Deprem verisi — anahtarsız iki kaynak:
//   • USGS (dünya geneli)  : earthquake.usgs.gov GeoJSON feed
//   • Kandilli (Türkiye)   : api.orhanaydogdu.com.tr topluluk API'si (Kandilli Rasathanesi)
import type { Locale } from "./i18n";

export type QuakeSource = "kandilli" | "usgs";

export type Quake = {
  id: string;
  mag: number;
  place: string; // ana yer adı (büyük başlık)
  region: string | null; // en yakın şehir / ek bilgi
  depth: number | null; // km
  lat: number;
  lon: number;
  time: number; // epoch ms (UTC)
  source: QuakeSource;
  url: string | null;
};

// Büyüklük bantları — renk + i18n etiket. Yeşil → mor (artan şiddet).
const MAG_BANDS = [
  { max: 3, color: "#7cb342", label: { tr: "Hafif", en: "Minor", et: "Nõrk" } },
  { max: 4, color: "#caa300", label: { tr: "Küçük", en: "Light", et: "Kerge" } },
  { max: 5, color: "#e08a00", label: { tr: "Orta", en: "Moderate", et: "Mõõdukas" } },
  { max: 6, color: "#d2400c", label: { tr: "Kuvvetli", en: "Strong", et: "Tugev" } },
  { max: 7, color: "#a8330a", label: { tr: "Şiddetli", en: "Major", et: "Suur" } },
];
const MAG_EXTREME = { color: "#6b21a8", label: { tr: "Büyük", en: "Great", et: "Hiiglaslik" } };

export function magInfo(mag: number, locale: Locale): { color: string; label: string } {
  const b = MAG_BANDS.find((x) => mag < x.max);
  const hit = b ?? MAG_EXTREME;
  return { color: hit.color, label: hit.label[locale] };
}

// Derinlik kategorisi (sığ depremler genelde daha çok hissedilir)
export function depthLabel(depth: number | null, locale: Locale): string {
  if (depth == null) return "—";
  const L = (tr: string, en: string, et: string) => ({ tr, en, et }[locale]);
  if (depth < 10) return L("çok sığ", "very shallow", "väga madal");
  if (depth < 30) return L("sığ", "shallow", "madal");
  if (depth < 70) return L("orta derinlik", "intermediate", "keskmine");
  return L("derin", "deep", "sügav");
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

// USGS GeoJSON feed → Quake[]
function fromUsgs(json: unknown): Quake[] {
  const feats = (json as { features?: unknown[] })?.features;
  if (!Array.isArray(feats)) return [];
  const out: Quake[] = [];
  for (const f of feats) {
    const ft = f as { id?: string; properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } };
    const p = ft.properties ?? {};
    const coords = ft.geometry?.coordinates ?? [];
    const mag = num(p.mag);
    const lon = num(coords[0]);
    const lat = num(coords[1]);
    if (mag == null || lat == null || lon == null) continue;
    out.push({
      id: ft.id || `usgs-${lat},${lon},${p.time}`,
      mag,
      place: typeof p.place === "string" ? p.place : "—",
      region: null,
      depth: num(coords[2]),
      lat,
      lon,
      time: num(p.time) ?? 0,
      source: "usgs",
      url: typeof p.url === "string" ? p.url : null,
    });
  }
  return out;
}

// Kandilli (orhanaydogdu) → Quake[]
function fromKandilli(json: unknown): Quake[] {
  const res = (json as { result?: unknown[] })?.result;
  if (!Array.isArray(res)) return [];
  const out: Quake[] = [];
  for (const r of res) {
    const q = r as Record<string, unknown>;
    const coords = (q.geojson as { coordinates?: number[] })?.coordinates ?? [];
    const lon = num(coords[0]);
    const lat = num(coords[1]);
    const mag = num(q.mag);
    if (mag == null || lat == null || lon == null) continue;
    const lp = q.location_properties as { epiCenter?: { name?: string }; closestCity?: { name?: string } } | undefined;
    // created_at güvenilir epoch (saniye); yoksa date_time'ı Istanbul yereli kabul et.
    const createdSec = num(q.created_at);
    const time = createdSec != null ? createdSec * 1000 : Date.parse(String(q.date_time ?? "").replace(" ", "T") + "+03:00") || 0;
    out.push({
      id: typeof q.earthquake_id === "string" ? q.earthquake_id : `kandilli-${lat},${lon},${time}`,
      mag,
      place: typeof q.title === "string" ? q.title : lp?.epiCenter?.name ?? "—",
      region: lp?.closestCity?.name ?? lp?.epiCenter?.name ?? null,
      depth: num(q.depth),
      lat,
      lon,
      time,
      source: "kandilli",
      url: null,
    });
  }
  return out;
}

const USGS_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
const KANDILLI_FEED = "https://api.orhanaydogdu.com.tr/deprem/kandilli/live?limit=100";

export async function getQuakes(source: QuakeSource): Promise<{ quakes: Quake[]; asOf: number }> {
  const url = source === "usgs" ? USGS_FEED : KANDILLI_FEED;
  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return { quakes: [], asOf: Date.now() };
    const json = await res.json();
    const quakes = (source === "usgs" ? fromUsgs(json) : fromKandilli(json))
      .sort((a, b) => b.time - a.time);
    return { quakes, asOf: Date.now() };
  } catch {
    return { quakes: [], asOf: Date.now() };
  }
}
