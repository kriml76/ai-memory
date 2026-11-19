# 项目知识（Devin 每次 session 自动注入）

## 项目是什么

ai-memory（内部代号 AI Forget）：Chrome MV3 插件，给 ChatGPT/Claude 聊天记录
加"记忆衰退"——过期内容模糊化，回忆验证（答题）解锁。目标是把"查询"变"考试"。

## 架构铁律

- `core/` 是纯逻辑层：不依赖 DOM、不依赖 chrome.* API、不发网络请求。
  改 `extension/` 时绝不动 `core/`，除非任务卡明确要求。
- `extension/src/content/capture/streamCapture.ts` 的状态机是捕获正确性的
  唯一权威。DOM 适配层只负责把页面事件翻译成 `CaptureInput` 喂进去。
- 选择器集中在 `extension/src/content/selectors/*.ts`，不允许散落在其他文件。

## 隐私红线（不可违反）

- 原始聊天记录只允许写入 IndexedDB / chrome.storage.local，禁止任何
  fetch/XHR/WebSocket 上传。
- 上云数据只能是 `core/store/schema.ts` 里 `SanitizedSummary` 结构
  （messageId + keyPoints + topicTags），且摘要必须在本地生成。
- 不在日志、issue、PR 描述中粘贴用户聊天原文；DOM dump 需先脱敏。

## 测试纪律

- 改 capture 逻辑必须新增或更新 `extension/tests/fixtures/*.json` 并通过
  `npm run fixture:replay`。
- 选择器变更必须同步更新 `docs/SELECTOR_PLAYBOOK.md`。
- 不得删除或弱化现有测试断言来让 CI 变绿。

## 常用命令

```bash
npm ci
npm test              # vitest：单测 + fixture 回放
npm run typecheck     # tsc --noEmit
npm run live:smoke    # playwright live 冒烟（需 cookie）
```

## 已知坑

- ChatGPT/Claude DOM 频繁改版，选择器失效是常态而非异常；
  live-smoke 每日跑，失败自动开 issue。
- SSE 流式响应不能用 DOM"生成完毕"按钮做唯一判据——按钮消失晚于内容稳定，
  且 Regenerate 会替换节点。用 StreamCapture 的三重判定。
