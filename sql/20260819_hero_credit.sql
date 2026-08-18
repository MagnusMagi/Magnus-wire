-- Görsel kredisi. CC-BY / CC-BY-SA atıf ZORUNLU kılıyor, yani fotoğrafçı,
-- lisans ve kaynak bağlantısı görselle BİRLİKTE saklanmalı — sonradan
-- türetilemez. jsonb: alan seti kaynağa göre değişebiliyor.
--   { "creator": "...", "license": "by-sa", "licenseUrl": "...",
--     "sourceUrl": "...", "title": "...", "provider": "flickr" }
alter table public.dispatches add column if not exists hero_credit jsonb;
