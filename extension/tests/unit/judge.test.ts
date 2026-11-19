import { describe, it, expect } from "vitest";
import { gradeLocally, buildQuizPrompt, type QuizQuestion } from "@core/quiz/judge";

const q: QuizQuestion = {
  id: "q1",
  sourceMessageId: "m1",
  prompt: "React 中闭包陷阱的错因是什么？",
  keyPoints: [
    "闭包捕获的是变量引用而非值",
    "循环中 var 声明导致所有回调共享同一个变量",
    "解决方案是使用 let 或立即执行函数表达式",
  ],
  contextTitle: "JS 面试题",
};

describe("本地判分 gradeLocally", () => {
  it("高质量回答 → quality 4-5 且 passed", () => {
    const answer =
      "闭包捕获的是变量的引用而不是值的副本。在 for 循环里用 var 声明的计数器，所有回调函数共享同一个变量绑定，所以结束后都拿到最终值。解决办法是改用 let 声明出块级作用域，或者用 IIFE 立即执行函数把变量固定住。";
    const r = gradeLocally(q, answer);
    expect(r.passed).toBe(true);
    expect(r.quality).toBeGreaterThanOrEqual(4);
    expect(r.channel).toBe("local");
  });

  it("完全跑题 → quality 1 且未通过", () => {
    const r = gradeLocally(q, "今天天气很好，我吃了面条");
    expect(r.passed).toBe(false);
    expect(r.quality).toBe(1);
  });

  it("部分命中 → quality 3 边界", () => {
    const r = gradeLocally(q, "闭包捕获的是引用而不是值");
    expect(r.quality).toBeGreaterThanOrEqual(3);
  });

  it("中文 bigram 使短回答也能命中要点", () => {
    const r = gradeLocally(q, "let 声明可以解决");
    expect(r.matchedPoints.length + r.missedPoints.length).toBe(3);
  });
});

describe("buildQuizPrompt", () => {
  it("包含上下文标题与长度截断", () => {
    const long = "x".repeat(20000);
    const p = buildQuizPrompt(long, "测试会话");
    expect(p).toContain("测试会话");
    expect(p.length).toBeLessThan(9000);
    expect(p).toContain("keyPoints");
  });
});
