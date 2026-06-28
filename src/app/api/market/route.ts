import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const RANGE_INTERVAL: Record<string, string> = {
  "1d": "5m", "5d": "30m", "1mo": "1d", "6mo": "1d", "1y": "1wk",
};

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "").trim();
  const range = req.nextUrl.searchParams.get("range") || "1mo";
  const interval = RANGE_INTERVAL[range];
  if (!symbol || symbol.length > 16 || !/^[\^A-Za-z0-9.=-]+$/.test(symbol) || !interval) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 120 } });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    const j = await res.json();
    const r = j?.chart?.result?.[0];
    const m = r?.meta;
    if (typeof m?.regularMarketPrice !== "number") return NextResponse.json({ error: "no data" }, { status: 404 });
    const ts: number[] = r.timestamp || [];
    const q = r.indicators?.quote?.[0] || {};
    const o: (number | null)[] = q.open || [], hi: (number | null)[] = q.high || [],
      lo: (number | null)[] = q.low || [], cl: (number | null)[] = q.close || [];
    const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
    const series = ts
      .map((tt, i) => ({ t: tt, o: num(o[i]), h: num(hi[i]), l: num(lo[i]), c: num(cl[i]) }))
      .filter((p): p is { t: number; o: number | null; h: number | null; l: number | null; c: number } => p.c !== null);
    return NextResponse.json({
      symbol,
      currency: m.currency || "USD",
      price: m.regularMarketPrice,
      prevClose: typeof m.chartPreviousClose === "number" ? m.chartPreviousClose
        : typeof m.previousClose === "number" ? m.previousClose : null,
      open: typeof m.regularMarketOpen === "number" ? m.regularMarketOpen
        : series.length ? series[0].c : null,
      dayHigh: typeof m.regularMarketDayHigh === "number" ? m.regularMarketDayHigh : null,
      dayLow: typeof m.regularMarketDayLow === "number" ? m.regularMarketDayLow : null,
      series,
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
