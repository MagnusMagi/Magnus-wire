import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

const paths = ["/tr", "/tr/borsa", "/tr/hava", "/tr/deprem"];

for (const path of paths) {
  test(`no horizontal overflow at 375px: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(1800); // async pano/kart hidrasyonu
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow ${overflow}px on ${path}`).toBeLessThanOrEqual(1);
  });
}

test("nav last item (ABD) is reachable", async ({ page }) => {
  await page.goto("/tr/hava");
  const last = page.getByRole("navigation", { name: "sections" }).getByRole("link", { name: "ABD" });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
});
