import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "bad coords" }, { status: 400 });
  }
  const fUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,surface_pressure,is_day`
    + `&hourly=temperature_2m,precipitation_probability,weather_code`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max`
    + `&forecast_days=7&timezone=auto`;
  const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10&timezone=auto`;
  try {
    const [fRes, aRes] = await Promise.all([
      fetch(fUrl, { next: { revalidate: 900 } }),
      fetch(aUrl, { next: { revalidate: 1800 } }).catch(() => null),
    ]);
    if (!fRes.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    const j = await fRes.json();
    const d = j?.daily;
    if (!d?.time?.length) return NextResponse.json({ error: "no data" }, { status: 404 });
    const c = j?.current;
    const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
    const current = c && typeof c.temperature_2m === "number" ? {
      temp: c.temperature_2m, feels: num(c.apparent_temperature),
      code: num(c.weather_code) ?? 0, wind: num(c.wind_speed_10m) ?? 0,
      windDir: num(c.wind_direction_10m), humidity: num(c.relative_humidity_2m) ?? 0,
      pressure: num(c.surface_pressure), isDay: c.is_day === 1,
    } : null;

    // Saatlik: şu andan itibaren 24 saat
    const ht: string[] = j.hourly?.time || [];
    const nowIso: string = c?.time || ht[0] || "";
    let start = ht.findIndex((t) => t >= nowIso);
    if (start < 0) start = 0;
    const hourly = [];
    for (let i = start; i < Math.min(start + 24, ht.length); i++) {
      hourly.push({ t: ht[i], temp: j.hourly.temperature_2m?.[i] ?? null, code: num(j.hourly.weather_code?.[i]) ?? 0, precip: j.hourly.precipitation_probability?.[i] ?? null });
    }

    const sun = { sunrise: d.sunrise?.[0] ?? null, sunset: d.sunset?.[0] ?? null, uvMax: num(d.uv_index_max?.[0]) };
    const daily = d.time.map((date: string, i: number) => ({
      date, code: num(d.weather_code?.[i]) ?? 0,
      tmax: d.temperature_2m_max?.[i] ?? null, tmin: d.temperature_2m_min?.[i] ?? null,
      precip: d.precipitation_probability_max?.[i] ?? null,
    }));

    let airQuality = null;
    if (aRes && aRes.ok) {
      const aj = await aRes.json();
      const ac = aj?.current;
      if (ac) airQuality = { aqi: num(ac.european_aqi), pm25: num(ac.pm2_5), pm10: num(ac.pm10) };
    }
    return NextResponse.json({ current, hourly, sun, daily, airQuality });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
