import { supabaseAdmin } from "@/lib/supabase";
import { isLocale, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";
import { mailerConfigured, sendMail } from "@/lib/mailer";
import { signToken } from "@/lib/subtoken";

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

const COPY: Record<Locale, { subject: string; intro: string; cta: string; note: string }> = {
  tr: {
    subject: "MagiWire aboneliğini onayla",
    intro: "MagiWire günlük teline abone olmak için bu isteği aldık. Onaylamak için aşağıdaki bağlantıya tıkla:",
    cta: "Aboneliği onayla",
    note: "Bu isteği sen yapmadıysan bu e-postayı yok say; onaylamadan listeye eklenmezsin.",
  },
  en: {
    subject: "Confirm your MagiWire subscription",
    intro: "We received a request to subscribe to the MagiWire daily wire. Click below to confirm:",
    cta: "Confirm subscription",
    note: "If you didn't request this, ignore this email; you won't be added without confirming.",
  },
  et: {
    subject: "Kinnita oma MagiWire'i tellimus",
    intro: "Saime taotluse tellida MagiWire'i päevauudised. Kinnitamiseks klõpsa allolevat linki:",
    cta: "Kinnita tellimus",
    note: "Kui sa seda ei taotlenud, eira seda kirja; ilma kinnituseta sind ei lisata.",
  },
};

function confirmHtml(locale: Locale, url: string): string {
  const c = COPY[locale];
  return `<!doctype html><html><body style="margin:0;background:#edebe4;padding:24px 0">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#edebe4;font-family:-apple-system,system-ui,sans-serif">
      <tr><td style="padding:0 22px 10px;border-bottom:2px solid #1a1916">
        <span style="font:700 13px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;color:#1c6e68;text-transform:uppercase">MAGIWIRE</span>
      </td></tr>
      <tr><td style="padding:18px 22px;color:#1a1916;font-size:15px;line-height:1.55">${c.intro}</td></tr>
      <tr><td style="padding:4px 22px 18px">
        <a href="${url}" style="display:inline-block;background:#1c6e68;color:#fff;text-decoration:none;font:700 14px/1 ui-monospace,Menlo,monospace;padding:13px 22px">${c.cta}</a>
      </td></tr>
      <tr><td style="padding:0 22px 22px;color:#8a857a;font-size:12px;line-height:1.5">${c.note}<br><br><a href="${url}" style="color:#1c6e68">${url}</a></td></tr>
    </table></body></html>`;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "0";
  if (limited(ip)) return Response.json({ error: "rate" }, { status: 429 });
  let body: { email?: string; locale?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "bad" }, { status: 400 }); }
  const email = (body.email || "").trim().toLowerCase().slice(0, 160);
  const locale = (isLocale(body.locale || "") ? body.locale! : "tr") as Locale;
  if (!EMAIL.test(email)) return Response.json({ error: "email" }, { status: 422 });
  try {
    const sb = supabaseAdmin();
    // Zaten onaylı aboneyse tekrar e-posta gönderme.
    const { data: existing } = await sb.from("subscribers").select("active").eq("email", email).maybeSingle();
    if (existing?.active) return Response.json({ ok: true, already: true });

    // Çift onay (double opt-in): pasif kaydet, onay e-postası gönder.
    const { error } = await sb.from("subscribers").upsert({ email, locale, active: false }, { onConflict: "email" });
    if (error) return Response.json({ error: "store" }, { status: 500 });

    if (!mailerConfigured()) return Response.json({ error: "mailer" }, { status: 503 });
    const url = `${SITE_URL}/api/confirm?token=${signToken(email, "confirm")}`;
    await sendMail({ to: email, subject: COPY[locale].subject, html: confirmHtml(locale, url) });
    return Response.json({ ok: true, pending: true });
  } catch {
    return Response.json({ error: "server" }, { status: 500 });
  }
}
