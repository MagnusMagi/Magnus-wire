// Openverse görsel arama — YALNIZ yeniden kullanımı ve türevi serbest lisanslar.
//
// license_type=commercial,modification → CC0 / PDM / BY / BY-SA.
// ⚠️ ND (türev yasak) DIŞLANIR: görseli kırpıp yeniden boyutlandırıyoruz.
// ⚠️ NC (ticari olmayan) DIŞLANIR: site bağış alıyor, "ticari değil"
//    savunmasına yaslanmak istemiyoruz (bkz künye).
// Atıf ZORUNLU (BY/BY-SA): fotoğrafçı + lisans + kaynak bağlantısı görselle
// birlikte saklanır ve sayfada gösterilir.
const UA = "MagiWireBot/1.0 (+https://news.magnusmagi.com)";
const API = "https://api.openverse.org/v1/images/";

// ⚠️ Openverse terimleri AND'liyor: 4-5 kelimelik sorgular SIFIR sonuç veriyor
// (MagnusPhotography'de 30 sorgunun 18'i böyle patlamıştı). 2-3 kelime ideal.
// Ülke/özel isim eklemek sonucu çoğu zaman sıfırlıyor — jenerik sahne hem daha
// isabetli hem "temsili görsel" çerçevesiyle dürüst.
const SECTION_QUERIES = {
  gundem: ["press conference", "city street", "government building", "parliament chamber", "newspaper stack", "microphone podium"],
  finans: ["stock exchange", "trading floor", "bank building", "financial district", "coins currency", "office towers"],
  "yapay-zeka": ["artificial intelligence", "neural network", "robot arm"],
  yazilim: ["source code", "programming laptop", "software developer", "keyboard closeup", "terminal screen", "open source"],
  donanim: ["computer hardware", "circuit board", "data center", "silicon chip", "motherboard", "server rack"],
  girisim: ["startup office", "coworking space", "business meeting"],
  bilim: ["laboratory research", "microscope", "science experiment"],
  uzay: ["space telescope", "rocket launch", "galaxy"],
  kripto: ["bitcoin", "cryptocurrency", "blockchain"],
  siber: ["cyber security", "server room", "padlock computer"],
  savunma: ["military aircraft", "naval ship", "radar antenna"],
  otomobil: ["electric car", "car factory", "highway traffic"],
  oyun: ["video game controller", "esports", "arcade"],
  spor: ["stadium", "football match", "running track"],
  kultur: ["art gallery", "concert stage", "library books"],
  tasarim: ["design studio", "architecture model", "typography"],
  yasam: ["city cafe", "hiking trail", "farmers market"],
};

// ⚠️ HASSAS HABERDE TEMSİLİ FOTOĞRAF KULLANILMAZ. Şiddet, suç, ölüm, afet ve
// kimliği belirli kişi içeren haberlerde jenerik bir stok fotoğraf yanıltıcı,
// bazen incitici olur — okuyucu onu olayın fotoğrafı sanabilir. Bu haberler
// üretilmiş kapağa (DispatchCover) düşer.
const SENSITIVE = /(sald[ıi]r[ıi]|b[ıi]çak|silah|öld[üu]|ölüm|cinayet|katl|yaral[ıi]|kaza|patlama|bomba|terör|tutukla|gözalt[ıi]|taciz|tecavüz|istismar|intihar|deprem|sel bask[ıi]n|yang[ıi]n|savaş|çat[ıi]şma|füze|bombard[ıi]man|soyk[ıi]r[ıi]m|mülteci|cenaze|kurban)/i;

export function isSensitive(text) { return SENSITIVE.test(String(text || "")); }

export function pickQuery(section, slug) {
  const list = SECTION_QUERIES[section];
  if (!list || !list.length) return null;
  // Slug'a göre deterministik: aynı haber her koşuda aynı sorguyu alır, ama
  // aynı bölümdeki haberler tek fotoğrafa yığılmaz.
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) { h ^= slug.charCodeAt(i); h = Math.imul(h, 16777619); }
  return list[(h >>> 0) % list.length];
}

const LICENSE_URL = {
  cc0: "https://creativecommons.org/publicdomain/zero/1.0/",
  pdm: "https://creativecommons.org/publicdomain/mark/1.0/",
  by: "https://creativecommons.org/licenses/by/4.0/",
  "by-sa": "https://creativecommons.org/licenses/by-sa/4.0/",
};

// ⚠️ Bu modül artık TEK sonuç değil ADAY LİSTESİ döndürüyor; seçimi
// lib/images.mjs yapıyor (iki kaynağın adaylarını birleştirip seed ile
// seçebilmek için). Eski sürüm hep ilk sonucu alıyordu ve bir sorgu = tek
// fotoğraf demekti.
export async function searchOpenverse(query, { timeoutMs = 9000 } = {}) {
  if (!query) return [];
  const url = `${API}?q=${encodeURIComponent(query)}&license_type=commercial,modification`
    // ⚠️ Anahtarsız istekte page_size TAVANI 20; 40 istemek 401 döndürüyor
    // ("page_size may not exceed 20 for anonymous requests") ve sessizce
    // görselsiz bırakıyor. Ölçüldü 2026-08-19.
    + `&page_size=20&mature=false&extension=jpg,png,webp`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "application/json" } });
    // ⚠️ 403 aynı sorguda KALICI olabiliyor, retry'la geçmiyor — sorgu metnini
    // değiştirmek gerekir. Burada sessizce vazgeçiyoruz; kapak yedeği var.
    if (!r.ok) return [];
    const j = await r.json();
    return (j.results || [])
      .filter((x) => x.url && LICENSE_URL[String(x.license || "").toLowerCase()])
      .map((x) => {
        const lic = String(x.license).toLowerCase();
        return {
          url: x.url,
          width: Number(x.width) || 0,
          credit: {
            creator: x.creator || "bilinmiyor",
            license: lic,
            licenseUrl: x.license_url || LICENSE_URL[lic],
            sourceUrl: x.foreign_landing_url || x.url,
            title: x.title || "",
            provider: x.provider || "openverse",
            query,
          },
        };
      });
  } catch { return []; } finally { clearTimeout(timer); }
}
