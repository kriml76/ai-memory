# 任务卡：端到端验收（手动/Devin 辅助）

## 场景
本地加载 `extension/` 为未打包扩展，打开 chatgpt.com。

## 步骤
1. `chrome://extensions` → 开发者模式 → 加载 `extension/` 目录
2. 在 ChatGPT 发送："用 500 字以上解释 JavaScript 闭包陷阱，附代码示例"
3. 等流式结束，确认插件落库（background 日志或 IndexedDB 可见消息）
4. 手动把该消息 `createdAt` 改为 4 天前（DevTools → IndexedDB）
5. 刷新页面 → 确认内容被模糊化（只剩标题/要点）
6. 触发回忆验证 → 答对 → 确认内容解锁

## 验收断言
- 长回答（>3000 字）无截断，代码块完整
- 中途刷新页面不重复落库（platformMessageId 去重）
- Regenerate 后只有最新版本入库
- 模糊化分级正确：3 天→隐藏代码块，7 天→只剩要点，30 天→只剩标题

## 已知风险
- ChatGPT DOM 改版导致选择器失效 → 先跑 fixture:replay 定位是逻辑还是选择器问题
