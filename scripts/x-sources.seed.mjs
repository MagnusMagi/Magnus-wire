// X keşif kaynakları — HABER kaynaklarından bağımsız liste.
//
// ⚠️ Seçim ölçütü haber değeri DEĞİL, TWEET YOĞUNLUĞU. Her giriş 2026-08-20'de
// ölçüldü: beslemenin son makaleleri çekilip içlerinde tweet linki arandı.
// Ölçülmeden liste büyütülmemeli — 18 Türk sitesinin RSS gövdesinde tweet
// linki SIFIR çıkmıştı, 30 site denenip yalnız bu 8'i üretken bulundu.
//
// ⚠️ Besleme URL'i TAHMİN EDİLMEZ. İlk sürümde bianet/birgün için makul
// görünen adresler yazılmıştı; ikisi de 404/ayrıştırma hatası verdi. Çalışan
// adresler haber havuzundaki `sources` tablosundan alındı.
//
// `oran` = tweet içeren makale yüzdesi (ölçüm anındaki örneklem).
// Üretmeyen kaynak zamanla kendiliğinden geri plana düşer (found_count).
export const X_SOURCE_SEED = [
  // ⭐ Doğrulama platformu: yalanladığı tweet'i gömmek ZORUNDA → en yüksek oran.
  { url: "https://malumatfurus.org/feed/",     name: "Malumatfuruş",  lang: "tr", country: "Türkiye" }, // %100, 8 makalede 29 ID
  { url: "https://medyascope.tv/feed/",        name: "Medyascope",    lang: "tr", country: "Türkiye" }, // %38
  { url: "https://www.webtekno.com/rss.xml",   name: "Webtekno",      lang: "tr", country: "Türkiye" }, // %25
  { url: "https://www.diken.com.tr/feed/",     name: "Diken",         lang: "tr", country: "Türkiye" }, // %13
  { url: "https://journo.com.tr/feed",         name: "Journo",        lang: "tr", country: "Türkiye" }, // %13
  // RSS GÖVDESİNDE tweet veren nadir Türk kaynakları (makale çekmeye gerek yok).
  { url: "https://bianet.org/rss/bianet",      name: "Bianet",        lang: "tr", country: "Türkiye" }, // gövdede 11 ID
  { url: "https://www.birgun.net/rss/home",    name: "BirGün",        lang: "tr", country: "Türkiye" }, // gövdede 6 ID
  { url: "https://webrazzi.com/feed/",         name: "Webrazzi",      lang: "tr", country: "Türkiye" }, // gövdede 3 ID
  // ⚠️ teyit.org ölçülemedi (makale çekimi bot korumasına takıldı, 0/8).
  // Listeye alınmadı; koruması gevşerse eklenebilir.
];

// Tekrar koşturulabilir: node scripts/x-sources.seed.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const { loadEnv } = await import("./env.mjs");
  const { connect, excludedSet, updateKeys } = await import("./lib/db.mjs");
  loadEnv();
  const sql = connect();
  // ⚠️ Yalnız kimlik alanları yazılır: found_count/last_scanned_at gibi
  // çalışma verisi upsert'te SIFIRLANMAMALI.
  const rows = X_SOURCE_SEED.map((s) => ({ url: s.url, name: s.name, lang: s.lang, country: s.country }));
  let error = null;
  try {
    await sql`insert into x_sources ${sql(rows)} on conflict (url) do update set ${excludedSet(sql, updateKeys(rows, "url"))}`;
  } catch (e) { error = e; }
  console.log(error ? `HATA: ${error.message}` : `${rows.length} X kaynağı yazıldı`);
  process.exit(error ? 1 : 0);
}
