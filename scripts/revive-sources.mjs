#!/usr/bin/env node
// Geçici hatayla kapatılmış kaynakları geri açar.
//
//   node scripts/revive-sources.mjs           → rapor (hiçbir şey yazmaz)
//   node scripts/revive-sources.mjs --apply   → geri açar
//
// Neden gerekiyor: ingest ölü feed'i 3 ardışık hatada kapatıyordu ve GERİ
// AÇAN HİÇBİR ŞEY YOKTU (admin'den elle dışında). Ölçüm 2026-08-18: kapatılmış
// 178 kaynağın 84'ü (%47) ölü değildi — 403 engelleme 64, 429 hız sınırı 9,
// timeout 9, 5xx 2. Havuz tek yönlü eriyordu: geçici bir aksaklık kalıcı kayba
// dönüşüyordu.
//
// ingest.mjs artık geçici hatalar için ayrı ve yüksek bir eşik kullanıyor
// (INGEST_TRANSIENT_FAIL_LIMIT), yani bu script asıl olarak o değişiklikten
// ÖNCE kaybedilenleri geri getirmek için. Periyodik koşturmak da zararsız:
// gerçekten ölü olan kaynak birkaç turda yeniden kapanır, yani süreç
// kendi kendini düzeltir.
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env.mjs";

loadEnv();
const [SUPABASE_URL, SERVICE_ROLE] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
const APPLY = process.argv.includes("--apply");
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ingest.mjs'teki TRANSIENT_RE ile aynı küme olmalı.
const TRANSIENT_RE = /\b(403|408|425|429|500|502|503|504)\b|timed out|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang up|network|aborted/i;

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("sources")
    .select("id,url,name,last_status,fail_count")
    .eq("active", false);
  if (error) { log("okuma hatası", error.message); process.exit(1); }

  const revive = data.filter((r) => TRANSIENT_RE.test(String(r.last_status || "")));
  const keepDead = data.length - revive.length;

  const byStatus = {};
  for (const r of revive) {
    const k = String(r.last_status).split("\n")[0].slice(0, 40);
    byStatus[k] = (byStatus[k] || 0) + 1;
  }
  log(`kapalı kaynak: ${data.length} | geri açılacak: ${revive.length} | kalıcı ölü bırakılacak: ${keepDead}`);
  for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(4)}  ${k}`);

  if (!APPLY) { log("rapor modu — hiçbir şey yazılmadı (--apply ile uygula)"); return; }
  if (!revive.length) { log("geri açılacak kaynak yok"); return; }

  // fail_count SIFIRLANMALI: sayaç zaten limitin üstünde olduğu için,
  // sıfırlanmazsa kaynak ilk hatada anında yeniden kapanırdı (admin'in
  // aç/kapat ucunda da aynı gerekçe var).
  let ok = 0;
  const CHUNK = 100;
  for (let i = 0; i < revive.length; i += CHUNK) {
    const ids = revive.slice(i, i + CHUNK).map((r) => r.id);
    const { error: e } = await sb.from("sources").update({ active: true, fail_count: 0 }).in("id", ids);
    if (e) log("yazma hatası", e.message); else ok += ids.length;
  }
  log(`${ok} kaynak geri açıldı. Gerçekten ölü olanlar birkaç turda yeniden kapanacak.`);
}

main().then(() => process.exit(0)).catch((e) => { log("FATAL", e.message); process.exit(1); });
