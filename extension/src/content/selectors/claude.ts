// Claude 选择器表。结构与 ChatGPT 不同：消息按 turn 分组，
// assistant 回复在 .font-claude-message 等容器内。

export const CLAUDE_SELECTORS = {
  messageRoot: ".font-claude-message, [data-testid*='message']",
  assistant: ".font-claude-message",
  user: ".font-user-message, [data-testid='user-message']",
  /** Claude 无稳定 message-id，兜底用 DOM 路径哈希 */
  stopButton: 'button[aria-label*="Stop"], button[data-testid*="stop"]',
  conversationTitle: "header h1, nav [class*='title']",
  composer: "div[contenteditable='true'], fieldset textarea",
  sendButton: 'button[aria-label*="Send"], button[type="submit"]',
} as const;

/** Claude 消息无服务端 id，用"会话id + DOM序号 + 文本指纹"合成主键 */
export function synthesizeMessageId(root: Element, conversationId: string): string {
  const text = (root.textContent ?? "").slice(0, 200);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const seq = Array.from(root.parentElement?.children ?? []).indexOf(root);
  return `claude-${conversationId}-${seq}-${(h >>> 0).toString(36)}`;
}
