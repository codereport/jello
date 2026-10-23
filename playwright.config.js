import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.js",
  timeout: 150_000,
  expect: { timeout: 15_000 },
  workers: 2,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYGROUND_URL || "http://127.0.0.1:8765",
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1150 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: process.env.PLAYGROUND_URL ? undefined : {
    command: "python3 scripts/build_site.py && python3 -m http.server 8765 --bind 127.0.0.1 --directory _site",
    url: "http://127.0.0.1:8765",
    reuseExistingServer: !process.env.CI,
  },
});
