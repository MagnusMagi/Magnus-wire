import { db } from "./db";
import type { Tweet, TweetPhoto } from "./tweets";

// X tel havuzunun DB okuması — yalnız sunucu (Server Component / route).
// Tipler ve istemcide de çalışan yardımcılar tweets.ts'te.

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
