# 架构说明

## 数据流

```
ChatGPT/Claude 页面
  │ DOM mutation + SSE chunk
  ▼
content script (index.ts)
  ├─ network-sniffer/sniffer.ts   fetch.tee() 观测 chunk 时间戳
  ├─ selectors/{chatgpt,claude}.ts DOM → 结构化消息
  └─ capture/streamCapture.ts    三重判定状态机
        │ COMMITTED
        ▼
background/serviceWorker.ts
  ├─ IndexedDB 落库（原始记录，只在本地）
  ├─ alarms 每小时跑 decay 扫描
  └─ LLM 转发（出题/判分，key 只存 storage.local）
        │
        ▼
core/decay + core/quiz   纯逻辑，无浏览器依赖
```

## StreamCapture 判定逻辑

提交需同时满足：
1. `stableTicks >= 3`：文本指纹连续 3 次 mutation 无变化
2. `networkQuiet`：最近 chunk 到达超过 800ms 前
3. `elapsed >= 1500ms`：最短生成时长（防误判）

兜底：`elapsed >= 120s` 且有内容 → 强制提交，防挂死。
中止：`nodeAlive=false`（虚拟滚动回收/Regenerate）→ ABORTED。

## 指纹设计

`fingerprintOf(text, codeBlocks)` = FNV-1a(长度+前缀+代码块数量/长度)。
不追求加密强度，只要求"内容变了指纹必变"，用于稳定性判定。

## 本地判分

`gradeLocally`：中文按 bigram、英文按词元，Jaccard 相似度覆盖 keyPoints。
coverage >= 0.7 → quality 4-5；>= 0.4 → quality 3；否则 1。
LLM 判分通过 `LlmGrader` 接口注入，core 层不感知网络。
