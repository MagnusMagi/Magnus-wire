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
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();
const [SUPABASE_URL, SERVICE_ROLE] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
const DRY = process.argv.includes("--dry");
const log = (...a) => console.log(new Date().toISOString(), ...a);

// Ulusal alan adı → ülke. Bu TLD'ler yayının beat'ini güvenilir biçimde veriyor.
const TLD_COUNTRY = {
  ".com.tr": "Türkiye", ".net.tr": "Türkiye", ".org.tr": "Türkiye", ".tr": "Türkiye",
  ".ee": "Estonia",
  ".co.uk": "United Kingdom", ".uk": "United Kingdom",
  ".de": "Germany", ".fr": "France", ".it": "Italy", ".es": "Spain",
  ".nl": "Netherlands", ".pl": "Poland", ".ie": "Ireland", ".pt": "Portugal",
  ".dk": "Denmark", ".fi": "Finland", ".ua": "Ukraine", ".ru": "Russia",
  ".in": "India", ".ph": "Philippines", ".mx": "Mexico", ".au": "Australia",
  ".com.au": "Australia", ".ca": "Canada", ".za": "South Africa", ".br": "Brazil",
  ".jp": "Japan", ".kr": "South Korea", ".cn": "China", ".sg": "Singapore",
  ".nz": "New Zealand", ".ng": "Nigeria", ".pk": "Pakistan", ".bd": "Bangladesh",
  ".ir": "Iran", ".il": "Israel", ".eg": "Egypt", ".ke": "Kenya",
  ".sa": "Saudi Arabia", ".tw": "Taiwan", ".th": "Thailand", ".vn": "Vietnam",
  ".hu": "Hungary", ".hr": "Croatia", ".ar": "Argentina", ".id": "Indonesia",
};

// Genel TLD'li ama beat'i belirli bir ülke olan ulusal yayınlar.
const HOST_COUNTRY = {
  "webrazzi.com": "Türkiye",
  "www.technopat.net": "Türkiye",
  "www.teknoblog.com": "Türkiye",
  "estonianworld.com": "Estonia",
  "feeds.bbci.co.uk": "United Kingdom",
  "www.theguardian.com": "United Kingdom",
  "rss.dw.com": "Germany",
};

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

function guessCountry(url) {
  const host = hostOf(url);
  if (!host) return null;
  if (HOST_COUNTRY[host]) return HOST_COUNTRY[host];
  // En uzun eşleşen TLD kazansın (.com.tr, .tr'den önce).
  const hit = Object.keys(TLD_COUNTRY)
    .filter((t) => host.endsWith(t))
    .sort((a, b) => b.length - a.length)[0];
  if (hit) return TLD_COUNTRY[hit];
  // Kalanlar küresel yayın sayılır — yanlış ülke yazmaktansa "Global".
  return "Global";
}

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data, error } = await sb.from("sources").select("id,url,name,priority").is("country", null);
  if (error) { log("okuma hatası", error.message); process.exit(1); }
  if (!data?.length) { log("ülkesi boş kaynak yok"); return; }
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

  // url/name da gönderilir: ON CONFLICT DO UPDATE'te bile Postgres geçerli bir
  // satır kurmak zorunda, NOT NULL kolonlar eksikse insert'ten önce patlar.
  for (let i = 0; i < updates.length; i += 200) {
    const { error: e } = await sb.from("sources").upsert(updates.slice(i, i + 200), { onConflict: "id" });
    if (e) { log("yazma hatası", e.message); process.exit(1); }
  }
  log(`bitti. ${updates.length} kaynak güncellendi`);
}

main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
