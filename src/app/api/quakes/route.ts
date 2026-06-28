import { NextRequest, NextResponse } from "next/server";
import { getQuakes, type QuakeSource } from "@/lib/quake";

export const revalidate = 120;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("source");
  const source: QuakeSource = raw === "usgs" ? "usgs" : "kandilli";
  const { quakes, asOf } = await getQuakes(source);
  return NextResponse.json({ source, quakes, asOf });
}
