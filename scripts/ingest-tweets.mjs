// MagiWire — X tel havuzu toplayıcı.  Maliyet: $0 (hiçbir ücretli API yok).
//
// Üç iş yapar:
//   1) FEED TARAMASI (asıl keşif hattı) — kaynak havuzundan rotasyonla N RSS
//      beslemesi çeker ve ÖĞE İÇERİĞİNDE alıntılanan tweet linklerini arar.
//      ⚠️ Ek HTTP maliyeti YOK: feed zaten indiriliyor, tweet linki gövdesinde
//      duruyor. Ölçüm 2026-08-20: 60 besleme → 43 benzersiz tweet ID.
//   2) MAKALE TARAMASI (ikincil) — kendi dispatch'lerimizin kaynak makalesini
//      çeker; feed özetinde görünmeyen gömülü tweet'leri yakalar
//      (makalelerin ~%11'inde tweet linki var).
//   3) TAZELEME — havuzdaki taze tweet'lerin beğeni/yanıt sayısını günceller;
//      popülerlik sıralaması bayat sayılarla yapılmasın diye.
//
// Neden iki hat birden: feed taraması HIZLI ve GENİŞ ama yalnız gövdesini
// yayınlayan beslemelerde iş görür; makale taraması YAVAŞ ve DAR ama özet-only
// beslemelerde tek yol odur.
//
// ⚠️ Neden makale taraması? Ücretsiz syndication ucu ID'si BİLİNEN tweet'i
// verir; arama/trend/profil akışı uçları 404. Yani "hangi tweet" sorusunun
// ücretsiz cevabı, tweet'i zaten bizim için seçmiş olan gazetecilerdir.
import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env.mjs";
import { fetchTweet, fetchTweetRaw, normalizeTweet, quotedTweetOf, extractTweetIds, tweetIdTime } from "../src/lib/xSyndication.mjs";

loadEnv();
const [SUPABASE_URL, SERVICE_ROLE] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

// Koşu başına taranacak besleme sayısı. Rotasyon KENDİ damgamızla
// (sources.x_scanned_at) yürür — ingest.mjs'in last_fetched_at rotasyonuna
// dokunmak haber toplayıcının FIFO sırasını bozardı.
// 774 aktif kaynak / 60 ≈ 13 koşu; 10 dakikalık cron'da havuz ~2 saatte devrolur.
const XI_FEEDS_PER_RUN = Number(process.env.XI_FEEDS_PER_RUN || 60);
const FEED_TIMEOUT_MS = Number(process.env.XI_FEED_TIMEOUT_MS || 12000);
const FEED_CONCURRENCY = Number(process.env.XI_FEED_CONCURRENCY || 10);

// Koşu başına taranacak YENİ dispatch sayısı. ingest.mjs tur başına ~6 haber
// ekliyor ve ikisi de 30 dakikada bir koşuyor → 12 rahat bir pay.
const SCAN_PER_RUN = Number(process.env.XI_SCAN_PER_RUN || 12);
// Taranan makalenin yaş sınırı: eski makaleyi çekmek keşif getirisi düşük.
const SCAN_MAX_AGE_DAYS = Number(process.env.XI_SCAN_MAX_AGE_DAYS || 7);
const RESOLVE_PER_RUN = Number(process.env.XI_RESOLVE_PER_RUN || 40);
const REFRESH_PER_RUN = Number(process.env.XI_REFRESH_PER_RUN || 40);
// "Sıcak" pencere: bu yaştan genç teller bütçenin %60'ını alır.
const HOT_HOURS = Number(process.env.XI_HOT_HOURS || 24);
// Bundan eski tweet'in sayısı artık kayda değer değişmiyor; tazeleme bütçesi
// taze tweet'lere ayrılır.
const REFRESH_MAX_AGE_DAYS = Number(process.env.XI_REFRESH_MAX_AGE_DAYS || 10);
// Üst üste bu kadar çözülemeyen tweet kapatılır (silinmiş/gizlenmiş sayılır).
const FAIL_LIMIT = Number(process.env.XI_FAIL_LIMIT || 3);
// ⚠️ Budama DİL BAŞINA yapılır. Global "en çok beğeni alan N tweet"i tutmak
// dil filtresini ÖLDÜRÜRDÜ: İngilizce viral teller havuzu kaplar, Türkçe ve
// Estonca satırlar tek tek süpürülürdü. Haber tarafında birebir aynı tuzağa
// düşülmüştü (global budama → gundem vitrini kaplıyor → bölüm başına kota).
const KEEP_PER_LANG = Number(process.env.XI_KEEP_PER_LANG || 150);
// Bu yaştan genç HER tweet korunur: yeni tel henüz etkileşim topluyor, beğeni
// sayısına bakıp elemek onu daha yarışa girmeden diskalifiye etmek olurdu.
const GRACE_HOURS = Number(process.env.XI_GRACE_HOURS || 48);
const KEEP = Number(process.env.XI_KEEP || 3000);
const KEEP_DAYS = Number(process.env.XI_KEEP_DAYS || 45);
const CONCURRENCY = Number(process.env.XI_CONCURRENCY || 4);
const ARTICLE_TIMEOUT_MS = Number(process.env.XI_ARTICLE_TIMEOUT_MS || 12000);

const UA_BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString(), "[x]", ...a);

/** Basit eşzamanlılık havuzu — sıralı fetch cron aralığını yiyor. */
async function pool(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

/**
 * Makalenin HAM HTML'ini döndürür. ⚠️ Metne indirgemiyoruz: ingest.mjs'in
 * htmlToText'i <p> içeriğini alıp etiketleri siliyor, oysa alıntılanan
 * tweet'ler çoğu zaman <blockquote>/<iframe> href'lerinde duruyor — metne
 * indirgeyen bir tarama onları GÖREMEZ.
 */
async function fetchArticleHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ARTICLE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA_BROWSER, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;
    if (!/html/i.test(res.headers.get("content-type") || "")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ASIL KEŞİF HATTI. Rotasyonla beslemeleri çeker, öğe gövdelerinde tweet
 * linki arar. Döndürdüğü harita: tweet id → { name, section } kaynak izi.
 */
async function scanFeeds() {
  const { data: feeds, error } = await sb
    .from("sources")
    .select("id,url,name,section")
    .eq("active", true)
    .order("x_scanned_at", { ascending: true, nullsFirst: true })
    .limit(XI_FEEDS_PER_RUN);
  if (error) throw new Error(`kaynak okuma: ${error.message}`);
  if (!feeds?.length) return { feeds: 0, ok: 0, items: 0, found: new Map() };

  const parser = new Parser({
    timeout: FEED_TIMEOUT_MS,
    headers: { "User-Agent": UA_BROWSER },
  });
  const found = new Map();
  let ok = 0;
  let items = 0;

  await pool(feeds, FEED_CONCURRENCY, async (f) => {
    let parsed;
    try {
      parsed = await parser.parseURL(f.url);
    } catch {
      return; // ölü/yavaş besleme: ingest.mjs zaten sayaç tutup kapatıyor
    }
    ok++;
    for (const it of parsed.items ?? []) {
      items++;
      // ⚠️ Tüm gövde alanları birleştirilir: bazı beslemeler tam metni
      // content:encoded'da, bazıları description'da veriyor; yalnız birine
      // bakmak beslemelerin yarısını kör noktada bırakır.
      const blob = [it.content, it["content:encoded"], it.summary, it.description, it.contentSnippet, it.link]
        .filter(Boolean)
        .join(" ");
      for (const id of extractTweetIds(blob)) {
        if (!found.has(id)) found.set(id, { source_name: f.name, section: f.section ?? null, slug: null });
      }
    }
  });

  // Rotasyon damgası: besleme çekilemese de ilerletilir, yoksa ölü bir feed
  // kuyruğun başında takılıp havuzun devrini kilitler.
  const stamp = new Date().toISOString();
  const { error: e2 } = await sb.from("sources").update({ x_scanned_at: stamp }).in("id", feeds.map((f) => f.id));
  if (e2) log("rotasyon damgası hatası:", e2.message);

  return { feeds: feeds.length, ok, items, found };
}

async function discover() {
  const since = new Date(Date.now() - SCAN_MAX_AGE_DAYS * 86400000).toISOString();
  const { data: cands, error } = await sb
    .from("dispatches")
    .select("id,slug,source_url,source_name,section,published_at")
    .gte("published_at", since)
    .not("source_url", "is", null)
    .order("published_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(`dispatch okuma: ${error.message}`);

  // Taranmışları ele. PostgREST'te NOT IN alt sorgusu yok; kimlikler zaten
  // küçük bir küme olduğu için istemcide kesiştiriliyor.
  const ids = (cands ?? []).map((d) => d.id);
  const { data: scanned } = await sb.from("tweet_scans").select("dispatch_id").in("dispatch_id", ids);
  const seen = new Set((scanned ?? []).map((r) => r.dispatch_id));
  const todo = (cands ?? []).filter((d) => !seen.has(d.id)).slice(0, SCAN_PER_RUN);
  if (!todo.length) return { scanned: 0, failed: 0, found: new Map() };

  // id → ilk bulan dispatch (kaynak izi). Aynı tweet iki haberde geçerse ilki kalır.
  const found = new Map();
  let failed = 0;
  const scanRows = [];

  await pool(todo, CONCURRENCY, async (d) => {
    const html = await fetchArticleHtml(d.source_url);
    if (html === null) {
      failed++;
      // ⚠️ Başarısız makale de "tarandı" sayılır: aksi halde erişilemeyen bir
      // URL her koşuda tekrar denenip keşif bütçesini kalıcı olarak yer.
      // found_count = -1 bunu ayırt edilebilir tutuyor.
      scanRows.push({ dispatch_id: d.id, found_count: -1 });
      return;
    }
    const hits = extractTweetIds(html);
    for (const id of hits) {
      if (!found.has(id)) found.set(id, { source_name: d.source_name ?? null, section: d.section ?? null, slug: d.slug });
    }
    scanRows.push({ dispatch_id: d.id, found_count: hits.size });
  });

  if (scanRows.length) {
    const { error: e } = await sb.from("tweet_scans").upsert(scanRows, { onConflict: "dispatch_id" });
    if (e) log("tarama kaydı hatası:", e.message);
  }
  return { scanned: todo.length, failed, found };
}

async function resolveNew(found) {
  if (!found.size) return { added: 0, quoted: 0, rejected: 0 };
  const ids = [...found.keys()];

  // İki elek: (1) havuzda olanlar — aynı tweet onlarca haberde alıntılanıyor,
  // (2) daha önce çözülemeyenler. ⚠️ İkincisi olmadan feed taraması her
  // koşuda AYNI silinmiş/eski ID'leri yeniden çeker ve çözümleme bütçesini
  // tamamen yer; ölçüldü: 60 beslemenin 43 ID'sinin çoğu turdan tura aynı.
  const [{ data: existing }, { data: rejected }] = await Promise.all([
    sb.from("tweets").select("id").in("id", ids),
    sb.from("tweet_rejects").select("id").in("id", ids),
  ]);
  const skip = new Set([...(existing ?? []), ...(rejected ?? [])].map((r) => r.id));

  // ⚠️ Üçüncü elek BEDAVA: tweet ID'si snowflake, gönderim zamanı içinde gömülü
  // (tweetIdTime). Yaşı burada eleyince tek bir ağ isteği harcamıyoruz ve
  // sicile de yazmıyoruz — kayıt tutmanın anlamı yok, kontrol her koşuda ücretsiz.
  // Ölçüm: bu elek olmadan 40'lık bütçenin 39'u "eski" damgası yiyordu.
  const cutoff = Date.now() - KEEP_DAYS * 86400000;
  const fresh = ids
    .filter((id) => !skip.has(id) && tweetIdTime(id) >= cutoff)
    // En taze linkler önce: havuzda yüzlerce aday varken bütçe bugünün
    // tweet'lerine gitmeli, kuyruğun rastgele bir yerine değil.
    .sort((a, b) => tweetIdTime(b) - tweetIdTime(a))
    .slice(0, RESOLVE_PER_RUN);
  if (!fresh.length) return { added: 0, quoted: 0, rejected: 0 };

  const rows = [];
  const rejects = [];
  let quoted = 0;
  const now = new Date().toISOString();
  const tooOld = (iso) => Date.now() - Date.parse(iso) > KEEP_DAYS * 86400000;

  await pool(fresh, CONCURRENCY, async (id) => {
    const raw = await fetchTweetRaw(id);
    const t = normalizeTweet(raw);
    if (!t || !t.posted_at) {
      // Silinmiş, gizli, yaş kısıtlı VEYA geçici ağ hatası. Ayırt edemiyoruz;
      // sicile yazmak tekrar denemeyi engeller ama kaydı görünür tutar.
      rejects.push({ id, reason: t ? "tarihsiz" : "çözülemedi" });
      return;
    }
    // ⚠️ Yaş elemesi EKLEMEDEN ÖNCE: haberler sık sık yıllar öncesinin
    // tweet'ini alıntılıyor. Elenmezse satır yazılıp aynı koşunun budama
    // adımında geri silinir (ölçüldü: koşu başına 1-3 boşa yazma).
    if (tooOld(t.posted_at)) {
      rejects.push({ id, reason: "eski" });
      return;
    }
    // ⚠️ Gövdesiz tel hiç saklanmaz: sayfada gösterilmiyor (bkz lib/tweets.ts),
    // dolayısıyla satır yazmak yalnız kotayı ve tazeleme bütçesini yerdi.
    if (!t.text.trim() || t.lang === "und") {
      rejects.push({ id, reason: "metinsiz" });
      return;
    }
    const src = found.get(id) ?? {};
    rows.push({
      ...t,
      found_via: "article",
      source_dispatch_slug: src.slug ?? null,
      source_name: src.source_name ?? null,
      section: src.section ?? null,
      refreshed_at: now,
    });

    // Alıntılanan tweet AYNI yanıtın içinde tam haliyle geliyor — bedava tel.
    const q = quotedTweetOf(raw);
    if (q && q.posted_at && !tooOld(q.posted_at) && !skip.has(q.id) && q.text.trim() && q.lang !== "und") {
      quoted++;
      rows.push({
        ...q,
        found_via: "article",
        source_dispatch_slug: src.slug ?? null,
        source_name: src.source_name ?? null,
        section: src.section ?? null,
        refreshed_at: now,
      });
    }
  });

  if (rejects.length) {
    const { error } = await sb.from("tweet_rejects").upsert(rejects, { onConflict: "id" });
    if (error) log("sicil hatası:", error.message);
  }
  if (!rows.length) return { added: 0, quoted: 0, rejected: rejects.length };

  // Aynı koşuda hem doğrudan hem alıntı olarak gelen ID tekrarlanabilir;
  // upsert'e çift anahtar vermek PostgREST'te hata döndürür.
  const uniq = [...new Map(rows.map((r) => [r.id, r])).values()];
  const { error } = await sb.from("tweets").upsert(uniq, { onConflict: "id" });
  if (error) {
    log("ekleme hatası:", error.message);
    return { added: 0, quoted: 0, rejected: rejects.length };
  }
  return { added: uniq.length, quoted, rejected: rejects.length };
}

async function refresh() {
  // ⚠️ Bütçe İKİ ŞERİDE bölünür. Düz FIFO tazeleme, sayısı artık donmuş 9
  // günlük bir tweet ile hâlâ dakika başı beğeni alan 2 saatlik teli aynı
  // kuyruğa koyuyordu → havuz büyüdükçe taze tellerin sayıları saatlerce
  // bayat kalıyor, popülerlik sıralaması yanlış sırayla çiziliyordu.
  const hotBudget = Math.max(1, Math.round(REFRESH_PER_RUN * 0.6));
  const coldBudget = Math.max(1, REFRESH_PER_RUN - hotBudget);
  const hotSince = new Date(Date.now() - HOT_HOURS * 3600000).toISOString();
  const coldSince = new Date(Date.now() - REFRESH_MAX_AGE_DAYS * 86400000).toISOString();

  const [hot, cold] = await Promise.all([
    sb.from("tweets").select("id,fail_count").eq("active", true)
      .gte("posted_at", hotSince)
      .order("refreshed_at", { ascending: true, nullsFirst: true }).limit(hotBudget),
    sb.from("tweets").select("id,fail_count").eq("active", true)
      .gte("posted_at", coldSince).lt("posted_at", hotSince)
      .order("refreshed_at", { ascending: true, nullsFirst: true }).limit(coldBudget),
  ]);

  const list = [...(hot.data ?? []), ...(cold.data ?? [])];
  if (!list.length) return { updated: 0, closed: 0 };

  let updated = 0;
  let closed = 0;
  const now = new Date().toISOString();
  await pool(list, CONCURRENCY, async (row) => {
    const t = await fetchTweet(row.id);
    if (!t) {
      // ⚠️ Silinmiş tweet ile geçici ağ hatası AYNI null'ı döndürüyor; tek
      // başarısızlıkta kapatmak yanlış olurdu. Üst üste FAIL_LIMIT kez
      // çözülemeyen gerçekten gitmiştir.
      const fails = (row.fail_count ?? 0) + 1;
      const patch = fails >= FAIL_LIMIT
        ? { fail_count: fails, active: false, refreshed_at: now }
        : { fail_count: fails, refreshed_at: now };
      if (fails >= FAIL_LIMIT) closed++;
      await sb.from("tweets").update(patch).eq("id", row.id);
      return;
    }
    await sb.from("tweets").update({
      favorite_count: t.favorite_count,
      reply_count: t.reply_count,
      text: t.text,
      author_name: t.author_name,
      avatar_url: t.avatar_url,
      verified: t.verified,
      lang: t.lang,
      photos: t.photos,
      fail_count: 0,
      refreshed_at: now,
    }).eq("id", row.id);
    updated++;
  });
  return { updated, closed };
}

async function prune() {
  let deleted = 0;
  const del = async (ids) => {
    if (!ids.length) return;
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await sb.from("tweets").delete().in("id", ids.slice(i, i + 100));
      if (!error) deleted += Math.min(100, ids.length - i);
    }
  };

  // 1) Yaş tavanı. Sabitlenmiş tweet editör kararıdır — budama onu ATLAR.
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString();
  const { data: old } = await sb.from("tweets").select("id").eq("pinned", false).lt("posted_at", cutoff).limit(500);
  await del((old ?? []).map((r) => r.id));

  // 2) Dil başına kota. Yalnız GRACE_HOURS'tan eski satırlar yarışır; genç
  //    teller henüz etkileşim topladığı için dokunulmaz.
  const grace = new Date(Date.now() - GRACE_HOURS * 3600000).toISOString();
  const { data: langRows } = await sb.from("tweets").select("lang").eq("pinned", false).lt("posted_at", grace);
  const langs = [...new Set((langRows ?? []).map((r) => r.lang))];
  for (const lang of langs) {
    const { data: keepers } = await sb
      .from("tweets")
      .select("id")
      .eq("lang", lang)
      .eq("pinned", false)
      .lt("posted_at", grace)
      // Kota içinde kalanlar: o dilin EN ÇOK ETKİLEŞİM ALANLARI. Sıralama
      // burada sönümsüz (ham beğeni) — arşiv derinliği için "o gün ne popülerdi"
      // sorusunun cevabı, sayfadaki anlık sıralama değil.
      .order("favorite_count", { ascending: false })
      .limit(KEEP_PER_LANG);
    const keep = new Set((keepers ?? []).map((r) => r.id));
    const { data: all } = await sb
      .from("tweets")
      .select("id")
      .eq("lang", lang)
      .eq("pinned", false)
      .lt("posted_at", grace)
      .limit(2000);
    await del((all ?? []).map((r) => r.id).filter((id) => !keep.has(id)));
  }

  // 3) Global emniyet supabı. Dil kotalarının TOPLAMININ üstünde tutulmalı,
  //    yoksa emniyet supabı asıl kural haline gelir ve dil dengesini bozar.
  const { count } = await sb.from("tweets").select("*", { count: "exact", head: true });
  if ((count ?? 0) > KEEP) {
    const { data: extra } = await sb
      .from("tweets")
      .select("id")
      .eq("pinned", false)
      .order("posted_at", { ascending: true })
      .limit((count ?? 0) - KEEP);
    await del((extra ?? []).map((r) => r.id));
  }
  return deleted;
}

async function main() {
  // İki keşif hattı paralel: biri feed gövdelerini, diğeri makale HTML'ini
  // tarıyor. Sonuçlar tek haritada birleşir (feed izi, makale izini ezmez).
  const [feed, article] = await Promise.all([scanFeeds(), discover()]);
  const found = new Map(feed.found);
  for (const [id, src] of article.found) found.set(id, src); // makale izi daha zengin (dispatch slug'ı var)

  const { added, quoted, rejected } = await resolveNew(found);
  const { updated, closed } = await refresh();
  const deleted = await prune();

  if (process.env.REVALIDATE_SECRET) {
    try {
      const r = await fetch("http://127.0.0.1:3360/api/revalidate", {
        method: "POST",
        headers: { "x-revalidate-secret": process.env.REVALIDATE_SECRET },
      });
      log("revalidate:", r.status);
    } catch (e) {
      log("revalidate hatası", e.message);
    }
  }

  // Tek satırlık özet — "neden az tweet geldi?" sorusu log'dan cevaplanabilsin.
  log(
    `özet: feed ${feed.ok}/${feed.feeds} (${feed.items} öğe) + makale ${article.scanned} (${article.failed} erişilemedi) ` +
      `→ ${found.size} link, eklenen ${added} (alıntı ${quoted}), elenen ${rejected}, tazelenen ${updated}, kapatılan ${closed}, budanan ${deleted}`,
  );
}

// ⚠️ Açıkça exit ŞART. Eşzamanlı fetch sonrası keep-alive soketleri event
// loop'u açık tutuyor; cron `flock -n` ile koştuğu için asılı süreç kilidi
// bırakmaz ve SONRAKİ TÜM KOŞULAR SESSİZCE ATLANIR (bkz ingest.mjs'te aynı hata).
main()
  .then(() => process.exit(0))
  .catch((e) => {
    log("FATAL", e.message);
    process.exit(1);
  });
