import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Cron ingest sonrası çağrılır: tüm site içeriğini tazeler.
export async function POST(req: NextRequest) {
  // Secret header'dan okunur (query string log'lara/Referer'a sızdığı için kullanılmaz).
  const secret = req.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, revalidated: true });
}
