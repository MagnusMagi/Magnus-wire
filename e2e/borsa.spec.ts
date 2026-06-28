import { test, expect } from "@playwright/test";

test.describe("Borsa dashboard", () => {
  test("borsa page loads with the markets board", async ({ page }) => {
    await page.goto("/tr/borsa");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Borsa");
    await expect(page.locator("text=Canlı Piyasa").first()).toBeVisible({ timeout: 10000 });
  });

  test("borsa page no longer contains the weather section", async ({ page }) => {
    await page.goto("/tr/borsa");
    await expect(page.locator("text=Canlı Piyasa").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Hava Durumu")).toHaveCount(0);
  });

  test("clicking a quote card opens the detail modal with chart-type toggle", async ({ page }) => {
    await page.goto("/tr/borsa");
    const card = page.locator('button:has-text("%")').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Mum" })).toBeVisible();
    await dialog.getByRole("button", { name: "Mum" }).click();
    await expect(dialog.locator("svg").first()).toBeVisible();
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
});
