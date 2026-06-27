export const runtime = "nodejs";
export const revalidate = false;

function isPrivateHost(host: string): boolean {
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0)/.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  return !!(m && +m[1] >= 16 && +m[1] <= 31);
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  if (!u) return new Response("bad", { status: 400 });
  let target: URL;
  try { target = new URL(u); } catch { return new Response("bad url", { status: 400 }); }
  if (target.protocol !== "https:" || isPrivateHost(target.hostname)) return new Response("blocked", { status: 400 });
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(target, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; MagnusWireBot/1.0; +https://news.magnusmagi.com)" } });
    clearTimeout(to);
    if (!r.ok) return new Response("upstream", { status: 502 });
    const ct = r.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return new Response("not image", { status: 415 });
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 8_000_000) return new Response("too large", { status: 413 });
    return new Response(buf, { headers: { "Content-Type": ct, "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" } });
  } catch {
    return new Response("error", { status: 502 });
  }
}
