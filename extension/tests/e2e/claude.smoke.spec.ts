import { test, expect } from "@playwright/test";

// Claude live 冒烟。结构与 ChatGPT 不同，选择器见 selectors/claude.ts。

const PROMPT = "用三句话解释什么是 JavaScript 闭包";

test.beforeEach(async ({ context }) => {
  const cookie = process.env.CLAUDE_SESSION_COOKIE;
  if (!cookie) test.skip(true, "CLAUDE_SESSION_COOKIE 未配置");
  await context.addCookies([
    {
      name: "sessionKey",
      value: cookie!,
      domain: ".claude.ai",
      path: "/",
      secure: true,
      httpOnly: true,
    },
  ]);
});

test("Claude 消息被捕获", async ({ page }) => {
  await page.goto("https://claude.ai/new");
  await page.waitForSelector("div[contenteditable='true']", { timeout: 30_000 });

  await page.fill("div[contenteditable='true']", PROMPT);
  await page.keyboard.press("Enter");

  // 等 assistant 回复出现且停止按钮消失
  await page.waitForSelector(".font-claude-message", { timeout: 30_000 });
  await page
    .waitForSelector('button[aria-label*="Stop"]', { state: "detached", timeout: 90_000 })
    .catch(() => {});

  const reply = page.locator(".font-claude-message").last();
  await expect(reply).toBeVisible({ timeout: 10_000 });
  const text = await reply.textContent();
  expect(text?.length ?? 0).toBeGreaterThan(50);

  const fs = await import("node:fs");
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/dom-dump.html", await page.content());
});
