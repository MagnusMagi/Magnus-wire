"use client";
import { MarketsGrid } from "./MarketsGrid";
import { useWatchlist } from "./useWatchlist";
import { t, type Locale } from "@/lib/i18n";
import type { Quote } from "@/lib/markets";

export function WatchlistSection({ quotes, locale }: { quotes: Quote[]; locale: Locale }) {
  const { ids } = useWatchlist();
  const watched = quotes.filter((q) => ids.includes(q.symbol));
  return (
    <div className="mb-8">
      <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal mb-2.5">
        ★ {t(locale, "watchlistTitle")}
      </h3>
      {watched.length ? (
        <MarketsGrid quotes={watched} locale={locale} />
      ) : (
        <p className="font-mono text-[11.5px] text-ink-3 border border-line border-dashed px-3.5 py-3">
          {t(locale, "watchlistEmpty")}
        </p>
      )}
    </div>
  );
}
