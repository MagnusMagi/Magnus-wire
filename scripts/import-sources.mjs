#!/usr/bin/env node
// kaynaklar.md → public.sources
//
//   node scripts/import-sources.mjs [dosya]     (varsayılan: ./kaynaklar.md)
//
// Tekrar tekrar koşturulabilir: url unique, upsert eder. Kürasyonlu çekirdek
// (scripts/feeds.seed.mjs) en sona yazılır ki elle ayarlanmış section/region
// otomatik eşlemeyi ezsin.
import { readFileSync } from "node:fs";
import { connect, excludedSet, updateKeys } from "./lib/db.mjs";
import { loadEnv } from "./env.mjs";
import { parseSourcesMarkdown, guessCountry } from "./sources-map.mjs";
import { FEED_SEED } from "./feeds.seed.mjs";

loadEnv();

const log = (...a) => console.log(new Date().toISOString(), ...a);

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url.slice(0, 60); }
}

async function main() {
  const file = process.argv[2] || new URL("../kaynaklar.md", import.meta.url).pathname;
  let parsed = [];
  try {
    parsed = parseSourcesMarkdown(readFileSync(file, "utf8"));
    log(`${file}: ${parsed.length} kaynak ayrıştırıldı`);
  } catch (e) {
    log(`uyarı: ${file} okunamadı (${e.message}) — yalnız kürasyonlu çekirdek yazılacak`);
  }

  // url → satır. Sonra gelen öncekini ezer; kürasyonlu çekirdek en son eklenir.
  // `active` BİLEREK dışarıda bırakılır (aşağıdaki upsert notuna bakın) —
  // ayrıca satırların kolon kümesi birebir aynı kalmalı.
  const byUrl = new Map();
  for (const r of parsed) {
    byUrl.set(r.url, {
      url: r.url, name: r.name, category: r.category, section: r.section,
      region: r.region, country: r.country, lang: r.lang,
      // Havuzdan gelenler rotasyona tabi; çekirdek aşağıda true'ya çekilir.
      priority: false,
    });
  }

  const before = byUrl.size;
  for (const f of FEED_SEED) {
    const existing = byUrl.get(f.url);
    byUrl.set(f.url, {
      url: f.url,
      name: existing?.name || hostOf(f.url),
      category: existing?.category ?? null,
      // Kürasyonlu değer varsa o kazanır; yoksa markdown'dan geleni koru.
      section: f.section ?? existing?.section ?? null,
      // Bölgesiz bırakılmaz: bölge YEDEK olarak kullanılıyor (AI kararsız
      // kalınca buraya düşülüyor), null olsaydı haber hiçbir bölge sayfasına
      // girmezdi. Kürasyonlu küresel feed'ler "dunya"ya düşer.
      region: f.region ?? existing?.region ?? "dunya",
      // ⚠️ null YAZMA: kaynaklar.md'de olmayan kürasyonlu feed'lerin ülkesi
      // her içe aktarımda siliniyordu (backfill'in doldurduğu 26 kaynak).
      country: existing?.country ?? guessCountry(f.url),
      lang: existing?.lang ?? null,
      // Çekirdek her koşuda çekilir (rotasyona girmez) — bkz
      // sql/20260817_source_priority.sql. ⚠️ Admin'den elle verilen öncelik
      // bu import'ta sıfırlanır; kalıcı olması gereken kaynağı FEED_SEED'e ekle.
      priority: true,
    });
  }
  log(`kürasyonlu çekirdek: ${FEED_SEED.length} (${before + FEED_SEED.length - byUrl.size} tanesi listede zaten vardı)`);

  const rows = [...byUrl.values()];
  const sql = connect();

  // Parça parça yaz (tek INSERT'te parametre sayısı sınırlı).
  // Gönderilen kolonlar HER satırda aynı olmalı: tek INSERT'e birleşiyor ve
  // ilk satırın kolonları esas alınıyor.
  // `active` ve rotasyon sayaçları (last_fetched_at, fail_count...) bilerek
  // GÖNDERİLMİYOR — yeni satırlar DEFAULT true ile gelir, mevcut satırlarda
  // ingest'in otomatik kapattığı kaynaklar geri açılmaz, ilerleme sıfırlanmaz.
  const CHUNK = 200;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    try {
      await sql`insert into sources ${sql(chunk)} on conflict (url) do update set ${excludedSet(sql, updateKeys(chunk, "url"))}`;
    } catch (e) { log("yazma hatası", e.message); process.exit(1); }
    written += chunk.length;
    log(`yazıldı ${written}/${rows.length}`);
  }

  // Dosyada ❌ ile işaretlenenler açıkça kapatılır (ayrı geçiş: yukarıdaki
  // upsert'e `active` karışırsa mevcut durumu ezerdi).
  const disabled = parsed.filter((r) => !r.active).map((r) => r.url);
  if (disabled.length) {
    try {
      await sql`update sources set active = false where url in ${sql(disabled)}`;
      log(`dosyada ❌ olan ${disabled.length} kaynak kapatıldı`);
    } catch (e) { log("kapatma hatası", e.message); }
  }

  const [{ count }] = await sql`select count(*) as count from sources`;
  log(`bitti. tabloda toplam: ${count}`);
}

// Açıkça exit: keep-alive soketleri event loop'u açık
// tutuyor (bkz ingest.mjs'teki aynı not).
main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
