// Borsa panosu — Yahoo Finance v8 chart uç noktasından anahtarsız piyasa verisi.
// Her sembol bağımsız çekilir; hata olursa o kart sessizce düşer (null → filtrelenir).
import type { Locale } from "./i18n";

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number; // mutlak
  changePct: number; // %
  currency: string;
  spark: number[]; // gün içi kapanışlar (≤24 nokta)
};

export type MarketGroup = { key: string; quotes: Quote[] };

const YF = "https://query1.finance.yahoo.com/v8/finance/chart/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

type SymbolDef = { s: string; label: string };

// Pano grupları. label = Yahoo'nun çirkin ad'ı yerine bizim gösterim adımız.
export const GROUPS: { key: string; symbols: SymbolDef[] }[] = [
  {
    key: "indices",
    symbols: [
      { s: "XU100.IS", label: "BIST 100" },
      { s: "^GSPC", label: "S&P 500" },
      { s: "^IXIC", label: "Nasdaq" },
      { s: "^DJI", label: "Dow Jones" },
      { s: "^GDAXI", label: "DAX" },
      { s: "^FTSE", label: "FTSE 100" },
    ],
  },
  {
    key: "fx",
    symbols: [
      { s: "USDTRY=X", label: "USD/TRY" },
      { s: "EURTRY=X", label: "EUR/TRY" },
      { s: "EURUSD=X", label: "EUR/USD" },
      { s: "GBPUSD=X", label: "GBP/USD" },
    ],
  },
  {
    key: "commodities",
    symbols: [
      { s: "GC=F", label: "Altın (ons)" },
      { s: "SI=F", label: "Gümüş (ons)" },
      { s: "BZ=F", label: "Brent" },
      { s: "CL=F", label: "WTI" },
    ],
  },
  {
    key: "crypto",
    symbols: [
      { s: "BTC-USD", label: "Bitcoin" },
      { s: "ETH-USD", label: "Ethereum" },
      { s: "SOL-USD", label: "Solana" },
    ],
  },
];

function downsample(arr: number[], target: number): number[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

async function fetchQuote(def: SymbolDef): Promise<Quote | null> {
  try {
    const url = `${YF}${encodeURIComponent(def.s)}?range=1d&interval=15m`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 300 } });
    if (!res.ok) return null;
    const j = await res.json();
    const r = j?.chart?.result?.[0];
    const m = r?.meta;
    const price = m?.regularMarketPrice;
    if (typeof price !== "number") return null;
    const prev = typeof m.chartPreviousClose === "number" ? m.chartPreviousClose
      : typeof m.previousClose === "number" ? m.previousClose : price;
    const rawCloses: number[] = (r?.indicators?.quote?.[0]?.close ?? []).filter(
      (x: unknown): x is number => typeof x === "number",
    );
    const spark = downsample([prev, ...rawCloses, price], 24);
    return {
      symbol: def.s,
      name: def.label,
      price,
      prevClose: prev,
      change: price - prev,
      changePct: prev ? ((price - prev) / prev) * 100 : 0,
      currency: m.currency || "USD",
      spark,
    };
  } catch {
    return null;
  }
}

// Tüm grupları ve sembolleri paralel çek.
export async function getMarketGroups(): Promise<{ groups: MarketGroup[]; asOf: Date }> {
  const groups = await Promise.all(
    GROUPS.map(async (g) => {
      const quotes = (await Promise.all(g.symbols.map(fetchQuote))).filter(
        (q): q is Quote => q !== null,
      );
      return { key: g.key, quotes };
    }),
  );
  return { groups: groups.filter((g) => g.quotes.length > 0), asOf: new Date() };
}

// Para birimine göre fiyat biçimi.
export function formatPrice(q: Quote, locale: Locale): string {
  const tag = locale === "tr" ? "tr-TR" : locale === "et" ? "et-EE" : "en-GB";
  const big = q.price >= 1000;
  const digits = q.price >= 100 ? 2 : q.price >= 1 ? 2 : 4;
  const n = new Intl.NumberFormat(tag, {
    minimumFractionDigits: big ? 0 : digits,
    maximumFractionDigits: big ? 0 : digits,
  }).format(q.price);
  const sym = q.currency === "USD" ? "$" : q.currency === "EUR" ? "€" : q.currency === "TRY" ? "₺" : "";
  // FX paritelerinde para birimi sembolü ekleme (zaten "EUR/USD" gibi).
  const isPair = q.symbol.includes("=X");
  return isPair ? n : sym ? `${sym}${n}` : `${n} ${q.currency}`;
}
