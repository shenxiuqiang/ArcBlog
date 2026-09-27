# 模板：测试报告

> **所有者**：QA ｜ **上游**：REQ（验收标准）+ Dev 已 complete 的产物 ｜ **下游**：PM（BUG 裁决）、Lead（放行 → 提交决策）｜ **写入范围**：`docs/team/test-reports/**`（QA 独有；不得修改任何源码或测试）

---

## 使用说明

1. 复制「骨架」到 `docs/team/test-reports/round-<n>-REQ-<nnn>.md`。
2. **自己重跑门**，不要把 Dev 贴的输出抄进来。
3. 「逐条验收结论表」必须与 REQ 的验收标准**逐条对齐**，一条不漏。
4. 结论列只允许三个值：`通过` / `不通过` / `受限未验证`。**"未验证"不等于"通过"**。
5. 至少覆盖 1 条负面用例（越权、非法输入、不存在对象、未授权工具等）。
6. 环境限制（无真实链依赖/资金钱包、无可用管理员测试身份）如实写在「受限未验证」里。
7. 结论必须是明确的「放行」或「不放行」；不放行时列出阻断项 BUG 编号。
8. 完成后：`team_task_update(action: "complete")` + `send_message` 给 PM。

> 参考命令入口：`arc dsl validate --json`、`npm test`、`arc blocklet build`、`node --test scripts/arcblog-<name>.test.mjs`、`node scripts/arcblog-*.mjs`。不确定的 ARC 能力先 `arc <cmd> --help` / `arc afs read /.knowledge` 核验。

---

## 骨架（可直接复制）

```markdown
# round-<n> 测试报告：REQ-<nnn>-<slug>

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-<n> |
| REQ | <REQ-00X-<slug> 路径> |
| 被测产物 | <文件路径列表> |
| 验证人 | QA |
| 验证时间 | <YYYY-MM-DD> |
| 结论 | <放行 / 不放行> |

## 1. 被测产物

<!-- 填写要求：列出 Dev 交付的每个文件路径 + Dev 任务 id + 声称的验证命令 -->

| 产物路径 | Dev 任务 | Dev 声称的验证命令 |
| -------- | -------- | ------------------ |
| `<path>` | `<task-id>` | `<command>` |

## 2. 逐条验收结论表

<!-- 填写要求：REQ 的每条验收标准一行；结论=通过/不通过/受限未验证；证据给命令或输出要点 -->

| # | 验收标准（抄 REQ 原文） | 结论 | 证据 |
| - | ----------------------- | ---- | ---- |
| 1 | <标准一> | <通过/不通过/受限未验证> | <命令或输出要点> |
| 2 | <标准二> | | |

## 3. 执行的原始命令与结果摘录

<!-- 填写要求：粘贴真实命令与真实输出（可截断无关行，用 … 标注），含退出码；不要转述 -->

```text
$ arc dsl validate --json
<原始输出>

$ npm test
<原始输出尾部：pass/fail 计数>
```

## 4. 负面用例

<!-- 填写要求：至少 1 条；写清输入、期望的失败行为、实际结果 -->

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | <例如：未授权 agent 调用写工具> | <拒绝执行并报错> | <实际> | <通过/不通过> |

## 5. 回归

<!-- 填写要求：列出本轮改动波及的既有测试及其结果 -->

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| <模块> | `node --test scripts/arcblog-<x>.test.mjs` | <pass/fail> |

## 6. 新增 BUG 列表

<!-- 填写要求：没有就写"无"；级别见 qa.md §4；每条给出 BUG 文件路径 -->

| BUG | 级别 | 标题 | BUG 文件 |
| --- | ---- | ---- | -------- |
| BUG-<nnn> | <P0/P1/P2/P3> | <标题> | `docs/team/bugs/BUG-<nnn>-<slug>.md` |

## 7. 受限未验证项

<!-- 填写要求：环境做不到的验证逐条列出 + 原因 + 建议的验证条件；不要留空 -->

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| <例如：真实链 ocap 端到端> | <本机无 ARC 链依赖与资金钱包> | <在有依赖的环境演练> |

## 8. 放行结论

<!-- 填写要求：明确写"放行"或"不放行"；不放行必须列阻断项与需要谁做什么 -->

**结论：<放行 / 不放行>**

- 依据：<门禁输出 + 验收表 + 无未裁决 P0/P1>
- 阻断项（不放行时填写）：<BUG 编号 + 一行现象 + 需要谁做什么>
- 备注：<其他>
```

---

## 示例（填好的简短示例 · 演示用，非真实验证记录）

```markdown
# round-6 测试报告：REQ-006-media-refs-view

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-6 |
| REQ | docs/team/requirements/REQ-006-media-refs-view.md |
| 被测产物 | scripts/arcblog-media.mjs、scripts/arcblog-media.test.mjs、.aup/pages/ops/media.aup |
| 验证人 | QA |
| 验证时间 | 2026-09-27 |
| 结论 | 放行 |

## 1. 被测产物

| 产物路径 | Dev 任务 | Dev 声称的验证命令 |
| -------- | -------- | ------------------ |
| `scripts/arcblog-media.mjs` | task-14 | `npm test` |
| `scripts/arcblog-media.test.mjs` | task-14 | `node --test scripts/arcblog-media.test.mjs` |
| `.aup/pages/ops/media.aup` | task-14 | `arc dsl validate --json` |

## 2. 逐条验收结论表

| # | 验收标准（抄 REQ 原文） | 结论 | 证据 |
| - | ----------------------- | ---- | ---- |
| 1 | `node scripts/arcblog-media.mjs refs` 输出包含 posts/ 引用 | 通过 | 输出 3 条 posts 引用 |
| 2 | `refs` 同时统计 drafts/ 中的引用 | 通过 | 同一媒体在 drafts/ 下命中 1 条 |
| 3 | `orphans` 不再把被草稿引用的媒体列为孤儿 | 通过 | 该媒体已从 orphans 列表消失 |
| 4 | `remove --force` 删除前打印引用清单 | 通过 | 输出含 4 条引用后退出码 1 |

## 3. 执行的原始命令与结果摘录

```text
$ arc dsl validate --json
{"issues":[]}

$ npm test
# tests 128
# pass 128
# fail 0
```

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | `node scripts/arcblog-media.mjs refs --id does-not-exist` | 非零退出 + 明确错误 | 退出码 1，`MEDIA_NOT_FOUND` | 通过 |

## 5. 回归

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| 媒体 | `node --test scripts/arcblog-media.test.mjs` | pass |
| 权限矩阵 | `node --test scripts/arcblog-permissions.test.mjs` | pass |

## 6. 新增 BUG 列表

| BUG | 级别 | 标题 | BUG 文件 |
| --- | ---- | ---- | -------- |
| BUG-005 | P2 | `refs` 输出未按目录分组，与 admin-ui-design 列表标准不一致 | `docs/team/bugs/BUG-005-media-refs-grouping.md` |

## 7. 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| 媒体页运行期点击与上传 | AUP 界面无可用管理员测试身份；`CLAUDE.md` 无 dev server | 保持 DSL 校验 + 测试门，界面部分标注受限 |

## 8. 放行结论

**结论：放行**

- 依据：`arc dsl validate --json` issues 为空；`npm test` 128/128；4 条验收全部通过；无未裁决 P0/P1
- 阻断项：无
- 备注：BUG-005 为 P2，交 PM 裁决（建议下一轮修）
```
