import { test, expect } from "@playwright/test";

// ChatGPT live 冒烟：发一条固定 prompt，验证插件捕获链路。
// 需要 secrets.CHATGPT_SESSION_COOKIE（GitHub Actions）或本地 .env。

const PROMPT = "用三句话解释什么是 JavaScript 闭包";

test.beforeEach(async ({ context }) => {
  const cookie = process.env.CHATGPT_SESSION_COOKIE;
  if (!cookie) test.skip(true, "CHATGPT_SESSION_COOKIE 未配置");
  await context.addCookies([
    {
      name: "__Secure-next-auth.session-token",
      value: cookie!,
      domain: ".chatgpt.com",
      path: "/",
      secure: true,
      httpOnly: true,
    },
  ]);
});

test("ChatGPT 消息被捕获并落库", async ({ page }) => {
  await page.goto("https://chatgpt.com/");
  await page.waitForSelector("#prompt-textarea", { timeout: 30_000 });

  await page.fill("#prompt-textarea", PROMPT);
  await page.click('button[data-testid="send-button"]');

  // 等流式结束：停止按钮消失 + 内容稳定
  await page.waitForSelector('button[data-testid="stop-button"]', {
    state: "detached",
    timeout: 90_000,
  });

  // 验收断言：assistant 消息存在且文本长度合理
  const assistant = page.locator('[data-message-author-role="assistant"]').last();
  await expect(assistant).toBeVisible({ timeout: 10_000 });
  const text = await assistant.textContent();
  expect(text?.length ?? 0).toBeGreaterThan(50);

  // DOM dump 供失败时 issue 使用
  const fs = await import("node:fs");
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/dom-dump.html", await page.content());
});
