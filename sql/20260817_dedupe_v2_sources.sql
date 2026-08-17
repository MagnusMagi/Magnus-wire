-- kaynaklar.md aynı feed'i İKİ KEZ listeliyor: bir kez normal, bir kez `?v=2`
-- (ya da `&v=2`) cache-busting ekiyle. 1421 satırın 647'si böyle bir ikiz.
--
-- İçerik açısından zararsızdı (item.link dedup'ı aynı haberi iki kez almıyor)
-- ama bedeli vardı: her devirde aynı feed iki kez çekiliyor → çekimlerin ~%45'i
-- boşa gidiyor ve rotasyon tam devri gereksiz yere iki katına çıkıyor.
--
-- Yalnız ikizi OLAN v=2 satırları silinir; sadece v=2 hâlinde var olan
-- kaynaklar korunur (onların temiz karşılığı yok).

delete from public.sources s
using public.sources t
where regexp_replace(s.url, '[?&]v=2$', '') = regexp_replace(t.url, '[?&]v=2$', '')
  and s.url ~ '[?&]v=2$'
  and t.url !~ '[?&]v=2$';

select count(*) as kalan_kaynak,
       count(*) filter (where url ~ '[?&]v=2$') as kalan_v2_ikizsiz
from public.sources;
