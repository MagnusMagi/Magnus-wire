"use client";
import { useEffect, useState } from "react";
import { PriceChart, type ChartType } from "./PriceChart";
import { formatPrice, type Quote } from "@/lib/markets";
import { t, type Locale } from "@/lib/i18n";

const RANGES = ["1d", "5d", "1mo", "6mo", "1y"] as const;
const RANGE_LABEL: Record<string, string> = { "1d": "1D", "5d": "5D", "1mo": "1M", "6mo": "6M", "1y": "1Y" };
const TYPES: { k: ChartType; key: string }[] = [
  { k: "area", key: "ctArea" }, { k: "line", key: "ctLine" }, { k: "candle", key: "ctCandle" },
];

type Detail = {
  price: number; prevClose: number | null; open: number | null;
  dayHigh: number | null; dayLow: number | null; currency: string;
  series: { t: number; o: number | null; h: number | null; l: number | null; c: number }[];
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper px-3 py-2.5">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-ink-3">{label}</div>
      <div className="font-mono text-[13px] font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

export function MarketDetailModal({ quote, locale, onClose }: { quote: Quote; locale: Locale; onClose: () => void }) {
  const [range, setRange] = useState<string>("1d");
  const [ctype, setCtype] = useState<ChartType>("area");
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErrored(false);
    fetch(`/api/market?symbol=${encodeURIComponent(quote.symbol)}&range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d?.error || typeof d?.price !== "number") { setErrored(true); setData(null); }
        else setData(d);
        setLoading(false);
      })
      .catch(() => { if (alive) { setErrored(true); setLoading(false); } });
    return () => { alive = false; };
  }, [quote.symbol, range]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const price = data?.price ?? quote.price;
  const prev = data?.prevClose ?? quote.prevClose;
  const chg = price - prev;
  const chgPct = prev ? (chg / prev) * 100 : quote.changePct;
  const up = chg >= 0;
  const currency = data?.currency ?? quote.currency;
  const points = data?.series?.length
    ? data.series
    : quote.spark.map((c) => ({ t: null as number | null, c }));
  const fmt = (v: number | null | undefined) =>
    v == null ? "—" : formatPrice({ ...quote, price: v, currency }, locale);

  const btn = (active: boolean) =>
    `font-mono text-[11px] font-bold px-2.5 py-1 border transition-colors ${
      active ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink"}`;

  return (
    <div role="dialog" aria-modal="true" aria-label={quote.name} onClick={onClose}
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6">
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[640px] bg-paper border-2 border-ink max-h-[92vh] overflow-y-auto wire-printin">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-3">{quote.symbol}</div>
            <h3 className="font-serif text-[24px] font-black tracking-tight leading-tight">{quote.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="font-mono text-[22px] leading-none text-ink-2 hover:text-signal px-1">×</button>
        </div>
        <div className="px-5 py-4 flex items-baseline gap-3 flex-wrap">
          <span className="font-serif text-[34px] font-black tabular-nums leading-none">{fmt(price)}</span>
          <span className={`font-mono text-[13px] font-bold tabular-nums ${up ? "text-wire" : "text-signal"}`}>
            {up ? "▲" : "▼"} {up ? "+" : "−"}{Math.abs(chgPct).toFixed(2)}%
          </span>
        </div>
        <div className="px-5 flex items-center gap-1.5 flex-wrap">
          {RANGES.map((rk) => (
            <button key={rk} type="button" onClick={() => setRange(rk)} className={btn(range === rk)}>
              {RANGE_LABEL[rk]}
            </button>
          ))}
          <span className="ml-auto inline-flex gap-1.5">
            {TYPES.map((ct) => (
              <button key={ct.k} type="button" onClick={() => setCtype(ct.k)} className={btn(ctype === ct.k)}>
                {t(locale, ct.key)}
              </button>
            ))}
          </span>
        </div>
        <div className="px-3 pt-3">
          {loading ? (
            <div className="h-[200px] grid place-items-center font-mono text-xs text-ink-3">{t(locale, "detailLoading")}</div>
          ) : errored && points.length < 2 ? (
            <div className="h-[200px] grid place-items-center font-mono text-xs text-signal">{t(locale, "detailError")}</div>
          ) : (
            <PriceChart points={points} up={up} type={ctype} quote={quote} locale={locale} currency={currency} range={range} />
          )}
        </div>
        <p className="px-5 pt-1 font-mono text-[9.5px] text-ink-3">{t(locale, "chartHint")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-line m-5 border border-line">
          <Stat label={t(locale, "detailOpen")} value={fmt(data?.open)} />
          <Stat label={t(locale, "detailPrevClose")} value={fmt(prev)} />
          <Stat label={t(locale, "detailDayRange")} value={`${fmt(data?.dayLow)} – ${fmt(data?.dayHigh)}`} />
        </div>
        <p className="px-5 pb-5 font-mono text-[10px] text-ink-3">{t(locale, "marketsDisclaimer")}</p>
      </div>
    </div>
  );
}
