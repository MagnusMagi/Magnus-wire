import { type Quote } from "@/lib/markets";
import { t, type Locale } from "@/lib/i18n";

function Pill({ q, up }: { q: Quote; up: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-bold text-ink">{q.name}</span>
      <span className={up ? "text-wire" : "text-signal"}>
        {up ? "▲" : "▼"}{Math.abs(q.changePct).toFixed(2)}%
      </span>
    </span>
  );
}

export function MoversStrip({ quotes, locale }: { quotes: Quote[]; locale: Locale }) {
  const sorted = [...quotes].sort((a, b) => b.changePct - a.changePct);
  const gainers = sorted.filter((q) => q.changePct > 0).slice(0, 4);
  const losers = sorted.filter((q) => q.changePct < 0).slice(-4).reverse();
  if (!gainers.length && !losers.length) return null;
  return (
    <div className="mb-7 grid sm:grid-cols-2 gap-2.5">
      <div className="border border-line bg-panel/40 px-3.5 py-2.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-wire">{t(locale, "topGainers")}</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 font-mono text-[12px] tabular-nums">
          {gainers.length ? gainers.map((q) => <Pill key={q.symbol} q={q} up />) : <span className="text-ink-3">—</span>}
        </div>
      </div>
      <div className="border border-line bg-panel/40 px-3.5 py-2.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-signal">{t(locale, "topLosers")}</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 font-mono text-[12px] tabular-nums">
          {losers.length ? losers.map((q) => <Pill key={q.symbol} q={q} up={false} />) : <span className="text-ink-3">—</span>}
        </div>
      </div>
    </div>
  );
}
