import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { getDispatch } from "@/lib/dispatches";
import { isLocale, type Locale } from "@/lib/i18n";
import { clientIp, rateLimited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
const CACHE = "/home/ubuntu/news-app/.audio-cache";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const slug = (sp.get("slug") || "").replace(/[^a-z0-9-]/g, "").slice(0, 80);
  const lraw = sp.get("locale") || "tr";
  const locale = (isLocale(lraw) ? lraw : "tr") as Locale;
  if (!slug) return new Response("bad", { status: 400 });
  const file = path.join(CACHE, `${slug}-${locale}.mp3`);
  try {
    if (existsSync(file)) {
      const buf = await readFile(file);
      return new Response(new Uint8Array(buf), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=604800" } });
    }
    // Cache yok = OpenAI TTS maliyeti → IP başına dakikada 5 ile sınırla.
    if (rateLimited(`tts:${clientIp(req)}`, 5)) return new Response("rate", { status: 429 });
    const d = await getDispatch(locale, slug);
    if (!d) return new Response("not found", { status: 404 });
    const text = `${d.title}. ${(d.body || "").replace(/[#*_>`\[\]()]/g, " ").replace(/\s+/g, " ")}`.slice(0, 4000);
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "tts-1", voice: "alloy", input: text, response_format: "mp3" }),
    });
    if (!r.ok) return new Response("tts upstream error", { status: 502 });
    const buf = Buffer.from(await r.arrayBuffer());
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, buf);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=604800" } });
  } catch {
    return new Response("error", { status: 500 });
  }
}
