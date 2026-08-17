import { supabaseAdmin } from "@/lib/supabase";
import type { Locale } from "@/lib/i18n";

// Gövde çevirisi TALEP ÜZERİNE.
//
// Ingest yalnız TR gövdesi üretiyor; EN/ET'de başlık + spot var (liste, kategori,
// arama ve sitemap üç dilde anlamlı kalsın diye). Gövde ancak biri o dildeki
// habere gerçekten girdiğinde çevrilir ve `content` jsonb'ye yazılır — bir daha
// ödenmez. Böylece gövde maliyeti OKUNMA sayısına bağlı, ingest hacmine değil.

const LANG_NAME: Record<Exclude<Locale, "tr">, string> = {
  en: "İngilizce",
  et: "Estonca",
};

// Aynı haber+dil için eşzamanlı isteklerde tek çeviri yapılsın.
const inflight = new Map<string, Promise<Translated | null>>();

export interface Translated {
  body: string;
  keyFacts: string[];
}

interface TranslateInput {
  slug: string;
  locale: Locale;
  trBody: string;
  trKeyFacts: string[];
}

async function callOpenAI(input: TranslateInput): Promise<Translated | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const lang = LANG_NAME[input.locale as Exclude<Locale, "tr">];
  if (!lang) return null;

  const sys = `Sen bir haber çevirmenisin. Verilen Türkçe haber gövdesini ve maddelerini ${lang} diline çevir. Markdown yapısını, paragraf bölünmesini ve ara başlıkları AYNEN koru. Ekleme yapma, kısaltma.`;
  const user = `SADECE şu JSON'u döndür:\n{"body":"(çeviri, markdown korunmuş)","keyFacts":["(her maddenin çevirisi)"]}\n\nGövde:\n${input.trBody}\n\nMaddeler:\n${JSON.stringify(input.trKeyFacts)}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
      // Sayfa render'ını süresiz bekletme: çeviri gelmezse TR gövdesi gösterilir.
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.error("translate: OpenAI", res.status);
      return null;
    }
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!body) return null;
    const keyFacts = Array.isArray(parsed.keyFacts)
      ? parsed.keyFacts.map((f: unknown) => String(f).trim()).filter(Boolean).slice(0, 5)
      : [];
    return { body, keyFacts };
  } catch (e) {
    console.error("translate: hata", e instanceof Error ? e.message : e);
    return null;
  }
}

// Çeviriyi content->locale altına yazar. Başlık/spot ingest'ten geldiği için
// korunur; yalnız body ve keyFacts eklenir.
async function persist(slug: string, locale: Locale, t: Translated): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("dispatches").select("content").eq("slug", slug).maybeSingle();
    const content = (data?.content ?? {}) as Record<string, Record<string, unknown>>;
    const next = {
      ...content,
      [locale]: { ...(content[locale] ?? {}), body: t.body, keyFacts: t.keyFacts },
    };
    const { error } = await sb.from("dispatches").update({ content: next }).eq("slug", slug);
    if (error) console.error("translate: yazma hatası", error.message);
  } catch (e) {
    console.error("translate: yazma istisnası", e instanceof Error ? e.message : e);
  }
}

/**
 * TR gövdesini istenen dile çevirir ve kalıcı olarak saklar.
 * Çeviri üretilemezse `null` döner ve çağıran TR gövdesini göstermeye devam eder
 * — sessizce boş içerik ASLA döndürülmez.
 */
export async function translateBody(input: TranslateInput): Promise<Translated | null> {
  if (input.locale === "tr" || !input.trBody) return null;
  // ⚠️ Build sırasında ASLA çevirme. Dispatch sayfası generateStaticParams ile
  // prerender ediliyor; guard olmasaydı her `pnpm build` tüm haberleri EN+ET'ye
  // çevirmeye kalkardı (200 haber × 2 dil = ~400 ücretli çağrı, her deploy'da).
  // Çeviri yalnız gerçek bir okuyucu isteğinde tetiklenmeli.
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const key = `${input.slug}:${input.locale}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const t = await callOpenAI(input);
    if (t) await persist(input.slug, input.locale, t);
    return t;
  })().finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
}
