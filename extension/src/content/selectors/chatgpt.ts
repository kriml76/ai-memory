// ChatGPT 选择器表。DOM 结构随版本漂移，
// 所有选择器集中在这里 + fixtures 回放兜底。
// 失效时按 docs/SELECTOR_PLAYBOOK.md 修复。

export const CHATGPT_SELECTORS = {
  /** 单条消息的根节点 */
  messageRoot: '[data-message-author-role]',
  /** assistant 消息 */
  assistant: '[data-message-author-role="assistant"]',
  /** user 消息 */
  user: '[data-message-author-role="user"]',
  /** 消息稳定 id（React 内部 key 兜底） */
  messageIdAttr: "data-message-id",
  /** 正在流式生成的标志：停止按钮存在即视为流式中 */
  stopButton: 'button[data-testid="stop-button"], button[aria-label*="Stop"]',
  /** 会话标题 */
  conversationTitle: "nav a[aria-current='page'], header h1, title",
  /** 输入框（用于 live-smoke 发送测试消息） */
  composer: "#prompt-textarea, div[contenteditable='true']",
  /** 发送按钮 */
  sendButton: 'button[data-testid="send-button"], button[aria-label*="Send"]',
} as const;

/** 从消息根节点抽取平台侧 message id，抽不到返回 null */
export function extractMessageId(root: Element): string | null {
  return (
    root.getAttribute("data-message-id") ??
    root.closest("[data-message-id]")?.getAttribute("data-message-id") ??
    null
  );
}

export function extractRole(root: Element): "user" | "assistant" | null {
  const role = root.getAttribute("data-message-author-role");
  return role === "user" || role === "assistant" ? role : null;
}
