import { supabaseAdmin } from "@/lib/supabase";
import { isLocale } from "@/lib/i18n";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; locale?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "bad" }, { status: 400 }); }
  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  const locale = isLocale(body.locale || "") ? body.locale! : "tr";
  if (!endpoint || !p256dh || !auth || !/^https:\/\//.test(endpoint))
    return Response.json({ error: "invalid subscription" }, { status: 422 });
  try {
    const sb = supabaseAdmin();
    const { error } = await sb.from("push_subscriptions")
      .upsert({ endpoint, p256dh, auth, locale }, { onConflict: "endpoint" });
    if (error) return Response.json({ error: "store" }, { status: 500 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "server" }, { status: 500 });
  }
}
