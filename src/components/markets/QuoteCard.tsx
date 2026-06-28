import { Sparkline } from "./Sparkline";
import { formatPrice, type Quote } from "@/lib/markets";
import type { Locale } from "@/lib/i18n";

export function QuoteCard({ q, locale }: { q: Quote; locale: Locale }) {
  const up = q.change >= 0;
  const pct = `${up ? "+" : "−"}${Math.abs(q.changePct).toFixed(2)}%`;
  const abs = `${up ? "+" : "−"}${Math.abs(q.change).toLocaleString(
    locale === "tr" ? "tr-TR" : locale === "et" ? "et-EE" : "en-GB",
    { maximumFractionDigits: q.price >= 100 ? 2 : 4 },
  )}`;
  return (
    <div className="group relative border border-line bg-panel/40 hover:bg-panel transition-colors p-3.5 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 pr-6">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-2 truncate">{q.name}</span>
        <span className={`font-mono text-[11px] font-bold tabular-nums ${up ? "text-wire" : "text-signal"}`}>{pct}</span>
      </div>
      <div className="font-serif text-[26px] leading-none font-black tracking-tight tabular-nums">
        {formatPrice(q, locale)}
      </div>
      <div className="-mx-1">
        <Sparkline data={q.spark} up={up} baseline={q.prevClose} />
      </div>
      <div className={`font-mono text-[11px] tabular-nums ${up ? "text-wire" : "text-signal"}`}>
        {up ? "▲" : "▼"} {abs}
      </div>
    </div>
  );
}
