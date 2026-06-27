import { supabaseAdmin } from "@/lib/supabase";
import { isLocale } from "@/lib/i18n";

export const runtime = "nodejs";

const WINDOW = 60_000;
const LIMIT = 10;
const hits = new Map<string, { n: number; t: number }>();
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

function limited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const cur = hits.get(ip);
  if (!cur || now - cur.t > WINDOW) { hits.set(ip, { n: 1, t: now }); return false; }
  cur.n += 1;
  return cur.n > LIMIT;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "0";
  if (limited(ip)) return Response.json({ error: "rate" }, { status: 429 });
  let body: { email?: string; locale?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "bad" }, { status: 400 }); }
  const email = (body.email || "").trim().toLowerCase().slice(0, 160);
  const locale = isLocale(body.locale || "") ? body.locale! : "tr";
  if (!EMAIL.test(email)) return Response.json({ error: "email" }, { status: 422 });
  try {
    const sb = supabaseAdmin();
    const { error } = await sb.from("subscribers").upsert({ email, locale, active: true }, { onConflict: "email" });
    if (error) return Response.json({ error: "store" }, { status: 500 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "server" }, { status: 500 });
  }
}
