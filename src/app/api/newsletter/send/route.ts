import { supabaseAdmin } from "@/lib/supabase";
import { getDispatches } from "@/lib/dispatches";
import { SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";
import { mailerConfigured, sendMail } from "@/lib/mailer";
import { signToken } from "@/lib/subtoken";

export const runtime = "nodejs";
export const maxDuration = 60;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SUBJECT: Record<Locale, string> = { tr: "MagiWire — günlük tel", en: "MagiWire — daily wire", et: "MagiWire — päevauudised" };
const KICKER: Record<Locale, string> = { tr: "günlük tel", en: "daily wire", et: "päevauudised" };
const UNSUB: Record<Locale, string> = { tr: "Abonelikten çık", en: "Unsubscribe", et: "Loobu tellimusest" };

function digestHtml(locale: Locale, items: { slug: string; title: string; summary: string }[], unsubUrl: string) {
  const rows = items.map((d) => `
    <tr><td style="padding:14px 0;border-bottom:1px solid #d9d6cd">
      <a href="${SITE_URL}/${locale}/dispatch/${d.slug}" style="color:#1a1916;text-decoration:none;font:600 17px/1.35 Georgia,serif">${esc(d.title)}</a>
      <p style="margin:6px 0 0;color:#5b574e;font:400 14px/1.5 -apple-system,system-ui,sans-serif">${esc(d.summary)}</p>
    </td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#edebe4;padding:24px 0">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#edebe4">
      <tr><td style="padding:0 22px 8px;border-bottom:2px solid #1a1916">
        <span style="font:700 13px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;color:#1c6e68;text-transform:uppercase">MAGIWIRE</span>
        <span style="font:400 12px/1 ui-monospace,Menlo,monospace;color:#8a857a;float:right;padding-top:2px">${KICKER[locale]}</span>
      </td></tr>
      <tr><td style="padding:4px 22px"><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
      <tr><td style="padding:14px 22px;color:#8a857a;font:400 12px/1.5 ui-monospace,Menlo,monospace">
        <a href="${SITE_URL}/${locale}" style="color:#1c6e68">news.magnusmagi.com</a> · AI ·
        <a href="${unsubUrl}" style="color:#8a857a">${UNSUB[locale]}</a>
      </td></tr>
    </table></body></html>`;
}

export async function POST(req: Request) {
  const secret = process.env.NEWSLETTER_SECRET;
  if (!secret || req.headers.get("x-newsletter-secret") !== secret)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  if (!mailerConfigured()) return Response.json({ error: "mailer not configured" }, { status: 503 });

  try {
    const sb = supabaseAdmin();
    const { data: subs } = await sb.from("subscribers").select("email, locale").eq("active", true).limit(5000);
    if (!subs?.length) return Response.json({ ok: true, sent: 0, note: "no subscribers" });

    // Dil başına dispatch listesini bir kez çek (içerik alıcılar arasında ortak).
    const digestByLocale = new Map<Locale, { slug: string; title: string; summary: string }[]>();
    async function itemsFor(lc: Locale) {
      const cached = digestByLocale.get(lc);
      if (cached) return cached;
      const all = await getDispatches(lc, 8);
      const items = all.map((d) => ({ slug: d.slug, title: d.title, summary: (d.summary || "").slice(0, 180) }));
      digestByLocale.set(lc, items);
      return items;
    }

    let sent = 0;
    for (const s of subs) {
      const lc = (["tr", "en", "et"].includes(s.locale) ? s.locale : "tr") as Locale;
      const items = await itemsFor(lc);
      if (!items.length) continue;
      const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${signToken(s.email, "unsub")}`;
      try {
        await sendMail({
          to: s.email,
          subject: SUBJECT[lc],
          html: digestHtml(lc, items, unsubUrl),
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        sent += 1;
      } catch {
        // tek alıcı hatası tüm gönderimi düşürmesin
      }
    }
    return Response.json({ ok: true, sent });
  } catch {
    return Response.json({ error: "server" }, { status: 500 });
  }
}
