// background service worker（骨架）。
// 职责：
// 1) 接收 content script committed 的消息，写入 IndexedDB（原始记录只在本地）
// 2) 每日 alarm 触发 decay 扫描：标记到期复习项、生成回忆验证队列
// 3) 出题/判分请求转发：LLM 调用不经过 content script，统一在这里做
//    （用户自备 endpoint 或本地 relay，API key 只存 storage.local）

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("decay-scan", { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "decay-scan") {
    void runDecayScan();
  }
});

async function runDecayScan(): Promise<void> {
  // TODO(week3): 扫 IndexedDB 中 studyMode=true 的消息，
  // 按 SM-2 计算 dueAt，更新 review 状态，UI 轮询展示。
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "MESSAGE_COMMITTED") {
    void persistMessage(msg.payload);
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

async function persistMessage(payload: unknown): Promise<void> {
  // TODO(week2): IndexedDB 写入。schema 见 core/store/schema.ts
  void payload;
}
