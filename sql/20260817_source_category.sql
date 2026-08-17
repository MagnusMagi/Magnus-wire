-- Kaynağın ORİJİNAL kategorisini sakla (kaynaklar.md'deki `### Kategori` başlığı).
--
-- Sorun: sources tablosu yalnız eşlenmiş `section`'ı tutuyordu. "Personal
-- finance kaynaklarını yasam'a al" gibi bir eşleme değişikliğinde "hangi
-- satırlar bu kategoriden geldi" sorusu SQL'den cevaplanamıyor, markdown'ı
-- yeniden ayrıştırmak gerekiyordu. Kaynak dosya her zaman elde olmayabilir.
--
-- Bundan sonra eşleme değişiklikleri saf SQL ile yapılabilir:
--   update sources set section='yasam' where category='Personal finance';

alter table public.sources add column if not exists category text;
create index if not exists sources_category_idx on public.sources (category);

notify pgrst, 'reload schema';
