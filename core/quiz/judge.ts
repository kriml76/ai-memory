// 出题判分器。两层判分：
// 1) 本地快速通道：token 级语义重叠度（免费、离线、毫秒级）
// 2) LLM 判分通道：边界处调用，接口预留（content script 不直接调，
//    由 background 转发到本地 relay 或用户自备 endpoint）

export interface QuizQuestion {
  id: string;
  /** 关联的原始对话 messageId */
  sourceMessageId: string;
  prompt: string;
  /** 参考答案要点（用于本地判分与提示） */
  keyPoints: string[];
  /** 出题时的会话标题，便于 UI 展示 */
  contextTitle: string;
}

export interface GradeResult {
  /** 0-5，映射到 SM-2 的 quality */
  quality: number;
  passed: boolean;
  matchedPoints: string[];
  missedPoints: string[];
  /** 判分通道：local=本地启发式，llm=远端判分 */
  channel: "local" | "llm";
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();

const tokenize = (s: string): Set<string> => new Set(normalize(s).split(" ").filter(Boolean));

/** 简体中文按 bigram 切分，其余按空格词元 */
function tokensOf(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of tokenize(text)) {
    if (/^[\u4e00-\u9fff]+$/.test(w)) {
      for (let i = 0; i < w.length - 1; i++) out.add(w.slice(i, i + 2));
      if (w.length === 1) out.add(w);
    } else {
      out.add(w);
    }
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * 本地判分：回答与参考要点的最大覆盖度。
 * 每个 keyPoint 取与回答的最高相似度，覆盖率 = 命中要点数 / 总要点数。
 * 阈值：>=0.7 → quality 4-5；>=0.4 → quality 3；否则 1。
 */
export function gradeLocally(question: QuizQuestion, answer: string): GradeResult {
  const ansTokens = tokensOf(answer);
  const matched: string[] = [];
  const missed: string[] = [];

  let coverage = 0;
  for (const point of question.keyPoints) {
    const sim = jaccard(ansTokens, tokensOf(point));
    if (sim >= 0.35) {
      matched.push(point);
      coverage += Math.min(1, sim * 1.4);
    } else {
      missed.push(point);
    }
  }
  coverage = question.keyPoints.length === 0 ? 0 : coverage / question.keyPoints.length;

  let quality: number;
  if (coverage >= 0.7) quality = answer.trim().length > 80 ? 5 : 4;
  else if (coverage >= 0.4) quality = 3;
  else quality = 1;

  return {
    quality,
    passed: quality >= 3,
    matchedPoints: matched,
    missedPoints: missed,
    channel: "local",
  };
}

/**
 * LLM 判分接口契约。实现由 background 层注入，
 * 保持 core 层不依赖网络。
 */
export interface LlmGrader {
  grade(question: QuizQuestion, answer: string): Promise<GradeResult>;
}

/** 出题 prompt 模板（供 LLM 出题调用方使用） */
export function buildQuizPrompt(sourceText: string, contextTitle: string): string {
  return [
    `你是一个学习复习出题器。以下是一段用户与 AI 的对话记录（标题：${contextTitle}）。`,
    `请基于这段对话出 1 道回忆验证题，要求：`,
    `1. 题目针对对话中的核心知识点或结论，不要问琐碎细节；`,
    `2. 提供 2-4 个参考要点（keyPoints），用于判分；`,
    `3. 题目用中文，简洁明确；`,
    `4. 只输出 JSON：{"prompt": string, "keyPoints": string[]}`,
    ``,
    `对话内容：`,
    sourceText.slice(0, 8000),
  ].join("\n");
}
