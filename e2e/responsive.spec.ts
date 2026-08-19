import { test, expect } from "@playwright/test";
import { passGate } from "./gate";

const WIDTHS = [320, 375, 414];
const paths = ["/tr", "/tr/borsa", "/tr/hava", "/tr/deprem", "/tr/savas", "/tr/savas/rusya-ukrayna", "/tr/hikayeler", "/tr/arsiv", "/tr/arsiv?bolum=siber"];

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL);
});

for (const width of WIDTHS) {
  for (const path of paths) {
    test(`${width}px yatay taşma yok: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(path);
      // Kapıyı gerçekten geçtik mi? Geçmediysek giriş sayfasını ölçer ve
      // "taşma yok" diye YANLIŞ geçerdik.
      await expect(page.locator("input[type=password]")).toHaveCount(0);
      await page.waitForTimeout(1800); // async pano/kart hidrasyonu

      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const bad: string[] = [];
        // ⚠️ KASITLI yatay kaydırıcıların içi taşma DEĞİLDİR: saatlik hava
        // şeridi, nav ve piyasa şeritleri bilerek viewport'tan geniştir ve
        // kendi kabında kaydırılır. Bunları elemezsek test 76 "hata" bulup
        // gerçek bir tanesini gürültüde boğar.
        const inScroller = (el: Element): boolean => {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === "auto" || ox === "scroll") return true;
          }
          return false;
        };
        for (const el of Array.from(document.querySelectorAll("main *"))) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          if (inScroller(el)) continue;
          if (b.right > vw + 1 || b.left < -1) {
            bad.push(`<${el.tagName.toLowerCase()} class="${(el.getAttribute("class") || "").slice(0, 60)}"> ${Math.round(b.left)}..${Math.round(b.right)} (vw ${vw})`);
          }
        }
        return { vw, scroll: document.documentElement.scrollWidth, bad: bad.slice(0, 5), total: bad.length };
      });

      // ⚠️ scrollWidth ÖLÇMEK YETMEZ: globals.css'te `html, body { overflow-x: clip }`
      // var, bu yüzden taşan içerik scrollWidth'i BÜYÜTMEZ — kırpılır ve test
      // yeşil kalır. Gerçek ölçüt, öğelerin viewport dışına taşıp taşmadığı.
      expect(r.bad.join("\n"), `${r.total} öğe ${width}px viewport dışına taşıyor:\n${r.bad.join("\n")}`).toBe("");
    });
  }
}

test("nav son öğe (ABD) erişilebilir", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tr/hava");
  const last = page.getByRole("navigation", { name: "sections" }).getByRole("link", { name: "ABD" });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
});

test("arşiv filtresi listeyi daraltıyor", async ({ page }) => {
  await page.goto("/tr/arsiv");
  const hepsi = await page.locator('a[href^="/tr/dispatch/"]').count();
  await page.goto("/tr/arsiv?bolum=siber");
  const suzulmus = await page.locator('a[href^="/tr/dispatch/"]').count();
  expect(suzulmus).toBeGreaterThan(0);
  expect(suzulmus).toBeLessThan(hepsi);
});

test("Savaş panosu nav'da ve cephelere gidiyor", async ({ page }) => {
  await page.goto("/tr");
  const chip = page.getByRole("navigation", { name: "sections" }).getByRole("link", { name: "Savaş" });
  await chip.scrollIntoViewIfNeeded();
  await chip.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Savaş");
  await page.getByRole("link", { name: /Rusya–Ukrayna/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Rusya–Ukrayna");
});
