// MagiWire — RSS → OpenAI (TR/EN/ET + bölge) → Supabase
import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const txt = readFileSync(join(__dir, "..", ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_PER_RUN = Number(process.env.INGEST_MAX || 24);
const KEEP = Number(process.env.INGEST_KEEP || 200);

// Feed başına SABİT bölge: Türkçe kaynaklar→turkiye, Eston kaynaklar→estonya
// (AI'nın içerikten bölge tahminini override eder). global teknoloji→region yok.
// global/TR/EE interleave: kısa turlarda (round-robin) her bölge paya girsin.
// section sabit olan feed'ler "gundem" (genel/güncel haber); diğerleri AI'nın
// seçtiği teknoloji bölümüne düşer. global/TR/EE/gündem interleave.
const FEED_LIST = [
  // ── 1. tur: her kategori/bölgeden birer kaynak (round-robin'in ilk turu bunları örnekler) ──
  { url: "https://techcrunch.com/feed/" },                                            // genel tech (AI sınıflar)
  { url: "https://www.ntv.com.tr/gundem.rss", region: "turkiye", section: "gundem" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", section: "kripto" },
  { url: "https://www.nasa.gov/news-release/feed/", section: "uzay" },
  { url: "https://www.bleepingcomputer.com/feed/", section: "siber" },
  { url: "https://dev.to/feed", section: "yazilim" },
  { url: "https://www.sciencedaily.com/rss/all.xml", section: "bilim" },
  { url: "https://www.eu-startups.com/feed/", region: "avrupa", section: "finans" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", section: "finans" },
  { url: "https://shiftdelete.net/feed", region: "turkiye" },
  { url: "https://news.err.ee/rss", region: "estonya" },
  { url: "https://www.err.ee/rss", region: "estonya" },               // ERR Estonca ana akış (öne çıkan/top haberler)
  { url: "https://www.theverge.com/rss/index.xml" },
  { url: "https://webrazzi.com/feed/", region: "turkiye", section: "finans" },
  { url: "https://tehnika.postimees.ee/rss", region: "estonya" },

  // ── 2. tur: ikinci kaynaklar ──
  { url: "https://cointelegraph.com/rss", section: "kripto" },
  { url: "https://www.space.com/feeds/all", section: "uzay" },
  { url: "https://feeds.feedburner.com/TheHackersNews", section: "siber" },
  { url: "https://github.blog/feed/", section: "yazilim" },
  { url: "https://www.newscientist.com/feed/home/", section: "bilim" },
  { url: "https://techcrunch.com/category/startups/feed/", section: "finans" },
  { url: "https://www.bloomberght.com/rss", region: "turkiye", section: "finans" },
  { url: "https://www.webtekno.com/rss.xml", region: "turkiye" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", section: "gundem" },
  { url: "https://feeds.arstechnica.com/arstechnica/technology-lab" },
  { url: "https://estonianworld.com/feed/", region: "estonya" },
  { url: "https://www.wired.com/feed/rss" },
  { url: "https://www.aa.com.tr/tr/rss/default?cat=guncel", region: "turkiye", section: "gundem" },
  { url: "https://www.dunya.com/rss", region: "turkiye", section: "finans" },
  { url: "https://www.donanimhaber.com/rss/tum/", region: "turkiye" },
  { url: "https://news.postimees.ee/rss", region: "estonya" },
  { url: "https://www.postimees.ee/rss", region: "estonya" },

  // ── 3. tur: üçüncü kaynaklar / derinlik ──
  { url: "https://decrypt.co/feed", section: "kripto" },
  { url: "https://phys.org/rss-feed/space-news/", section: "uzay" },
  { url: "https://krebsonsecurity.com/feed/", section: "siber" },
  { url: "https://phys.org/rss-feed/", section: "bilim" },
  { url: "https://sifted.eu/feed", region: "avrupa", section: "finans" },
  { url: "https://hnrss.org/frontpage" },
  { url: "https://www.engadget.com/rss.xml" },
  { url: "https://www.trthaber.com/manset_articles.rss", region: "turkiye", section: "gundem" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", section: "finans" },
  { url: "https://www.technopat.net/feed/", region: "turkiye" },
  { url: "https://feeds.bbci.co.uk/turkce/rss.xml", region: "turkiye", section: "gundem" },
  { url: "https://www.aripaev.ee/rss", region: "estonya", section: "finans" },
  { url: "https://www.geenius.ee/feed/", region: "estonya" },
  { url: "https://www.technologyreview.com/feed/" },
  { url: "https://www.chip.com.tr/rss/", region: "turkiye" },
  { url: "https://rss.dw.com/rdf/rss-tur-all", region: "turkiye", section: "gundem" },
  { url: "https://www.investing.com/rss/news.rss", section: "finans" },
  { url: "https://www.marketwatch.com/rss/topstories", section: "finans" },
  { url: "https://www.log.com.tr/feed/", region: "turkiye" },
  { url: "https://www.teknoblog.com/feed/", region: "turkiye" },
];
const FEEDS = process.env.INGEST_FEEDS
  ? process.env.INGEST_FEEDS.split(",").map((s) => ({ url: s.trim() })).filter((f) => f.url)
  : FEED_LIST;

const TOPICS = { "gundem": "Gündem", "finans": "Finans", "yapay-zeka": "Yapay Zeka", "yazilim": "Yazılım", "donanim": "Donanım", "bilim": "Bilim", "kripto": "Kripto", "siber": "Siber", "uzay": "Uzay" };
const REGIONS = new Set(["estonya", "turkiye", "avrupa", "abd"]);

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
function shortHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36).slice(0, 6); }

async function rewrite(item) {
  const sys = "Sen çok dilli bir haber editörüsün (teknoloji + güncel/gündem). Verilen kaynaktan özgün, kısa, doğru bir haber üret ve TÜRKÇE, İNGİLİZCE ve ESTONCA olarak yaz. Abartma, tıklama tuzağı kurma.";
  const snippet = (item.contentSnippet || item["content:encoded"] || item.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 2500);
  const bodyRule = "EN AZ 3 dolu paragraf (her paragraf 3-5 cümle, toplam ≥250 kelime). Markdown; gerekirse bir ## ara başlık. Bağlam, arka plan ve olası etkileri açıkla — yüzeysel özet GEÇME.";
  const factsRule = "haberin 3-5 kilit gerçeği / öne çıkan noktası; her madde tek kısa cümle, somut (sayı/isim/tarih varsa kullan)";
  const user = `Kaynak başlık: ${item.title}\nKaynak metin: ${snippet}\n\nHer dil için (tr, en, et) AYNI haberi tam olarak yaz. SADECE şu JSON'u döndür:\n{\n "section": "şunlardan biri: ${Object.keys(TOPICS).join(", ")}",\n "region": "şunlardan biri ya da boş: estonya, turkiye, avrupa, abd",\n "tags": ["2-4 küçük harf etiket"],\n "tr": {"title":"≤90 karakter", "summary":"tek cümle spot", "body":"${bodyRule}", "keyFacts":["${factsRule}"]},\n "en": {"title":"", "summary":"", "body":"(same body rule)", "keyFacts":[]},\n "et": {"title":"", "summary":"", "body":"(same body rule)", "keyFacts":[]}\n}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: OPENAI_MODEL, response_format: { type: "json_object" }, temperature: 0.6,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const o = JSON.parse((await res.json()).choices[0].message.content);
  if (!TOPICS[o.section]) o.section = "yapay-zeka";
  o.region = REGIONS.has(o.region) ? o.region : null;
  o.tags = Array.isArray(o.tags) ? o.tags.slice(0, 4).map((t) => slugify(String(t))) : [];
  for (const l of ["tr", "en", "et"]) {
    const c = o[l];
    if (!c?.title || !c?.body) throw new Error(`eksik ${l} içerik`);
    const paras = String(c.body).split(/\n\s*\n/).filter((p) => p.trim().length > 40);
    if (paras.length < 3) throw new Error(`${l} gövdesi 3 paragraftan kısa (${paras.length})`);
    c.keyFacts = Array.isArray(c.keyFacts) ? c.keyFacts.map((f) => String(f).trim()).filter(Boolean).slice(0, 5) : [];
    if (c.keyFacts.length < 3) throw new Error(`${l} keyFacts<3 (${c.keyFacts.length})`);
  }
  return o;
}

async function main() {
  for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_ROLE, OPENAI_API_KEY })) if (!v) { log("HATA eksik env", k); process.exit(1); }
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const parser = new Parser({ timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (compatible; MagiWireBot/1.0; +https://news.magnusmagi.com)" }, customFields: { item: [["media:content","media",{keepArray:true}],["media:thumbnail","mediaThumb"],"content:encoded"] } });

  const { data: existing } = await sb.from("dispatches").select("source_url,title").not("source_url", "is", null).limit(1000);
  const seen = new Set((existing || []).map((r) => r.source_url));

  const perFeed = [];
  for (const feed of FEEDS) {
    try { const f = await parser.parseURL(feed.url); const arr = [];
      for (const item of f.items || []) { if (item.link && !seen.has(item.link)) { arr.push({ item, feedTitle: f.title || feed.url, forcedRegion: feed.region || null, forcedSection: feed.section || null }); seen.add(item.link); } }
      perFeed.push(arr);
    } catch (e) { log("feed hatası", feed.url, e.message); }
  }
  // round-robin: her feed'den sırayla (görselli feed'ler de paya girsin)
  const candidates = [];
  for (let i = 0; ; i++) { let any = false; for (const arr of perFeed) { if (arr[i]) { candidates.push(arr[i]); any = true; } } if (!any) break; }
  log(`aday: ${candidates.length}, tur limiti ${MAX_PER_RUN}`);

  let inserted = 0;
  // Yüksek-hacimli forced section'lar (gündem/finans) tur başına sınırlanır ki
  // niş kategoriler (uzay, kripto, siber, bilim, yazılım, girişim) slot bulsun.
  const SECTION_CAPS = { gundem: Number(process.env.INGEST_GUNDEM_CAP || 5), finans: Number(process.env.INGEST_FINANS_CAP || 5) };
  const secCount = { gundem: 0, finans: 0 };
  const seenTitles = (existing || []).map((r) => normTitle(r.title)).filter((t) => t.length);
  for (const { item, feedTitle, forcedRegion, forcedSection } of candidates.slice(0, MAX_PER_RUN)) {
    try {
      if (forcedSection && SECTION_CAPS[forcedSection] != null && secCount[forcedSection] >= SECTION_CAPS[forcedSection]) { continue; }
      const o = await rewrite(item);
      if (forcedRegion) o.region = forcedRegion;
      if (forcedSection && TOPICS[forcedSection]) o.section = forcedSection;
      const nt = normTitle(o.tr.title);
      if (seenTitles.some((t) => jaccard(t, nt) > 0.6)) { log("benzer haber atlandı:", o.tr.title.slice(0, 44)); continue; }
      if (SECTION_CAPS[o.section] != null && secCount[o.section] >= SECTION_CAPS[o.section]) { continue; }
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
    } catch (e) { log("öğe hatası", item.link, e.message); }
  }

  const { data: newest } = await sb.from("dispatches").select("id").order("published_at", { ascending: false }).limit(1);
  if (newest?.[0]) { await sb.from("dispatches").update({ live: false }).neq("id", newest[0].id); await sb.from("dispatches").update({ live: true }).eq("id", newest[0].id); }

  const { data: all } = await sb.from("dispatches").select("id").order("published_at", { ascending: false });
  if (all && all.length > KEEP) { const drop = all.slice(KEEP).map((r) => r.id); const { error } = await sb.from("dispatches").delete().in("id", drop); if (!error) log(`budama: ${drop.length}`); }

  if (process.env.REVALIDATE_SECRET) {
    try { const r = await fetch("http://127.0.0.1:3360/api/revalidate", { method: "POST", headers: { "x-revalidate-secret": process.env.REVALIDATE_SECRET } }); log("revalidate:", r.status); } catch (e) { log("revalidate hatası", e.message); }
  }
  log(`bitti. eklenen: ${inserted}`);
}
main().catch((e) => { log("FATAL", e.message); process.exit(1); });
