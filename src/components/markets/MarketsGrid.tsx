"use client";
import { useState } from "react";
import { QuoteCard } from "./QuoteCard";
import { MarketDetailModal } from "./MarketDetailModal";
import { useWatchlist } from "./useWatchlist";
import type { Quote } from "@/lib/markets";
import type { Locale } from "@/lib/i18n";

function StarButton({ symbol }: { symbol: string }) {
  const { has, toggle } = useWatchlist();
  const on = has(symbol);
  return (
    <button
      type="button"
      onClick={() => toggle(symbol)}
      aria-label={on ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={on}
      className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 grid place-items-center text-[15px] leading-none transition-colors ${
        on ? "text-signal" : "text-ink-3 hover:text-ink"}`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}

export function MarketsGrid({ quotes, locale }: { quotes: Quote[]; locale: Locale }) {
  const [sel, setSel] = useState<Quote | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {quotes.map((q) => (
          <div key={q.symbol} className="relative">
            <button
              type="button"
              onClick={() => setSel(q)}
              className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-1"
            >
              <QuoteCard q={q} locale={locale} />
            </button>
            <StarButton symbol={q.symbol} />
          </div>
        ))}
      </div>
      {sel && <MarketDetailModal quote={sel} locale={locale} onClose={() => setSel(null)} />}
    </>
  );
}
