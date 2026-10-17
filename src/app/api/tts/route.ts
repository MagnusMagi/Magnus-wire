import { BlobNotFoundError, head, put } from "@vercel/blob";
import { getDispatch } from "@/lib/dispatches";
import { isLocale, type Locale } from "@/lib/i18n";
import { clientIp, rateLimited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
// Önbellek Vercel Blob'da (fonksiyon diski kalıcı değil; eskiden VPS'te
// TTS_CACHE_DIR vardı). Önbellek kaybı = her dinlemede yeniden OpenAI ücreti.
// ⚠️ Depo public ama adres istemciye VERİLMİYOR (yönlendirme yok, akış var):
// site parola kapısının arkasında, ses dosyası kapıyı delmesin.
const PREFIX = "tts/";
const AUDIO_HEADERS = { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=604800" };

async function cachedUrl(pathname: string): Promise<string | null> {
  try {
    return (await head(pathname)).url;
  } catch (e) {
    if (e instanceof BlobNotFoundError) return null;
    throw e;
  }
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const slug = (sp.get("slug") || "").replace(/[^a-z0-9-]/g, "").slice(0, 80);
  const lraw = sp.get("locale") || "tr";
  const locale = (isLocale(lraw) ? lraw : "tr") as Locale;
  if (!slug) return new Response("bad", { status: 400 });
  const pathname = `${PREFIX}${slug}-${locale}.mp3`;
  try {
    const url = await cachedUrl(pathname);
    if (url) {
      const cached = await fetch(url);
      if (cached.ok && cached.body) return new Response(cached.body, { headers: AUDIO_HEADERS });
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
    // Önbelleğe yazamamak dinlemeyi bozmasın; ama sessiz de kalmasın.
    try {
      await put(pathname, buf, { access: "public", contentType: "audio/mpeg", addRandomSuffix: false, allowOverwrite: true });
    } catch (e) {
      console.error("tts: önbellek yazılamadı", e instanceof Error ? e.message : e);
    }
    return new Response(new Uint8Array(buf), { headers: AUDIO_HEADERS });
  } catch (e) {
    console.error("tts:", e instanceof Error ? e.message : e);
    return new Response("error", { status: 500 });
  }
}
