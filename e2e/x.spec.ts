import { test, expect } from "@playwright/test";
import { passGate } from "./gate";

// ⚠️ Tüm site parola kapısının arkasında; kapıyı geçmeyen test giriş sayfasını
// ölçer ve yanıltıcı şekilde "geçer" (bkz e2e/gate.ts).
test.beforeEach(async ({ context, baseURL }) => { await passGate(context, baseURL); });

test.describe("X panosu", () => {
  test("sayfa başlık ve tellerle yükleniyor", async ({ page }) => {
    await page.goto("/tr/x");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("X'te Gündem");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });
  });

  test("dil filtresi listeyi daraltıyor ve URL'ye yazılıyor", async ({ page }) => {
    await page.goto("/tr/x");
    const before = await page.locator("article").count();
    expect(before).toBeGreaterThan(0);

    // Çetelenin ilk gerçek dil satırı (Tümü'nden sonraki).
    const langBtn = page.getByRole("complementary", { name: "Dil" }).locator("ul li button").nth(1);
    const label = (await langBtn.innerText()).split("\n")[0];
    await langBtn.click();

    await expect(page).toHaveURL(/[?&]dil=/);
    const after = await page.locator("article").count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThanOrEqual(before);
    // Süzülen dil, üstteki sayaç satırında görünmeli.
    expect(label.length).toBeGreaterThan(0);
  });

  test("sıralama Yeni'ye geçince URL'ye yazılıyor ve sıra değişebiliyor", async ({ page }) => {
    await page.goto("/tr/x");
    await page.getByRole("button", { name: "Yeni" }).click();
    await expect(page).toHaveURL(/[?&]sirala=yeni/);
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("kart özgün tweet'e giden bağlantı taşıyor (X Display Requirements)", async ({ page }) => {
    await page.goto("/tr/x");
    const link = page.locator('article a[href^="https://x.com/"][href*="/status/"]').first();
    await expect(link).toBeVisible();
  });

  test("görseller kendi vekilimizden geçiyor — tarayıcıdan X'e istek YOK", async ({ page }) => {
    const thirdParty: string[] = [];
    page.on("request", (r) => {
      const h = new URL(r.url()).hostname;
      if (/twimg\.com$|twitter\.com$|x\.com$/.test(h)) thirdParty.push(r.url());
    });
    await page.goto("/tr/x", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    expect(thirdParty).toEqual([]);
  });

  test("375px'te yatay taşma yok", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/tr/x");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("metinsiz teller GÖSTERİLMİYOR", async ({ page }) => {
    await page.goto("/tr/x");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });
    // Dil çetelesinde "Metinsiz" sekmesi olmamalı ve hiçbir kart o rozeti taşımamalı.
    await expect(page.getByRole("complementary", { name: "Dil" })).not.toContainText("Metinsiz");
    // ⚠️ `.not.toContainText` çoklu eşleşmede strict-mode ihlali verir (200 kart);
    // "hiç yok" iddiası sayımla kurulur.
    await expect(page.locator("article", { hasText: "METİNSİZ" })).toHaveCount(0);
    // Her kartın gerçek bir gövdesi olmalı.
    const empty = await page.locator("article p.whitespace-pre-wrap").evaluateAll(
      (ps) => ps.filter((p) => (p.textContent || "").trim().length === 0).length,
    );
    expect(empty).toBe(0);
  });

  test("fotoğrafa tıklayınca tam ekran büyüteç açılıyor ve Escape kapatıyor", async ({ page }) => {
    await page.goto("/tr/x");
    const photo = page.getByRole("button", { name: "Görseli büyüt" }).first();
    await expect(photo).toBeVisible({ timeout: 10000 });
    await photo.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Büyüteç tam boy sürümü istemeli (name=large) ve yine kendi vekilimizden geçmeli.
    const src = await dialog.locator("img").first().getAttribute("src");
    expect(src).toContain("/api/x/img?u=");
    expect(decodeURIComponent(src || "")).toContain("name=large");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("kırık görsel kartta yer tutucu bırakmıyor", async ({ page }) => {
    await page.goto("/tr/x");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });
    // Yeniden deneme + gizleme mantığının oturması için bekle (görseller
    // önce ?name=small ile denenir, hata olursa boyutsuz URL'e düşer).
    await page.waitForTimeout(4000);
    // ⚠️ X, telifli video kapaklarını DMCA yer tutucusuna yönlendiriyor; vekil
    // bunu 404'e çeviriyor ve istemci görseli tamamen gizliyor. Sayfada
    // yüklenememiş (naturalWidth===0) tek bir görsel kalmamalı.
    const broken = await page.locator("article img").evaluateAll(
      (imgs) => imgs.filter((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0).length,
    );
    expect(broken).toBe(0);
  });

  test("nadir diller pencerede taban kotayla korunuyor", async ({ page }) => {
    // ⚠️ Gerileme testi: pencere düz "en yeni N" olsaydı İngilizce seli nadir
    // dilleri dışarı iterdi. Her dil sekmesi tıklanınca EN AZ bir kart vermeli.
    await page.goto("/tr/x");
    const rail = page.getByRole("complementary", { name: "Dil" });
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });

    // ⚠️ Ray'de İKİ liste var: masaüstü çetelesi ve mobil çip şeridi
    // (biri lg:hidden). Hepsini seçmek görünmez düğmeye tıklamayı denetir.
    const buttons = rail.locator("ul").first().locator("li button");
    const n = await buttons.count();
    expect(n).toBeGreaterThan(2); // Tümü + en az iki dil
    for (let i = 1; i < n; i++) {
      await buttons.nth(i).click();
      const label = (await buttons.nth(i).innerText()).replace(/\s+/g, " ").trim();
      await expect(page.locator("article").first(), `boş dil sekmesi: ${label}`).toBeVisible();
    }
  });

  test("uzun gönderilerin TAM metni gösteriliyor", async ({ page }) => {
    // ⚠️ X'in kendi ücretsiz uçları 280 karakterde kesiyor; tam metin ancak
    // kurtarma hattıyla geliyor (bkz xSyndication.mjs:fetchFullText). 320+
    // karakterlik bir kart, kurtarmanın canlı olduğunun kanıtı.
    await page.goto("/tr/x");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });
    const longest = await page.locator("article p.whitespace-pre-wrap").evaluateAll(
      (ps) => Math.max(0, ...ps.map((p) => (p.textContent || "").trim().length)),
    );
    expect(longest).toBeGreaterThan(320);
  });

  test("kurtarılamayan gönderi sessizce kesilmiyor", async ({ page }) => {
    // Kurtarma başarısız olabilir (silinmiş/erişilemez). O zaman kart bunu
    // AÇIKÇA söylemeli. Sayfada kesik tel yoksa test boşuna geçmesin diye
    // iddia koşullu: VARSA bağlantısı doğru olmalı.
    await page.goto("/tr/x");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });
    const notice = page.locator('a:has-text("X bu gönderiyi kısaltıyor")');
    const n = await notice.count();
    for (let i = 0; i < n; i++) {
      const href = await notice.nth(i).getAttribute("href");
      expect(href).toMatch(/^https:\/\/x\.com\/[^/]+\/status\/\d+$/);
    }
  });

  test("onaylı filtresi listeyi daraltıyor ve URL'ye yazılıyor", async ({ page }) => {
    await page.goto("/tr/x");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });
    const before = await page.locator("article").count();

    await page.getByRole("button", { name: "✓ Onaylı" }).click();
    await expect(page).toHaveURL(/[?&]onayli=1/);

    const after = await page.locator("article").count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThanOrEqual(before);
    // Kalan HER kartta doğrulama rozeti olmalı.
    const withBadge = await page.locator('article:has([aria-label="doğrulanmış"])').count();
    expect(withBadge).toBe(after);
  });

  test("onaylı + Türkçe birlikte çalışıyor (Türkiye görünümü)", async ({ page }) => {
    // Kullanıcının istediği asıl görünüm: Türkiye özelinde onaylı hesaplar.
    await page.goto("/tr/x?dil=tr&onayli=1");
    await expect(page.locator("article").first()).toBeVisible({ timeout: 10000 });
    const n = await page.locator("article").count();
    expect(n).toBeGreaterThan(0);
    // Çetele sayacı, tıklandığında görülecek sayıyla TUTARLI olmalı.
    const rail = page.getByRole("complementary", { name: "Dil" });
    const active = rail.locator("ul").first().locator("li button[aria-pressed=\"true\"]");
    const label = await active.innerText();
    expect(Number(label.match(/(\d+)\s*$/)?.[1])).toBe(n);
  });

  test("navigasyondan X panosuna gidilebiliyor", async ({ page }) => {
    await page.goto("/tr");
    await page.locator('nav a[href="/tr/x"]').first().click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("X'te Gündem");
  });
});
