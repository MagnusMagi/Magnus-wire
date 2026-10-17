#!/usr/bin/env node
// Kaynakların ülke ve bölüm atamalarını LLM ile denetler.
//
//   node scripts/audit-sources.mjs            → rapor (hiçbir şey yazmaz)
//   node scripts/audit-sources.mjs --apply    → önerileri uygular
//   node scripts/audit-sources.mjs --limit 50 → yalnız ilk N kaynak
//   --force → toplu bölüm silme emniyetini aş (bkz WIPE_LIMIT)
//   --json <dosya> → bulguları JSON yaz (seçerek uygulamak için)
//   --from <dosya> → JSON'daki bulguları uygula (LLM'e hiç gitmez)
//
// Neden gerekiyor: ülkeler TLD tahminiyle dolduruldu (.com.tr güvenilir ama
// tüm .com'lara "Global" dendi) ve bölüm ataması kaynaklar.md'nin 51 kategorisi
// üzerinden TOPLU yapıldı — kaynak bazında hiç doğrulanmadı.
//
// Maliyeti düşük tutmak için kaynaklar TOPLU gönderilir (BATCH tanesi bir
// çağrıda): 774 kaynak ~39 çağrı ≈ $0.12. Tek tek sorulsaydı 774 çağrı olurdu.
import { readFileSync, writeFileSync } from "node:fs";
import { connect } from "./lib/db.mjs";
import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();
const [OPENAI_API_KEY] = requireEnv(
  "OPENAI_API_KEY",
);
// ⚠️ gpt-4o-mini bu iş için YETERSİZ, ölçüldü (2026-08-18, aynı prompt, 774 kaynak):
//   gpt-4o-mini → 161 öneri, bunların 35'i bölüm SİLME ve hepsi uydurma.
//                 Gerekçeleri kendi önerisiyle çelişiyordu ("Genel haber
//                 kaynağı" deyip Al Jazeera'nın `gundem` bölümünü silmek,
//                 Guardian'ın Meksika beslemesini Mexico→Global yapmak).
//   gpt-5-mini   → 72 öneri, bölüm silme SIFIR; DW Türkçe/Euronews Türkçe'yi
//                 doğru şekilde Türkiye'ye çekti, yukarıdaki tuzakların
//                 hiçbirine düşmedi.
// Fark $0.016 → $0.117; denetim seyrek koştuğu için önemsiz.
// ⚠️ BİLEREK `OPENAI_MODEL` OKUNMUYOR. O değişken ingest.mjs'e ait ve
// .env.local'de gpt-4o-mini'ye sabitli (haber yeniden yazımı her koşuda
// çalışır, aylık ~$4 bütçe ona bağlı). Denetim seyrek koşar ve doğruluk
// ister → kendi değişkeni var. Bir kez bu tuzağa düşüldü: kod varsayılanı
// gpt-5-mini yapıldı ama .env.local sessizce ezip denetimi yine 4o-mini ile
// koşturdu, "düzeltildi" sanılan koşu eski hataları üretti.
const MODEL = process.env.AUDIT_MODEL || "gpt-5-mini";
const SUPPORTS_TEMPERATURE = !/^(gpt-5|o[1-9])/.test(MODEL);
// $/1M token (girdi, çıktı). Bilinmeyen model 4o-mini fiyatıyla raporlanır —
// maliyet satırı bilgi amaçlı, faturalandırma değil.
const PRICES = {
  "gpt-4o-mini": [0.15, 0.6], "gpt-4o": [2.5, 10],
  "gpt-4.1": [2, 8], "gpt-4.1-mini": [0.4, 1.6], "gpt-4.1-nano": [0.1, 0.4],
  "gpt-5": [1.25, 10], "gpt-5-mini": [0.25, 2],
};
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
// Bir koşuda kaç bölüm silmesine izin verilir (üstünde --force şart).
const WIPE_LIMIT = Number(process.env.AUDIT_WIPE_LIMIT || 5);
// Bulguları makine-okunur dosyaya yaz: insan gözden geçirip SEÇEREK
// uygulayabilsin. Rapor metni kısaltma yapıyor (uzun URL, query string) —
// karar dosyası olarak KULLANILAMAZ.
const JSON_OUT = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
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

// ⚠️ Raporda HOST DEĞİL, host+yol yazılır. Host'a indirgeyen eski sürüm
// theguardian.com/world/mexico/rss ile theguardian.com/world/rss'i ayırt
// edilemez kılıyordu → doğru satırlar raporda saçma görünüyordu.
function labelOf(url) {
  try {
    const u = new URL(url);
    const label = u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
    return label.length > 52 ? label.slice(0, 51) + "…" : label;
  } catch { return url.slice(0, 52); }
}

// Bölümü kaldırma niyetinin AÇIK sentinel'i. Bkz auditBatch'teki null notu.
const WIPE = "YOK";

// Alan hem {yeni,neden} nesnesi hem de düz değer olarak gelebilir (model
// sözleşmeye her zaman uymuyor). Düz değerde satır geneli `neden`e düşülür.
function fieldOf(v, fallbackNeden) {
  const neden = (x) => String(x || "").slice(0, 120);
  if (v === undefined) return { yeni: undefined, neden: "" };
  if (v !== null && typeof v === "object") {
    return { yeni: v.yeni === undefined ? undefined : v.yeni, neden: neden(v.neden || fallbackNeden) };
  }
  return { yeni: v, neden: neden(fallbackNeden) };
}

async function auditBatch(rows) {
  // ⚠️ TAM URL gönderilir, host değil: besleme yolu konuyu belirliyor
  // (theguardian.com/uk/travel/rss → seyahat). Host'a bakan ilk sürüm
  // Guardian'ı "genel yayın" sanıp seyahat beslemesinin bölümünü siliyordu.
  const list = rows
    .map((r, i) => `${i + 1}. ${r.name} — ${r.url}${r.category ? ` [katalog kategorisi: ${r.category}]` : ""} (mevcut: ülke=${r.country || "?"}, bölüm=${r.section || "yok"})`)
    .join("\n");

  // ⚠️ Bu prompt bir kez baştan yazıldı. İlk sürüm 774 kaynakta 344 öneri
  // üretti ve baskın desenlerin hepsi YANLIŞTI: (1) "gundem"in genel haber
  // bölümü olduğu söylenmediği için 70 ulusal gazeteden bölümü silmek istedi,
  // (2) "küresel yayınlara United States yazma" talimatını 62 kez çiğnedi,
  // (3) bilerek taşıdığımız Personal finance kaynaklarını finans'a geri istedi.
  // Ders: denetçiye kuralları DEĞİL, gerekçeleri ve karşı-örnekleri ver.
  const sys = "Sen bir haber kaynağı kataloğu denetçisisin. Mevcut atamalar genelde DOĞRUDUR; görevin yalnız AÇIK ve KESİN hataları yakalamak. Şüphe varsa, tercih farkıysa ya da 'daha iyi olabilir' diyorsan SUSMAK doğrudur. Boş liste döndürmek başarısızlık değildir.";
  const user = `Her kaynak için iki alanı kontrol et. SADECE açık hataları bildir.

ÜLKE: SADECE şu listeden bir değer kullan (birebir aynı yaz, çeviri/eşanlam KULLANMA):
${COUNTRY_VOCAB.join(", ")}
Yayının HABER ODAĞI belirli bir ülkeyse o ülke, uluslararası okur için yayın yapıyorsa "Global".
⚠️ ŞİRKET MERKEZİ ÖNEMLİ DEĞİL, OKUR KİTLESİ ÖNEMLİ. TechCrunch/Verge/Wired/Engadget merkezleri ABD'de ama dünya okuruna yazar → "Global". "United States" yalnız ABD iç haberlerini ABD'lilere veren yayınlar içindir.
⚠️ Mevcut ülke zaten makul bir ulusal ülkeyse (Australia, Japan, Spain, Poland...) DOKUNMA — "Global"a çevirmek neredeyse her zaman yanlıştır.
Bu alan çoğu kaynakta doğrudur; ancak apaçık yanlışsa öneri yap.

BÖLÜM: şunlardan biri ya da null: ${SECTIONS.join(", ")}
⚠️ "gundem" = GENEL HABER bölümüdür. Genel/karışık haber yayınları (ulusal gazeteler, haber ajansları, TV kanalları) "gundem"e AİTTİR — onlara null ÖNERME.
null yalnız hiçbir bölüme oturmayan kaynaklar içindir.
⚠️ Kişisel finans / para biriktirme / alışveriş tavsiyesi kaynakları BİLEREK "yasam"a atanmıştır (haber değil, yaşam tarzı içeriği) — bunları "finans"a taşımayı ÖNERME.
URL'nin YOLUNA dik: /travel/, /sport/, /business/ gibi bölüm beslemeleri o konuya adanmıştır — yayının tamamına değil, BESLEMEYE bak.
Yalnız GERÇEKTEN yanlış olanları bildir. İsim biçimi, eşanlam veya küçük tercih farkı için öneri YAPMA.

Kaynaklar:
${list}

SADECE YANLIŞ olanları döndür. Doğru olanları listeleme. JSON:
{"duzeltmeler":[{"i":1,"ulke":{"yeni":"United States","neden":"o alana özgü kısa gerekçe"},"bolum":{"yeni":"finans","neden":"o alana özgü kısa gerekçe"}}]}

⚠️ ÇIKTI KURALLARI — bunlara uymazsan öneri ATILIR:
1. Değişiklik önermediğin alanı HİÇ YAZMA. Alanı mevcut değeriyle tekrar yazmak öneri DEĞİLDİR.
2. Her alanın gerekçesi KENDİ içinde olur ve YALNIZ o alanı anlatır. Bölümle ilgili gerekçeyi ülke alanına yazma.
3. Bölümü KALDIRMAK istiyorsan "bolum":{"yeni":"YOK","neden":"..."} yaz. null YAZMA.
4. Bir kuralı tekrar etmek ("gundem'e null önerilmez") öneri değildir — o durumda o kaynak için HİÇBİR ŞEY döndürme.
5. Hiç hata yoksa {"duzeltmeler":[]} döndür.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL, response_format: { type: "json_object" },
      // ⚠️ gpt-5 / o-serisi `temperature`i reddediyor (400: "Only the default
      // (1) value is supported"). Eski sürüm bu modellerde HER partiyi
      // hataya düşürüp "0 öneri" diye sessizce bitiyordu.
      ...(SUPPORTS_TEMPERATURE ? { temperature: 0 } : {}),
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

    const change = {};
    const reasons = {};

    // ⚠️ Ülke: sözlükte olmayan değer atılır; mevcut değere eşitse öneri DEĞİL.
    const u = fieldOf(d.ulke, d.neden);
    if (u.yeni !== undefined) {
      const v = String(u.yeni).trim();
      if (COUNTRY_VOCAB.includes(v) && v !== row.country) {
        change.country = v; reasons.country = u.neden;
      }
    }

    // ⚠️ Bölüm: SİLME yalnız açık "YOK" sentinel'iyle olur. Model `null`'ı
    // "değişiklik yok" anlamında da kullanıyor (ölçüldü 2026-08-18: zaten
    // gundem olan 20 kaynağa `"bolum":null` + gerekçe olarak KURALIN KENDİSİ
    // — "gündem kaynaklarına null önerilmez" — döndürdü). Eski kod bunu
    // "section'ı NULL yap" sanıyordu; --apply o kaynakların bölümünü silerdi.
    const b = fieldOf(d.bolum, d.neden);
    if (b.yeni !== undefined && b.yeni !== null) {
      const v = String(b.yeni).trim();
      if (v === WIPE) {
        if (row.section !== null) { change.section = null; reasons.section = b.neden; }
      } else if (SECTIONS.includes(v) && v !== row.section) {
        change.section = v; reasons.section = b.neden;
      }
    }

    if (Object.keys(change).length) out.push({ row, change, reasons });
  }
  return out;
}

async function main() {
  const sql = connect();

  // --from: önceden üretilmiş (ve İNSAN TARAFINDAN AYIKLANMIŞ) bulguları
  // uygular. Yeniden denetim çalıştırmaz — model kararı ile uygulama arasına
  // insan girsin diye ayrıldı.
  const fromIdx = process.argv.indexOf("--from");
  if (fromIdx > -1) {
    const file = process.argv[fromIdx + 1];
    const saved = JSON.parse(readFileSync(file, "utf8"));
    log(`${file}: ${saved.length} bulgu okundu`);
    if (!APPLY) { log("--apply verilmedi, hiçbir şey yazılmadı"); return; }
    let ok = 0;
    for (const f of saved) {
      try {
        await sql`update sources set ${sql(f.change)} where id = ${f.id}`;
        ok++;
      } catch (e) { log("yazma hatası", f.url, e.message); }
    }
    log(`${ok}/${saved.length} kaynak güncellendi`);
    return;
  }
  let data;
  try {
    data = await sql`
      select id, url, name, country, section, category, priority from sources
       order by priority desc, id ${LIMIT ? sql`limit ${LIMIT}` : sql``}`;
  } catch (e) { log("okuma hatası", e.message); process.exit(1); }
  const vocab = await sql`select distinct country from sources where country is not null`;
  COUNTRY_VOCAB = vocab.map((v) => v.country).sort();
  log(`denetlenecek kaynak: ${data.length}, parti boyu ${BATCH}, ülke sözlüğü ${COUNTRY_VOCAB.length}, model ${MODEL}`);

  const batches = [];
  for (let i = 0; i < data.length; i += BATCH) batches.push(data.slice(i, i + BATCH));

  const findings = [];
  let cursor = 0;
  let failed = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= batches.length) return;
      try {
        const res = await auditBatch(batches[i]);
        findings.push(...res);
        log(`parti ${i + 1}/${batches.length}: ${res.length} öneri`);
      } catch (e) {
        failed++;
        log(`parti ${i + 1} hatası:`, e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));

  const [pIn, pOut] = PRICES[MODEL] || PRICES["gpt-4o-mini"];
  const cost = (usage.in / 1e6) * pIn + (usage.out / 1e6) * pOut;
  // ⚠️ Düşen parti sayısı GÖRÜNÜR olmalı: hepsi düşse bile eski sürüm
  // "0 öneri" yazıp sıfır hatayla bitiyordu — temiz denetim gibi okunuyordu.
  if (failed) log(`⚠️ ${failed}/${batches.length} parti HATA aldı — sonuç EKSİK.`);
  log(`\n=== ${findings.length} öneri (${data.length} kaynakta${failed ? `, ${failed} parti eksik` : ""}) ===`);
  // Gerekçe alan BAŞINA yazılır. Tek `neden` alanı varken, iki alandan biri
  // elendiğinde hayatta kalan değişikliğe ÖTEKİ alanın gerekçesi yapışıyordu.
  for (const f of findings) {
    console.log(`  ${f.row.priority ? "★" : " "} ${labelOf(f.row.url).padEnd(52)}`);
    if ("country" in f.change) {
      console.log(`      ülke   ${String(f.row.country || "yok").padEnd(22)} → ${f.change.country}   — ${f.reasons.country || "(gerekçe yok)"}`);
    }
    if ("section" in f.change) {
      console.log(`      bölüm  ${String(f.row.section || "yok").padEnd(22)} → ${f.change.section || "YOK (silinir)"}   — ${f.reasons.section || "(gerekçe yok)"}`);
    }
  }
  log(`maliyet: ${usage.calls} çağrı, ${usage.in}+${usage.out} token, $${cost.toFixed(4)}`);

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify(findings.map((f) => ({
      id: f.row.id, url: f.row.url, name: f.row.name,
      mevcut: { country: f.row.country, section: f.row.section },
      change: f.change, reasons: f.reasons, priority: f.row.priority,
    })), null, 2));
    log(`bulgular yazıldı: ${JSON_OUT}`);
  }

  const wipes = findings.filter((f) => "section" in f.change && f.change.section === null);
  if (wipes.length) log(`⚠️ ${wipes.length} öneri bölümü SİLİYOR — uygulamadan önce tek tek bak.`);

  if (!APPLY) { log("rapor modu — hiçbir şey yazılmadı (--apply ile uygula)"); return; }

  // ⚠️ Toplu bölüm silme emniyeti. 2026-08-18'de model, zaten `gundem` olan
  // kaynaklara kuralın kendisini gerekçe yazıp `bolum:null` döndürdü; o
  // sürümde --apply onlarca kaynağın bölümünü silerdi. Kitlesel silme artık
  // kaza eseri geçmez.
  if (wipes.length > WIPE_LIMIT && !FORCE) {
    log(`DURDURULDU: ${wipes.length} bölüm silme önerisi var (sınır ${WIPE_LIMIT}).`);
    log("Bu, denetçinin savrulduğunun bilinen imzası. Raporu doğrula; yine de istiyorsan --force ekle.");
    process.exit(1);
  }
  for (const f of findings) {
    try {
      await sql`update sources set ${sql(f.change)} where id = ${f.row.id}`;
    } catch (e) { log("yazma hatası", f.row.url, e.message); }
  }
  log(`${findings.length} kaynak güncellendi`);
}

main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
