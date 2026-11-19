# 任务卡：修复目标站选择器失效

## 触发条件
live-smoke issue 打开，或用户报告"消息没被捕获"。

## 输入
- 失败 issue 中的 DOM dump（已脱敏）
- 失效的选择器文件：`extension/src/content/selectors/chatgpt.ts` 或 `claude.ts`

## 步骤
1. 对照 DOM dump 找出新的稳定选择器（优先 data-testid / data-message-author-role
   等语义属性，避免用动态 class 名）
2. 更新对应 selectors 文件，**保持导出接口不变**
3. 用 `extension/scripts/record-fixture.mjs` 思路手工构造新 fixture：
   在 `extension/tests/fixtures/` 新增 `<site>-<scenario>.json`，
   steps 为新的文本快照序列
4. `npm run fixture:replay` 全绿
5. `npm run typecheck` 通过
6. 更新 `docs/SELECTOR_PLAYBOOK.md` 记录本次失效模式

## 验收标准（全部满足才算完成）
- [ ] `npm test` 全绿（含新增 fixture）
- [ ] `npm run typecheck` 通过
- [ ] 选择器改动同步了 SELECTOR_PLAYBOOK.md
- [ ] 未触碰 `core/`、`manifest.json` 的 host_permissions

## 非目标
- 不重构 StreamCapture 状态机
- 不改遗忘曲线参数
- 不新增平台支持（只修已支持的 chatgpt.com / claude.ai）
