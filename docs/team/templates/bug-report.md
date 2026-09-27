# 模板：BUG 报告

> **所有者**：QA ｜ **上游**：REQ 验收标准 + 独立复现 ｜ **下游**：PM（裁决三选一：本轮修 / 下一轮修 / 不修）、Dev（定位与修复）｜ **写入范围**：`docs/team/bugs/**`（QA 独有；报告者不得修改任何源码）

---

## 使用说明

1. 复制下面「骨架」到 `docs/team/bugs/BUG-<nnn>-<slug>.md`（编号**全局唯一、顺序递增、不复用**）。
2. 一条 BUG 一个文件，只描述一个问题；相关但独立的问题拆成多条。
3. **严重级只能取 P0 / P1 / P2 / P3**（定义见 `docs/team/roles/qa.md` §4）。
4. **证据必须是原始输出**，不要转述成"报错了"。
5. 写完后 `send_message` 给 PM 一句：`BUG-<nnn>(P?) <标题>｜复现: <命令>｜影响: <一行>`。
6. 你不修 bug——「疑似文件」是线索不是结论。

---

## 骨架（可直接复制）

```markdown
# BUG-<编号>: <一句话标题（含模块名）>

<!-- 填写要求：编号形如 BUG-001；标题写"哪里 + 什么现象"，不要写"有问题" -->

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-<编号> |
| 严重级 | <P0 / P1 / P2 / P3> |
<!-- P0 阻断主链路（门禁红/发布读取不可用/越权/fail closed 失效）；P1 功能错；P2 体验或文案；P3 建议 -->
| 发现轮次 | round-<n> |
| 关联 REQ | <REQ-00X-<slug> 或 无（范围外）> |
| 状态 | <待裁决 / 🟥 本轮修 / 🟨 下一轮修 / ⛔ 不修（理由 + spec 章节）> |
<!-- 状态先写"待裁决"，由 PM 裁决后更新；标记与 docs/team/backlog.md 的状态图例一致 -->
<!-- ⛔ 不修时必须在下方「证据输出」之后补一行「不修理由 + spec 章节」，例如 §139 明确不进入 MVP -->

## 复现命令与最小步骤

<!-- 填写要求：给出能被别人原样复制执行的最短路径；含前置条件（实例名、身份、数据） -->

1. 前置：<例如 arc 实例 default；已有一条 published 文章>
2. <命令一>
3. <命令二>

```bash
# 最小复现（把上面的步骤压成可粘贴命令）
<command>
```

## 期望

<!-- 填写要求：写"应该发生什么"，并引用 REQ 验收标准条目或 spec 章节，例如 §15.4 -->

<期望行为，引用验收标准或 spec §x>

## 实际

<!-- 填写要求：写"实际发生了什么"，与期望一一对应，不夹带推测 -->

<实际行为>

## 证据输出

<!-- 填写要求：粘贴原始命令与原始输出（可截断无关行，用 … 标注），保留退出码 -->

```text
$ <命令>
<原始输出>
```

退出码：<n>

## 影响范围

<!-- 填写要求：谁受影响、影响哪条链路、是否有数据写入/权限后果、是否可绕过 -->

- 受影响角色：<guest / 已登录用户 / admin / agent / Studio / Hub>
- 受影响链路：<发布 / 读取 / 查询 / 经济 / 权限 / 界面>
- 数据后果：<无 / 只读 / 已写入（说明如何清理）>
- 可绕过：<是（绕法） / 否>

## 疑似文件

<!-- 填写要求：给定位线索，可写路径:行；这是线索不是结论；不得修改这些文件 -->

- `<path>:<line>`
- `<path>`
```

---

## 示例（填好的简短示例 · 演示用，非真实缺陷记录）

```markdown
# BUG-002: 标签合并后旧标签仍能命中（query 索引残留）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-002 |
| 严重级 | P1 |
| 发现轮次 | round-6 |
| 关联 REQ | REQ-007-tag-merge |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：arc 实例 default；已发布 1 篇文章，tags 为 `nextjs`。
2. 执行标签合并，把 `nextjs` 合到 `react`。
3. 分别用旧标签与新标签查询。

```bash
node scripts/arcblog-lifecycle.mjs publish --title "T" --author-did did:key:z6Mk... \
  --body-file post.md --category technology --tags "nextjs"
node scripts/arcblog-tags.mjs merge --from nextjs --to react
node scripts/arcblog-query-posts.mjs published --tag nextjs
node scripts/arcblog-query-posts.mjs published --tag react
```

## 期望

合并后 `nextjs` 不再命中任何文章，`react` 命中该文章（REQ-007 验收标准 2；spec §15.4 标签治理）。

## 实际

`--tag react` 正确命中；`--tag nextjs` **仍然命中同一篇文章**，文章 JSON 的 `tags` 已不含 `nextjs`。

## 证据输出

```text
$ node scripts/arcblog-query-posts.mjs published --tag nextjs
1 post(s)
- t (technology) tags=[react]
…
$ node scripts/arcblog-query-posts.mjs published --tag react
1 post(s)
- t (technology) tags=[react]
```

退出码：0

## 影响范围

- 受影响角色：guest、已登录用户
- 受影响链路：查询（`afs-list` filter 走 `/.actions/query` 索引）
- 数据后果：只读；但记录被改写后索引条目过期（与 CLAUDE.md 记录的"编辑记录导致索引残留"一致）
- 可绕过：是（改用目录边界 `posts/` 遍历），但 CLI 查询仍错

## 疑似文件

- `scripts/arcblog-tags.mjs`（merge 后未刷新索引）
- `scripts/arcblog-query-posts.mjs`（依赖索引查询）
```
