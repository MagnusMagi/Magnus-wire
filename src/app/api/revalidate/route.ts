import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Cron ingest sonrası çağrılır: tüm site içeriğini tazeler.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, revalidated: true });
}
