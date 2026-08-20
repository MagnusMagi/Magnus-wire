-- Magnus Wire — X (Twitter) tel havuzu.
--
-- ⚠️ MİMARİ KARARI (2026-08-20): bu sayfa SIFIR maliyetle çalışır, hiçbir ücretli
-- X API'si kullanılmaz. Ölçülen gerçekler:
--   • Resmî X API şubat 2026'da kullanım-başına geçti: okuma başına $0.005.
--     Günde 1.000 tweet ≈ $150/ay — sitenin ~$4/ay'lık OpenAI bütçesinin 37 katı.
--   • cdn.syndication.twimg.com/tweet-result → ID verince ÜCRETSİZ, anahtarsız
--     tam JSON döner (metin, lang, favorite_count, medya, yazar). Gömme
--     widget'ının kendi beslediği uç. RENDER BEDAVA.
--   • syndication'ın profil/liste zaman tüneli uçları 404 → KEŞİF BEDAVA DEĞİL.
-- Bu yüzden keşif iki ücretsiz yoldan yapılır: (1) kendi haberlerimizin kaynak
-- makalelerinde ALINTILANAN tweet'ler (otomatik, cron), (2) /admin/x'ten elle
-- küratörlük. Ölçüm: makalelerin ~%11'inde tweet linki var.

create table if not exists public.tweets (
  -- X'in kendi id_str'ı. Kendi sequence'imiz YOK: aynı tweet iki ayrı haberde
  -- alıntılansa da tek satır olmalı, upsert doğal anahtar üzerinden çalışsın.
  id                   text primary key,
  screen_name          text not null,
  author_name          text not null,
  avatar_url           text,
  verified             boolean not null default false,
  text                 text not null,
  -- X'in kendi dil tespiti (BCP-47: tr, en, et, ar…). Dil filtresi BUNA dayanır;
  -- kendimiz tahmin etmiyoruz. Medya-only tweet'lerde "und" gelir.
  lang                 text not null default 'und',
  favorite_count       integer not null default 0,
  reply_count          integer not null default 0,
  -- [{url, width, height}] — en fazla 2 görsel saklanır.
  photos               jsonb not null default '[]'::jsonb,
  posted_at            timestamptz not null,

  -- Keşif izi: tweet havuza nereden düştü.
  found_via            text not null default 'article',  -- 'article' | 'manual'
  source_dispatch_slug text,
  source_name          text,
  section              text,

  -- ⚠️ Popülerlik skoru KASITLI OLARAK saklanmıyor: skor zamanla söner, sabit
  -- kolon bayatlar ve eski tweet sonsuza dek zirvede kalırdı. Okuma tarafı
  -- pencereyi çekip skoru anlık hesaplar (src/lib/tweets.ts:tweetScore).
  active               boolean not null default true,
  -- Üst üste çözülemeyen tweet sayacı. ⚠️ TEK bir başarısız çekimde kapatmak
  -- YANLIŞ olurdu: geçici ağ hatası ile gerçekten silinmiş tweet aynı şeyi
  -- (null) döndürüyor. Ancak üst üste birkaç kez çözülemeyen tweet gerçekten
  -- gitmiştir; başarılı çekimde sayaç sıfırlanır.
  fail_count           integer not null default 0,
  pinned               boolean not null default false,
  -- Metrik tazeleme kuyruğunun anahtarı (nulls first → hiç tazelenmemiş öne).
  refreshed_at         timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists tweets_posted_idx on public.tweets (posted_at desc) where active;
create index if not exists tweets_lang_idx   on public.tweets (lang) where active;
create index if not exists tweets_refresh_idx on public.tweets (refreshed_at nulls first) where active;

-- Taranmış dispatch kaydı. Olmasaydı her koşu aynı makaleleri tekrar çeker,
-- günde ~2.000 gereksiz dış istek üretirdik; bununla koşu başına yalnız YENİ
-- dispatch'ler (ingest tur limiti kadar, ~6) çekiliyor.
create table if not exists public.tweet_scans (
  -- ⚠️ dispatches.id UUID (bigint DEĞİL) — ilk sürümde bigint yazılmıştı ve
  -- tarama kaydı her koşuda sessizce hata verip aynı makaleler tekrar taranıyordu.
  dispatch_id  uuid primary key,
  found_count  integer not null default 0,
  scanned_at   timestamptz not null default now()
);

alter table public.tweets      enable row level security;
alter table public.tweet_scans enable row level security;

-- ⚠️ Varsayılan grant'lar anon'a TRUNCATE'e kadar yetki verebiliyor (RLS bypass),
-- o yüzden önce her şey geri alınır. tweets HERKESE AÇIK OKUNUR (sayfa anon
-- istemciyle okuyor, dispatches ile aynı desen) ama YALNIZ select.
revoke all on public.tweets      from anon, authenticated;
revoke all on public.tweet_scans from anon, authenticated;

grant select on public.tweets to anon, authenticated;
grant all on public.tweets      to service_role;
grant all on public.tweet_scans to service_role;

-- Kapatılmış tweet (admin'in gizlediği) anon'a HİÇ görünmez — filtre uygulama
-- katmanında değil, satır düzeyinde.
drop policy if exists tweets_public_read on public.tweets;
create policy tweets_public_read on public.tweets
  for select to anon, authenticated using (active);

notify pgrst, 'reload schema';

-- ── 2026-08-20 ek: SÜREKLİ AKIŞ ───────────────────────────────────────────
-- Yalnız yayınladığımız dispatch'lerin makalelerini taramak keşif hızını haber
-- üretimine bağlıyordu (koşu başına 1-6 tweet). Ölçüm: 60 RSS beslemesinin
-- ÖĞE İÇERİĞİNDE 43 benzersiz tweet linki var ve bunun için EK İSTEK GEREKMİYOR
-- (feed zaten indiriliyor). Asıl keşif hattı artık feed taraması.

-- ⚠️ Kendi rotasyon damgamız. sources.last_fetched_at KULLANILAMAZ: o kolon
-- ingest.mjs'in FIFO rotasyonunun anahtarı; buradan güncellersek haber
-- toplayıcının sırası bozulur ve kaynak havuzu düzensiz dolaşılır.
alter table public.sources add column if not exists x_scanned_at timestamptz;
create index if not exists sources_x_rotation_idx
  on public.sources (x_scanned_at nulls first) where active;

-- Çözülemeyen ID'lerin siciline: silinmiş/gizli/çok eski tweet'ler her koşuda
-- yeniden denenip çözümleme bütçesini yerdi (aynı 43 ID her turda geliyor).
create table if not exists public.tweet_rejects (
  id       text primary key,
  reason   text not null,
  seen_at  timestamptz not null default now()
);
alter table public.tweet_rejects enable row level security;
revoke all on public.tweet_rejects from anon, authenticated;
grant all on public.tweet_rejects to service_role;

notify pgrst, 'reload schema';

-- ── Dil-adil pencere ──────────────────────────────────────────────────────
-- ⚠️ Sayfa "en yeni N" penceresi çekiyordu ve akış hızlanınca bu pencere
-- 45 saate kadar daraldı; içinde İngilizce 135, Türkçe 12 satır kaldı. Akış
-- büyüdükçe nadir dillerin sekmesi TAMAMEN boşalacaktı — yani dil filtresi
-- kendi başarısıyla ölecekti. Çözüm: pencereye her dilden bir taban kota.
--
-- Tek sorguda iki küme birleşir:
--   • genel tazelik  → en yeni p_recent tel (sayfanın "gündem" hissi)
--   • dil tabanı     → her dilden en yeni p_per_lang tel (filtre hep dolu)
-- ⚠️ Dönüş tipi değiştiği için önce DROP şart (Postgres "cannot change return
-- type of existing function" der; kolon eklerken bu tuzağa iki kez düşülür).
drop function if exists public.tweets_window(int, int, int);
create function public.tweets_window(
  p_days     int default 30,
  p_recent   int default 200,
  p_per_lang int default 30
)
returns table (
  id text, screen_name text, author_name text, avatar_url text, verified boolean,
  text text, lang text, favorite_count int, reply_count int, photos jsonb,
  posted_at timestamptz, source_name text, source_dispatch_slug text,
  section text, pinned boolean
)
language sql
stable
as $$
  with base as (
    select t.*,
           row_number() over (partition by t.lang order by t.posted_at desc) as rn_lang,
           row_number() over (order by t.posted_at desc)                     as rn_all
    from public.tweets t
    -- Metinsiz teller sayfada gösterilmiyor; pencereye hiç girmemeliler ki
    -- kotayı da işgal etmesinler.
    where t.active and t.lang <> 'und'
      and t.posted_at >= now() - make_interval(days => p_days)
  )
  select b.id, b.screen_name, b.author_name, b.avatar_url, b.verified,
         b.text, b.lang, b.favorite_count, b.reply_count, b.photos,
         b.posted_at, b.source_name, b.source_dispatch_slug, b.section, b.pinned
  from base b
  where b.rn_all <= p_recent or b.rn_lang <= p_per_lang
  order by b.posted_at desc
$$;

-- security invoker (varsayılan): anon zaten yalnız active satırları görebiliyor
-- (tweets_public_read politikası), fonksiyon ek yetki AÇMAZ.
grant execute on function public.tweets_window(int, int, int) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ── Uzun gönderi işareti ──────────────────────────────────────────────────
-- ⚠️ X'in ÜCRETSİZ uçlarının hiçbiri uzun gönderilerin (280+ karakter) tam
-- metnini vermiyor — ne syndication ne oEmbed; resmî gömme widget'ı bile
-- "Show more" ile kesiyor. Ölçüm 2026-08-20: 240+ karakterli tellerin %78'i
-- böyle, yani havuzun ~%39'u.
--
-- Yanıtta `note_tweet` alanı VAR ama içinde yalnız bir kimlik var, metin yok.
-- Bu alanın varlığı "bu tel kesildi"nin GÜVENİLİR işareti; kart o zaman
-- kesildiğini açıkça söyleyip özgün gönderiye yolluyor. Sessizce cümlenin
-- ortasında bitmek hata gibi okunuyordu.
alter table public.tweets add column if not exists truncated boolean not null default false;

-- ⚠️ Dönüş tipi değiştiği için önce DROP şart (Postgres "cannot change return
-- type of existing function" der; kolon eklerken bu tuzağa iki kez düşülür).
drop function if exists public.tweets_window(int, int, int);
create function public.tweets_window(
  p_days int default 30, p_recent int default 200, p_per_lang int default 30
)
returns table (
  id text, screen_name text, author_name text, avatar_url text, verified boolean,
  text text, lang text, favorite_count int, reply_count int, photos jsonb,
  posted_at timestamptz, source_name text, source_dispatch_slug text,
  section text, pinned boolean, truncated boolean
)
language sql stable as $$
  with base as (
    select t.*,
           row_number() over (partition by t.lang order by t.posted_at desc) as rn_lang,
           row_number() over (order by t.posted_at desc)                     as rn_all
    from public.tweets t
    where t.active and t.lang <> 'und'
      and t.posted_at >= now() - make_interval(days => p_days)
  )
  select b.id, b.screen_name, b.author_name, b.avatar_url, b.verified,
         b.text, b.lang, b.favorite_count, b.reply_count, b.photos,
         b.posted_at, b.source_name, b.source_dispatch_slug, b.section,
         b.pinned, b.truncated
  from base b
  where b.rn_all <= p_recent or b.rn_lang <= p_per_lang
  order by b.posted_at desc
$$;

grant execute on function public.tweets_window(int, int, int) to anon, authenticated, service_role;
notify pgrst, 'reload schema';

-- ── Üretken kaynak şeridi ─────────────────────────────────────────────────
-- ⚠️ Ölçüm 2026-08-20: beslemelerin ÇOK KÜÇÜK bir azınlığı tweet gömüyor.
-- 45 Türk kaynağın 42'si tarandı, tweet linki yalnız 4'ünden geldi (Bianet 11,
-- BirGün 6, webrazzi 3, Milliyet 1). Düz FIFO rotasyonda bu üretken kaynaklar
-- 774'lük kuyrukta sıraya giriyor ve ~2 saatte bir çekiliyordu; verimsiz 700
-- kaynak ise her turda bedava slot işgal ediyordu.
--
-- Çözüm ingest.mjs'te kanıtlanmış desen: üretken kaynaklar ROTASYONA TABİ
-- DEĞİL, her koşuda çekilir; kalanlar keşif için FIFO döner. Bu Türkçe'yi de
-- doğrudan iyileştirir çünkü üretken Türk kaynakları artık her turda taranır.
alter table public.sources add column if not exists x_found_count integer not null default 0;
create index if not exists sources_x_productive_idx
  on public.sources (x_found_count desc) where active and x_found_count > 0;

notify pgrst, 'reload schema';
