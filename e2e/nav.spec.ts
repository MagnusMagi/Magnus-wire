import { test, expect } from "@playwright/test";
import { passGate } from "./gate";

/**
 * Bölüm navigasyonu yatay bir ray (`overflow-x: auto`). O beyan diğer ekseni
 * de `auto`'ya hesaplatır — bir eksen `visible` değilse öteki `visible`
 * kalamaz — yani ray İKİ eksende birden scroll container olur.
 *
 * Sonuç 2026-08-24'te kullanıcı tarafından bildirildi: bağlantıların
 * `-mb-[2px]`'i aktif çizgiyi kabın dışına taşıyor, ray parmakla 2px yukarı
 * aşağı kayıyordu. Fareyle görünmüyor; bu yüzden bekçi dokunmatikte değil
 * ölçümde duruyor.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL);
});

const WIDTHS = [320, 390, 1280];

for (const width of WIDTHS) {
  test(`${width}px: bölüm rayı dikey kaymıyor`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/tr");
    await expect(page.locator("input[type=password]")).toHaveCount(0);

    const overflow = await page.evaluate(() => {
      const rails = document.querySelectorAll<HTMLElement>('nav[aria-label="sections"] ul');
      return Array.from(rails).map((r) => r.scrollHeight - r.clientHeight);
    });

    // Yatay taşma serbest ve beklenen; dikey olan hatanın ta kendisi.
    expect(overflow).toEqual(overflow.map(() => 0));
  });
}

test("aktif sekmenin çizgisi tam kalınlığında BOYANIYOR", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 812 });
  await page.goto("/tr");
  await expect(page.locator("input[type=password]")).toHaveCount(0);

  const r = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="sections"]')!;
    const ul = nav.querySelector("ul")!;
    const link = nav.querySelector<HTMLElement>('a[aria-current="page"]')!;
    const border = parseFloat(getComputedStyle(link).borderBottomWidth) || 0;
    const lb = link.getBoundingClientRect();
    const ub = ul.getBoundingClientRect();
    // overflow PADDING box'ta kırpar
    const clipBottom = ub.bottom - (parseFloat(getComputedStyle(ul).borderBottomWidth) || 0);
    const top = lb.bottom - border;
    // ⚠️ Kutu ölçüsü yetmez: kırpılmış eleman da "doğru konumda" görünür.
    // Çizginin kendi orta noktasını hit-test et — MagnusGeo'da tam bu ayrım
    // yeşil bir testin arkasında hiç boyanmayan bir çizgiyi saklamıştı.
    const hit = document.elementFromPoint(lb.left + lb.width / 2, top + border / 2);
    return {
      border,
      painted: Math.max(0, Math.min(lb.bottom, clipBottom) - top),
      hitIsLink: hit === link,
    };
  });

  expect(r.border).toBeGreaterThan(0);
  expect(r.painted).toBeCloseTo(r.border, 1);
  expect(r.hitIsLink).toBe(true);
});
