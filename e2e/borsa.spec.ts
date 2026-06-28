import { test, expect } from "@playwright/test";

// Borsa: markets dashboard + weather. Veriler dış API'lerden geldiği için
// assertion'lar dayanıklı (kart YA DA "alınamıyor" durumu kabul edilir).
test.describe("Borsa dashboard", () => {
  test("borsa page loads with the markets board", async ({ page }) => {
    await page.goto("/tr/borsa");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Borsa");
    await expect(page.locator("text=Canlı Piyasa").first()).toBeVisible({ timeout: 10000 });
  });

  test("clicking a quote card opens the detail modal with chart-type toggle", async ({ page }) => {
    await page.goto("/tr/borsa");
    const card = page.locator('button:has-text("%")').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Grafik türü düğmeleri
    await expect(dialog.getByRole("button", { name: "Mum" })).toBeVisible();
    await dialog.getByRole("button", { name: "Mum" }).click();
    await expect(dialog.locator("svg").first()).toBeVisible();
    // Kapat
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("starring a market card adds it to the watchlist", async ({ page }) => {
    await page.goto("/tr/borsa");
    const star = page.getByRole("button", { name: "Add to watchlist" }).first();
    await expect(star).toBeVisible({ timeout: 10000 });
    await star.click();
    await expect(page.getByRole("button", { name: "Remove from watchlist" }).first()).toBeVisible();
    await expect(page.locator("text=İzleme Listem")).toBeVisible();
  });

  test("weather section renders cities and a city search", async ({ page }) => {
    await page.goto("/tr/borsa");
    await expect(page.locator("text=Hava Durumu")).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Şehir ara…")).toBeVisible();
  });

  test("city search returns geocoding suggestions", async ({ page }) => {
    await page.goto("/tr/borsa");
    const input = page.getByPlaceholder("Şehir ara…");
    await input.fill("Paris");
    // Öneri listesi ya da en azından input dolu kalır
    const option = page.locator("ul li button").first();
    await expect.poll(async () => (await option.count()) > 0, { timeout: 8000 }).toBeTruthy();
  });
});
