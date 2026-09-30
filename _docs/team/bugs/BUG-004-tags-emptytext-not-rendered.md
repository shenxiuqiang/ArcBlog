# BUG-004: `emptyText=:list-empty` / `:queue-empty` 不生效，空列表显示运行时默认英文

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-004 |
| 严重级 | P3 |
| 发现轮次 | round-6 |
| 关联 REQ | REQ-001-tags-admin-ui（验收标准 A6，§2.1.7 i18n） |
| 状态 | ✅ **已修复并复验通过**（两个永不渲染的活键在 locale 与页面同时删除；空列表的运行时默认英文属平台限制；证据 `docs/team/test-reports/round-6-reverify.md` §4 / §7） |

## 复现命令与最小步骤

1. 前置：dev 实例 `default`；admin 会话；使用「空投影探针」把 `tags/` 派生投影置空（只动派生记录，随后用 `project` 复原）。
2. 渲染 `?page=tags`，读取列表区的空态文案。

```bash
# 空投影（仅派生记录，可复原）
node -e "…"   # 见 docs/team/test-reports/round-6.md §3「A6 空投影探针」
# 渲染后读文本，再复原：
node scripts/arcblog-tags.mjs project
```

## 期望

`.aup/locales/{en,zh}.json` 里为页面声明了 `tags.list-empty` = "No tag to show." / "没有可显示的标签。"、`tags.queue-empty` = "No intent queued." / "队列为空。"，且页面用 `emptyText=:list-empty` / `emptyText=:queue-empty` 引用它们。空列表应显示这两条本地化文案（REQ §2.1.7 新键应真正生效）。

## 实际

空投影下列表区显示的是**运行时默认英文** `No items to display`，不是声明的 `No tag to show.`；即 `emptyText` 上的 `:key` 简写（与 `$t()` 一样）在 `afs-list` 上不被求值，两条声明出来的空态键成了**永不渲染的活键**（`arc dsl lint` 也不会报它们 dead，因为 `.aup` 里有引用）。

## 证据输出

```text
# 空投影渲染（?page=tags，admin）
Tags in use
No items to display                     ← 运行时默认英文；声明的 tags.list-empty 未渲染
No tag in use yet?                      ← 页级引导卡（常驻，见 BUG-001）
A tag shows up in the list above as soon as a post carries one: add tags while writing, then press Refresh projection — the worker rebuilds this list from the posts. Nothing here is a registry.
Write a post
…
'No tag to show.'   -> False
'No data'           -> False

# 复原验证
$ node scripts/arcblog-tags.mjs project
final projection count = 3   （与 list 一致）
```

退出码：0

## 影响范围

- 受影响角色：admin（控制台运营者）；zh 使用者
- 受影响链路：界面 i18n（空列表文案）
- 数据后果：无（纯呈现）
- 可绕过：是（页级引导卡已说明下一步，故 A6 仍算通过）

## 疑似文件

- `.aup/pages/site/tags.aup:141`（`emptyText=:queue-empty`）、`:157`（`emptyText=:list-empty`）
- `.aup/locales/en.json:445,449`、`.aup/locales/zh.json` 同键（声明存在但渲染路径无效）
- 平台事实参考：`CLAUDE.md`「`emptyText` on `afs-list` does not evaluate `$t()`」（本轮补充实测：`:key` 简写同样不求值）

## 复验记录（round-6 复验，2026-09-27，QA）

Dev 按「不留下声明了但永不渲染的活键」处理：删除两个声明并改为页级常驻说明。

```text
tags.list-empty   locale(en)=0  locale(zh)=0   page-ref=0
tags.queue-empty  locale(en)=0  locale(zh)=0   page-ref=0
$ grep -n 'emptyText' .aup/pages/site/tags.aup → no emptyText in tags.aup
$ arc dsl lint → Passed DSL lint（45 files），仅 10 条既有 unreferenced_explicit_id，无 dead_locale_keys
$ npm test → 28/28（含死 locale key 门）

空投影下列表区文本：'Tags in use\nNo items to display\nWhere these tags come from\n…'
→ 运行时默认英文仍在：平台限制（`emptyText` 不求值），按 Lead 口径不判 Dev 未修
```

结论：**已修复并复验通过**（活键消失、死键门绿）；空列表本地化文案为平台限制。完整证据：`docs/team/test-reports/round-6-reverify.md` §4 / §7。
