import { test, expect } from "@playwright/test";
import { passGate } from "./gate";

// Tüm site parola kapısının arkasında; kapıyı geçmeyen test giriş sayfasını
// ölçer ve yanıltıcı sonuç verir (bkz e2e/gate.ts).
test.beforeEach(async ({ context, baseURL }) => { await passGate(context, baseURL); });

test.describe("Deprem (earthquake) page", () => {
  test("loads with the quake board, source toggle and a live list", async ({ page }) => {
    await page.goto("/tr/deprem");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Deprem");
    await expect(page.locator("text=Son Depremler").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Türkiye · Kandilli" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dünya · USGS" })).toBeVisible();
    const rows = page.locator("main .divide-y > button");
    await expect.poll(async () => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
  });

  test("hero shows the strongest quake with an OpenStreetMap map", async ({ page }) => {
    await page.goto("/tr/deprem");
    await expect(page.locator("text=Son 24 saatin en büyüğü").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('iframe[src*="openstreetmap"]').first()).toBeVisible();
  });

  test("switching source to USGS keeps a non-empty list", async ({ page }) => {
    await page.goto("/tr/deprem");
    await page.getByRole("button", { name: "Dünya · USGS" }).click();
    const rows = page.locator("main .divide-y > button");
    await expect.poll(async () => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
  });

  test("M5+ filter only keeps magnitude 5 and above", async ({ page }) => {
    await page.goto("/tr/deprem");
    await page.getByRole("button", { name: "Dünya · USGS" }).click();
    await page.getByRole("button", { name: "M5+" }).click();
    // either zero results (allowed) or every visible row's magnitude >= 5
    const mags = await page.locator("main .divide-y > button .font-serif").allInnerTexts();
    for (const m of mags) {
      const v = parseFloat(m);
      if (!Number.isNaN(v)) expect(v).toBeGreaterThanOrEqual(5);
    }
  });

  test("AI Predict button sits left of Follow and opens a tabbed analysis panel", async ({ page }) => {
    // Stub the AI endpoint so the test never hits OpenAI (cost/flake-free, deterministic).
    await page.route("**/api/quakes/analyze**", (route) => {
      const src = new URL(route.request().url()).searchParams.get("source") ?? "kandilli";
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          source: src,
          text: `Stubbed ${src} analysis paragraph.`,
          stats: { last24h: 12, last3h: 2, strongest: { mag: 4.1, place: "Test" }, topRegions: [{ name: "Manisa", count: 8 }] },
          asOf: Date.now(),
          error: null,
        }),
      });
    });
    await page.goto("/tr/deprem");

    const ai = page.getByRole("button", { name: /AI Predict/ });
    const follow = page.getByRole("button", { name: /Takip et/i });
    await expect(ai).toBeVisible();
    const aiBox = await ai.boundingBox();
    const folBox = await follow.boundingBox();
    expect(aiBox!.x).toBeLessThan(folBox!.x);

    await ai.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Türkiye · Kandilli/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Dünya · USGS/ })).toBeVisible();
    await expect(dialog.locator("text=Stubbed kandilli analysis")).toBeVisible();
    // disclaimer that earthquakes can't be predicted is always present
    await expect(dialog.locator("text=TAHMİN EDİLEMEZ")).toBeVisible();

    // switching to the world tab loads the USGS analysis
    await dialog.getByRole("button", { name: /Dünya · USGS/ }).click();
    await expect(dialog.locator("text=Stubbed usgs analysis")).toBeVisible();
  });

  test("clicking a quake opens the detail modal with map and magnitude", async ({ page }) => {
    await page.goto("/tr/deprem");
    const row = page.locator("main .divide-y > button").first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("text=Büyüklük")).toBeVisible();
    await expect(dialog.locator('iframe[src*="openstreetmap"]')).toHaveCount(1);
  });
});
