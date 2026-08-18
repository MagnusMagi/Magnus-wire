#!/usr/bin/env node
// Mevcut dispatch'leri çatışma cephelerine etiketler (public.dispatches.conflict).
//
//   node scripts/backfill-conflicts.mjs           → rapor (hiçbir şey yazmaz)
//   node scripts/backfill-conflicts.mjs --apply   → yazar
//   node scripts/backfill-conflicts.mjs --all     → etiketlenmişleri de yeniden değerlendir
//
// ingest.mjs artık her yeni teli üretirken `conflict` alanını dolduruyor; bu
// script iki iş için var: (1) alan eklenmeden ÖNCE yazılmış tellerin geçmişi,
// (2) gece cron'unda ağdan kaçanları toplamak.
//
// ⚠️ Maliyet kontrolü: TÜM teller LLM'e gönderilmez. Önce ucuz bir anahtar
// kelime ELEMESİ yapılır (başlık+spot+etiketler), yalnız ilgili olabilecekler
// modele sorulur. Ölçüm 2026-08-18: 254 telin ~%10'u eleği geçiyor, yani
// koşu başına birkaç kuruş.
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();
const [SUPABASE_URL, SERVICE_ROLE, OPENAI_API_KEY] = requireEnv(
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY",
);
// Denetim gibi seyrek koşan, doğruluk isteyen iş → kendi modeli.
// OPENAI_MODEL BİLEREK okunmuyor: o ingest'e ait ve ucuz modele sabitli.
const MODEL = process.env.CONFLICT_MODEL || "gpt-5-mini";
const SUPPORTS_TEMPERATURE = !/^(gpt-5|o[1-9])/.test(MODEL);
const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const BATCH = Number(process.env.CONFLICT_BATCH || 15);
const log = (...a) => console.log(new Date().toISOString(), ...a);

// site.ts CONFLICTS + ingest.mjs CONFLICTS ile BİREBİR aynı anahtarlar.
const CONFLICTS = {
  "rusya-ukrayna": "Rusya'nın Ukrayna'ya karşı savaşı: cephe, saldırılar, barış görüşmeleri, yaptırımlar, askerî/insani yardım, savaşın doğrudan siyasi ve ekonomik sonuçları.",
  "usa-iran": "ABD ile İran arasındaki askerî/siyasi çatışma: doğrudan saldırılar, nükleer program müzakereleri, yaptırımlar, vekil güçler üzerinden çatışmalar, tehdit ve misilleme açıklamaları.",
};

// Ucuz ön eleme. Geniş tutulur (yanlış pozitif ucuz, yanlış negatif teli
// tamamen kaçırır); son kararı model verir.
const SIEVE = /\b(ukrayna|ukrain|rusya|russi|putin|zelensk|kremlin|moskova|kiev|kyiv|donetsk|luhansk|kherson|zaporij|kırım|crimea|nato|iran|tahran|tehran|hürmüz|hormuz|devrim muhafız|revolutionary guard|hizbullah|hezbollah|husi|houthi|nükleer müzakere|nuclear talks|yaptırım|sanction|ateşkes|ceasefire|savaş|war|füze|missile|drone|insansız hava)/i;

async function ask(rows) {
  const list = rows.map((r, i) =>
    `${i + 1}. BAŞLIK: ${r.title}\n   SPOT: ${r.summary}\n   ETİKET: ${(r.tags || []).join(", ") || "-"}`).join("\n");
  const sys = "Sen bir haber arşiv editörüsün. Görevin her haberi, TANIMLI çatışmalardan birine ait mi diye işaretlemek. Emin değilsen null yaz — yanlış etiketlemek, etiketlememekten daha kötüdür.";
  const user = `Aşağıdaki haberlerin her biri için, TANIMLI çatışmalardan BİRİNİN doğrudan parçası mı belirle.

TANIMLAR:
${Object.entries(CONFLICTS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

⚠️ KURALLAR:
- Haber o çatışmanın KENDİSİYLE ilgili olmalı. İçinde "savaş"/"ordu"/"füze" geçmesi YETMEZ.
- Listede olmayan çatışmalar (Gazze/İsrail-Filistin, Sudan, Yemen iç savaşı, Çin-Tayvan...) için null.
- Savaşın yalnız uzak bir yan etkisinden bahseden haber (örn. genel enerji fiyatı yorumu) null.
- Emin değilsen null.

HABERLER:
${list}

SADECE şu JSON'u döndür (yalnız çatışmaya AİT olanları listele, gerisini yazma):
{"eslesmeler":[{"i":1,"conflict":"rusya-ukrayna","neden":"kısa gerekçe"}]}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL, response_format: { type: "json_object" },
      ...(SUPPORTS_TEMPERATURE ? { temperature: 0 } : {}),
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 140)}`);
  const j = await res.json();
  const parsed = JSON.parse(j.choices[0].message.content);
  const out = [];
  for (const m of parsed.eslesmeler ?? []) {
    const row = rows[Number(m.i) - 1];
    if (!row) continue;
    if (!CONFLICTS[m.conflict]) continue;          // uydurma anahtarı ele
    if (row.conflict === m.conflict) continue;     // zaten doğru
    out.push({ row, conflict: m.conflict, neden: String(m.neden || "").slice(0, 100) });
  }
  return out;
}

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  let q = sb.from("dispatches").select("id,slug,title,summary,tags,conflict").order("published_at", { ascending: false }).limit(1000);
  if (!ALL) q = q.is("conflict", null);
  const { data, error } = await q;
  if (error) { log("okuma hatası", error.message); process.exit(1); }

  const aday = data.filter((r) => SIEVE.test(`${r.title} ${r.summary} ${(r.tags || []).join(" ")}`));
  log(`tel: ${data.length} | elekten geçen: ${aday.length} | model: ${MODEL}`);
  if (!aday.length) { log("değerlendirilecek tel yok"); return; }

  const bulgular = [];
  for (let i = 0; i < aday.length; i += BATCH) {
    try {
      const r = await ask(aday.slice(i, i + BATCH));
      bulgular.push(...r);
      log(`parti ${Math.floor(i / BATCH) + 1}: ${r.length} eşleşme`);
    } catch (e) { log(`parti ${Math.floor(i / BATCH) + 1} hatası:`, e.message); }
  }

  log(`\n=== ${bulgular.length} tel etiketlenecek ===`);
  for (const b of bulgular) console.log(`  ${b.conflict.padEnd(15)} ${b.row.title.slice(0, 62)}\n      — ${b.neden}`);

  if (!APPLY) { log("rapor modu — hiçbir şey yazılmadı (--apply ile uygula)"); return; }
  let ok = 0;
  for (const b of bulgular) {
    const { error: e } = await sb.from("dispatches").update({ conflict: b.conflict }).eq("id", b.row.id);
    if (e) log("yazma hatası", b.row.slug, e.message); else ok++;
  }
  log(`${ok}/${bulgular.length} tel etiketlendi`);
}

main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
