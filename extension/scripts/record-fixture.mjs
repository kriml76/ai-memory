#!/usr/bin/env node
// fixture 录制工具（骨架）。
// 用法：本地加载扩展 → 手动在 ChatGPT/Claude 发一条消息
// → 本脚本从 content script 的 window.__AIFORGET_CAPTURE_LOG 读取快照序列
// → 输出 extension/tests/fixtures/<name>.json
//
// Week 2 实现：content script 侧需暴露 __AIFORGET_CAPTURE_LOG 调试钩子。

console.error(
  "record-fixture.mjs 尚未实现。" +
    "需要 content script 暴露 window.__AIFORGET_CAPTURE_LOG 后，" +
    "从该数组读取 {at, text, codeBlocks, quietMs} 序列并写入 fixtures/。",
);
process.exit(1);
