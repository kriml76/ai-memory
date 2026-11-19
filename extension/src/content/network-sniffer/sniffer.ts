// 网络静默嗅探：只观测不拦截。
// tee 一份 SSE 流出来数 chunk 到达时间，原始响应原样返回给页面，
// 不改变任何字节，不影响 ChatGPT/Claude 自身逻辑。

export interface SnifferEvents {
  /** 每收到一个 chunk 回调一次 */
  onChunk: (bytes: number) => void;
  /** 流结束 */
  onEnd: () => void;
}

export interface SnifferHandle {
  /** 最近一次 chunk 到达时间戳（ms），无流量时为 0 */
  lastChunkAt(): number;
  /** 卸载劫持，恢复原始 fetch */
  dispose(): void;
}

const STREAM_PATH_PATTERNS = [
  /\/backend-api\/conversation/,
  /\/api\/organizations/,
  /\/v1\/messages/, // Claude
  /\/api\/chat/, // 通用兜底
];

export function isStreamingEndpoint(url: string): boolean {
  return STREAM_PATH_PATTERNS.some((re) => re.test(url));
}

/**
 * 安装 fetch 嗅探器。必须在 document_start 由 content script 调用，
 * 早于页面自身代码拿到 fetch 引用。
 */
export function installSniffer(events: SnifferEvents): SnifferHandle {
  const originalFetch = window.fetch.bind(window);
  let lastChunkAt = 0;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const resp = await originalFetch(input, init);

    if (!isStreamingEndpoint(url) || !resp.body) {
      return resp;
    }

    const [forPage, forSniffer] = resp.body.tee();
    void watchStream(forSniffer, events, (t) => {
      lastChunkAt = t;
    });

    // tee 后必须用 forPage 重建 Response，否则页面拿到的流已被消耗
    return new Response(forPage, {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers,
    });
  };

  return {
    lastChunkAt: () => lastChunkAt,
    dispose() {
      window.fetch = originalFetch;
    },
  };
}

async function watchStream(
  stream: ReadableStream<Uint8Array>,
  events: SnifferEvents,
  markChunk: (t: number) => void,
): Promise<void> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        markChunk(Date.now());
        events.onChunk(value.byteLength);
      }
    }
    events.onEnd();
  } catch {
    // 页面中止请求（用户点停止）也走这里，静默处理
    events.onEnd();
  } finally {
    reader.releaseLock();
  }
}
