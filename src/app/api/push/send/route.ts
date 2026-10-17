import webpush from "web-push";
import { db } from "@/lib/db";
import { getDispatches } from "@/lib/dispatches";
import { SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 60;

// Push payload URL'i yalnızca kendi sitemize ait https olabilir (phishing/javascript: engeli).
function safeUrl(u: string | undefined): string | undefined {
  if (!u) return undefined;
  try {
    const p = new URL(u);
    if (p.protocol === "https:" && (u === SITE_URL || u.startsWith(`${SITE_URL}/`))) return u;
  } catch { /* geçersiz URL */ }
  return undefined;
}

export async function POST(req: Request) {
  const secret = process.env.NEWSLETTER_SECRET;
  if (!secret || req.headers.get("x-newsletter-secret") !== secret)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:news@magnusmagi.com";
  if (!pub || !priv) return Response.json({ error: "vapid not configured" }, { status: 503 });
  webpush.setVapidDetails(subject, pub, priv);

  let body: { title?: string; bodyText?: string; url?: string; slug?: string };
  try { body = await req.json(); } catch { body = {}; }

  // If no explicit payload, push the latest breaking (live) dispatch.
  let title = body.title;
  let bodyText = body.bodyText || "";
  let url = safeUrl(body.url);
  if (!title) {
    const latest = await getDispatches("tr" as Locale, 20);
    const pick = latest.find((d) => d.live) || latest[0];
    if (!pick) return Response.json({ ok: true, sent: 0, note: "nothing to push" });
    title = pick.title;
    bodyText = (pick.summary || "").slice(0, 140);
    url = `${SITE_URL}/tr/dispatch/${pick.slug}`;
  }
  const payload = JSON.stringify({ title, body: bodyText, url: url || SITE_URL, tag: "wire-breaking" });

  const sql = db();
  const subs = await sql<{ endpoint: string; p256dh: string; auth: string }[]>`select endpoint, p256dh, auth from push_subscriptions limit 5000`;
  if (!subs?.length) return Response.json({ ok: true, sent: 0, note: "no subscribers" });

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent += 1;
    } catch (err: unknown) {
      const code = (err as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) stale.push(s.endpoint);
    }
  }));
  if (stale.length) await sql`delete from push_subscriptions where endpoint in ${sql(stale)}`;
  return Response.json({ ok: true, sent, pruned: stale.length });
}
