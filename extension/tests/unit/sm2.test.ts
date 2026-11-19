import { describe, it, expect } from "vitest";
import { createItem, scheduleReview, isDue, dueItems } from "@core/decay/sm2";

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

describe("SM-2 遗忘曲线", () => {
  it("首次复习成功 → 间隔约 1 天", () => {
    const item = createItem(T0);
    const next = scheduleReview(item, { quality: 4, now: T0 });
    expect(next.intervalDays).toBeGreaterThanOrEqual(1);
    expect(next.intervalDays).toBeLessThanOrEqual(2);
    expect(next.dueAt).toBe(T0 + next.intervalDays * DAY);
  });

  it("连续成功 → 间隔递增", () => {
    let item = createItem(T0);
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      item = scheduleReview(item, { quality: 5, now: item.dueAt });
      intervals.push(item.intervalDays);
    }
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]!);
    }
  });

  it("失败 → 间隔重置且 ease 下降", () => {
    let item = createItem(T0);
    item = scheduleReview(item, { quality: 5, now: T0 });
    item = scheduleReview(item, { quality: 5, now: item.dueAt });
    const easeBefore = item.ease;
    const failed = scheduleReview(item, { quality: 1, now: item.dueAt });
    expect(failed.intervalDays).toBe(1);
    expect(failed.ease).toBeLessThan(easeBefore);
    expect(failed.lapses).toBe(1);
    expect(failed.repetitions).toBe(0);
  });

  it("ease 下限保护 1.3", () => {
    let item = createItem(T0);
    for (let i = 0; i < 20; i++) {
      item = scheduleReview(item, { quality: 0, now: item.dueAt });
    }
    expect(item.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("间隔上限封顶", () => {
    let item = createItem(T0);
    for (let i = 0; i < 30; i++) {
      item = scheduleReview(item, { quality: 5, now: item.dueAt });
    }
    expect(item.intervalDays).toBeLessThanOrEqual(180);
  });

  it("dueItems 只返回到期项", () => {
    const a = { id: "a", review: scheduleReview(createItem(T0), { quality: 5, now: T0 }) };
    const b = { id: "b", review: createItem(T0 + 10 * DAY) };
    const due = dueItems([a, b], T0 + 5 * DAY);
    expect(due.map((d) => d.id)).toEqual(["a"]);
    expect(isDue(a.review, T0 + 5 * DAY)).toBe(true);
  });
});
