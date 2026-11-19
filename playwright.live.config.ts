import { defineConfig } from "@playwright/test";

// live-smoke 专用配置：真实浏览器 + 扩展加载 + 持久化 cookie。
// 与 ci.yml 的 fixture 回放互补——fixture 保逻辑正确，live 保选择器不过期。

export default defineConfig({
  testDir: "./extension/tests/e2e",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  use: {
    headless: false, // MV3 扩展在 headless 下受限，live-smoke 用 xvfb 跑
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      args: [
        `--disable-extensions-except=${process.cwd()}/extension`,
        `--load-extension=${process.cwd()}/extension`,
      ],
    },
  },
  projects: [
    {
      name: "chatgpt",
      testMatch: "chatgpt.smoke.spec.ts",
    },
    {
      name: "claude",
      testMatch: "claude.smoke.spec.ts",
    },
  ],
});
