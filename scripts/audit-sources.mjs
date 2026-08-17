#!/usr/bin/env node
// Kaynakların ülke ve bölüm atamalarını LLM ile denetler.
//
//   node scripts/audit-sources.mjs            → rapor (hiçbir şey yazmaz)
//   node scripts/audit-sources.mjs --apply    → önerileri uygular
//   node scripts/audit-sources.mjs --limit 50 → yalnız ilk N kaynak
//
// Neden gerekiyor: ülkeler TLD tahminiyle dolduruldu (.com.tr güvenilir ama
// tüm .com'lara "Global" dendi) ve bölüm ataması kaynaklar.md'nin 51 kategorisi
// üzerinden TOPLU yapıldı — kaynak bazında hiç doğrulanmadı.
//
// Maliyeti düşük tutmak için kaynaklar TOPLU gönderilir (BATCH tanesi bir
// çağrıda): 774 kaynak ~39 çağrı ≈ $0.02. Tek tek sorulsaydı 774 çağrı olurdu.
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();
const [SUPABASE_URL, SERVICE_ROLE, OPENAI_API_KEY] = requireEnv(
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY",
);
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 0;
const BATCH = Number(process.env.AUDIT_BATCH || 20);
const CONCURRENCY = Number(process.env.AUDIT_CONCURRENCY || 6);

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ingest.mjs'teki TOPICS ile aynı küme olmalı — AI yalnız bunlara atayabilir.
const SECTIONS = [
  "gundem", "finans", "yapay-zeka", "yazilim", "donanim", "girisim", "bilim",
  "uzay", "kripto", "siber", "savunma", "otomobil", "oyun", "spor", "kultur",
  "tasarim", "yasam",
];

// Ülke adları veritabanındaki kanonik yazımla SINIRLI. Serbest bırakılınca
// model "Türkiye"yi "Turkey"e çeviriyordu — mapRegion tam string eşleşmesine
// baktığı için bu bölge eşlemesini sessizce kırardı.
let COUNTRY_VOCAB = ["Global"];

const usage = { calls: 0, in: 0, out: 0 };

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

async function auditBatch(rows) {
  // ⚠️ TAM URL gönderilir, host değil: besleme yolu konuyu belirliyor
  // (theguardian.com/uk/travel/rss → seyahat). Host'a bakan ilk sürüm
  // Guardian'ı "genel yayın" sanıp seyahat beslemesinin bölümünü siliyordu.
  const list = rows
    .map((r, i) => `${i + 1}. ${r.name} — ${r.url}${r.category ? ` [katalog kategorisi: ${r.category}]` : ""} (mevcut: ülke=${r.country || "?"}, bölüm=${r.section || "yok"})`)
    .join("\n");

  const sys = "Sen bir haber kaynağı kataloğu denetçisisin. Verilen RSS kaynakları için ÜLKE ve BÖLÜM atamalarının doğruluğunu değerlendir. Emin değilsen değişiklik ÖNERME.";
  const user = `Her kaynak için iki alanı kontrol et:

ÜLKE: SADECE şu listeden bir değer kullan (birebir aynı yaz, çeviri/eşanlam KULLANMA):
${COUNTRY_VOCAB.join(", ")}
Yayının beat'i belirli bir ülkeyse o ülke, değilse "Global".
Uluslararası/küresel yayınlarsa "Global". ⚠️ Merkezi ABD'de olan ama küresel yayın yapanlar (TechCrunch, The Verge, Wired gibi) "Global"dır, "United States" DEĞİL. "United States" yalnız ABD'yi konu alan ulusal yayınlar içindir.

BÖLÜM: şunlardan biri ya da null (uygun değilse): ${SECTIONS.join(", ")}
Kaynak tek bir konuya adanmışsa o bölüm; genel/karışık yayınsa null.
URL'nin YOLUNA dik: /travel/, /sport/, /business/ gibi bölüm beslemeleri o konuya adanmıştır — yayının tamamına değil, BESLEMEYE bak.
Yalnız GERÇEKTEN yanlış olanları bildir. İsim biçimi, eşanlam veya küçük tercih farkı için öneri YAPMA.

Kaynaklar:
${list}

SADECE YANLIŞ olanları döndür. Doğru olanları listeleme. JSON:
{"duzeltmeler":[{"i":1,"ulke":"...","bolum":"...","neden":"kısa gerekçe"}]}
Değiştirilmeyecek alanı atla. Bölüm null olacaksa "bolum":null yaz.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL, response_format: { type: "json_object" }, temperature: 0,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = await res.json();
  usage.calls++;
  usage.in += json.usage?.prompt_tokens || 0;
  usage.out += json.usage?.completion_tokens || 0;

  const parsed = JSON.parse(json.choices[0].message.content);
  const out = [];
  for (const d of parsed.duzeltmeler ?? []) {
    const row = rows[Number(d.i) - 1];
    if (!row) continue;
    // Modelin uydurduğu bölüm adlarını ele.
    const bolum = d.bolum === null || d.bolum === undefined ? undefined
      : SECTIONS.includes(d.bolum) ? d.bolum : undefined;
    const ulkeRaw = typeof d.ulke === "string" ? d.ulke.trim() : "";
    const ulke = COUNTRY_VOCAB.includes(ulkeRaw) ? ulkeRaw : undefined;
    const change = {};
    if (ulke && ulke !== row.country) change.country = ulke;
    if (d.bolum === null && row.section !== null) change.section = null;
    else if (bolum && bolum !== row.section) change.section = bolum;
    if (Object.keys(change).length) {
      out.push({ row, change, neden: String(d.neden || "").slice(0, 120) });
    }
  }
  return out;
}

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  let q = sb.from("sources").select("id,url,name,country,section,category,priority").order("priority", { ascending: false }).order("id");
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) { log("okuma hatası", error.message); process.exit(1); }
  const { data: vocab } = await sb.from("sources").select("country").not("country", "is", null);
  COUNTRY_VOCAB = [...new Set((vocab || []).map((v) => v.country))].sort();
  log(`denetlenecek kaynak: ${data.length}, parti boyu ${BATCH}, ülke sözlüğü ${COUNTRY_VOCAB.length}`);

  const batches = [];
  for (let i = 0; i < data.length; i += BATCH) batches.push(data.slice(i, i + BATCH));

  const findings = [];
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= batches.length) return;
      try {
        const res = await auditBatch(batches[i]);
        findings.push(...res);
        log(`parti ${i + 1}/${batches.length}: ${res.length} öneri`);
      } catch (e) {
        log(`parti ${i + 1} hatası:`, e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));

  const cost = (usage.in / 1e6) * 0.15 + (usage.out / 1e6) * 0.6;
  log(`\n=== ${findings.length} öneri (${data.length} kaynakta) ===`);
  for (const f of findings) {
    const parts = [];
    if ("country" in f.change) parts.push(`ülke ${f.row.country} → ${f.change.country}`);
    if ("section" in f.change) parts.push(`bölüm ${f.row.section || "yok"} → ${f.change.section || "yok"}`);
    console.log(`  ${f.row.priority ? "★" : " "} ${hostOf(f.row.url).padEnd(30)} ${parts.join(", ")}  — ${f.neden}`);
  }
  log(`maliyet: ${usage.calls} çağrı, ${usage.in}+${usage.out} token, $${cost.toFixed(4)}`);

  if (!APPLY) { log("rapor modu — hiçbir şey yazılmadı (--apply ile uygula)"); return; }
  for (const f of findings) {
    const { error: e } = await sb.from("sources").update(f.change).eq("id", f.row.id);
    if (e) log("yazma hatası", f.row.url, e.message);
  }
  log(`${findings.length} kaynak güncellendi`);
}

main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
