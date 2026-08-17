-- Kürasyonlu çekirdek kaynaklara öncelik bayrağı.
--
-- Sorun: kaynak havuzu 55'ten 1421'e çıkınca kürasyonlu çekirdek de (NTV, TRT,
-- BBC, ERR, TechCrunch, Verge...) FIFO rotasyona girdi. Rotasyon tam devri
-- 12 saat sürdüğü için bu kaynaklar 30 dakikada bir yerine ~12 saatte bir
-- çekilir oldu → son dakika haberi yarım gün gecikebilirdi.
-- Havuza kaynak eklemek, iyi kaynakların tazeliğini bozmamalı.
--
-- Çözüm: priority=true olanlar rotasyona TABİ DEĞİL, her koşuda çekilir.
-- Geri kalan havuz FIFO rotasyonla dolaşılmaya devam eder.

alter table public.sources
  add column if not exists priority boolean not null default false;

-- Öncelikli kaynaklar her koşuda seçildiği için ayrı indeks.
create index if not exists sources_priority_idx
  on public.sources (priority)
  where active and priority;

notify pgrst, 'reload schema';
