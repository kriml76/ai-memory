// content script 入口（骨架）。
// 职责：装 sniffer → 扫已有 DOM → 对新 assistant 节点挂 MutationObserver
// → 把 DOM 事件翻译成 StreamCapture.feed() → committed 后发给 background 落库。
// 具体 DOM 适配在 domAdapter.ts（按 host 分发 chatgpt/claude）。

import { installSniffer } from "./network-sniffer/sniffer";
import { StreamCapture } from "./capture/streamCapture";

const capture = new StreamCapture();

const sniffer = installSniffer({
  onChunk: () => {},
  onEnd: () => {},
});

// TODO(week2): 实现 domAdapter，按 location.host 分发到 chatgpt/claude 适配器。
// 骨架阶段只保证 sniffer 安装与 capture 状态机可被 fixture 独立验证。

console.info("[ai-forget] content script loaded", location.host);

window.addEventListener("beforeunload", () => sniffer.dispose());
