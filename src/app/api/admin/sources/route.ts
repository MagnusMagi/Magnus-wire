import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Bu rota middleware'in site kapısından muaf (/api/admin/*) — kimlik doğrulamayı
// KENDİSİ yapmak zorunda.
async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(ADMIN_COOKIE)?.value);
}

// Kaynağı aç/kapat. Ölü feed'leri elle kapatmak veya ingest'in otomatik
// kapattıklarını geri açmak için.
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { id, active } = (body ?? {}) as { id?: unknown; active?: unknown };
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "invalid active" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  // Kaynak geri açılırken hata sayacı da sıfırlanır, yoksa ingest onu ilk
  // hatada tekrar kapatır (sayaç zaten limitin üstünde).
  const patch = active ? { active: true, fail_count: 0 } : { active: false };
  const { error } = await sb.from("sources").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
