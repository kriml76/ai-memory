# 选择器失效修复手册（给 Devin / 维护者）

目标站 DOM 改版是常态。本手册定义失效时的标准修复流程。

## 诊断顺序

1. `npm run fixture:replay` —— fixture 全绿说明**逻辑没问题**，是选择器失效
2. `npm run live:smoke` 或看 live-smoke issue 里的 DOM dump
3. 在 dump 中搜索稳定语义属性：
   - ChatGPT：`data-message-author-role`、`data-message-id`、`data-testid`
   - Claude：`data-testid`、`.font-claude-message`（次选，class 易变）

## 修复步骤

1. 更新 `extension/src/content/selectors/{chatgpt,claude}.ts`
2. 保持导出常量名与函数签名不变（content script 依赖接口）
3. 新增 fixture 覆盖本次失效场景（参考现有 4 个 fixture 格式）
4. 跑 `npm test` 全绿
5. 在本文件末尾「变更记录」追加一行

## 选择器优先级

```
data-testid > data-message-author-role > data-message-id > 语义 class > 结构路径
```

避免：动态 hash class（如 `.css-1a2b3c`）、绝对 XPath、依赖 DOM 层级深度。

## 变更记录

| 日期 | 平台 | 失效选择器 | 替换为 | fixture |
|---|---|---|---|---|
| — | — | — | — | — |
