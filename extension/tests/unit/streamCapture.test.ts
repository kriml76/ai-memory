import { describe, it, expect } from "vitest";
import { StreamCapture, fingerprintOf, CAPTURE_DEFAULTS } from "@capture/streamCapture";

const T0 = 1_000_000;

function feed(
  cap: StreamCapture,
  text: string,
  now: number,
  opts: { lastChunkAt?: number; nodeAlive?: boolean; codeBlocks?: string[] } = {},
) {
  return cap.feed({
    text,
    codeBlocks: opts.codeBlocks ?? [],
    now,
    lastChunkAt: opts.lastChunkAt ?? 0,
    nodeAlive: opts.nodeAlive ?? true,
  });
}

describe("StreamCapture 状态机", () => {
  it("流式增长期间不提交", () => {
    const cap = new StreamCapture();
    cap.begin(T0);
    // 模拟 token 级追加：文本不断变化
    for (let i = 1; i <= 10; i++) {
      const d = feed(cap, "回答".repeat(i), T0 + i * 100, { lastChunkAt: T0 + i * 100 });
      expect(d.shouldCommit).toBe(false);
    }
  });

  it("DOM 稳定 + 网络静默 + 最短时长 → COMMITTED", () => {
    const cap = new StreamCapture();
    cap.begin(T0);
    const finalText = "这是最终回答";
    // 第一帧建立指纹
    feed(cap, finalText, T0 + 100, { lastChunkAt: T0 + 100 });
    // 连续 3 次无变化的 mutation，且网络已静默 800ms+
    const quietSince = T0 + 500;
    let committed = false;
    for (let i = 0; i < 5; i++) {
      const now = T0 + 1600 + i * 100;
      const d = feed(cap, finalText, now, { lastChunkAt: quietSince });
      if (d.shouldCommit) committed = true;
    }
    expect(committed).toBe(true);
    expect(cap.getState()).toBe("COMMITTED");
  });

  it("网络仍在传输时即使 DOM 短暂停顿也不提交", () => {
    const cap = new StreamCapture();
    cap.begin(T0);
    const text = "长回答";
    feed(cap, text, T0 + 100);
    // DOM 稳定但 lastChunkAt 很新（<800ms）
    const now = T0 + 3000;
    for (let i = 0; i < 4; i++) {
      const d = feed(cap, text, now + i * 50, { lastChunkAt: now + i * 50 });
      expect(d.shouldCommit).toBe(false);
    }
    expect(cap.getState()).not.toBe("COMMITTED");
  });

  it("节点被回收（虚拟滚动/Regenerate）→ ABORTED", () => {
    const cap = new StreamCapture();
    cap.begin(T0);
    feed(cap, "部分内容", T0 + 100);
    const d = feed(cap, "部分内容", T0 + 200, { nodeAlive: false });
    expect(d.state).toBe("ABORTED");
    expect(d.shouldCommit).toBe(false);
  });

  it("超过最大时长且有内容 → 强制 COMMITTED（防挂死）", () => {
    const cap = new StreamCapture({
      ...CAPTURE_DEFAULTS,
      MAX_DURATION_MS: 5000,
    });
    cap.begin(T0);
    // 文本持续微变，永远不稳定，但网络一直有 chunk
    let committed = false;
    for (let i = 0; i < 60; i++) {
      const now = T0 + i * 200;
      const d = feed(cap, `内容${i}`, now, { lastChunkAt: now });
      if (d.shouldCommit) committed = true;
      if (committed) break;
    }
    expect(committed).toBe(true);
  });

  it("空文本永不提交", () => {
    const cap = new StreamCapture();
    cap.begin(T0);
    for (let i = 0; i < 10; i++) {
      const d = feed(cap, "", T0 + i * 500);
      expect(d.shouldCommit).toBe(false);
    }
  });
});

describe("fingerprintOf", () => {
  it("相同输入产生相同指纹", () => {
    expect(fingerprintOf("hello", ["a", "b"])).toBe(fingerprintOf("hello", ["a", "b"]));
  });

  it("文本变化指纹变化", () => {
    expect(fingerprintOf("hello", [])).not.toBe(fingerprintOf("hello!", []));
  });

  it("代码块数量变化指纹变化", () => {
    expect(fingerprintOf("x", [])).not.toBe(fingerprintOf("x", ["code"]));
  });
});
