import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (compatible; MagnusWireBot/1.0; +https://news.magnusmagi.com)";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const langRaw = req.nextUrl.searchParams.get("lang") || "en";
  const lang = langRaw === "tr" ? "tr" : "en";
  if (q.length < 2 || q.length > 60) return NextResponse.json({ results: [] });
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const j = await res.json();
    const results = (j.results || [])
      .filter((r: { latitude?: number; longitude?: number }) => typeof r.latitude === "number" && typeof r.longitude === "number")
      .map((r: { name: string; latitude: number; longitude: number; country_code?: string; country?: string; admin1?: string }) => ({
        id: `${r.latitude.toFixed(3)},${r.longitude.toFixed(3)}`,
        name: r.name,
        country: r.country_code || r.country || "",
        admin1: r.admin1 || "",
        lat: r.latitude,
        lon: r.longitude,
      }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
