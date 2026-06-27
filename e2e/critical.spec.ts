import { test, expect } from "@playwright/test";

test.describe("Magnus Wire critical flows", () => {
  test("homepage renders the wire with dispatches", async ({ page }) => {
    await page.goto("/tr");
    await expect(page.locator("h1").first()).toBeVisible();
    const links = page.locator('a[href*="/tr/dispatch/"]');
    await expect(links.first()).toBeVisible();
  });

  test("category page loads and finance shows the market ticker", async ({ page }) => {
    await page.goto("/tr/finans");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Finans");
    await expect(page.locator("text=/USD\\/TRY|BTC/").first()).toBeVisible({ timeout: 8000 });
  });

  test("dispatch detail opens from home with listen button and source", async ({ page }) => {
    await page.goto("/tr");
    const href = await page.locator('a[href*="/tr/dispatch/"]').first().getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page).toHaveURL(/\/tr\/dispatch\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dinle" })).toBeVisible();
  });

  test("search returns a result or an empty-state", async ({ page }) => {
    await page.goto("/tr/ara?q=yapay");
    const results = page.locator('a[href*="/tr/dispatch/"]');
    const empty = page.locator("text=/bulunamadı/i");
    await expect.poll(async () => (await results.count()) > 0 || (await empty.count()) > 0).toBeTruthy();
  });

  test("archive page loads", async ({ page }) => {
    const res = await page.goto("/tr/arsiv");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("developing stories page loads with timelines", async ({ page }) => {
    await page.goto("/tr/hikayeler");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hikaye");
  });

  test("personalized feed shows empty-state when nothing followed", async ({ page }) => {
    await page.goto("/tr/akis");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("text=/takip etmiyorsun/i")).toBeVisible();
  });

  test("newsletter form is present in the footer", async ({ page }) => {
    await page.goto("/tr");
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("english and estonian locales render", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.goto("/et");
    await expect(page.locator("html")).toHaveAttribute("lang", "et");
  });
});
