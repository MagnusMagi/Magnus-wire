#!/usr/bin/env node
// sources.country tek seferlik doldurma.
//
//   node scripts/backfill-country.mjs [--dry]
//
// Neden: bölge sınıflandırmasında AI'ya "bu kaynak hangi ülkenin yayını"
// bilgisini ipucu olarak veriyoruz. kaynaklar.md ülke başlığı taşıyan
// kaynaklarda bunu zaten sağlıyor, ama "Genel"/"Dünya" başlığı altındakilerde
// ve kürasyonlu çekirdekte boştu (67 çekirdek kaynağın 58'i).
//
// ⚠️ Küresel yayınlara ülke YAZILMAZ, "Global" yazılır. TechCrunch'a
// "United States" deseydik AI her haberini `abd` etiketlerdi — oysa Verge'ün
// Samsung haberi ABD haberi değil. Ülke yalnız beat'i kendi ülkesi olan
// ulusal yayınlara verilir.
import { connect } from "./lib/db.mjs";
import { loadEnv } from "./env.mjs";
import { guessCountry } from "./sources-map.mjs";

loadEnv();
const DRY = process.argv.includes("--dry");
const log = (...a) => console.log(new Date().toISOString(), ...a);

// Ulusal alan adı → ülke. Bu TLD'ler yayının beat'ini güvenilir biçimde veriyor.

// Genel TLD'li ama beat'i belirli bir ülke olan ulusal yayınlar.

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

async function main() {
  const sql = connect();
  let data;
  try {
    data = await sql`select id, url, name, priority from sources where country is null`;
  } catch (e) { log("okuma hatası", e.message); process.exit(1); }
  if (!data.length) { log("ülkesi boş kaynak yok"); return; }
  log(`ülkesi boş: ${data.length}`);

  const byCountry = {};
  const updates = data.map((r) => {
    const country = guessCountry(r.url);
    byCountry[country] = (byCountry[country] || 0) + 1;
    return { id: r.id, url: r.url, name: r.name, country };
  });

  for (const [c, n] of Object.entries(byCountry).sort((a, b) => b[1] - a[1])) {
    log(`  ${String(n).padStart(4)}  ${c}`);
  }
  if (DRY) { log("--dry: yazılmadı"); return; }

  // Satırlar zaten var → toplu UPDATE ... FROM (VALUES).
  try {
    await sql`
      update sources s set country = v.country
        from (values ${sql(updates.map((u) => [u.id, u.country]))}) as v(id, country)
       where s.id = v.id::bigint`;
  } catch (e) { log("yazma hatası", e.message); process.exit(1); }
  log(`bitti. ${updates.length} kaynak güncellendi`);
}

main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
