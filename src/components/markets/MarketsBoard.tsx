import { getMarketGroups } from "@/lib/markets";
import { MarketsGrid } from "./MarketsGrid";
import { MoversStrip } from "./MoversStrip";
import { WatchlistSection } from "./WatchlistSection";
import { t, type Locale } from "@/lib/i18n";

const GROUP_KEY: Record<string, string> = {
  indices: "grpIndices", fx: "grpFx", commodities: "grpCommodities", crypto: "grpCrypto",
};

function formatAsOf(asOf: Date, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : locale === "et" ? "et-EE" : "en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Istanbul", timeZoneName: "short",
    }).format(asOf);
  } catch {
    return asOf.toISOString().slice(11, 16) + " UTC";
  }
}

export async function MarketsBoard({ locale }: { locale: Locale }) {
  const { groups, asOf } = await getMarketGroups();
  if (!groups.length) {
    return (
      <p className="font-mono text-[12.5px] text-ink-2 border border-line bg-panel/40 px-4 py-3 mb-8">
        {t(locale, "marketsUnavailable")}
      </p>
    );
  }
  const allQuotes = groups.flatMap((g) => g.quotes);
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2 mb-5">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-wire">
          <span className="w-[6px] h-[6px] rounded-full bg-wire wire-pulse" />
          {t(locale, "marketsLive")}
        </span>
        <time dateTime={asOf.toISOString()} className="font-mono text-[10px] uppercase tracking-widest text-ink-3 tabular-nums">
          {t(locale, "updated")} {formatAsOf(asOf, locale)}
        </time>
      </div>

      <WatchlistSection quotes={allQuotes} locale={locale} />
      <MoversStrip quotes={allQuotes} locale={locale} />

      {groups.map((g) => (
        <div key={g.key} className="mb-7">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-2 mb-2.5">
            {t(locale, GROUP_KEY[g.key] ?? g.key)}
          </h3>
          <MarketsGrid quotes={g.quotes} locale={locale} />
        </div>
      ))}

      <p className="font-mono text-[10.5px] text-ink-3 mt-1">{t(locale, "marketsDisclaimer")}</p>
    </section>
  );
}
