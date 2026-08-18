// MagiWire — RSS → OpenAI (TR/EN/ET + bölge) → Supabase
import Parser from "rss-parser";
import { FEED_SEED } from "./feeds.seed.mjs";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.mjs";

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
// ⚠️ Hacim, sitenin tuttuğu içerikle orantılı olmalı. Eskiden tur başına 24 ×
// 48 koşu = günde ~1.000 haber üretiliyordu ama site yalnız KEEP kadarını
// tutuyordu: ölçüldü, bir günde 422 haber eklenip 422 haber silindi — ödenen
// içeriğin ~%80'i aynı gün çöpe gidiyordu. Az üret, çok tut.
const MAX_PER_RUN = Number(process.env.INGEST_MAX || 6);
// Global tavan (emniyet supabı). Asıl budama bölüm-başına yapılır.
// ⚠️ Bölüm tavanlarının TOPLAMININ ÜSTÜNDE kalmalı, yoksa emniyet supabı asıl
// kural haline gelir: global budama en eskileri bölüm ayırmadan siler ve
// bölüm-başına kotanın çözdüğü sorun (gundem'in vitrini kaplaması) geri gelir.
// Bugünkü tavanlar: 60+40+40+40 + 13x25 = 505 → 600 makul bir pay bırakıyor.
const KEEP = Number(process.env.INGEST_KEEP || 600);
// Bölüm başına tutulan haber sayısı. Global budama gündem'in (havuzun ~%37'si)
// vitrini kaplamasına yol açıyordu: 200 haberin 91'i gundem'ken oyun/otomobil/
// savunma/yaşam bölümleri TAMAMEN boştu. Artık her bölüm kendi penceresinde
// yarışıyor → niş bölümler dolu kalıyor, gündem kendi kendini deviriyor.
const KEEP_PER_SECTION = Number(process.env.INGEST_KEEP_PER_SECTION || 25);
// ⚠️ Tek bir sayı her bölüme uymuyor: tavan ÜRETİM HIZIYLA birlikte devir
// süresini belirliyor. Ölçüm 2026-08-18 — gundem günde 22 haber üretip 25
// slota sığdığı için oradaki bir başlık yalnız ~1,1 GÜN yaşıyordu; aynı anda
// savunma günde 2 üretiyor ve 25'e hiç yaklaşmıyor. Yani aynı tavan hızlı
// bölümü sığlaştırırken yavaş bölümde hiç devreye girmiyor.
// Yalnız ÜRETİMİ YÜKSEK bölümlere daha geniş pencere verilir; bu bir
// görünürlük ayarı değil, arşiv derinliği: ana sayfa zaten en yeniyi
// gösteriyor, tavan sadece bölüm sayfasının ne kadar geriye gittiğini
// belirliyor. INGEST_KEEP_PER_SECTION_OVERRIDES ile ezilebilir
// (biçim: "gundem=60,finans=40").
const KEEP_OVERRIDES = Object.fromEntries(
  (process.env.INGEST_KEEP_PER_SECTION_OVERRIDES || "gundem=60,finans=40,yazilim=40,donanim=40")
    .split(",").map((p) => p.split("=")).filter((p) => p.length === 2 && Number(p[1]) > 0)
    .map(([k, v]) => [k.trim(), Number(v)]),
);
const keepFor = (section) => KEEP_OVERRIDES[section] ?? KEEP_PER_SECTION;

// Kaynak havuzu 1000+ feed'e çıktığı için hepsi her koşuda çekilemez:
// - FEEDS_PER_RUN: bu koşuda çekilecek kaynak sayısı. En uzun süredir
//   çekilmemişler önce gelir (FIFO rotasyon) → havuz zamanla tamamen dolaşılır.
//   MAX_PER_RUN'ın biraz üstünde tutulur; round-robin'de baştaki kaynaklar
//   slot alır, fazlası yalnız yedek/çeşitlilik payıdır. Çok büyütmek boşa
//   ağ trafiği demek (OpenAI maliyeti MAX_PER_RUN'a bağlı, feed sayısına değil).
// - CONCURRENCY: fetch havuzu. Sıralı fetch 1000+ feed'de cron aralığını aşardı.
const FEEDS_PER_RUN = Number(process.env.INGEST_FEEDS_PER_RUN || 60);
const CONCURRENCY = Number(process.env.INGEST_CONCURRENCY || 12);
// Üst üste bu kadar hata veren kaynak otomatik kapatılır (ölü feed'ler havuzu
// tıkamasın). Başarılı çekimde sayaç sıfırlanır.
// Düşük tutuluyor: FIFO rotasyonda bir kaynak tam devir başına YALNIZ BİR KEZ
// denenir (1421 kaynak / 60 = ~24 koşu ≈ yarım gün), yani her hata ayrı bir güne
// denk gelir. 10 olsaydı ölü bir feed ~5 gün havuzda slot işgal ederdi.
const FAIL_LIMIT = Number(process.env.INGEST_FAIL_LIMIT || 3);
// ⚠️ GEÇİCİ hata KALICI kapatmaya yol açmamalı. Ölçüm 2026-08-18: kapatılmış
// 178 kaynağın 84'ü (%47) ölü değildi — 403 engelleme 64, 429 hız sınırı 9,
// timeout 9, 5xx 2. Üçü de zamanla düzelen durumlar, üstelik 429 doğrudan
// BİZİM çok hızlı vurduğumuzun işareti; cezayı kaynağın çekmesi tersine bir
// tepki. Geri açan hiçbir mekanizma olmadığı için havuz tek yönlü eriyordu.
// Bu yüzden geçici hatalar ayrı ve çok daha yüksek bir eşikle kapatılır:
// sonsuza dek denenmezler (rotasyon slotu israfı olurdu) ama üç vuruşta da
// emekli edilmezler. Kalıcı hatalar (404/410/DNS/ayrıştırma) eskisi gibi.
const TRANSIENT_FAIL_LIMIT = Number(process.env.INGEST_TRANSIENT_FAIL_LIMIT || 12);
const TRANSIENT_RE = /\b(403|408|425|429|500|502|503|504)\b|timed out|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang up|network|aborted/i;
const isTransient = (status) => !!status && TRANSIENT_RE.test(String(status));
// Bundan eski öğeler rewrite edilmeden elenir (bkz isFresh).
const MAX_AGE_DAYS = Number(process.env.INGEST_MAX_AGE_DAYS || 7);

// Koşu başına gerçek token tüketimi + maliyet. Fiyatlar 1M token başına USD;
// env'den ezilebilir ki fiyat değişince kod değiştirmeden güncellensin.
const PRICE_IN = Number(process.env.OPENAI_PRICE_IN || 0.15);
const PRICE_OUT = Number(process.env.OPENAI_PRICE_OUT || 0.60);
const tokenUse = { calls: 0, in: 0, out: 0 };

// AI'nın sınıflandırabileceği bölümler (slug → kicker etiketi).
// site.ts'teki borsa/hava/deprem BİLEREK yok: onlar canlı-veri panosu, haber
// listesi değil. finans'ın sayfası yok ama Borsa'da "Piyasa Haberleri" olarak
// gösterildiği için sınıflandırmada duruyor.
const TOPICS = {
  "gundem": "Gündem", "finans": "Finans", "yapay-zeka": "Yapay Zeka",
  "yazilim": "Yazılım", "donanim": "Donanım", "girisim": "Girişim",
  "bilim": "Bilim", "uzay": "Uzay", "kripto": "Kripto", "siber": "Siber",
  "savunma": "Savunma", "otomobil": "Otomobil", "oyun": "Oyun", "spor": "Spor",
  "kultur": "Kültür", "tasarim": "Tasarım", "yasam": "Yaşam",
};
// site.ts'teki REGIONS ile aynı küme olmalı.
const REGIONS = new Set(["turkiye", "estonya", "avrupa", "abd", "asya", "amerika", "afrika", "okyanusya", "dunya"]);

function log(...a) { console.log(new Date().toISOString(), ...a); }
function slugify(s) {
  const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
  return s.toLowerCase().replace(/[çğıöşüİ]/g, (c) => map[c] || c).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function extractImage(item) {
  try {
    if (item.enclosure?.url && /^https?:/.test(item.enclosure.url) && /(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.type || item.enclosure.url)) return item.enclosure.url;
    const m = item.media?.find?.((x) => x?.$?.url);
    if (m?.$?.url) return m.$.url;
    if (item.mediaThumb?.$?.url) return item.mediaThumb.$.url;
    const html = item["content:encoded"] || item.content || "";
    const mm = html.match(/<img[^>]+src=["\']([^"\']+)["\']/i);
    if (mm && /^https?:/.test(mm[1])) return mm[1];
  } catch {}
  return null;
}
async function fetchOgImage(url) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; MagiWireBot/1.0; +https://news.magnusmagi.com)" } });
    clearTimeout(to);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 250000);
    const pick = (re) => { const m = html.match(re); return m ? m[1] : null; };
    let img = pick(/<meta[^>]+(?:property|name)=["\']og:image(?::url)?["\'][^>]+content=["\']([^"\']+)["\']/i)
           || pick(/<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']og:image["\']/i)
           || pick(/<meta[^>]+name=["\']twitter:image(?::src)?["\'][^>]+content=["\']([^"\']+)["\']/i);
    if (img && img.startsWith("//")) img = "https:" + img;
    else if (img && img.startsWith("/")) { try { img = new URL(url).origin + img; } catch {} }
    return img && /^https?:\/\//.test(img) ? img.replace(/&amp;/g, "&") : null;
  } catch { return null; }
}
const STOP = new Set(["ve","ile","bir","bu","için","the","and","for","with","ja","ning","kui","das","der","die"]);
function normTitle(s) {
  const map = { "ç":"c","ğ":"g","ı":"i","ö":"o","ş":"s","ü":"u" };
  return [...new Set((s || "").toLowerCase().replace(/[çğıöşü]/g, (c) => map[c] || c).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)))];
}
function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b); let inter = 0;
  for (const x of new Set(a)) if (sb.has(x)) inter++;
  return inter / (a.length + b.length - inter);
}
// Budama `published_at` sıralı ve yalnız en yeni KEEP kadarı kalıyor. Havuzda
// blog/evergreen kaynaklar da olduğu için eski yazılar önce OpenAI'ye
// gönderilip hemen ardından budanıyordu — çift israf. Yaşlıları rewrite'tan
// ÖNCE ele. Tarihi olmayan öğe taze sayılır (feed'lerin bir kısmı tarih vermiyor).
function isFresh(item) {
  const raw = item.isoDate || item.pubDate;
  if (!raw) return true;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= MAX_AGE_DAYS * 86400000;
}
function shortHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36).slice(0, 6); }

async function rewrite(item, source = {}) {
  // Gövde YALNIZ Türkçe üretilir. EN/ET için sadece başlık + spot istenir:
  // liste/kategori/arama sayfaları ve sitemap üç dilde anlamlı kalsın diye.
  // EN/ET gövdesi, biri o dildeki habere gerçekten girdiğinde çevrilip
  // kaydedilir (src/lib/translate.ts) — yani gövde maliyeti okunma sayısına
  // bağlı, ingest hacmine değil. Ölçüm: TR payı üretimin %33'ü, bu değişiklik
  // çıktı token'ını ~%60 düşürüyor.
  // ⚠️ keyFacts vurgusu sys prompt'ta AÇIKÇA duruyor: gövdeyi tek dile indiren
  // ilk sürümde model dikkatini "sadece başlık/spot çevir" kısmına verip
  // tr.keyFacts'i boş bırakmaya başlamıştı → öğelerin çoğu doğrulamada eleniyordu.
  const sys = "Sen çok dilli bir haber editörüsün (teknoloji + güncel/gündem). Verilen kaynaktan özgün, kısa, doğru bir haber üret. Gövdeyi yalnız TÜRKÇE yaz; İngilizce ve Estonca için sadece başlık ve spot çevir. tr.keyFacts alanı ZORUNLUDUR ve en az 3 madde içermelidir — boş bırakma. Abartma, tıklama tuzağı kurma.";
  const snippet = (item.contentSnippet || item["content:encoded"] || item.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 2500);
  const bodyRule = "EN AZ 3 dolu paragraf (her paragraf 3-5 cümle, toplam ≥250 kelime). Markdown; gerekirse bir ## ara başlık. Bağlam, arka plan ve olası etkileri açıkla — yüzeysel özet GEÇME.";
  const factsRule = "haberin 3-5 kilit gerçeği / öne çıkan noktası; her madde tek kısa cümle, somut (sayı/isim/tarih varsa kullan)";
  // Kaynağın ülkesi AI'ya BAĞLAM olarak verilir, cevap olarak değil.
  // Zorlama modelinde kaynağın ülkesi doğrudan bölge oluyordu ve Türk
  // gazetesinin "Belçika'da orman yangını" haberi `turkiye` etiketi alıyordu.
  // Şimdi karar içerikten veriliyor; ülke yalnız bağlam sağlıyor (örn. "obruk"
  // haberinin Türkiye'yle ilgili olduğunu anlamak için).
  const originLine = source.country && source.country !== "Global"
    ? `Bu kaynak ${source.country} yayınıdır. Bu YALNIZCA bağlamdır — bölgeyi haberin KONUSUNA göre seç, kaynağın ülkesini otomatik kopyalama. Haber başka bir ülkeyi anlatıyorsa o ülkenin bölgesini yaz.`
    : `Bu kaynak küresel bir yayındır; bölgeyi haberin konusundan çıkar.`;
  const user = `Kaynak: ${source.name || item.title}\n${originLine}\n\nKaynak başlık: ${item.title}\nKaynak metin: ${snippet}\n\nGövdeyi SADECE Türkçe yaz. "en" ve "et" için yalnızca başlık ve spot'un çevirisini ver — gövde YAZMA. SADECE şu JSON'u döndür:\n{\n "section": "şunlardan biri: ${Object.keys(TOPICS).join(", ")}",\n "region": "haberin KONUSU hangi coğrafyaysa şunlardan TAM BİRİ — DAHA SPESİFİK OLANI SEÇ: turkiye (Türkiye), estonya (Estonya), abd (ABD), avrupa (diğer Avrupa ülkeleri), asya (Japonya, Çin, Hindistan, Orta Doğu, Güneydoğu Asya...), amerika (ABD DIŞINDAKİ Amerika: Kanada, Meksika, Brezilya, Arjantin...), afrika (Afrika ülkeleri), okyanusya (Avustralya, Yeni Zelanda), dunya (belirli bir ülkeyle ilgili olmayan küresel haberler)",\n "tags": ["2-4 küçük harf etiket"],\n "tr": {"title":"≤90 karakter", "summary":"tek cümle spot", "body":"${bodyRule}", "keyFacts":["ZORUNLU, 3-5 madde — ${factsRule}"]},\n "en": {"title":"tr.title'ın İngilizcesi", "summary":"tr.summary'nin İngilizcesi"},\n "et": {"title":"tr.title'ın Estoncası", "summary":"tr.summary'nin Estoncası"}\n}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: OPENAI_MODEL, response_format: { type: "json_object" }, temperature: 0.6,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  // Gerçek token tüketimi ölçülür — maliyet tahmin edilmesin. Elenen öğeler de
  // (3 paragraf / keyFacts doğrulamasına takılanlar) sayaca dahil, çünkü çağrı
  // yapıldığı an ücretlendiriliyor.
  tokenUse.calls++;
  tokenUse.in += json.usage?.prompt_tokens || 0;
  tokenUse.out += json.usage?.completion_tokens || 0;
  const o = JSON.parse(json.choices[0].message.content);
  // Sınıflandırılamayan öğe "gundem"e düşer. (Eskiden "yapay-zeka" idi; havuz
  // teknoloji dışına açılınca alakasız haberleri AI bölümüne dolduruyordu.)
  if (!TOPICS[o.section]) o.section = "gundem";
  o.region = REGIONS.has(o.region) ? o.region : null;
  o.tags = Array.isArray(o.tags) ? o.tags.slice(0, 4).map((t) => slugify(String(t))) : [];
  // TR tam doğrulanır: gövde + keyFacts kalite eşiği burada.
  const tr = o.tr;
  if (!tr?.title || !tr?.body) throw new Error("eksik tr içerik");
  const paras = String(tr.body).split(/\n\s*\n/).filter((p) => p.trim().length > 40);
  if (paras.length < 3) throw new Error(`tr gövdesi 3 paragraftan kısa (${paras.length})`);
  tr.keyFacts = Array.isArray(tr.keyFacts) ? tr.keyFacts.map((f) => String(f).trim()).filter(Boolean).slice(0, 5) : [];
  if (tr.keyFacts.length < 3) throw new Error(`tr keyFacts<3 (${tr.keyFacts.length})`);
  // EN/ET'den yalnız başlık + spot beklenir. Model yine de gövde döndürürse
  // atılır — gövdenin tek kaynağı TR, çevirisi talep üzerine üretilir.
  for (const l of ["en", "et"]) {
    const c = o[l];
    if (!c?.title || !c?.summary) throw new Error(`eksik ${l} başlık/spot`);
    o[l] = { title: String(c.title).trim(), summary: String(c.summary).trim() };
  }
  return o;
}

// Bu koşuda çekilecek kaynakları seçer.
// Öncelik: INGEST_FEEDS env (elle deneme) → DB rotasyonu → kürasyonlu çekirdek.
async function selectFeeds(sb) {
  if (process.env.INGEST_FEEDS) {
    const list = process.env.INGEST_FEEDS.split(",").map((s) => ({ url: s.trim() })).filter((f) => f.url);
    log(`kaynak: INGEST_FEEDS env (${list.length})`);
    return list;
  }
  const cols = "id,url,name,section,region,country,fail_count,priority";
  // Çekirdek (priority) rotasyona TABİ DEĞİL: her koşuda çekilir. Havuz 1421'e
  // çıkınca bunlar da kuyruğa girmişti ve 30 dk yerine ~12 saatte bir
  // çekiliyorlardı — son dakika haberi yarım gün gecikiyordu.
  const [core, rest] = await Promise.all([
    sb.from("sources").select(cols).eq("active", true).eq("priority", true),
    sb.from("sources").select(cols).eq("active", true).eq("priority", false)
      // FIFO rotasyon: hiç çekilmemişler (null) en önde.
      .order("last_fetched_at", { ascending: true, nullsFirst: true })
      .limit(FEEDS_PER_RUN),
  ]);
  if (core.error || rest.error) {
    log("sources okunamadı, çekirdeğe düşülüyor:", (core.error || rest.error).message);
    return FEED_SEED.map((f) => ({ ...f, isCore: true }));
  }
  // ⚠️ Çekirdek şerit KARIŞTIRILIR. Rotasyon havuzu FIFO ile adil dolaşılıyor
  // ama çekirdek her koşuda aynı dizi sırasıyla geliyordu; tur başına yalnız
  // ~3 çekirdek denemesi olduğu için hep listenin ilk feed'leri kazanıyordu.
  // Sonuç: 5 sağlıklı girisim kaynağı (sifted/webrazzi/eu-startups/techcrunch)
  // öğe döndürdüğü halde bölüm günlerce BOŞ kaldı. Karıştırma her koşuda farklı
  // çekirdek feed'lere öncelik verir, zamanla hepsi pay alır.
  const coreRows = (core.data || [])
    .map((f) => ({ ...f, isCore: true, _r: Math.random() }))
    .sort((a, b) => a._r - b._r);
  const restRows = (rest.data || []).map((f) => ({ ...f, isCore: false }));
  if (!coreRows.length && !restRows.length) {
    log("sources boş, çekirdeğe düşülüyor (scripts/import-sources.mjs koştur)");
    return FEED_SEED.map((f) => ({ ...f, isCore: true }));
  }
  log(`kaynak: çekirdek ${coreRows.length} (her koşuda) + rotasyon ${restRows.length}`);
  return [...coreRows, ...restRows];
}

// Çekim sonuçlarını kaynaklara yazar: rotasyon saati, hata sayacı, ölü feed kapatma.
// Kaynak DB'den gelmediyse (env/çekirdek fallback) id yok → atlanır.
// Feed çekimi rss-parser'ın parseURL'i yerine BURADAN geçer: UA yedeği için
// isteği kendimiz kurmamız gerekiyor.
//
// Dürüst bot kimliği VARSAYILAN kalır; yalnız 403 alındığında bir kez yaygın
// bir tarayıcı kimliğiyle tekrar denenir. Ölçüldü 2026-08-18: 403 veren 12
// beslemenin 2'si (~%17) tarayıcı kimliğiyle 200 dönüyor, gerisi Cloudflare /
// veri merkezi IP engeli — yani bu bir "403'leri yok eden" numara değil,
// ~11 kaynaklık mütevazı bir kurtarma. Sıralama bilinçli: kimliğimizi
// saklamayı varsayılan yapmıyoruz, yalnız reddedilince başvuruyoruz.
const UA_BOT = "Mozilla/5.0 (compatible; MagiWireBot/1.0; +https://news.magnusmagi.com)";
const UA_BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const FEED_TIMEOUT_MS = Number(process.env.INGEST_FEED_TIMEOUT_MS || 15000);

async function fetchFeed(parser, url) {
  let last;
  for (const ua of [UA_BOT, UA_BROWSER]) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          signal: ctrl.signal, redirect: "follow",
          headers: { "User-Agent": ua, Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8" },
        });
        // Hata metni "Status code NNN" biçiminde tutulur: sources.last_status'ta
        // zaten bu biçim yazılı ve isTransient() ona göre eşleşiyor.
        if (!res.ok) throw new Error(`Status code ${res.status}`);
        return await parser.parseString(await res.text());
      } finally { clearTimeout(timer); }
    } catch (e) {
      last = e;
      if (!/\b403\b/.test(e.message || "")) throw e;  // 403 dışında UA'nın ilgisi yok
    }
  }
  throw last;
}

async function recordFeedStats(sb, feeds, stats) {
  const now = new Date().toISOString();
  const updates = [];
  for (let i = 0; i < feeds.length; i++) {
    const feed = feeds[i];
    const st = stats[i];
    if (!feed.id || !st) continue;
    updates.push({
      // url/name da gönderilir: ON CONFLICT DO UPDATE'te bile Postgres önce
      // geçerli bir satır kurar, NOT NULL kolonlar eksikse insert'ten ÖNCE patlar.
      id: feed.id, url: feed.url, name: feed.name,
      last_fetched_at: now,
      last_status: st.ok ? "ok" : st.error,
      fail_count: st.ok ? 0 : (feed.fail_count || 0) + 1,
      item_count: st.ok ? st.items : 0,
    });
  }
  if (!updates.length) return;
  const { error } = await sb.from("sources").upsert(updates, { onConflict: "id" });
  if (error) { log("kaynak istatistiği yazılamadı:", error.message); return; }

  // Üst üste çok hata veren kaynakları kapat — eşik hatanın TÜRÜNE bağlı
  // (bkz TRANSIENT_FAIL_LIMIT). Karar son hataya göre verilir: bir kaynak
  // 404 vermeye başladıysa geçmişteki timeout'ları onu kurtarmamalı.
  const dead = updates
    .filter((u) => u.fail_count >= (isTransient(u.last_status) ? TRANSIENT_FAIL_LIMIT : FAIL_LIMIT))
    .map((u) => u.id);
  if (dead.length) {
    const { error: e2 } = await sb.from("sources").update({ active: false }).in("id", dead);
    if (!e2) log(`ölü kaynak kapatıldı: ${dead.length}`);
  }
  const nursing = updates.filter((u) => !u.last_status?.startsWith("ok") && isTransient(u.last_status) && u.fail_count >= FAIL_LIMIT).length;
  if (nursing) log(`geçici hatayla ayakta tutulan kaynak: ${nursing} (kalıcı eşik ${TRANSIENT_FAIL_LIMIT})`);
}

async function main() {
  for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_ROLE, OPENAI_API_KEY })) if (!v) { log("HATA eksik env", k); process.exit(1); }
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  // timeout/headers artık fetchFeed'in işi; parser yalnız parseString için.
  const parser = new Parser({ customFields: { item: [["media:content","media",{keepArray:true}],["media:thumbnail","mediaThumb"],"content:encoded"] } });

  const { data: existing } = await sb.from("dispatches").select("source_url,title").not("source_url", "is", null).limit(1000);
  const seen = new Set((existing || []).map((r) => r.source_url));

  const feeds = await selectFeeds(sb);

  // Eşzamanlı çekim: havuz CONCURRENCY kadar feed'i paralel işler. perFeed
  // sırası feeds sırasıyla AYNI kalmalı (round-robin adaleti buna dayanıyor),
  // o yüzden sonuç kendi indeksine yazılır.
  const perFeed = new Array(feeds.length).fill(null).map(() => []);
  const stats = new Array(feeds.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= feeds.length) return;
      const feed = feeds[i];
      try {
        const f = await fetchFeed(parser, feed.url);
        for (const item of f.items || []) {
          if (item.link && !seen.has(item.link) && isFresh(item)) {
            perFeed[i].push({
              item, feedTitle: f.title || feed.name || feed.url,
              forcedRegion: feed.region || null, forcedSection: feed.section || null,
              country: feed.country || null,
            });
            seen.add(item.link);
          }
        }
        stats[i] = { ok: true, items: perFeed[i].length };
      } catch (e) {
        stats[i] = { ok: false, error: e.message.slice(0, 200) };
        log("feed hatası", feed.url, e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, feeds.length) }, worker));
  const okCount = stats.filter((s) => s?.ok).length;
  log(`feed: ${feeds.length} çekildi, ${okCount} başarılı, ${feeds.length - okCount} hatalı`);
  // Rotasyon saatini hemen yaz: sonraki adımlar patlasa bile bu koşuda çekilen
  // kaynaklar kuyruğun sonuna gitsin, yoksa aynı 60 kaynak sonsuza dek dönerdi.
  await recordFeedStats(sb, feeds, stats);

  // round-robin: her feed'den sırayla (görselli feed'ler de paya girsin)
  const roundRobin = (lists) => {
    const out = [];
    for (let i = 0; ; i++) {
      let any = false;
      for (const arr of lists) { if (arr[i]) { out.push(arr[i]); any = true; } }
      if (!any) break;
    }
    return out;
  };
  // İki şerit ayrı ayrı round-robin'lenip 1:1 harmanlanır. Düz birleştirme
  // yapılsaydı çekirdeğin ~55 adayı rewrite bütçesini tek başına bitirir,
  // rotasyon havuzu hiç pay alamazdı (yani 1366 kaynağı eklemenin anlamı kalmazdı).
  const coreCands = roundRobin(perFeed.filter((_, i) => feeds[i].isCore));
  const restCands = roundRobin(perFeed.filter((_, i) => !feeds[i].isCore));
  const candidates = [];
  for (let i = 0; i < Math.max(coreCands.length, restCands.length); i++) {
    if (coreCands[i]) candidates.push(coreCands[i]);
    if (restCands[i]) candidates.push(restCands[i]);
  }
  log(`aday: ${candidates.length} (çekirdek ${coreCands.length} + rotasyon ${restCands.length}), tur limiti ${MAX_PER_RUN}`);

  let inserted = 0;
  // Tur başına bölüm kotası. Kaynak havuzu 1000+'e çıkınca gündem kaynakları
  // (havuzun ~%37'si) her turu doldurabiliyor → HER bölüme genel bir tavan,
  // yüksek hacimli iki bölüme daha sıkısı. Niş bölümler böylece slot bulur.
  // Kota MAX_PER_RUN'a göre ölçeklenir: sabit 6 olsaydı 6'lık bir turda kota
  // hiç bağlayıcı olmaz, tek koşu tamamen gündem olabilirdi. ~dörtte bir kuralı
  // her turda en az 3-4 farklı bölüm garantiler.
  const DEFAULT_CAP = Number(process.env.INGEST_SECTION_CAP || Math.max(2, Math.ceil(MAX_PER_RUN / 4)));
  const SECTION_CAPS = Object.fromEntries(Object.keys(TOPICS).map((s) => [s, DEFAULT_CAP]));
  SECTION_CAPS.gundem = Number(process.env.INGEST_GUNDEM_CAP || DEFAULT_CAP);
  SECTION_CAPS.finans = Number(process.env.INGEST_FINANS_CAP || DEFAULT_CAP);
  const secCount = Object.fromEntries(Object.keys(TOPICS).map((s) => [s, 0]));
  const seenTitles = (existing || []).map((r) => normTitle(r.title)).filter((t) => t.length);

  // Aday listesi ESKİDEN slice(0,MAX_PER_RUN) ile önden kesiliyordu. Kota
  // atlamaları (`continue`) o slotları boşa harcadığı için, rotasyon penceresi
  // tek bir bölüme yüklendiğinde koşu yarım kalıyordu: kota 6'da dolar, kalan
  // 18 slot çöpe gider, listedeki diğer adaylara hiç bakılmazdı.
  // Artık TÜM adaylar taranır; durma koşulu iki tane:
  //   inserted >= MAX_PER_RUN   → hedef eklemeye ulaşıldı
  //   attempts >= MAX_ATTEMPTS  → OpenAI çağrısı tavanı (maliyet sınırı)
  // Kota atlaması rewrite'tan ÖNCE olduğu için bedava, attempts'i artırmaz.
  const MAX_ATTEMPTS = Number(process.env.INGEST_MAX_ATTEMPTS || MAX_PER_RUN);
  let attempts = 0;
  const skips = { kota: 0, benzer: 0, hata: 0 };
  for (const { item, feedTitle, forcedRegion, forcedSection, country } of candidates) {
    if (inserted >= MAX_PER_RUN || attempts >= MAX_ATTEMPTS) break;
    try {
      if (forcedSection && SECTION_CAPS[forcedSection] != null && secCount[forcedSection] >= SECTION_CAPS[forcedSection]) { skips.kota++; continue; }
      attempts++;
      const o = await rewrite(item, { country, name: feedTitle });
      // Bölge zorlaması artık YEDEK, override DEĞİL.
      // Zorlama kaynağın ülkesini haberin konusu sanıyordu: Türk gazetesinin
      // "Belçika'da dev orman yangını" haberi `turkiye` etiketi alıyordu.
      // AI içerikten bir bölge çıkarabildiyse ona güvenilir; yalnız kararsız
      // kaldığında (null) kaynağın ülkesine düşülür.
      if (!o.region && forcedRegion) o.region = forcedRegion;
      if (forcedSection && TOPICS[forcedSection]) o.section = forcedSection;
      // "dunya" bölgesi 28 ülkeyi topluyor; ülke bilgisi kaybolmasın diye
      // etiket olarak eklenir (/ara?tag=india ile bulunabilir).
      if (country) o.tags = [...new Set([...o.tags, slugify(country)])].slice(0, 5);
      const nt = normTitle(o.tr.title);
      if (seenTitles.some((t) => jaccard(t, nt) > 0.6)) { skips.benzer++; log("benzer haber atlandı:", o.tr.title.slice(0, 44)); continue; }
      if (SECTION_CAPS[o.section] != null && secCount[o.section] >= SECTION_CAPS[o.section]) { skips.kota++; continue; }
      const hero = extractImage(item) || (await fetchOgImage(item.link));
      const slug = `${slugify(o.tr.title)}-${shortHash(item.link)}`;
      const row = {
        slug, kicker: TOPICS[o.section], section: o.section, region: o.region, tags: o.tags,
        hero, live: false, author: "Tel Masası", source_url: item.link, source_name: feedTitle,
        published_at: item.isoDate || new Date().toISOString(),
        title: o.tr.title, summary: o.tr.summary, body: o.tr.body,
        content: { tr: o.tr, en: o.en, et: o.et },
      };
      const { error } = await sb.from("dispatches").upsert(row, { onConflict: "source_url", ignoreDuplicates: true });
      if (error) { log("insert hatası", slug, error.message); continue; }
      inserted++; seenTitles.push(nt); if (secCount[o.section] != null) secCount[o.section]++;
      log("eklendi:", o.section, o.region || "-", slug);
    } catch (e) { skips.hata++; log("öğe hatası", item.link, e.message); }
  }
  // Az eklendiyse sebebi görünsün: eskiden kota atlamaları sessizdi ve koşunun
  // neden yarım kaldığı log'dan anlaşılmıyordu.
  log(`özet: eklenen ${inserted}/${MAX_PER_RUN}, rewrite ${attempts}/${MAX_ATTEMPTS}, atlanan → kota ${skips.kota}, benzer ${skips.benzer}, hata ${skips.hata}`);
  const cost = (tokenUse.in / 1e6) * PRICE_IN + (tokenUse.out / 1e6) * PRICE_OUT;
  // 48 koşu/gün (30 dk'lık cron) → günlük/aylık izdüşüm.
  log(`maliyet: ${tokenUse.calls} çağrı, girdi ${tokenUse.in} + çıktı ${tokenUse.out} token, ` +
      `bu koşu $${cost.toFixed(4)} → günlük ~$${(cost * 48).toFixed(2)}, aylık ~$${(cost * 48 * 30).toFixed(2)}`);

  const { data: newest } = await sb.from("dispatches").select("id").order("published_at", { ascending: false }).limit(1);
  if (newest?.[0]) { await sb.from("dispatches").update({ live: false }).neq("id", newest[0].id); await sb.from("dispatches").update({ live: true }).eq("id", newest[0].id); }

  // Budama: önce BÖLÜM BAŞINA, sonra global tavan.
  // Tek global tavan gündem'in vitrini kaplamasına yol açıyordu (200 haberin
  // 91'i gundem, oyun/otomobil/savunma/yaşam ise tamamen boş). Her bölüm artık
  // kendi penceresinde yarışıyor.
  const { data: all } = await sb.from("dispatches")
    .select("id,section")
    .order("published_at", { ascending: false });
  if (all?.length) {
    const perSection = {};
    const drop = [];
    const survivors = [];
    for (const r of all) {  // published_at DESC → her bölümün en yenisi önce
      const n = (perSection[r.section] = (perSection[r.section] || 0) + 1);
      if (n > keepFor(r.section)) drop.push(r.id);
      else survivors.push(r.id);
    }
    const bolumBasina = drop.length;
    // Bölüm kotalarından sonra hâlâ tavanı aşıyorsa en eskiler gider.
    if (survivors.length > KEEP) drop.push(...survivors.slice(KEEP));
    if (drop.length) {
      // ⚠️ Parça parça sil: `in` filtresi URL'e gömülüyor, birkaç yüz id
      // PostgREST'in URL sınırını aşabiliyor.
      let deleted = 0;
      for (let i = 0; i < drop.length; i += 100) {
        const { error } = await sb.from("dispatches").delete().in("id", drop.slice(i, i + 100));
        if (error) { log("budama hatası", error.message); break; }
        deleted += Math.min(100, drop.length - i);
      }
      log(`budama: ${deleted} (bölüm kotası ${bolumBasina}, global tavan ${drop.length - bolumBasina})`);
    }
  }

  if (process.env.REVALIDATE_SECRET) {
    try { const r = await fetch("http://127.0.0.1:3360/api/revalidate", { method: "POST", headers: { "x-revalidate-secret": process.env.REVALIDATE_SECRET } }); log("revalidate:", r.status); } catch (e) { log("revalidate hatası", e.message); }
  }
  log(`bitti. eklenen: ${inserted}`);
}
// ⚠️ Açıkça exit ŞART. Eşzamanlı fetch'ten sonra keep-alive soketleri açık
// kalıyor ve main() bittiği halde event loop kapanmıyor (süreç ep_poll'da
// dakikalarca asılı kalıyor). Cron `flock -n` ile koştuğu için asılı süreç
// kilidi bırakmaz → SONRAKİ TÜM KOŞULAR SESSİZCE ATLANIR. Tüm yazmalar
// main() içinde await edildiği için burada çıkmak veri kaybettirmez.
main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
