-- Magnus Wire — RSS kaynak havuzu.
-- Kaynak listesi koddan (FEED_LIST) DB'ye taşındı: 1000+ kaynak arasında rotasyon
-- yapabilmek ve kaynak açıp kapamayı deploy gerektirmeyen bir veri değişikliği
-- haline getirmek için. Ingest her koşuda en uzun süredir çekilmemiş N kaynağı alır.
--
-- Erişim: yalnız service_role (subscribers/push_subscriptions ile aynı desen).
-- anon'a hiçbir grant verilmez — varsayılan grant'lar anon'a TRUNCATE'e kadar
-- yetki verebiliyor, o yüzden açıkça grant edilen tek rol service_role.

create table if not exists public.sources (
  id               bigserial primary key,
  url              text not null unique,
  name             text not null,
  -- Zorlanan site taksonomisi. null → AI içerikten sınıflandırsın.
  section          text,
  region           text,
  -- Kaynağın orijinal ülke/dil bilgisi (etiket üretimi ve denetim için saklanır).
  country          text,
  lang             text,
  active           boolean not null default true,
  -- Rotasyon anahtarı: nulls first sıralamasıyla hiç çekilmemişler öne gelir.
  last_fetched_at  timestamptz,
  last_status      text,
  fail_count       integer not null default 0,
  item_count       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- Rotasyon sorgusunun indeksi: aktif kaynaklar arasında en eski çekilenler.
create index if not exists sources_rotation_idx
  on public.sources (last_fetched_at nulls first)
  where active;

create index if not exists sources_section_idx on public.sources (section);
create index if not exists sources_region_idx  on public.sources (region);

alter table public.sources enable row level security;

revoke all on public.sources from anon, authenticated;
revoke all on sequence public.sources_id_seq from anon, authenticated;
grant all on public.sources to service_role;
grant all on sequence public.sources_id_seq to service_role;

notify pgrst, 'reload schema';
