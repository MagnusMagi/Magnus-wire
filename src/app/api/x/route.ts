import { NextResponse } from "next/server";
import { getTweets } from "@/lib/tweets";

export const runtime = "nodejs";
// Havuz 10 dakikada bir cron'la değişiyor; sayfadaki yoklama bu ucu 90 saniyede
// bir çağırıyor. Kısa bir CDN/tarayıcı önbelleği aynı anda açık sekmelerin
// aynı sorguyu tekrar tekrar DB'ye vurmasını engelliyor.
export const revalidate = 60;

export async function GET() {
  const tweets = await getTweets();
  return NextResponse.json(
    { tweets, asOf: Date.now() },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" } },
  );
}
