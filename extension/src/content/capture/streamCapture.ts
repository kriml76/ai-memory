// StreamCapture 状态机 —— DOM 无关的核心判定逻辑。
// content script 负责把 DOM mutation 翻译成 CaptureInput 喂进来；
// 这里纯函数化，fixture 可在 Node 里直接回放。

import type { ChatMessage } from "@core/store/schema";

export interface CaptureInput {
  /** 归一化后的消息文本（textContent 抽取 + markdown 兜底） */
  text: string;
  /** 代码块原文数组 */
  codeBlocks: string[];
  /** 当前时间戳 ms */
  now: number;
  /** 最近一次 SSE chunk 到达时间戳；无网络嗅探时传 0 */
  lastChunkAt: number;
  /** 消息节点是否仍在 DOM 中（虚拟滚动回收/Regenerate 会置 false） */
  nodeAlive: boolean;
}

export interface CaptureDecision {
  state: ChatMessage["capture"]["state"];
  fingerprint: string;
  stableTicks: number;
  /** true = 可以 COMMITTED 落库 */
  shouldCommit: boolean;
}

export const CAPTURE_DEFAULTS = {
  /** 最短生成时长，防止过早判定（ms） */
  MIN_DURATION_MS: 1500,
  /** DOM 内容需连续稳定的 mutation 次数 */
  STABLE_TICKS_REQUIRED: 3,
  /** 网络静默阈值：超过此时长无新 chunk 视为流结束（ms） */
  QUIET_MS: 800,
  /** 单条消息最大捕获时长，超时强制提交（防挂死） */
  MAX_DURATION_MS: 120_000,
} as const;

export class StreamCapture {
  private fingerprint = "";
  private stableTicks = 0;
  private state: ChatMessage["capture"]["state"] = "CAPTURING";
  private startedAt = 0;
  private lastText = "";
  private lastCodeBlocks: string[] = [];

  constructor(private readonly opts = CAPTURE_DEFAULTS) {}

  /** content script 在检测到新 assistant 消息节点时调用 */
  begin(now: number): void {
    this.state = "CAPTURING";
    this.startedAt = now;
    this.fingerprint = "";
    this.stableTicks = 0;
    this.lastText = "";
    this.lastCodeBlocks = [];
  }

  /**
   * 每次 DOM mutation / 定时器 tick 调用一次。
   * 返回当前判定；shouldCommit=true 时调用方负责落库并 reset。
   */
  feed(input: CaptureInput): CaptureDecision {
    if (this.state === "COMMITTED" || this.state === "ABORTED") {
      return this.decision(false);
    }

    if (!input.nodeAlive) {
      // 节点被虚拟滚动回收或 Regenerate 替换
      this.state = "ABORTED";
      return this.decision(false);
    }

    const fp = fingerprintOf(input.text, input.codeBlocks);

    if (fp === this.fingerprint && input.text === this.lastText) {
      this.stableTicks++;
    } else {
      this.stableTicks = 0;
      this.fingerprint = fp;
      this.lastText = input.text;
      this.lastCodeBlocks = [...input.codeBlocks];
    }

    const elapsed = input.now - this.startedAt;
    const networkQuiet =
      input.lastChunkAt === 0 || input.now - input.lastChunkAt >= this.opts.QUIET_MS;

    // 超时强制提交：宁可截断也不挂死
    if (elapsed >= this.opts.MAX_DURATION_MS && input.text.length > 0) {
      this.state = "COMMITTED";
      return this.decision(true);
    }

    const domStable = this.stableTicks >= this.opts.STABLE_TICKS_REQUIRED;
    const minElapsed = elapsed >= this.opts.MIN_DURATION_MS;

    // 双信号 AND：DOM 稳定 + 网络静默 + 最短时长
    if (domStable && networkQuiet && minElapsed && input.text.length > 0) {
      this.state = "COMMITTED";
      return this.decision(true);
    }

    this.state = "SETTLING";
    return this.decision(false);
  }

  /** 落库后调用，准备捕获下一条 */
  reset(): void {
    this.state = "CAPTURING";
    this.fingerprint = "";
    this.stableTicks = 0;
    this.lastText = "";
    this.lastCodeBlocks = [];
  }

  getState(): ChatMessage["capture"]["state"] {
    return this.state;
  }

  snapshot(): { text: string; codeBlocks: string[] } {
    return { text: this.lastText, codeBlocks: this.lastCodeBlocks };
  }

  private decision(shouldCommit: boolean): CaptureDecision {
    return {
      state: this.state,
      fingerprint: this.fingerprint,
      stableTicks: this.stableTicks,
      shouldCommit,
    };
  }
}

/** FNV-1a 32bit + 长度盐，足够做稳定性指纹，不做加密 */
export function fingerprintOf(text: string, codeBlocks: string[]): string {
  const payload = `${text.length}:${text.slice(0, 64)}|${codeBlocks.length}:${codeBlocks
    .map((c) => c.length)
    .join(",")}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
