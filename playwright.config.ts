import { defineConfig, devices } from "@playwright/test";

// E2E runs against the live local PM2 server (news:3360). Override with E2E_BASE_URL.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3360",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use the cached full chromium build (avoids headless-shell revision mismatch).
        launchOptions: { executablePath: process.env.CHROME_BIN || "/home/ubuntu/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome" },
      },
    },
  ],
});
