import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    // 探活两处坑（本机实测）：① i18n 根路径 307 会被 Playwright 的重定向跟随探测掐断；
    // ② 本机对 localhost 的 IPv6 探活连接会 ECONNRESET，而 Playwright 自定义 dualStackLookup
    // 优先 IPv6 且无回退——故显式打 127.0.0.1 的 200 路由，reuseExistingServer 才能正常工作
    url: "http://127.0.0.1:3000/zh",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
