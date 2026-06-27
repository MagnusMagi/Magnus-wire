import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
const txt = readFileSync(join(__dir, "..", ".env.local"), "utf8");
for (const l of txt.split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ""); }

async function fetchOgImage(url) {
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; MagnusWireBot/1.0; +https://news.magnusmagi.com)" } });
    clearTimeout(to); if (!res.ok) return null;
    const html = (await res.text()).slice(0, 250000);
    const pick = (re) => { const m = html.match(re); return m ? m[1] : null; };
    let img = pick(/<meta[^>]+(?:property|name)=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i)
           || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i)
           || pick(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i);
    if (img && img.startsWith("//")) img = "https:" + img;
    else if (img && img.startsWith("/")) { try { img = new URL(url).origin + img; } catch {} }
    return img && /^https?:\/\//.test(img) ? img.replace(/&amp;/g, "&") : null;
  } catch { return null; }
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await sb.from("dispatches").select("slug,source_url").is("hero", null).not("source_url", "is", null);
console.log("görselsiz satır:", data?.length || 0);
let ok = 0;
for (const r of data || []) {
  const img = await fetchOgImage(r.source_url);
  if (img) { const { error } = await sb.from("dispatches").update({ hero: img }).eq("slug", r.slug); if (!error) { ok++; console.log("foto:", r.slug, "→", img.slice(0, 70)); } }
  else console.log("yok:", r.slug);
}
console.log(`bitti. eklenen görsel: ${ok}`);
if (process.env.REVALIDATE_SECRET) { try { const x = await fetch(`http://127.0.0.1:3360/api/revalidate?secret=${process.env.REVALIDATE_SECRET}`, { method: "POST" }); console.log("revalidate:", x.status); } catch {} }
