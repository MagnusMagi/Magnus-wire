#!/usr/bin/env node
// Mevcut tellere lisansı temiz temsili görsel atar.
//
//   node scripts/backfill-photos.mjs           → rapor
//   node scripts/backfill-photos.mjs --apply   → yazar
//   node scripts/backfill-photos.mjs --force   → görseli olanları da yeniler
//
// ⚠️ Eski `hero` değerleri yayıncı CDN'lerinden geliyordu ve lisansları
// BİLİNMİYORDU; bunlar hero_credit'i olmayan satırlardan tanınır ve
// temizlenir. Yeni görseller yalnız CC0/BY/BY-SA.
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env.mjs";
import { searchImage, pickQuery, isSensitive } from "./lib/images.mjs";

loadEnv();
const [SUPABASE_URL, SERVICE_ROLE, OPENAI_API_KEY] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY");
// ingest yeni tellerde `imageQuery`yi kendisi üretiyor; burada geçmiş için
// toplu üretiyoruz. Kendi değişkeni: OPENAI_MODEL ingest'e ait ve ucuz modele
// sabitli, bu iş ise isabet istiyor.
const QUERY_MODEL = process.env.PHOTO_QUERY_MODEL || "gpt-5-mini";
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const GAP_MS = Number(process.env.PHOTO_GAP_MS || 350);   // Openverse'e kibar ol
const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ⚠️ Bölüm başına sabit sorgu YETMİYOR: ölçüldü, 272 haber yalnız 49 farklı
// görsel paylaşıyordu ve konuyla ilgisi zayıftı. Sorgu haber başına üretilmeli.
// Etiketler Türkçe olduğu için ("yatirim", "futbol") doğrudan kullanılamıyor —
// Openverse İngilizce derlem. Bu yüzden modele İNGİLİZCE jenerik sahne
// yazdırıyoruz; özel isim yasak, çünkü arşivden olayın fotoğrafını değil
// konuyu temsil eden bir sahne arıyoruz.
async function makeQueries(rows) {
  const list = rows.map((r, i) => `${i + 1}. ${r.title}`).join("\n");
  const body = {
    model: QUERY_MODEL, response_format: { type: "json_object" },
    ...(/^(gpt-5|o[1-9])/.test(QUERY_MODEL) ? {} : { temperature: 0 }),
    messages: [
      { role: "system", content: "Sen bir foto editörüsün. Her habere, arşivden aranacak JENERİK bir sahne öneriyorsun." },
      { role: "user", content: `Her haber için İNGİLİZCE 2-3 kelimelik, somut ve fotoğraflanabilir bir sahne yaz.
⚠️ Özel isim YASAK (kişi, şirket, marka, ülke, şehir). Soyut kavram YASAK ('innovation', 'future', 'technology').
Örnek iyi: "wind turbine field", "courtroom interior", "shipping containers", "hospital corridor", "server room".
Uygun sahne bulamazsan o maddeyi ATLA.

HABERLER:
${list}

JSON: {"sorgular":[{"i":1,"q":"wind turbine field"}]}` },
    ],
  };
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 120)}`);
  const j = await r.json();
  const out = new Map();
  for (const x of JSON.parse(j.choices[0].message.content).sorgular ?? []) {
    const row = rows[Number(x.i) - 1];
    const q = String(x.q || "").trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    if (row && /^[a-z\s]+$/.test(q) && words.length >= 2 && words.length <= 3) out.set(row.id, words.join(" "));
  }
  return out;
}

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data, error } = await sb.from("dispatches")
    .select("id,slug,section,title,summary,tags,hero,hero_credit")
    .order("published_at", { ascending: false }).limit(1000);
  if (error) { log("okuma hatası", error.message); process.exit(1); }

  // hero var ama hero_credit yoksa: eski, lisansı bilinmeyen görsel → değiştir.
  const hedef = data.filter((r) => FORCE || !r.hero || !r.hero_credit);
  const eskiLisanssiz = data.filter((r) => r.hero && !r.hero_credit).length;
  log(`tel: ${data.length} | işlenecek: ${hedef.length} | bunlardan lisansı bilinmeyen eski görselli: ${eskiLisanssiz}`);

  const uygun = hedef.filter((r) => !isSensitive(`${r.title} ${r.summary} ${(r.tags || []).join(" ")}`));
  const sorgular = new Map();
  for (let i = 0; i < uygun.length; i += 25) {
    try {
      const m = await makeQueries(uygun.slice(i, i + 25));
      for (const [k, v] of m) sorgular.set(k, v);
      log(`sorgu partisi ${Math.floor(i / 25) + 1}: ${m.size} sorgu`);
    } catch (e) { log(`sorgu partisi ${Math.floor(i / 25) + 1} hatası:`, e.message); }
  }
  log(`üretilen sorgu: ${sorgular.size}/${uygun.length}`);

  let bulundu = 0, hassas = 0, sonucsuz = 0;
  const yazilacak = [];
  for (const r of hedef) {
    if (isSensitive(`${r.title} ${r.summary} ${(r.tags || []).join(" ")}`)) {
      hassas++;
      // Hassas haberde eski (lisanssız) görsel varsa TEMİZLE — kapağa düşsün.
      if (r.hero) yazilacak.push({ id: r.id, hero: null, hero_credit: null });
      continue;
    }
    // seed=slug: aynı sorgudan farklı haberlere FARKLI kare düşsün.
    const found = await searchImage(sorgular.get(r.id) || pickQuery(r.section, r.slug), { seed: r.slug })
      || (sorgular.has(r.id) ? await searchImage(pickQuery(r.section, r.slug), { seed: r.slug }) : null);
    if (found) { yazilacak.push({ id: r.id, hero: found.url, hero_credit: found.credit }); bulundu++; }
    else { sonucsuz++; if (r.hero) yazilacak.push({ id: r.id, hero: null, hero_credit: null }); }
    await sleep(GAP_MS);
  }
  log(`sonuç: ${bulundu} görsel bulundu, ${hassas} hassas (görselsiz), ${sonucsuz} uygun lisanslı sonuç yok`);

  if (!APPLY) { log("rapor modu — hiçbir şey yazılmadı (--apply ile uygula)"); return; }
  let ok = 0;
  for (const u of yazilacak) {
    const { error: e } = await sb.from("dispatches").update({ hero: u.hero, hero_credit: u.hero_credit }).eq("id", u.id);
    if (e) log("yazma hatası", u.id, e.message); else ok++;
  }
  log(`${ok}/${yazilacak.length} tel güncellendi`);
}

main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
