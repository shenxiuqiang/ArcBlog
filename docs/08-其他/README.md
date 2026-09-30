# docs/08-其他/ · README

| 字段 | 值 |
| --- | --- |
| 状态 | **已定稿**（Stage 8a 冻结：2026-09-30；审查记录 [`S8a-事实审查`](../team/reviews/S8a-事实审查.md)） |
| 版本 | v1.0 ｜ 2026-09-30 ｜ 主笔 `doc-final` |
| 上游 | [总纲 `docs/README.md`](../README.md) §1/§4/§7；Lead 口径 [`stage-7-8-口径裁决-Lead.md`](../team/stage-7-8-口径裁决-Lead.md)；调研 [`S8-01`](调研/S8-01-其他文档与README盘点.md) |
| 下游 | 任何进入 `docs/08-其他/` 的人；根 `README.md`（Stage 8b）与 [`00-索引与阅读路径.md`](00-索引与阅读路径.md) |
| 证据基线 | git HEAD `2229367`；本目录实测 `ls docs/08-其他`（7 篇正文 + `调研/` **20 份** + `决策/` **1 份**）；机检脚本见 §3（**代码 + 命令 + 真实输出同处一篇**） |
| 事实标签 | 【已实现】｜【规划中】｜【平台边界】｜【决策待定】｜【未验证】（唯一出处 = [总纲 §4](../README.md)） |

> **本目录是什么**：`docs/` 八类里的"**其余必要文档**"——**索引与入口、决策记录、旧→新迁移对照、归档停用声明、任务导航、错误码索引**，
> 以及**全过程的调研底稿**。它**不承载产品定义**（那是 `01`–`07` 的事），只回答"**去哪读、旧东西怎么处置、这个码/这件事在哪**"。

---

## 1. 本目录有什么

### 1.1 正文（7 篇）

| # | 文件 | 一句话职责 | 谁是读者 |
| :-: | --- | --- | --- |
| — | （本文件） | 本目录入口：有什么、怎么用、机检怎么跑 | 所有人 |
| 00 | [`00-索引与阅读路径.md`](00-索引与阅读路径.md) | 三类读者（新来的人 / 工程同学 / 人类决策者）的**真实可达**阅读路径 | 第一次进 `docs/` 的人 |
| 01 | [`01-决策记录.md`](01-决策记录.md) | 归档 **D1–D7** 逐条处置（仍生效 / 已作废 / 被谁替代）+ 跨阶段 Lead 裁决索引 | 想知道"为什么这么定"的人 |
| 02 | [`02-迁移对照.md`](02-迁移对照.md) | 旧→新三张表（`REQ`→`PRD`、旧文件→新文件、归档目录→新目录）+ **未迁移项** | 手上拿着旧文档/旧编号的人 |
| 03 | [`03-归档停用声明.md`](03-归档停用声明.md) | `_docs/` 怎么用 + **5 条已作废归档结论** + 明确不文档化项 | 任何要引用 `_docs/**` 的人 |
| 04 | [`04-常见任务导航.md`](04-常见任务导航.md) | 改 `.aup` / 发版 / 排查 / 审文档 / 跑门：**每条指向唯一出处，不复制步骤** | 要动手的工程同学 |
| 05 | [`05-错误码索引.md`](05-错误码索引.md) | 错误码 → **真实实现来源**（`scripts/**:行`）；归档表只作对照 | 排查失败返回的人 |

### 1.2 子目录

| 目录 | 内容 | 纪律 |
| --- | --- | --- |
| `调研/` | **20 份** Stage 输入底稿（`S1-01` … `S7-01`、`S8-01`） | **只读冻结**：调研产物不是正文，定稿后不再改 |
| `决策/` | `DEC-<NNN>-<slug>.md`，**一页一条**（实测 **1 份**：`DEC-01`） | 规范出处 = [`docs/02-产品需求/00 §9`](../02-产品需求/00-需求地图与规范.md) 第 4 条；登记表 = [`01-决策记录.md §4`](01-决策记录.md) |

> **本目录不做什么**：不新建术语总表（Lead 裁决 §6：术语归属 = [总纲 §6](../README.md)）、不新建"版本与发布史"（Lead 裁决 T4 = A，见 [`02 §6`](02-迁移对照.md)）、不新建 backlog（待办三载体见 [`02 §4.2`](02-迁移对照.md)）。

---

## 2. 怎么用（三种人）

| 你是 | 从这里开始 | 下一步 |
| --- | --- | --- |
| **第一次接触本项目** | [根 `README.md`](../../README.md)（Stage 8b 重写中）→ [`00 §2`](00-索引与阅读路径.md) | [`docs/01-产品概念/00-导读.md`](../01-产品概念/00-导读.md) |
| **工程同学（要改代码/发版）** | [`04-常见任务导航.md`](04-常见任务导航.md) | [`docs/05-开发文档/`](../05-开发文档/00-架构总览.md) |
| **审文档 / 新 agent** | 本文件 §3（机检怎么跑）→ [总纲 §5](../README.md)（审查清单） | `docs/team/reviews/` 的报告格式（[`07`](../07-团队与开发规范/00-角色与写入范围.md)，Stage 7） |
| **手上拿着旧文档** | [`02-迁移对照.md`](02-迁移对照.md) → [`03-归档停用声明.md`](03-归档停用声明.md) | 按对照表找新落点 |

---

## 3. 机检（G1）：本目录相对链接 **0 死链**

### 3.1 判据说明（**能抓什么、不能抓什么，写在脸上**）

| 抓 | 说明 |
| --- | --- |
| Markdown 真链接 | `[label](target)`；`http(s)`、`mailto:` 与纯锚点 `#…` 跳过；按**文件所在目录**解析；**反引号内的链接语法不算链接**（先剥掉行内代码再扫） |
| 反引号路径提及 | 仅当 token **以仓库根开头**（`docs/`/`_docs/`/`scripts/`/`.aup/`/`world/`/`pages/`/`.web/`/`.route/`/`agents/`/`seed/`/`dist/`）；行号后缀（`:123`）先剥离；含 `*`/`{}`/`<`/`>`/`§`/`|`/空格的 token 跳过（它们是模式或章节简写） |
| **必须不存在的路径** | `ABSENT` 名单（`docs/team/.gate-lock`、`docs/team/backlog.md`、`.web/components/arcblog-home/`、`pages/index/`）**反向断言**：出现即 `UNEXPECTED-EXISTS`（这些是文档显式声明"已删 / 未建"的证据） |
| **不抓** | **围栏代码块内**的一切（§3.2 的脚本自身就在里面）；**章节简写**（如 `05/04 §7`）、**AFS 路径**（如 `config/roles.json`、`/p/llms.txt`）与**非路径编号**（如 `ENG-08`、`PRD-CNT-01`） |

### 3.2 脚本（`python3`，直接粘贴可跑）

```python
import os, re, sys
targets = ['docs/08-其他/README.md', 'docs/08-其他/00-索引与阅读路径.md',
           'docs/08-其他/01-决策记录.md', 'docs/08-其他/02-迁移对照.md',
           'docs/08-其他/03-归档停用声明.md', 'docs/08-其他/04-常见任务导航.md',
           'docs/08-其他/05-错误码索引.md']
roots = ('docs/', '_docs/', 'scripts/', '.aup/', 'world/', 'pages/', '.web/',
         '.route/', 'agents/', 'seed/', 'dist/')
ABSENT = {'docs/team/.gate-lock', 'docs/team/backlog.md',
          '.web/components/arcblog-home/', 'pages/index/'}
bad = 0
for path in targets:
    fence = False
    for n, line in enumerate(open(path, encoding='utf-8').read().split('\n'), 1):
        if line.lstrip().startswith('```'):
            fence = not fence
            continue
        if fence:
            continue
        for label, tgt in re.findall(r'\[([^\]]*)\]\(([^)]+)\)', re.sub(r'`[^`]*`', '', line)):
            t = tgt.strip().split('#')[0]
            if not t or t.startswith(('http', 'mailto:', '#')):
                continue
            if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(path), t))):
                print(f'MISS-LINK {path}:{n} [{label}]({tgt})'); bad += 1
        for tok in re.findall(r'`([^`]+)`', line):
            tok = re.sub(r':[0-9][0-9,\-]*$', '', tok)
            if any(c in tok for c in '*{}<>§| ') or not tok.startswith(roots):
                continue
            if tok in ABSENT:
                if os.path.exists(tok):
                    print(f'UNEXPECTED-EXISTS {path}:{n} `{tok}`'); bad += 1
            elif not os.path.exists(tok):
                print(f'MISS-PATH {path}:{n} `{tok}`'); bad += 1
print(f'checked={len(targets)} files | MISS={bad}')
sys.exit(1 if bad else 0)
```

### 3.3 真实输出（本机复跑 2026-09-30）

把 §3.2 的脚本存为 `g1.py`（仓库根执行）：

```text
$ python3 g1.py
checked=7 files | MISS=0
$ echo $?
0
```

### 3.4 变异用例（**判据必须能红**）

在 `docs/08-其他/` 放一个临时文件（跑完即删），内含：一条死链、一条不存在的仓库路径、一条**落在 `ABSENT` 名单里但确实不存在**的路径：

```text
$ python3 g1.py          # targets 指向该变异副本
MISS-LINK docs/08-其他/.mutation-check.md:3 [x](./no-such.md)
MISS-PATH docs/08-其他/.mutation-check.md:4 `docs/08-其他/no-such-file.md`
checked=1 files | MISS=2
$ echo $?
1
```

> **三条读出**：① 死链与死路径**都能红**；② `docs/team/backlog.md`（第 5 行）**没有报红**——因为它在 `ABSENT` 名单里**且确实不存在**，这正是"归档/总纲声称它存在"的反向证据；③ 变异副本**已删除**（`test -e` → GONE），正本随即复跑仍为 `MISS=0`。

---

## 4. 开放问题

| # | 开放问题 | 候选 A / B | 裁决人 | 截止 |
| :-: | --- | --- | --- | --- |
| O1 | §3 的检查器是否升级为**快层套件**（现在只能手工粘贴） | **已裁 T5 = A + 登记 B**：本阶段只内联脚本 + 真实输出（`scripts/` 不在 Stage 8a 写范围）；"升级为快层套件"登记为 [`06/02`](../06-功能开发列表/02-工程与工具功能点.md) 的 `ENG-*` 候选 | Lead（已裁，2026-09-30） | 已完成 |
| O2 | 本目录是否需要一个"**调研底稿索引**"（20 份 `S<n>-<n>` 的跨 Stage 视图） | A. 需要（写进 [`00 §5`](00-索引与阅读路径.md)，一页可查）；B. 不需要（按 Stage 目录就近找） | Lead | Stage 8 冻结前 |

---

## 变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-09-30 | v0.1 | 首版：§1 本目录 7 篇 + 2 个子目录（含"不做什么"三条）；§2 四类用法；§3 **G1 死链机检**（判据边界 + 可粘贴 `python3` 脚本 + 真实输出占位 + 变异用例）；§4 开放问题（T5 已裁留痕） |
| 2026-09-30 | v1.0 | **Stage 8a 定稿**：独立事实审查（[S8a-事实审查](../team/reviews/S8a-事实审查.md)）全部处置完毕，Lead 复核放行（记录见 docs/team/reviews/S8-定稿核验-Lead.md） |
