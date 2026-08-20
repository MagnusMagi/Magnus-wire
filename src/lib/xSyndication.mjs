// X (Twitter) syndication istemcisi — ÜCRETSİZ, ANAHTARSIZ.
//
// ⚠️ Bu, X'in gömme widget'ının kendi beslendiği açık uçtur; resmî v2 API DEĞİL.
// Resmî API şubat 2026'da kullanım-başına geçti (okuma başına $0.005 → günde
// 1.000 tweet ≈ $150/ay) ve bu proje için bilinçli olarak kullanılmıyor.
//
// ⚠️ Ne verir, ne vermez:
//   VERİR  — ID'si bilinen tek bir tweet'in tam verisi (metin, lang, beğeni,
//            yanıt, medya, yazar + avatar + mavi tik).
//   VERMEZ — arama, trend, profil/liste akışı. O uçlar 404 döner (2026-08-20
//            ölçüldü). Yani KEŞİF bu dosyanın işi değil; keşif ücretsiz iki
//            yoldan yapılır: haberlerde alıntılanan linkler + elle küratörlük.
//
// .mjs olmasının sebebi: hem Next (TS) tarafı hem çıplak node ile koşan cron
// script'i AYNI kodu kullanabilsin. Kopyalanırsa iki taraf sessizce ayrışır.

const ENDPOINT = "https://cdn.syndication.twimg.com/tweet-result";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Tweet ID'si taşıyan her X/Twitter bağlantısını yakalar (x.com, twitter.com, mobile.*, /statuses/). */
export const TWEET_URL_RE =
  /(?:^|[^\w])(?:https?:\/\/)?(?:[a-z0-9-]+\.)?(?:twitter|x)\.com\/(?:#!\/)?([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{10,25})/gi;

/**
 * Syndication'ın beklediği token. react-tweet ile aynı türetme; sabit bir
 * değer bugün çalışıyor ama uç bunu doğrulamaya başlarsa diye doğrusu üretilir.
 * @param {string} id
 */
export function syndicationToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(6 ** 2).replace(/(0+|\.)/g, "");
}

// ⚠️ X, metin içermeyen tweet'lere gerçek dil kodu değil sözde-kod verir:
// und (belirsiz), zxx (dilsel içerik yok), qme/qam/qct/qht/qst (yalnız medya,
// yalnız bahsetme, yalnız alıntı…). Bunlar filtre listesinde ayrı sekmeler
// üretip kullanıcıya anlamsız "QME" düğmeleri gösterirdi; tek kovaya indiriliyor.
const NO_TEXT_LANGS = new Set(["und", "zxx", "qme", "qam", "qct", "qht", "qst"]);

// X hâlâ birkaç ESKİ ISO kodunu kullanıyor. Çevrilmezse dil filtresinde
// "IN"/"IW"/"JI" gibi tanınmayan sekmeler çıkar (ölçüldü: havuzda `in` geldi).
const LEGACY_LANGS = { in: "id", iw: "he", ji: "yi", tl: "fil" };

/**
 * Tweet ID'sinden gönderim zamanı (ms). X'in snowflake şeması: üst 41 bit
 * epoch'tan (2010-11-04) beri geçen milisaniye.
 *
 * ⚠️ Bu keşif hattının en değerli kısayolu: bir tweet'in YAŞINI hiç ağ isteği
 * yapmadan biliyoruz. Ölçüm 2026-08-20 — feed taraması koşu başına yüzlerce
 * link buluyor ama çoğu yıllar öncesine ait; snowflake elemesi olmadan 40'lık
 * çözümleme bütçesinin 39'u "eski" damgası yiyip boşa gidiyordu.
 * @param {string} id
 * @returns {number} ms epoch (geçersiz ID'de 0)
 */
export function tweetIdTime(id) {
  if (!/^\d{10,25}$/.test(String(id))) return 0;
  try {
    return Number((BigInt(id) >> 22n) + 1288834974657n);
  } catch {
    return 0;
  }
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);

/**
 * Bizim satır biçimimiz. `tweets` tablosunun kolonlarıyla BİREBİR aynı adlar —
 * upsert'e doğrudan verilebilsin diye (camelCase'e çevrim okuma katmanında).
 * @typedef {{
 *   id: string, screen_name: string, author_name: string,
 *   avatar_url: string|null, verified: boolean, text: string, lang: string,
 *   favorite_count: number, reply_count: number,
 *   photos: {url: string, w: number|null, h: number|null}[],
 *   posted_at: string|null
 * }} TweetRow
 */

/**
 * Ham syndication yanıtını bizim satır biçimimize indirger.
 * @param {any} raw
 * @returns {TweetRow|null} tanınmayan/silinmiş tweet'te null
 */
export function normalizeTweet(raw) {
  // Silinmiş, gizli veya yaş kısıtlı tweet "TweetTombstone" döner — veri yok.
  if (!raw || raw.__typename !== "Tweet" || !raw.id_str || !raw.user) return null;

  // display_text_range KOD NOKTASI cinsinden: emoji'li tweet'te .slice() ile
  // kesmek karakteri ikiye böler. Array.from ile kod noktalarına ayrılıyor.
  const chars = Array.from(String(raw.text ?? ""));
  const [start, end] = Array.isArray(raw.display_text_range) ? raw.display_text_range : [0, chars.length];
  let text = chars.slice(start, end).join("");

  // t.co kısaltmalarını okunabilir haline çevir (kart bizim, X'in değil).
  for (const u of raw.entities?.urls ?? []) {
    if (u?.url && u?.display_url) text = text.split(u.url).join(u.display_url);
  }
  text = decode(text).trim();

  const photos = [];
  for (const p of raw.photos ?? []) {
    if (p?.url) photos.push({ url: p.url, w: p.width ?? null, h: p.height ?? null });
  }
  // Video/GIF'te `photos` boş gelir; kapak karesi mediaDetails'te durur.
  if (!photos.length) {
    for (const m of raw.mediaDetails ?? []) {
      if (m?.media_url_https) photos.push({ url: m.media_url_https, w: m.original_info?.width ?? null, h: m.original_info?.height ?? null });
    }
  }

  const u = raw.user;
  return {
    id: raw.id_str,
    screen_name: u.screen_name,
    author_name: u.name ?? u.screen_name,
    avatar_url: u.profile_image_url_https ?? null,
    verified: Boolean(u.is_blue_verified || u.verified),
    text,
    lang: NO_TEXT_LANGS.has(raw.lang) || !raw.lang ? "und" : (LEGACY_LANGS[raw.lang] ?? raw.lang),
    favorite_count: Number(raw.favorite_count) || 0,
    reply_count: Number(raw.conversation_count) || 0,
    photos: photos.slice(0, 2),
    posted_at: raw.created_at ?? null,
  };
}

/**
 * Tek tweet'i çeker ve normalleştirir. Ağ/ayrıştırma hatası ile silinmiş tweet
 * AYNI şekilde null döner — çağıran taraf ikisini de "gösterilemez" diye ele alır.
 * @param {string} id
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<TweetRow|null>}
 */
export async function fetchTweet(id, opts = {}) {
  return normalizeTweet(await fetchTweetRaw(id, opts));
}

/**
 * Ham syndication yanıtı. `fetchTweet` bunun üstüne kuruludur; ham hali
 * yalnız alıntılanan tweet'i de hasat etmek isteyen çağıran için açık.
 * @param {string} id
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<any|null>}
 */
export async function fetchTweetRaw(id, opts = {}) {
  if (!/^\d{10,25}$/.test(String(id))) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 12000);
  try {
    const url = `${ENDPOINT}?id=${id}&token=${syndicationToken(id)}&lang=en`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
      // Next'in fetch cache'i bu çağrıyı build çıktısına gömmesin.
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bir tweet başka bir tweet'i alıntılıyorsa, alıntılanan tweet TAM HALİYLE
 * aynı yanıtın içinde gelir — yani bedava ikinci bir tel. Keşif hattının
 * ücretsiz çarpanlarından biri.
 * @param {any} raw
 * @returns {TweetRow|null}
 */
export function quotedTweetOf(raw) {
  return normalizeTweet(raw?.quoted_tweet ?? null);
}

/**
 * Serbest metinden (HTML dahil) benzersiz tweet ID'lerini çıkarır.
 * @param {string|null|undefined} text
 * @returns {Set<string>}
 */
export function extractTweetIds(text) {
  const out = new Set();
  if (!text) return out;
  for (const m of String(text).matchAll(TWEET_URL_RE)) {
    // /i/web/status/ ve /intent/ gibi sahte kullanıcı adlarını ele.
    if (/^(i|intent|home|search|hashtag)$/i.test(m[1])) continue;
    out.add(m[2]);
  }
  return out;
}

/**
 * Bir tweet URL'inden ID (admin elle eklerken).
 * @param {unknown} url
 * @returns {string|null}
 */
export function tweetIdFromUrl(url) {
  const ids = extractTweetIds(String(url ?? ""));
  return ids.size === 1 ? [...ids][0] : ids.size ? [...ids][0] : null;
}
