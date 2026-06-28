import { t, type Locale } from "@/lib/i18n";

type Quote = { label: string; value: string; chg?: number };

async function getMarket(): Promise<{ quotes: Quote[]; asOf: Date }> {
  const out: Quote[] = [];
  try {
    const fx = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 300 } }).then((r) => r.json());
    const usdtry = fx?.rates?.TRY, eur = fx?.rates?.EUR;
    if (usdtry) out.push({ label: "USD/TRY", value: usdtry.toFixed(2) });
    if (usdtry && eur) out.push({ label: "EUR/TRY", value: (usdtry / eur).toFixed(2) });
  } catch {}
  try {
    const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true", { next: { revalidate: 300 } }).then((r) => r.json());
    if (cg?.bitcoin) out.push({ label: "BTC", value: "$" + Math.round(cg.bitcoin.usd).toLocaleString("en-US"), chg: cg.bitcoin.usd_24h_change });
    if (cg?.ethereum) out.push({ label: "ETH", value: "$" + Math.round(cg.ethereum.usd).toLocaleString("en-US"), chg: cg.ethereum.usd_24h_change });
  } catch {}
  // asOf = bu render anındaki (ISR ile ≤5 dk taze) veri çekim zamanı.
  return { quotes: out, asOf: new Date() };
}

const LOCALE_TAG: Record<Locale, string> = { tr: "tr-TR", en: "en-GB", et: "et-EE" };

function formatAsOf(asOf: Date, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Europe/Istanbul", timeZoneName: "short",
    }).format(asOf);
  } catch {
    return asOf.toISOString().slice(11, 16) + " UTC";
  }
}

export async function MarketTicker({ locale = "tr" }: { locale?: Locale }) {
  const { quotes, asOf } = await getMarket();
  if (!quotes.length) return null;
  return (
    <div className="border border-line bg-ink text-paper px-4 py-2.5 mb-6 flex flex-wrap items-center gap-x-6 gap-y-1.5 font-mono text-[12.5px]">
      <span className="inline-flex items-center gap-1.5 text-signal font-bold uppercase tracking-widest text-[10px]"><span className="w-[6px] h-[6px] rounded-full bg-signal wire-pulse" />Piyasa</span>
      {quotes.map((q) => (
        <span key={q.label} className="flex items-center gap-1.5">
          <span className="text-[#9b978c]">{q.label}</span>
          <span className="font-bold tabular-nums">{q.value}</span>
          {typeof q.chg === "number" && (
            <span className={q.chg >= 0 ? "text-[#5cba98]" : "text-signal"}>{q.chg >= 0 ? "▲" : "▼"}{Math.abs(q.chg).toFixed(1)}%</span>
          )}
        </span>
      ))}
      <time dateTime={asOf.toISOString()} className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#7c7869] tabular-nums">
        <span className="w-[5px] h-[5px] rounded-full bg-[#5cba98] wire-pulse" />
        {t(locale, "updated")} {formatAsOf(asOf, locale)}
      </time>
    </div>
  );
}
