import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3227";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  outputDir: "playwright-results",
  // The suite runs against a production build on one machine (and 2 workers on
  // CI). A full-page capture of four routes or a full-document search navigation
  // can take longer than the 5 s default without anything being wrong; the
  // assertions themselves are unchanged.
  expect: { timeout: 12_000 },
  // projectName keeps the 1440 and 375 baselines from overwriting each other.
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    colorScheme: "light",
    locale: "ar-EG",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 },
    },
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 13"], viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3227",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
