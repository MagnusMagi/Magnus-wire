// Magnus Wire — kürasyonlu çekirdek kaynaklar (elle ayarlanmış section/region).
//
// Kaynak listesinin ASLI artık DB'deki `sources` tablosu (bkz sql/20260817_sources.sql).
// Bu dosya iki iş yapar:
//   1. scripts/import-sources.mjs bunları DB'ye yazarken elle ayarlanmış
//      section/region değerleri kaynaklar.md'den gelen otomatik eşlemeyi EZER.
//   2. scripts/ingest.mjs, DB boş/erişilemezse buna geri düşer.
//
// Feed başına SABİT bölge: Türkçe kaynaklar→turkiye, Eston kaynaklar→estonya
// (AI'nın içerikten bölge tahminini override eder). global teknoloji→region yok.
// global/TR/EE interleave: kısa turlarda (round-robin) her bölge paya girsin.
// section sabit olan feed'ler "gundem" (genel/güncel haber); diğerleri AI'nın
// seçtiği teknoloji bölümüne düşer. global/TR/EE/gündem interleave.
export const FEED_SEED = [
  // ── 1. tur: her kategori/bölgeden birer kaynak (round-robin'in ilk turu bunları örnekler) ──
  { url: "https://techcrunch.com/feed/" },                                            // genel tech (AI sınıflar)
  { url: "https://venturebeat.com/category/ai/feed/", section: "yapay-zeka" },         // pür AI → yapay-zeka (forced; AI sınıfı yoksa bu kategori boş kalıyordu)
  { url: "https://www.tomshardware.com/feeds/all", section: "donanim" },               // pür donanım → donanim (forced)
  { url: "https://www.ntv.com.tr/gundem.rss", region: "turkiye", section: "gundem" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", section: "kripto" },
  { url: "https://www.nasa.gov/news-release/feed/", section: "uzay" },
  { url: "https://www.bleepingcomputer.com/feed/", section: "siber" },
  { url: "https://dev.to/feed", section: "yazilim" },
  { url: "https://www.sciencedaily.com/rss/all.xml", section: "bilim" },
  { url: "https://www.eu-startups.com/feed/", region: "avrupa", section: "finans" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", section: "finans" },
  { url: "https://shiftdelete.net/feed", region: "turkiye" },
  { url: "https://news.err.ee/rss", region: "estonya" },
  { url: "https://www.err.ee/rss", region: "estonya" },               // ERR Estonca ana akış (öne çıkan/top haberler)
  { url: "https://www.theverge.com/rss/index.xml" },
  { url: "https://webrazzi.com/feed/", region: "turkiye", section: "finans" },
  { url: "https://tehnika.postimees.ee/rss", region: "estonya" },

  // ── 2. tur: ikinci kaynaklar ──
  { url: "https://cointelegraph.com/rss", section: "kripto" },
  { url: "https://www.space.com/feeds/all", section: "uzay" },
  { url: "https://feeds.feedburner.com/TheHackersNews", section: "siber" },
  { url: "https://github.blog/feed/", section: "yazilim" },
  { url: "https://www.newscientist.com/feed/home/", section: "bilim" },
  { url: "https://techcrunch.com/category/startups/feed/", section: "finans" },
  { url: "https://www.bloomberght.com/rss", region: "turkiye", section: "finans" },
  { url: "https://www.webtekno.com/rss.xml", region: "turkiye" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", section: "gundem" },
  { url: "https://feeds.arstechnica.com/arstechnica/technology-lab" },
  { url: "https://the-decoder.com/feed/", section: "yapay-zeka" },                     // 2. yapay-zeka kaynağı (forced)
  { url: "https://estonianworld.com/feed/", region: "estonya" },
  { url: "https://www.wired.com/feed/rss" },
  { url: "https://www.aa.com.tr/tr/rss/default?cat=guncel", region: "turkiye", section: "gundem" },
  { url: "https://www.dunya.com/rss", region: "turkiye", section: "finans" },
  { url: "https://www.donanimhaber.com/rss/tum/", region: "turkiye", section: "donanim" }, // 2. donanım kaynağı (TR, forced)
  { url: "https://news.postimees.ee/rss", region: "estonya" },
  { url: "https://www.postimees.ee/rss", region: "estonya" },

  // ── 3. tur: üçüncü kaynaklar / derinlik ──
  { url: "https://decrypt.co/feed", section: "kripto" },
  { url: "https://phys.org/rss-feed/space-news/", section: "uzay" },
  { url: "https://krebsonsecurity.com/feed/", section: "siber" },
  { url: "https://phys.org/rss-feed/", section: "bilim" },
  { url: "https://sifted.eu/feed", region: "avrupa", section: "finans" },
  { url: "https://hnrss.org/frontpage" },
  { url: "https://www.engadget.com/rss.xml" },
  { url: "https://www.trthaber.com/manset_articles.rss", region: "turkiye", section: "gundem" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", section: "finans" },
  { url: "https://www.technopat.net/feed/", region: "turkiye" },
  { url: "https://feeds.bbci.co.uk/turkce/rss.xml", region: "turkiye", section: "gundem" },
  { url: "https://www.aripaev.ee/rss", region: "estonya", section: "finans" },
  { url: "https://www.geenius.ee/feed/", region: "estonya" },
  { url: "https://www.technologyreview.com/feed/" },
  { url: "https://www.chip.com.tr/rss/", region: "turkiye" },
  { url: "https://rss.dw.com/rdf/rss-tur-all", region: "turkiye", section: "gundem" },
  { url: "https://www.investing.com/rss/news.rss", section: "finans" },
  { url: "https://www.marketwatch.com/rss/topstories", section: "finans" },
  { url: "https://www.log.com.tr/feed/", region: "turkiye" },
  { url: "https://www.teknoblog.com/feed/", region: "turkiye" },
];
