// Magnus Wire — ince bölümleri beslemek için eklenen KONU ODAKLI kaynaklar.
//
// Neden ayrı bir dosya: kaynaklar.md kazınmış bir liste ve bölümlere göre
// çok dengesizdi. Ölçüm 2026-08-18 — kaynak sayıları: gundem 279 (havuzun
// %36'sı), yazilim 99, yasam 74 ... ama siber 3, kripto 3, yapay-zeka 3,
// savunma 5, uzay 10. `siber` bu yüzden günde 1 haber üretebiliyordu.
//
// ⚠️ Bu listedeki her feed eklenmeden ÖNCE tek tek çekildi: HTTP 200 döndüğü,
// RSS olarak ayrıştığı ve son 7 günde gerçekten içerik ürettiği doğrulandı.
// Çalışmayanlar (theblock.co 403, navaltechnology fetch failed,
// thedefensepost ayrıştırma hatası, militaryaerospace 404, autoevolution
// ayrıştırma hatası) ve son 7 günde hiç yayın yapmayanlar (blockworks,
// bair.berkeley, syncedreview) BİLEREK dışarıda bırakıldı.
//
// ⚠️ `section` BİLEREK dolu: bunlar tek konuya adanmış beslemeler, o yüzden
// zorlama doğru davranış (bkz ingest.mjs'teki forcedSection). Genel yayınlara
// section verilmez — orada null "AI her haberi tek tek sınıflasın" demektir.
//
// ⚠️ import-sources.mjs bu listeyi OKUMAZ. Kasıtlı: o script md+çekirdeği
// yeniden yazıyor ve denetimle (audit-sources.mjs) elle düzeltilmiş
// değerleri de eziyor. Bu kaynaklar scripts/seed-topical.mjs ile eklenir.
export const TOPICAL_SEED = [
  // ── siber (öncesi: 3 kaynak) ──
  { url: "https://krebsonsecurity.com/feed/", name: "Krebs on Security", section: "siber" },
  { url: "https://www.darkreading.com/rss.xml", name: "Dark Reading", section: "siber" },
  { url: "https://www.securityweek.com/feed/", name: "SecurityWeek", section: "siber" },
  { url: "https://www.schneier.com/feed/", name: "Schneier on Security", section: "siber" },
  { url: "https://isc.sans.edu/rssfeed.xml", name: "SANS Internet Storm Center", section: "siber" },
  { url: "https://grahamcluley.com/feed/", name: "Graham Cluley", section: "siber" },
  { url: "https://www.helpnetsecurity.com/feed/", name: "Help Net Security", section: "siber" },
  { url: "https://cybersecuritynews.com/feed/", name: "Cyber Security News", section: "siber" },

  // ── kripto (öncesi: 3) ──
  { url: "https://decrypt.co/feed", name: "Decrypt", section: "kripto" },
  { url: "https://bitcoinmagazine.com/.rss/full/", name: "Bitcoin Magazine", section: "kripto" },
  { url: "https://cryptoslate.com/feed/", name: "CryptoSlate", section: "kripto" },
  { url: "https://ambcrypto.com/feed/", name: "AMBCrypto", section: "kripto" },

  // ── yapay-zeka (öncesi: 3) ──
  { url: "https://openai.com/blog/rss.xml", name: "OpenAI Blog", section: "yapay-zeka" },
  { url: "https://huggingface.co/blog/feed.xml", name: "Hugging Face Blog", section: "yapay-zeka" },
  { url: "https://deepmind.google/blog/rss.xml", name: "Google DeepMind", section: "yapay-zeka" },
  { url: "https://www.marktechpost.com/feed/", name: "MarkTechPost", section: "yapay-zeka" },

  // ── savunma (öncesi: 5) ──
  { url: "https://www.defensenews.com/arc/outboundfeeds/rss/", name: "Defense News", section: "savunma" },
  { url: "https://breakingdefense.com/feed/", name: "Breaking Defense", section: "savunma" },
  { url: "https://www.army-technology.com/feed/", name: "Army Technology", section: "savunma" },
  { url: "https://www.airforce-technology.com/feed/", name: "Airforce Technology", section: "savunma" },

  // ── uzay (öncesi: 10) ──
  { url: "https://spacenews.com/feed/", name: "SpaceNews", section: "uzay" },
  { url: "https://www.nasaspaceflight.com/feed/", name: "NASASpaceflight", section: "uzay" },
  { url: "https://arstechnica.com/space/feed/", name: "Ars Technica — Space", section: "uzay" },
  { url: "https://www.universetoday.com/feed/", name: "Universe Today", section: "uzay" },
  { url: "https://phys.org/rss-feed/space-news/", name: "Phys.org — Space", section: "uzay" },

  // ── oyun (öncesi: 11) ──
  { url: "https://www.eurogamer.net/feed", name: "Eurogamer", section: "oyun" },
  { url: "https://www.pcgamer.com/rss/", name: "PC Gamer", section: "oyun" },
  { url: "https://kotaku.com/rss", name: "Kotaku", section: "oyun" },
  { url: "https://www.rockpapershotgun.com/feed", name: "Rock Paper Shotgun", section: "oyun" },
  { url: "https://www.gamesindustry.biz/feed", name: "GamesIndustry.biz", section: "oyun" },

  // ── otomobil (öncesi: 16, ama yalnız 9'u aktifti) ──
  { url: "https://www.motor1.com/rss/news/all/", name: "Motor1", section: "otomobil" },
  { url: "https://electrek.co/feed/", name: "Electrek", section: "otomobil" },
  { url: "https://insideevs.com/rss/news/all/", name: "InsideEVs", section: "otomobil" },
];
