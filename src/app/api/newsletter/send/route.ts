import { supabaseAdmin } from "@/lib/supabase";
import { getDispatches } from "@/lib/dispatches";
import { SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 60;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function digestHtml(locale: Locale, items: { slug: string; title: string; summary: string }[]) {
  const rows = items.map((d) => `
    <tr><td style="padding:14px 0;border-bottom:1px solid #d9d6cd">
      <a href="${SITE_URL}/${locale}/dispatch/${d.slug}" style="color:#1a1916;text-decoration:none;font:600 17px/1.35 Georgia,serif">${esc(d.title)}</a>
      <p style="margin:6px 0 0;color:#5b574e;font:400 14px/1.5 -apple-system,system-ui,sans-serif">${esc(d.summary)}</p>
    </td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#edebe4;padding:24px 0">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#edebe4">
      <tr><td style="padding:0 22px 8px;border-bottom:2px solid #1a1916">
        <span style="font:700 13px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;color:#1c6e68;text-transform:uppercase">MAGNUS WIRE</span>
        <span style="font:400 12px/1 ui-monospace,Menlo,monospace;color:#8a857a;float:right;padding-top:2px">günlük tel</span>
      </td></tr>
      <tr><td style="padding:4px 22px"><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
      <tr><td style="padding:14px 22px;color:#8a857a;font:400 12px/1.5 ui-monospace,Menlo,monospace">
        <a href="${SITE_URL}/${locale}" style="color:#1c6e68">news.magnusmagi.com</a> · AI destekli teknoloji teli
      </td></tr>
    </table></body></html>`;
}

export async function POST(req: Request) {
  const secret = process.env.NEWSLETTER_SECRET;
  if (!secret || req.headers.get("x-newsletter-secret") !== secret)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.NEWSLETTER_FROM;
  if (!apiKey || !from)
    return Response.json({ error: "sendgrid not configured (SENDGRID_API_KEY / NEWSLETTER_FROM)" }, { status: 503 });

  try {
    const sb = supabaseAdmin();
    const { data: subs } = await sb.from("subscribers").select("email, locale").eq("active", true).limit(5000);
    if (!subs?.length) return Response.json({ ok: true, sent: 0, note: "no subscribers" });

    // group recipients by locale, build a digest per locale once
    const byLocale = new Map<Locale, string[]>();
    for (const s of subs) {
      const lc = (["tr", "en", "et"].includes(s.locale) ? s.locale : "tr") as Locale;
      const arr = byLocale.get(lc) || [];
      arr.push(s.email);
      byLocale.set(lc, arr);
    }

    let sent = 0;
    for (const [lc, emails] of byLocale) {
      const all = await getDispatches(lc, 8);
      if (!all.length) continue;
      const items = all.map((d) => ({ slug: d.slug, title: d.title, summary: (d.summary || "").slice(0, 180) }));
      const html = digestHtml(lc, items);
      const subject = lc === "en" ? "Magnus Wire — daily wire" : lc === "et" ? "Magnus Wire — päevauudised" : "Magnus Wire — günlük tel";
      const personalizations = emails.map((e) => ({ to: [{ email: e }] }));
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ personalizations, from: { email: from, name: "Magnus Wire" }, subject, content: [{ type: "text/html", value: html }] }),
      });
      if (res.ok) sent += emails.length;
    }
    return Response.json({ ok: true, sent });
  } catch {
    return Response.json({ error: "server" }, { status: 500 });
  }
}
