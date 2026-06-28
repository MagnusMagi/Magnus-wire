"use client";
import { useEffect, useMemo, useState } from "react";
import { magInfo, depthLabel, type Quake, type QuakeSource } from "@/lib/quake";
import { QuakeDetailModal } from "./QuakeDetailModal";
import { t, type Locale } from "@/lib/i18n";

type Bucket = { quakes: Quake[]; asOf: number };
type Initial = Record<QuakeSource, Bucket>;

const SOURCES: { id: QuakeSource; key: string }[] = [
  { id: "kandilli", key: "quakeSrcTr" },
  { id: "usgs", key: "quakeSrcWorld" },
];
const FILTERS = [0, 4, 5] as const;

function localeTag(l: Locale): string {
  return l === "tr" ? "tr-TR" : l === "et" ? "et-EE" : "en-GB";
}
function clock(ms: number, l: Locale): string {
  try {
    return new Intl.DateTimeFormat(localeTag(l), {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Istanbul",
    }).format(new Date(ms));
  } catch {
    return "—";
  }
}
function timeAgo(ms: number, l: Locale): string {
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60000);
  if (m < 1) return t(l, "agoNow");
  if (m < 60) return `${m} ${t(l, "agoMin")}`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${t(l, "agoHour")}`;
  return `${Math.round(h / 24)} ${t(l, "agoDay")}`;
}

function MagSquare({ mag, locale, size = "md" }: { mag: number; locale: Locale; size?: "md" | "lg" }) {
  const { color } = magInfo(mag, locale);
  const cls = size === "lg" ? "w-[68px] h-[68px] text-[30px]" : "w-[46px] h-[46px] text-[19px]";
  return (
    <span className={`flex-none grid place-items-center font-serif font-black tabular-nums text-paper ${cls}`}
      style={{ background: color }}>
      {mag.toFixed(1)}
    </span>
  );
}

export function QuakeFeed({ initial, locale }: { initial: Initial; locale: Locale }) {
  const [source, setSource] = useState<QuakeSource>("kandilli");
  const [data, setData] = useState<Initial>(initial);
  const [minMag, setMinMag] = useState<number>(0);
  const [sel, setSel] = useState<Quake | null>(null);

  // Aktif kaynağı 60 sn'de bir tazele.
  useEffect(() => {
    let alive = true;
    const pull = () => {
      fetch(`/api/quakes?source=${source}`)
        .then((r) => r.json())
        .then((j) => {
          if (!alive || !Array.isArray(j?.quakes)) return;
          setData((prev) => ({ ...prev, [source]: { quakes: j.quakes, asOf: j.asOf } }));
        })
        .catch(() => {});
    };
    const id = setInterval(pull, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [source]);

  const bucket = data[source];
  const list = useMemo(
    () => bucket.quakes.filter((q) => q.mag >= minMag),
    [bucket.quakes, minMag],
  );
  const strongest = useMemo(
    () => list.reduce<Quake | null>((a, b) => (a && a.mag >= b.mag ? a : b), null),
    [list],
  );

  return (
    <>
      {strongest && <QuakeHero q={strongest} locale={locale} onOpen={() => setSel(strongest)} />}

      {/* Kontroller: kaynak + büyüklük filtresi + güncelleme */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2 mb-4">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-wire">
          <span className="w-[6px] h-[6px] rounded-full bg-wire wire-pulse" />
          {t(locale, "quakeRecent")}
        </span>
        <time className="font-mono text-[10px] uppercase tracking-widest text-ink-3 tabular-nums">
          {t(locale, "updated")} {clock(bucket.asOf, locale)}
        </time>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex border border-ink">
          {SOURCES.map((s) => (
            <button key={s.id} type="button" onClick={() => setSource(s.id)}
              className={`font-mono text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 transition-colors ${
                source === s.id ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"
              }`}>{t(locale, s.key)}</button>
          ))}
        </div>
        <div className="inline-flex border border-line ml-auto">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setMinMag(f)}
              className={`font-mono text-[11px] font-bold tabular-nums px-3 py-1.5 transition-colors ${
                minMag === f ? "bg-wire text-paper" : "text-ink-2 hover:text-ink"
              }`}>{f === 0 ? t(locale, "quakeAll") : `M${f}+`}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="font-mono text-[12.5px] text-ink-2 border border-line bg-panel/40 px-4 py-3">
          {t(locale, "quakeUnavailable")}
        </p>
      ) : (
        <div className="divide-y divide-line border border-line">
          {list.map((q) => {
            const { label, color } = magInfo(q.mag, locale);
            return (
              <button key={q.id} type="button" onClick={() => setSel(q)}
                className="w-full text-left grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 hover:bg-panel/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-inset">
                <MagSquare mag={q.mag} locale={locale} />
                <span className="min-w-0">
                  <span className="block font-serif text-[15px] font-bold leading-tight truncate">{q.place}</span>
                  <span className="block font-mono text-[10.5px] text-ink-3 tabular-nums truncate">
                    <span style={{ color }} className="font-bold uppercase">{label}</span>
                    {q.depth != null && <> · {q.depth.toFixed(0)} km · {depthLabel(q.depth, locale)}</>}
                    {q.region && <> · {q.region}</>}
                  </span>
                </span>
                <span className="text-right whitespace-nowrap font-mono text-[10.5px] text-ink-2 tabular-nums">
                  <span className="block">{clock(q.time, locale)}</span>
                  <span className="block text-ink-3">{timeAgo(q.time, locale)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="font-mono text-[10px] text-ink-3 mt-3">{t(locale, "quakeSource")}</p>

      {sel && <QuakeDetailModal q={sel} locale={locale} onClose={() => setSel(null)} />}
    </>
  );
}

function QuakeHero({ q, locale, onOpen }: { q: Quake; locale: Locale; onOpen: () => void }) {
  const { label, color } = magInfo(q.mag, locale);
  const d = 1.2;
  const bbox = `${q.lon - d},${q.lat - d / 2},${q.lon + d},${q.lat + d / 2}`;
  const map = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${q.lat},${q.lon}`;
  return (
    <div className="mb-9 border-2 border-ink bg-panel/40">
      <div className="grid lg:grid-cols-[1fr_1fr]">
        <div className="p-5 sm:p-6 flex flex-col gap-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-signal inline-flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-signal wire-pulse" />{t(locale, "quakeStrongest")}
          </span>
          <div className="flex items-center gap-4">
            <MagSquare mag={q.mag} locale={locale} size="lg" />
            <div className="min-w-0">
              <span className="block font-serif text-[26px] font-black leading-none tracking-tight truncate">{q.place}</span>
              <span className="block font-mono text-[12px] font-bold uppercase tracking-wide mt-1" style={{ color }}>{label}</span>
            </div>
          </div>
          <div className="font-mono text-[12.5px] text-ink-2 tabular-nums">
            {q.depth != null && <>{t(locale, "quakeDepth")}: <span className="text-ink font-bold">{q.depth.toFixed(1)} km</span> · {depthLabel(q.depth, locale)}<br /></>}
            {clock(q.time, locale)} · {timeAgo(q.time, locale)}
            {q.region && <> · {q.region}</>}
          </div>
          <button type="button" onClick={onOpen}
            className="self-start font-mono text-[11px] font-bold uppercase tracking-wide border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors">
            {t(locale, "quakeDetails")} →
          </button>
        </div>
        <div className="relative border-t-2 lg:border-t-0 lg:border-l-2 border-ink min-h-[240px]">
          <span className="absolute top-2 left-2 z-10 font-mono text-[10px] font-bold uppercase tracking-widest text-paper bg-ink/80 px-2 py-1">{t(locale, "quakeMap")}</span>
          <iframe title={t(locale, "quakeMap")} loading="lazy" src={map} className="w-full h-full min-h-[240px] block" />
        </div>
      </div>
    </div>
  );
}
