-- Rotasyon kuyruğunu bir kez karıştır.
--
-- Sorun: kaynaklar.md ülke/kategoriye göre GRUPLU. İçe aktarımda hepsi
-- last_fetched_at = NULL ile geldiği için rotasyon onları dosya sırasıyla
-- dolaşıyor → her koşunun 60'lık penceresi tek bir bölüme yükleniyor
-- (bir koşuda 6 haberin hepsi yazilim, bir öncekinde hepsi finans).
-- Bölüm kotası 6 olduğu için koşu erken tükeniyor ve ana sayfa tek renk oluyor.
-- Üstelik kümelenme kalıcı: birlikte çekilenler aynı last_fetched_at'i alıp
-- sonsuza dek birlikte dönüyorlar.
--
-- Çözüm: kuyruğa rastgele bir başlangıç dağılımı ver. FIFO adaleti bozulmaz
-- (herkes sırayla kuyruğun başına gelir), yalnız komşuluk kırılır.
-- Bir KEZ çalıştırılır; yeni içe aktarılanlar NULL ile gelip öne geçer.

update public.sources
set last_fetched_at = now() - (random() * interval '12 hours');

select
  count(*) as toplam,
  count(distinct date_trunc('minute', last_fetched_at)) as dagilim_kovasi
from public.sources;
