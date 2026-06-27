type Quote = { label: string; value: string; chg?: number };

async function getMarket(): Promise<Quote[]> {
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
  return out;
}

export async function MarketTicker() {
  const quotes = await getMarket();
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
    </div>
  );
}
