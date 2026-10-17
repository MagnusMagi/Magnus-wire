import { db } from "./db";
import type { Locale } from "./i18n";

// X tel havuzunun OKUMA katmanı. Yazma tarafı scripts/ingest-tweets.mjs ve
// /api/admin/tweets; ikisi de src/lib/xSyndication.mjs'i paylaşır.

export interface TweetPhoto {
  url: string;
  w: number | null;
  h: number | null;
}

export interface Tweet {
  id: string;
  screenName: string;
  authorName: string;
  avatar: string | null;
  verified: boolean;
  text: string;
  lang: string;
  likes: number;
  replies: number;
  photos: TweetPhoto[];
  postedAt: number; // ms
  sourceName: string | null;
  dispatchSlug: string | null;
  section: string | null;
  pinned: boolean;
  /** X uzun gönderiyi kesti; tam metin ücretsiz uçlarda YOK (bkz xSyndication.mjs). */
  truncated: boolean;
}

// Sayfanın çektiği pencere. ⚠️ Skor SAKLANMIYOR (bkz sql/20260820_tweets.sql):
// zamanla sönen bir değeri kolonda tutmak eski tweet'i sonsuza dek zirvede
// bırakırdı. Pencere küçük olduğu için sıralama okuma anında hesaplanıyor.
const WINDOW_DAYS = 30;
const WINDOW_LIMIT = 200;
// Her dilin en az bu kadar teli pencereye girer — nadir diller genel tazelik
// yarışında ezilmesin diye taban kota.
const PER_LANG_FLOOR = 30;
// Sayfada gösterilen diller. Havuza da yalnız bunlar yazılıyor
// (scripts/ingest-tweets.mjs:LANGS); buradaki liste ikinci emniyet.
// ⚠️ Tek dil kaldığında dil çetelesi kendini gizler (XBoard) — tek öğelik
// bir filtre kullanıcıya seçenek değil gürültü sunar.
const SHOWN_LANGS = ["tr"];

interface Row {
  id: string;
  screen_name: string;
  author_name: string;
  avatar_url: string | null;
  verified: boolean;
  text: string;
  lang: string;
  favorite_count: number;
  reply_count: number;
  photos: TweetPhoto[] | null;
  posted_at: string;
  source_name: string | null;
  source_dispatch_slug: string | null;
  section: string | null;
  pinned: boolean;
  truncated: boolean;
}

function toTweet(r: Row): Tweet {
  return {
    id: r.id,
    screenName: r.screen_name,
    authorName: r.author_name,
    avatar: r.avatar_url,
    verified: r.verified,
    text: r.text,
    lang: r.lang || "und",
    likes: r.favorite_count,
    replies: r.reply_count,
    photos: Array.isArray(r.photos) ? r.photos : [],
    postedAt: Date.parse(r.posted_at),
    sourceName: r.source_name,
    dispatchSlug: r.source_dispatch_slug,
    section: r.section,
    pinned: r.pinned,
    truncated: Boolean(r.truncated),
  };
}

/**
 * Popülerlik skoru: etkileşim / yaş sönümü (Hacker News ailesi).
 *
 * Ham beğeni sayısıyla sıralamak sayfayı taşlaştırır — bir kez zirveye çıkan
 * tweet aylarca orada kalır ve "popüler" panosu arşive döner. Sönüm, dünkü
 * 5.000 beğenili tweet ile bu saatteki 300 beğenili tweet'i yarıştırılabilir
 * kılıyor. Yanıt sayısı beğeniden daha pahalı bir sinyal (yazmak gerekiyor),
 * o yüzden 3 katsayısıyla giriyor.
 */
export function tweetScore(t: Tweet, now = Date.now()): number {
  const ageHours = Math.max(0, (now - t.postedAt) / 3_600_000);
  return (t.likes + 3 * t.replies) / Math.pow(ageHours + 2, 1.35);
}

export type SortKey = "popular" | "recent";

export function sortTweets(list: Tweet[], key: SortKey, now = Date.now()): Tweet[] {
  const scored = [...list];
  scored.sort((a, b) => {
    // Sabitlenmişler her zaman önce: editör kararı algoritmayı ezer.
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return key === "recent" ? b.postedAt - a.postedAt : tweetScore(b, now) - tweetScore(a, now);
  });
  return scored;
}

/**
 * Pencereyi çeker. Dil filtresi BİLEREK burada değil: istemci anında filtreler.
 *
 * ⚠️ Düz "en yeni N" sorgusu DEĞİL, `tweets_window` RPC'si kullanılıyor. Sebep
 * ölçülerek bulundu: akış hızlanınca 200'lük pencere 45 saate daraldı ve
 * içinde İngilizce 135, Türkçe 12 satır kaldı — havuz büyüdükçe nadir dil
 * sekmeleri tamamen boşalacaktı, yani dil filtresi kendi başarısıyla ölecekti.
 * RPC her dile taban kota veriyor (bkz sql/20260820_tweets.sql).
 */
export async function getTweets(): Promise<Tweet[]> {
  const sql = db();
  let data: Row[];
  try {
    data = await sql<Row[]>`select * from tweets_window(${WINDOW_DAYS}, ${WINDOW_LIMIT}, ${PER_LANG_FLOOR})`;
  } catch (e) {
    // Boş sayfa ile düşmüş DB aynı ekranı üretir — hata mutlaka loglanmalı.
    console.error("[tweets] pencere okuma hatası:", e instanceof Error ? e.message : e);
    return [];
  }
  return data.map(toTweet).filter((t) => SHOWN_LANGS.includes(t.lang));
}

// ── Dil etiketleri ────────────────────────────────────────────────────────
// X'in kendi tespit ettiği kodlar (BCP-47). Listede olmayan kod ham haliyle
// (büyük harf) gösterilir — filtre yine çalışır, yalnız adı yerelleşmez.
const LANG_NAMES: Record<string, Record<Locale, string>> = {
  tr: { tr: "Türkçe", en: "Turkish", et: "Türgi" },
  en: { tr: "İngilizce", en: "English", et: "Inglise" },
  et: { tr: "Estonca", en: "Estonian", et: "Eesti" },
  de: { tr: "Almanca", en: "German", et: "Saksa" },
  fr: { tr: "Fransızca", en: "French", et: "Prantsuse" },
  es: { tr: "İspanyolca", en: "Spanish", et: "Hispaania" },
  it: { tr: "İtalyanca", en: "Italian", et: "Itaalia" },
  pt: { tr: "Portekizce", en: "Portuguese", et: "Portugali" },
  nl: { tr: "Felemenkçe", en: "Dutch", et: "Hollandi" },
  ru: { tr: "Rusça", en: "Russian", et: "Vene" },
  uk: { tr: "Ukraynaca", en: "Ukrainian", et: "Ukraina" },
  ar: { tr: "Arapça", en: "Arabic", et: "Araabia" },
  fa: { tr: "Farsça", en: "Persian", et: "Pärsia" },
  he: { tr: "İbranice", en: "Hebrew", et: "Heebrea" },
  ja: { tr: "Japonca", en: "Japanese", et: "Jaapani" },
  ko: { tr: "Korece", en: "Korean", et: "Korea" },
  zh: { tr: "Çince", en: "Chinese", et: "Hiina" },
  hi: { tr: "Hintçe", en: "Hindi", et: "Hindi" },
  id: { tr: "Endonezce", en: "Indonesian", et: "Indoneesia" },
  fil: { tr: "Filipince", en: "Filipino", et: "Filipiini" },
  yi: { tr: "Yidiş", en: "Yiddish", et: "Jidiši" },
  mr: { tr: "Marathi", en: "Marathi", et: "Marathi" },
  ta: { tr: "Tamilce", en: "Tamil", et: "Tamili" },
  th: { tr: "Tayca", en: "Thai", et: "Tai" },
  vi: { tr: "Vietnamca", en: "Vietnamese", et: "Vietnami" },
  bn: { tr: "Bengalce", en: "Bengali", et: "Bengali" },
  ur: { tr: "Urduca", en: "Urdu", et: "Urdu" },
  cs: { tr: "Çekçe", en: "Czech", et: "Tšehhi" },
  hu: { tr: "Macarca", en: "Hungarian", et: "Ungari" },
  bg: { tr: "Bulgarca", en: "Bulgarian", et: "Bulgaaria" },
  sr: { tr: "Sırpça", en: "Serbian", et: "Serbia" },
  no: { tr: "Norveççe", en: "Norwegian", et: "Norra" },
  da: { tr: "Danca", en: "Danish", et: "Taani" },
  pl: { tr: "Lehçe", en: "Polish", et: "Poola" },
  sv: { tr: "İsveççe", en: "Swedish", et: "Rootsi" },
  fi: { tr: "Fince", en: "Finnish", et: "Soome" },
  el: { tr: "Yunanca", en: "Greek", et: "Kreeka" },
  ro: { tr: "Rumence", en: "Romanian", et: "Rumeenia" },
  lv: { tr: "Letonca", en: "Latvian", et: "Läti" },
  lt: { tr: "Litvanca", en: "Lithuanian", et: "Leedu" },
  // X, metni olmayan (yalnız görsel/link) tweet'lere bu kodu verir.
  und: { tr: "Metinsiz", en: "No text", et: "Tekstita" },
};

export function langName(code: string, locale: Locale): string {
  return LANG_NAMES[code]?.[locale] ?? code.toUpperCase();
}

/** Havuzda GERÇEKTEN bulunan diller, çoktan aza. Boş filtre sekmesi üretmez. */
export function langCounts(list: Tweet[]): { code: string; count: number }[] {
  const map = new Map<string, number>();
  for (const t of list) map.set(t.lang, (map.get(t.lang) ?? 0) + 1);
  return [...map.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

/** Sitenin görüntü dili ↔ tweet dili eşlemesi (varsayılan sekme için). */
export function defaultLangFor(locale: Locale, available: string[]): string {
  return available.includes(locale) ? locale : "all";
}
