import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// IP başına basit in-memory rate limit (tek PM2 instance için yeterli).
const WINDOW = 60_000;
const LIMIT = 30;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  if (arr.length >= LIMIT) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if (limited(ip)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    const { slug } = await req.json();
    if (!slug || typeof slug !== "string") return NextResponse.json({ ok: false }, { status: 400 });
    const sql = db();
    await sql`update dispatches set views = views + 1 where slug = ${slug.slice(0, 80)}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
