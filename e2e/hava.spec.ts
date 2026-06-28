import { test, expect } from "@playwright/test";

test.describe("Hava (weather) page", () => {
  test("hava page loads with the weather board and city search", async ({ page }) => {
    await page.goto("/tr/hava");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hava");
    await expect(page.locator("text=Hava Durumu").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Şehir ara…")).toBeVisible();
  });

  test("city search returns geocoding suggestions", async ({ page }) => {
    await page.goto("/tr/hava");
    await page.getByPlaceholder("Şehir ara…").fill("Paris");
    const option = page.locator("ul li button").first();
    await expect.poll(async () => (await option.count()) > 0, { timeout: 8000 }).toBeTruthy();
  });

  test("clicking a weather card opens the 7-day forecast", async ({ page }) => {
    await page.goto("/tr/hava");
    const card = page.locator('button:has-text("km/h")').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("text=7 Günlük Tahmin")).toBeVisible();
  });

  test("hero shows a big featured view with precipitation radar", async ({ page }) => {
    await page.goto("/tr/hava");
    await expect(page.locator("text=Yağış Radarı").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('iframe[src*="embed.windy.com"]')).toHaveCount(1);
  });

  test("pinning a city sets it as the hero default", async ({ page }) => {
    await page.goto("/tr/hava");
    const pin = page.getByRole("button", { name: "Varsayılan yap" }).first();
    await expect(pin).toBeVisible({ timeout: 10000 });
    await pin.click();
    await expect(page.getByRole("button", { name: "Varsayılan şehir" }).first()).toBeVisible();
  });

});