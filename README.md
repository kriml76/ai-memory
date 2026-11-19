# ai-memory（AI Forget）

给 AI 聊天记录装上"记忆衰退"的 Chrome 插件：超过设定时间的对话自动模糊化，
想看完整内容需要先通过回忆验证（答题解锁）。让"问过"不等于"学会"。

灵感来自与 poke.com 的一场对话。

## 架构

```
core/          纯逻辑层（无浏览器依赖，可独立测试）
  decay/       SM-2 变体遗忘曲线调度
  quiz/        出题 prompt 模板 + 本地判分器
  store/       消息 schema（原始记录只存本地）
extension/     Chrome MV3 插件
  src/content/ content script：DOM 捕获 + SSE 静默嗅探
  src/background/ Service Worker：落库、定时衰退扫描、LLM 转发
  src/ui/      popup 面板
tests/         vitest 单测 + fixture 回放 + playwright live 冒烟
```

## 核心机制

- **StreamCapture 状态机**（`extension/src/content/capture/streamCapture.ts`）：
  不信任 DOM 的"生成完毕"信号，采用「文本指纹连续稳定 + SSE chunk 静默 800ms
  + 最短时长 1.5s」三重判定才提交，防止抓到半截流式回答。
- **网络嗅探**（`network-sniffer/sniffer.ts`）：`fetch.tee()` 只观测 chunk
  到达时间，不改写任何字节，原始响应原样返回页面。
- **遗忘曲线**（`core/decay/sm2.ts`）：标准 SM-2 变体，答错重置间隔、
  ease 惩罚性下降，下限 1.3、上限 180 天。
- **本地判分**（`core/quiz/judge.ts`）：中文 bigram + Jaccard 覆盖度，
  免 LLM 成本的快速通道；LLM 判分走 background 转发，接口已预留。

## 隐私红线

原始聊天记录只写入本机 IndexedDB。任何离开本机的数据必须先经
`core/store/schema.ts` 的 `SanitizedSummary` 脱敏（只含 keyPoints +
topicTags）。详见 `docs/PRIVACY.md`。

## 开发

```bash
npm ci
npm test          # 单测 + fixture 回放
npm run typecheck
npm run live:smoke  # 真实页面冒烟（需 cookie，见 docs/）
```

## 测试三层

1. **PR 门禁**（`.github/workflows/ci.yml`）：typecheck + vitest + fixture 回放
2. **每日 live-smoke**（`live-smoke.yml`）：真实 ChatGPT/Claude 页面冒烟，
   失败自动开 issue 触发 Devin 按 `docs/SELECTOR_PLAYBOOK.md` 修复
3. **手动端到端验收**：发长回答 → 快进时间 → 验证模糊化 → 答题解锁

## Devin 协作

本项目设计为 Devin 可自主迭代：任务卡模板见 `.devin/playbooks/`，
项目知识与红线见 `.devin/knowledge.md`。
