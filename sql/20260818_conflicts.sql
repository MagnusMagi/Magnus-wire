-- Savaş/çatışma boyutu. `section` ve `region`dan AYRI tutuluyor: bir savaş
-- haberi aynı anda `gundem` bölümüne ve `avrupa` bölgesine ait olabilir —
-- çatışma etiketi bunların yerine geçmez, ÜZERİNE biner.
-- NULL = bu haber bilinen bir çatışmayla ilgili değil (haberlerin büyük çoğunluğu).
alter table public.dispatches add column if not exists conflict text;

-- Çatışma sayfaları en yeniden eskiye listeler; kısmi indeks, çünkü satırların
-- ezici çoğunluğu NULL ve onları indekslemenin faydası yok.
create index if not exists dispatches_conflict_idx
  on public.dispatches (conflict, published_at desc)
  where conflict is not null;
