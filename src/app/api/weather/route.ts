import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "bad coords" }, { status: 400 });
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    const j = await res.json();
    const d = j?.daily;
    if (!d?.time?.length) return NextResponse.json({ error: "no data" }, { status: 404 });
    const daily = d.time.map((date: string, i: number) => ({
      date,
      code: typeof d.weather_code?.[i] === "number" ? d.weather_code[i] : 0,
      tmax: d.temperature_2m_max?.[i] ?? null,
      tmin: d.temperature_2m_min?.[i] ?? null,
      precip: d.precipitation_probability_max?.[i] ?? null,
    }));
    return NextResponse.json({ daily });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
