// Fixture 回放测试：把录制的"DOM 文本快照序列"喂给 StreamCapture，
// 断言 committed 结果。fixture 格式见 fixtures/*.json。
// 录制工具: extension/scripts/record-fixture.mjs

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { StreamCapture } from "@capture/streamCapture";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

interface FixtureStep {
  /** 距开始的 ms 偏移 */
  at: number;
  text: string;
  codeBlocks?: string[];
  /** 距上一步的 chunk 静默 ms；缺省视为仍在流式 */
  quietMs?: number;
  nodeAlive?: boolean;
}

interface Fixture {
  name: string;
  description: string;
  steps: FixtureStep[];
  expect: {
    committed: boolean;
    /** committed 时文本长度容差（字符） */
    finalLength?: number;
    finalTextPrefix?: string;
  };
}

const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));

describe("fixture 回放", () => {
  it("至少存在一个 fixture", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const fixture: Fixture = JSON.parse(readFileSync(join(fixturesDir, file), "utf8"));
    it(fixture.name, () => {
      const cap = new StreamCapture();
      const t0 = 1_000_000;
      cap.begin(t0);

      let lastChunkAt = 0;
      let committedText = "";
      let committed = false;

      for (const step of fixture.steps) {
        const now = t0 + step.at;
        // quietMs 表示"距上次 chunk 已静默这么久"→ lastChunkAt = now - quietMs
        // 缺省 quietMs 时假设仍在流式（lastChunkAt = now）
        lastChunkAt = step.quietMs !== undefined ? now - step.quietMs : now;

        const decision = cap.feed({
          text: step.text,
          codeBlocks: step.codeBlocks ?? [],
          now,
          lastChunkAt,
          nodeAlive: step.nodeAlive ?? true,
        });

        if (decision.shouldCommit) {
          committed = true;
          committedText = cap.snapshot().text;
          break;
        }
      }

      expect(committed).toBe(fixture.expect.committed);
      if (committed && fixture.expect.finalLength !== undefined) {
        expect(committedText.length).toBe(fixture.expect.finalLength);
      }
      if (committed && fixture.expect.finalTextPrefix) {
        expect(committedText.startsWith(fixture.expect.finalTextPrefix)).toBe(true);
      }
    });
  }
});
