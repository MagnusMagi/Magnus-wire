"use client";
import { useState } from "react";
import { QuoteCard } from "./QuoteCard";
import { MarketDetailModal } from "./MarketDetailModal";
import type { Quote } from "@/lib/markets";
import type { Locale } from "@/lib/i18n";

export function MarketsGrid({ quotes, locale }: { quotes: Quote[]; locale: Locale }) {
  const [sel, setSel] = useState<Quote | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {quotes.map((q) => (
          <button key={q.symbol} type="button" onClick={() => setSel(q)}
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-1">
            <QuoteCard q={q} locale={locale} />
          </button>
        ))}
      </div>
      {sel && <MarketDetailModal quote={sel} locale={locale} onClose={() => setSel(null)} />}
    </>
  );
}
