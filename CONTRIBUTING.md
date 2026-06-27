# 🤝 Magnus Wire'a Katkı Rehberi

Magnus Wire'a ilgin için teşekkürler! Bu, AI ile çalışan çok dilli bir haber teli. Aşağıdaki rehber, ortamı kurmandan PR açmana kadar süreci özetler.

> Kişisel bir hobi projesi olduğu için süreç hafif tutulmuştur — ama kod kalitesi, güvenlik ve çok dillilik konusunda titizdir.

---

## 📋 İçindekiler

- [Davranış Kuralları](#-davranış-kuralları)
- [Başlamadan Önce](#-başlamadan-önce)
- [Geliştirme Ortamı](#-geliştirme-ortamı)
- [Dal & Commit Akışı](#-dal--commit-akışı)
- [Kodlama Standartları](#-kodlama-standartları)
- [Çok Dillilik (i18n) Kuralları](#-çok-dillilik-i18n-kuralları)
- [Test](#-test)
- [Güvenlik](#-güvenlik)
- [Pull Request Süreci](#-pull-request-süreci)
- [Katkı Türleri](#-katkı-türleri)

---

## 📜 Davranış Kuralları

Saygılı, yapıcı ve kapsayıcı ol. Taciz, ayrımcılık ve kötü niyetli davranış kabul edilmez. Anlaşmazlıkları teknik gerekçeyle çöz, kişiselleştirme.

---

## 🚦 Başlamadan Önce

- **Küçük düzeltmeler** (typo, kırık link, ufak stil): doğrudan PR açabilirsin.
- **Yeni özellik / büyük değişiklik:** önce bir **issue** aç, yaklaşımı tartışalım. Boşa emek harcamanı istemeyiz.
- Mevcut açık issue/PR'lara göz at — belki aynı şey üzerinde çalışılıyordur.

---

## 🛠️ Geliştirme Ortamı

**Gereksinimler:** Node `22+`, `pnpm` (önerilir), erişilebilir bir Supabase örneği, OpenAI API anahtarı.

```bash
# 1. Fork + klonla
git clone https://github.com/<kullanıcı-adın>/Magnus-wire.git
cd Magnus-wire

# 2. Bağımlılıklar
pnpm install

# 3. Ortam değişkenleri (README'deki listeye bak)
cp .env.example .env.local && $EDITOR .env.local

# 4. Geliştirme sunucusu
pnpm dev            # http://localhost:3000

# 5. (Opsiyonel) içerik çek
node scripts/ingest.mjs
```

> Supabase'in yoksa, `src/lib/dispatches.ts` üzerinden okuma yapan UI bileşenlerinde çalışabilir; ama tam akış için bir örnek gerekir.

---

## 🌿 Dal & Commit Akışı

### Dallar

`main`'den anlamlı isimli bir dal aç:

```
feat/<özellik>       # yeni özellik
fix/<sorun>          # hata düzeltme
docs/<konu>          # dokümantasyon
refactor/<kapsam>    # davranışı değiştirmeyen düzenleme
test/<kapsam>        # test ekleme
chore/<kapsam>       # bakım / araç
```

### Commit mesajları — [Conventional Commits](https://www.conventionalcommits.org/)

```
<type>: <kısa açıklama>

[opsiyonel gövde]
```

**Tipler:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**Örnekler:**
```
feat(push): add quiet-hours setting to web push
fix(i18n): correct Estonian plural for "updates"
docs: document the ingest pipeline knobs
```

- Her commit tek bir mantıksal değişiklik olsun.
- Mesaj **ne** ve **neden**i anlatsın, **nasıl**ı koda bırak.

---

## 🎯 Kodlama Standartları

Proje TypeScript + React 19 + Next.js 16 App Router üzerinedir.

### Genel

- **Dosyalar küçük & odaklı:** ~200‑400 satır tipik, 800 maksimum. Büyüyen modülü böl.
- **İsimlendirme:** `camelCase` (değişken/fonksiyon), `PascalCase` (bileşen/tip), `UPPER_SNAKE_CASE` (sabit). Boolean'lar `is`/`has`/`should`/`can` önekli.
- **Immutability:** mevcut nesneyi mutate etme; yeni kopya döndür (spread).
- **Hata yönetimi:** sessizce yutma; UI tarafında kullanıcı dostu mesaj, sunucu tarafında detaylı log.
- **`console.log` bırakma** — üretim kodunda debug çıktısı olmasın.

### TypeScript

- Dışa açık (exported) fonksiyon/bileşen prop'larına açık tip ver; yerel değişkende çıkarıma güven.
- `any` kullanma — dış/güvenilmez veri için `unknown` + daralt.
- Girdi doğrulamasında `zod` tercih et (API route'ları, ingest).

### React / Next

- **Server Component varsayılan**; `"use client"` yalnız state/effect/ref/tarayıcı API'si gerektiğinde, dosyanın ilk satırında.
- Hook kurallarına uy (`react-hooks/rules-of-hooks`); hook'lar koşulsuz, en üstte.
- `useEffect`'i türetilmiş state için kullanma — render sırasında hesapla.
- API route'larda `export const runtime = "nodejs"` (Supabase/web-push/OpenAI Node gerektirir).

### Stil

- Tailwind 4 token'ları (`--ink`, `--paper`, `--wire`, `--signal`) — paleti elle hardcode etme.
- Yalnız compositor‑dostu animasyon (`transform`, `opacity`).
- Semantik HTML önce (`<header>`, `<main>`, `<nav aria-label>` …).

Linter'ı çalıştır:
```bash
pnpm lint
```

---

## 🌐 Çok Dillilik (i18n) Kuralları

Bu projede i18n **birinci sınıf**tır. UI metni eklerken:

1. Yeni string'i **üç dilde de** (`tr`, `en`, `et`) `src/lib/i18n.ts`'e ekle.
2. Ekledikten sonra **mutlaka doğrula** — eksik bir locale sessizce anahtar string'ine düşer:
   ```bash
   grep -c "yeniAnahtar:" src/lib/i18n.ts   # 3 dönmeli
   ```
3. **Var olan bir anahtar adını yeniden kullanma** — çakışma "duplicate property" build hatası verir. Çakışırsa benzersiz bir ad seç (ör. `follow` doluysa `followBtn`).
4. Türkçe/Estonca aksanlı karakterleri (ğ, ş, ä, õ …) doğru kullan; UTF‑8 olarak kaydet.

---

## 🧪 Test

Kritik akışlar Playwright ile kapsanır.

```bash
pnpm test:e2e
```

- Yeni bir kullanıcı akışı eklediysen `e2e/critical.spec.ts`'e bir test ekle.
- Testleri **deterministik** tut — sabit timeout yerine rol/heading/URL beklentileri kullan.
- Bir buildi yeşil bırakmadan PR açma:
  ```bash
  pnpm build    # BUILD EXIT 0 olmalı (çıktıyı grep'leme, çıkış koduna bak)
  ```

---

## 🔒 Güvenlik

- **Asla secret commit'leme.** API anahtarları, `service_role`, VAPID private — yalnız `.env.local` (zaten `.gitignore`'da).
- Dışarıdan gelen veriyi (kullanıcı girdisi, RSS, API yanıtı) doğrula; güvenme.
- Görsel/URL proxy'lerinde **SSRF korumasını** koru (non‑https + private IP engeli).
- Durum değiştiren endpoint'lerde rate‑limit / secret koruması.
- Bir güvenlik açığı bulursan **public issue açma** — repo sahibine özelden ulaş.

---

## 🔁 Pull Request Süreci

1. Dalını güncel `main` üzerine rebase et, çakışmaları çöz.
2. Şunları doğrula:
   - [ ] `pnpm lint` temiz
   - [ ] `pnpm build` çıkış kodu `0`
   - [ ] `pnpm test:e2e` geçiyor (UI/akış değiştiyse)
   - [ ] Yeni i18n string'leri 3 dilde
   - [ ] Secret yok, `console.log` yok
3. Açıklayıcı bir PR aç:
   - **Ne** değiştirdin ve **neden**.
   - İlgili issue'yu bağla (`Closes #123`).
   - UI değişikliği varsa ekran görüntüsü ekle.
   - Test planını yaz.
4. İnceleme geri bildirimlerini ele al; tartışmayı yapıcı tut.

---

## 💡 Katkı Türleri

Sadece kod değil — şunlar da değerli:

- 🐛 **Hata bildirimi** — net repro adımlarıyla
- 📰 **Yeni RSS kaynağı** — `scripts/ingest.mjs` içindeki `FEED_LIST`'e bölge/bölüm etiketli ekleme
- 🌍 **Çeviri** — i18n string'lerinin doğruluğu/akıcılığı
- 📖 **Dokümantasyon** — README, bu rehber, kod yorumları
- 🎨 **Tasarım** — erişilebilirlik, responsive, mikro‑etkileşimler
- ⚡ **Performans** — bundle, CWV, sorgu optimizasyonu

---

<div align="center">

Katkın için teşekkürler! 📡

**[news.magnusmagi.com](https://news.magnusmagi.com)**

</div>
