import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { clientIp, rateLimited } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (rateLimited(`push-sub:${clientIp(req)}`, 10)) return Response.json({ error: "rate" }, { status: 429 });
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
    const sql = db();
    try {
      await sql`
        insert into push_subscriptions (endpoint, p256dh, auth, locale) values (${endpoint}, ${p256dh}, ${auth}, ${locale})
        on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, locale = excluded.locale`;
    } catch {
      return Response.json({ error: "store" }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "server" }, { status: 500 });
  }
}
