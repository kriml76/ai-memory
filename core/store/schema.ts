// 消息存储 schema。铁律：原始记录只存本地（IndexedDB），
// 任何离开本机的数据必须先经过 summary 层脱敏。

export type CaptureState = "CAPTURING" | "SETTLING" | "COMMITTED" | "ABORTED";

export interface ChatMessage {
  /** 平台侧消息 ID（ChatGPT/Claude DOM 中的 data-message-id 等） */
  platformMessageId: string;
  conversationId: string;
  role: "user" | "assistant";
  /** 归一化后的纯文本（markdown 原文，非渲染后 DOM 文本） */
  text: string;
  codeBlocks: string[];
  /** ISO 时间戳 */
  createdAt: string;
  /** 该消息所属对话的标题（用于 UI 与出题上下文） */
  contextTitle: string;
  /** 学习模式标记：只有 true 的对话才参与遗忘衰退 */
  studyMode: boolean;
  capture: {
    state: CaptureState;
    /** 最后一次内容指纹，用于稳定性判定 */
    lastFingerprint: string;
    /** 连续无变化的 mutation 计数 */
    stableTicks: number;
    /** 最后一次 SSE chunk 到达时间戳 */
    lastChunkAt: number;
    startedAt: number;
  };
}

/** 上云前必须经过的脱敏结构——只允许这三个字段离开本机 */
export interface SanitizedSummary {
  messageId: string;
  /** 本地生成的要点摘要，不含原文 */
  keyPoints: string[];
  topicTags: string[];
}
