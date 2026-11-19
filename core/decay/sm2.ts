// SM-2 变体遗忘曲线调度器。
// 纯函数、无浏览器依赖，可在 Node 与 content script 中共用。

export interface ReviewItem {
  /** 稳定度因子，SM-2 惯例初始 2.5 */
  ease: number;
  /** 当前间隔（天） */
  intervalDays: number;
  /** 连续成功次数 */
  repetitions: number;
  /** 下次复习时间戳（ms） */
  dueAt: number;
  /** 累计失败次数 */
  lapses: number;
}

export interface ScheduleOptions {
  /** 0=完全遗忘 … 5=完美回忆。2 分及以下视为失败 */
  quality: number;
  now: number;
  /** 第一次成功后最小间隔（天），默认 1 */
  initialIntervalDays?: number;
  /** 最大间隔封顶（天），默认 180 */
  maxIntervalDays?: number;
}

const DAY_MS = 86_400_000;
const PASS_THRESHOLD = 3;

export function createItem(now: number): ReviewItem {
  return { ease: 2.5, intervalDays: 0, repetitions: 0, dueAt: now, lapses: 0 };
}

/**
 * 根据一次回忆验证结果更新调度。
 * quality < 3 视为失败：间隔重置为 initialInterval，ease 惩罚性下降。
 */
export function scheduleReview(item: ReviewItem, opts: ScheduleOptions): ReviewItem {
  const { quality, now } = opts;
  const initial = opts.initialIntervalDays ?? 1;
  const max = opts.maxIntervalDays ?? 180;

  if (quality < PASS_THRESHOLD) {
    const ease = Math.max(1.3, item.ease - 0.2);
    return {
      ease,
      intervalDays: initial,
      repetitions: 0,
      dueAt: now + initial * DAY_MS,
      lapses: item.lapses + 1,
    };
  }

  // SM-2 质量映射：5→满分增益，3→最小增益
  const gain = 0.4 + ((quality - PASS_THRESHOLD) / (5 - PASS_THRESHOLD)) * 0.6;
  const ease = Math.min(3.0, item.ease + gain * 0.1);

  let intervalDays: number;
  if (item.repetitions === 0) {
    intervalDays = initial;
  } else if (item.repetitions === 1) {
    intervalDays = Math.max(initial * 2, item.intervalDays * 1.2);
  } else {
    intervalDays = item.intervalDays * ease * (0.5 + gain);
  }
  intervalDays = Math.min(max, Math.max(initial, intervalDays));

  return {
    ease,
    intervalDays,
    repetitions: item.repetitions + 1,
    dueAt: now + intervalDays * DAY_MS,
    lapses: item.lapses,
  };
}

/** 到期判定：dueAt <= now 即到期 */
export function isDue(item: ReviewItem, now: number): boolean {
  return item.dueAt <= now;
}

/** 批量筛出当前到期的条目 */
export function dueItems<T extends { review: ReviewItem }>(entries: T[], now: number): T[] {
  return entries.filter((e) => isDue(e.review, now));
}
