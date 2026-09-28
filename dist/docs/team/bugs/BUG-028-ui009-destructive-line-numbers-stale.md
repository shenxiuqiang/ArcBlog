# BUG-028: UI-009 §1.4① 的 `variant=destructive` 使用点行号是 10:20 快照，最终工作区已整体 +4 行

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-028 |
| 严重级 | **P3**（设计文书准确性；不影响对比度结论、不影响本轮放行的功能面） |
| 发现轮次 | **Round 12**（QA-007 独立复验） |
| 关联 REQ | **REQ-014**（A3「影响面源码使用点 = `grep` 真值，并列出全部 `文件:行`」）、UI-009 §1.4① / §8 S2 |
| 状态 | 待裁决（建议下一轮 UI 刷新行号，或 PM 并入 backlog 建议） |
| 疑似文件 | `docs/team/design/UI-009-v3-contrast-and-visual-debt.md` §1.4① 与 §8 S2 —— **QA 不改设计文书**，仅作定位线索 |

## 复现命令与最小步骤

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
grep -rn "variant=destructive" .aup/pages --include=*.aup
grep -n "site/categories.aup\|posts.aup:179\|admin/pages.aup:165" docs/team/design/UI-009-v3-contrast-and-visual-debt.md
```

## 期望

REQ-014 A3 / UI-009 §8 S2 要求影响面给出**真实**的 `文件:行`（至少对最终快照的那一列）。

## 实际

**最终工作区（QA 本轮实测）9 处 / 7 文件**：

```text
.aup/pages/admin/pages.aup:169
.aup/pages/admin/pages.aup:196
.aup/pages/admin/posts.aup:183
.aup/pages/admin/posts.aup:220
.aup/pages/site/heroes.aup:152
.aup/pages/site/tags.aup:178
.aup/pages/ops/factory.aup:214
.aup/pages/ops/hub.aup:160
.aup/pages/preview.aup:36
```

**UI-009 §1.4① 的「10:41（本轮最终）」一行**（去掉 `site/categories.aup` 后沿用 10:20 的行号）：

```text
admin/posts.aup:179,216 · admin/pages.aup:165,192 · site/heroes.aup:148 ·
site/tags.aup:174 · ops/factory.aup:210 · ops/hub.aup:156 · preview.aup:36
```

⇒ **7 个控制台页面的行号整体少 4 行**（`preview.aup:36` 正确，因为它不是控制台页面、没有侧栏）。
成因：10:20 之后 Dev 的 task-35 给**每个**控制台页面的侧栏插入了 `nav-diagnostics` 行（`action` + 分隔 `view` 共 4 行），UI-009 直接把 10:20 的 `文件:行` 复用到最终快照列，未重新 `grep`。
逐页偏移：`posts.aup 179→183 / 216→220`、`pages.aup 165→169 / 192→196`、`heroes.aup 148→152`、`tags.aup 174→178`、`factory.aup 210→214`、`hub.aup 156→160`（**全部 +4**）。

## 证据输出

```text
$ grep -c "variant=destructive" .aup/pages/admin/posts.aup   → 2（行 183、220）
$ sed -n '183p;220p' .aup/pages/admin/posts.aup | grep -c "variant=destructive" → 2
$ grep -n "variant=destructive" .aup/pages/preview.aup       → 36（与 UI-009 一致）
```

## 影响范围

- **不影响**：使用点**数量**（9）、**文件集合**、对比度计算、路径 A/B/C 的结论、`?page=*` 实例计数。UI-009 已在 §1.4① 明确「10 是 10:20 快照真值、9 是最终真值」，**计数口径本身是对的**。
- **影响**：下一轮按 UI-009 派工的人会按 `:179/:216/…` 打开**错误的行**（实际在 `:183/:220/…`）；若照抄进新的标准/REQ，错误会被固化。
- 不阻断本轮放行（设计文书行号，非实现缺陷）。

## 建议

UI 下一轮交付前重跑一次 `grep -rn "variant=destructive" .aup/pages --include=*.aup` 并逐行校正；或由 PM 在 backlog 里登记「UI-009 行号刷新」为下一轮 UI 任务的验收项。
