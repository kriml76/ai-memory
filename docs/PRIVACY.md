# 隐私与数据边界

## 铁律

原始聊天记录**只存本机**（IndexedDB / chrome.storage.local），
不上传、不备份、不进日志。

## 允许离开本机的数据

只有 `SanitizedSummary`：
```ts
{ messageId, keyPoints[], topicTags[] }
```
且必须满足：
- keyPoints 由本地 LLM 或规则从原文抽取，不含原文片段
- topicTags 是预定义枚举值，不是自由文本
- 发送前在本地完成脱敏，content script 无网络权限直发外部

## 威胁模型

| 威胁 | 对策 |
|---|---|
| 浏览器扩展被审查 | manifest.json 声明最少 permissions；host_permissions 仅 3 个域 |
| DOM dump 泄露到 issue | live-smoke 失败时 dump 先脱敏再贴 |
| LLM API key 泄露 | 只存 storage.local，不进 content script，不进日志 |
| 本地存储被其他扩展读 | IndexedDB 是 per-extension 隔离，天然安全 |

## 用户可控

- 学习模式开关：默认关闭，用户主动标记的对话才参与遗忘衰退
- 一键导出/清空本地数据
- LLM endpoint 自配（可指向本地 ollama，完全离线）
