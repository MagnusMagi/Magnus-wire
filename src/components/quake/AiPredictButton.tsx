"use client";
import { useCallback, useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import type { QuakeSource } from "@/lib/quake";

type Stats = {
  last24h: number;
  last3h: number;
  strongest: { mag: number; place: string } | null;
  topRegions: { name: string; count: number }[];
} | null;
type Result = { text: string | null; stats: Stats; error: string | null };
type Entry = Result | "loading" | undefined;

const TABS: { id: QuakeSource; label: string }[] = [
  { id: "kandilli", label: "🇹🇷" },
  { id: "usgs", label: "🌍" },
];

export function AiPredictButton({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<QuakeSource>("kandilli");
  const [data, setData] = useState<Record<QuakeSource, Entry>>({ kandilli: undefined, usgs: undefined });

  const load = useCallback((source: QuakeSource, force = false) => {
    setData((prev) => {
      if (!force && prev[source] !== undefined) return prev;
      return { ...prev, [source]: "loading" };
    });
    fetch(`/api/quakes/analyze?source=${source}&locale=${locale}`)
      .then((r) => r.json())
      .then((j) => setData((prev) => ({ ...prev, [source]: { text: j?.text ?? null, stats: j?.stats ?? null, error: j?.error ?? null } })))
      .catch(() => setData((prev) => ({ ...prev, [source]: { text: null, stats: null, error: "fetch-failed" } })));
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    load(active);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, active, load]);

  const entry = data[active];
  const srcLabel = active === "kandilli" ? t(locale, "quakeSrcTr") : t(locale, "quakeSrcWorld");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="font-mono text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 border border-signal text-signal hover:bg-signal hover:text-paper transition-colors inline-flex items-center gap-1.5">
        <span aria-hidden>✨</span> {t(locale, "aiPredict")}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={t(locale, "aiPredictTitle")} onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6">
          <div onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[620px] bg-paper border-2 border-ink max-h-[92vh] overflow-y-auto wire-printin">
            {/* Başlık */}
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b-2 border-ink">
              <div>
                <h3 className="font-serif text-[22px] font-black tracking-tight leading-tight inline-flex items-center gap-2">
                  <span aria-hidden>✨</span> {t(locale, "aiPredictTitle")}
                </h3>
                <p className="font-mono text-[11px] text-ink-2 mt-1">{t(locale, "aiPredictSub")}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                className="font-mono text-[22px] leading-none text-ink-2 hover:text-signal px-1">×</button>
            </div>

            {/* Sekmeler */}
            <div className="flex items-center gap-2 px-5 pt-4">
              {TABS.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActive(tab.id)}
                  className={`font-mono text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 border transition-colors ${
                    active === tab.id ? "bg-ink text-paper border-ink" : "border-line text-ink-2 hover:text-ink hover:border-ink"
                  }`}>
                  <span aria-hidden className="mr-1">{tab.label}</span>
                  {t(locale, tab.id === "kandilli" ? "quakeSrcTr" : "quakeSrcWorld")}
                </button>
              ))}
              <button type="button" onClick={() => load(active, true)} disabled={entry === "loading"}
                aria-label={t(locale, "aiRefresh")}
                className="ml-auto font-mono text-[11px] font-bold text-wire hover:text-ink disabled:text-ink-3 transition-colors">↻</button>
            </div>

            {/* İçerik */}
            <div className="px-5 py-4">
              {entry === "loading" || entry === undefined ? (
                <div className="py-10 grid place-items-center gap-2">
                  <span className="w-5 h-5 border-2 border-line border-t-signal rounded-full animate-spin" aria-hidden />
                  <span className="font-mono text-[12px] text-ink-3">{t(locale, "aiLoading")}</span>
                </div>
              ) : entry.text ? (
                <>
                  {entry.stats && <StatStrip stats={entry.stats} locale={locale} />}
                  <p className="font-mono text-[13px] leading-relaxed text-ink whitespace-pre-wrap mt-3">{entry.text}</p>
                </>
              ) : (
                <p className="font-mono text-[12.5px] text-signal py-8 text-center">{t(locale, "aiError")}</p>
              )}
            </div>

            {/* Uyarı */}
            <div className="px-5 pb-5">
              <p className="font-mono text-[10px] leading-relaxed text-ink-3 border-t border-line pt-3">
                ⚠️ {t(locale, "aiDisclaimer")}<br />
                {t(locale, "quakeSource")} · {srcLabel}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatStrip({ stats, locale }: { stats: NonNullable<Stats>; locale: Locale }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip label={t(locale, "aiStat24h")} value={String(stats.last24h)} />
      {stats.strongest && <Chip label={t(locale, "quakeStrongest")} value={`M${stats.strongest.mag.toFixed(1)}`} />}
      {stats.topRegions.slice(0, 3).map((r) => (
        <Chip key={r.name} label={r.name} value={`×${r.count}`} />
      ))}
    </div>
  );
}
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 border border-line bg-panel/40 px-2 py-1 font-mono text-[10px] tabular-nums">
      <span className="text-ink-3 uppercase tracking-wide">{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </span>
  );
}
