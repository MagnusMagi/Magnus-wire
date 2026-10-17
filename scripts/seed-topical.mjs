#!/usr/bin/env node
// scripts/feeds.topical.mjs → public.sources
//
//   node scripts/seed-topical.mjs           → rapor (hiçbir şey yazmaz)
//   node scripts/seed-topical.mjs --apply   → ekler
//
// ⚠️ import-sources.mjs'ten AYRI olmasının sebebi: o script md + kürasyonlu
// çekirdeği topluca yeniden yazıyor ve audit-sources.mjs ile elle onaylanmış
// düzeltmeleri de eziyor. Bu script YALNIZ kendi listesindeki satırlara
// dokunur, havuzun geri kalanını hiç okumaz.
//
// `active` ve rotasyon sayaçları BİLEREK gönderilmez: yeni satır DEFAULT
// true ile gelir, mevcut satırda ingest'in kapattığı kaynak geri açılmaz,
// ilerleme sıfırlanmaz (import-sources.mjs'teki aynı gerekçe).
import { connect, excludedSet, updateKeys } from "./lib/db.mjs";
import { loadEnv } from "./env.mjs";
import { TOPICAL_SEED } from "./feeds.topical.mjs";

loadEnv();
const APPLY = process.argv.includes("--apply");
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function main() {
  const sql = connect();
  const urls = TOPICAL_SEED.map((f) => f.url);
  let existing;
  try {
    existing = await sql`select url, section, active from sources where url in ${sql(urls)}`;
  } catch (e) { log("okuma hatası", e.message); process.exit(1); }
  const have = new Map(existing.map((r) => [r.url, r]));

  const yeni = TOPICAL_SEED.filter((f) => !have.has(f.url));
  const zaten = TOPICAL_SEED.filter((f) => have.has(f.url));
  log(`liste: ${TOPICAL_SEED.length} | yeni: ${yeni.length} | havuzda zaten var: ${zaten.length}`);
  for (const f of zaten) {
    const r = have.get(f.url);
    log(`  zaten var: ${f.url} (bölüm ${r.section || "yok"}, ${r.active ? "aktif" : "KAPALI"})`);
  }
  const bySection = {};
  for (const f of yeni) bySection[f.section] = (bySection[f.section] || 0) + 1;
  log(`eklenecek bölümler: ${JSON.stringify(bySection)}`);

  if (!APPLY) { log("rapor modu — hiçbir şey yazılmadı (--apply ile uygula)"); return; }
  if (!yeni.length) { log("eklenecek yeni kaynak yok"); return; }

  // Kolon kümesi HER satırda birebir aynı olmalı: toplu upsert tek INSERT'e
  // birleşiyor ve ilk satırın kolonları esas alınıyor.
  const rows = yeni.map((f) => ({
    url: f.url, name: f.name, section: f.section,
    // Bölge YEDEK olarak kullanılıyor (AI kararsız kalınca buraya düşülür);
    // null olsaydı haber hiçbir bölge sayfasına girmezdi.
    region: "dunya",
    // Küresel okur kitlesine yazan yayınlar → "Global". Merkez ülkesi yazılsaydı
    // AI her haberi o ülkenin bölgesine etiketlerdi (bkz backfill-country notu).
    country: "Global", lang: "en", category: null,
    priority: false,  // rotasyona tabi; çekirdek şeridi şişirmezler
  }));
  try {
    await sql`insert into sources ${sql(rows)} on conflict (url) do update set ${excludedSet(sql, updateKeys(rows, "url"))}`;
  } catch (e) { log("yazma hatası", e.message); process.exit(1); }
  log(`${rows.length} kaynak eklendi`);
}

main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
