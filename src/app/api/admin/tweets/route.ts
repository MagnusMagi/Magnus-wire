import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchTweet, fetchFullText, tweetIdFromUrl } from "@/lib/xSyndication.mjs";

export const runtime = "nodejs";

// Elle küratörlük ucu. ⚠️ /api/admin/* middleware'in site kapısından muaf —
// kimlik doğrulamayı KENDİSİ yapmak zorunda (bkz src/middleware.ts).
async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(ADMIN_COOKIE)?.value);
}

const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Tweet URL'i yapıştır → syndication'dan çek → havuza ekle. */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  const body = await readJson(req);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "url gerekli" }, { status: 400 });

  const id = tweetIdFromUrl(url);
  if (!id) return NextResponse.json({ error: "geçerli bir X/tweet bağlantısı değil" }, { status: 400 });

  const tw = await fetchTweet(id);
  // Ağ hatası ile silinmiş/gizli tweet aynı sonucu döndürüyor; ikisini de
  // "gösterilemez" diye bildiriyoruz, admin tekrar deneyebilir.
  if (!tw || !tw.posted_at) {
    return NextResponse.json({ error: "tweet çekilemedi (silinmiş, gizli veya geçici hata)" }, { status: 502 });
  }

  // Uzun gönderiyse tam metni kurtarmayı dene; başarısızlık zararsız, kart
  // "X'te tamamını oku" bağlantısı gösterir (bkz xSyndication.mjs).
  if (tw.truncated) {
    const full = await fetchFullText(id);
    if (full && full.length > tw.text.length) {
      tw.text = full;
      tw.truncated = false;
    }
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from("tweets").upsert(
    {
      ...tw,
      found_via: "manual",
      active: true,
      fail_count: 0,
      refreshed_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) return NextResponse.json({ error: "kaydedilemedi" }, { status: 500 });
  return NextResponse.json({ ok: true, id: tw.id, screen_name: tw.screen_name, lang: tw.lang });
}

/** Göster/gizle ve sabitle. */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  const body = await readJson(req);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^\d{10,25}$/.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body?.active === "boolean") {
    patch.active = body.active;
    // Geri açılan tweet'in hata sayacı sıfırlanmalı, yoksa tazeleme onu ilk
    // başarısız çekimde tekrar kapatır (sayaç zaten limitte).
    if (body.active) patch.fail_count = 0;
  }
  if (typeof body?.pinned === "boolean") patch.pinned = body.pinned;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "değişiklik yok" }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb.from("tweets").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  const body = await readJson(req);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^\d{10,25}$/.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb.from("tweets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "delete failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
