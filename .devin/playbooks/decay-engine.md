# 任务卡：遗忘曲线与复习调度

## 范围
`core/decay/sm2.ts` 及其测试 `extension/tests/unit/sm2.test.ts`。

## 设计约束
- 纯函数、无 IO、无浏览器 API
- quality 0-5 映射 SM-2；<3 为失败
- 间隔下限 initialIntervalDays（默认 1 天），上限 maxIntervalDays（默认 180 天）
- ease 下限 1.3，上限 3.0

## 验收标准
- [ ] `npm test` 中 sm2 相关用例全绿
- [ ] 覆盖：首次成功、连续成功间隔递增、失败重置、ease 上下限、dueItems 过滤
- [ ] 不修改 `core/quiz/`、`extension/` 任何文件

## 非目标
- 不接 UI、不接存储、不接 LLM
