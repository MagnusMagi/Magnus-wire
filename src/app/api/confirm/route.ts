import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { verifyToken } from "@/lib/subtoken";

export const runtime = "nodejs";

function page(title: string, body: string, cta: string, href: string): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
  <body style="margin:0;background:#edebe4;color:#1a1916;font-family:-apple-system,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh">
    <main style="max-width:460px;padding:40px 28px;text-align:center">
      <div style="font:700 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;color:#1c6e68;text-transform:uppercase;margin-bottom:14px">MAGIWIRE</div>
      <h1 style="font:800 26px/1.2 Georgia,serif;margin:0 0 10px">${title}</h1>
      <p style="color:#5b574e;font-size:15px;line-height:1.55;margin:0 0 22px">${body}</p>
      <a href="${href}" style="display:inline-block;background:#1a1916;color:#fff;text-decoration:none;font:700 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.05em;text-transform:uppercase;padding:13px 22px">${cta}</a>
    </main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const email = verifyToken(token, "confirm");
  if (!email) return page("Bağlantı geçersiz / Invalid link", "Onay bağlantısı geçersiz veya süresi dolmuş. · This confirmation link is invalid.", "MagiWire →", `${SITE_URL}/`);
  try {
    const sql = db();
    await sql`update subscribers set active = true where email = ${email}`;
  } catch {
    return page("Bir hata oldu / Error", "Onaylanamadı, lütfen tekrar dene. · Could not confirm, please try again.", "MagiWire →", `${SITE_URL}/`);
  }
  return page(
    "Aboneliğin onaylandı 🎉",
    "Subscription confirmed. Her sabah seçili teknoloji haberleri gelen kutunda olacak. · You're on the list.",
    "MagiWire →",
    `${SITE_URL}/`,
  );
}
