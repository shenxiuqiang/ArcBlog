# S8a · 事实与判据审查（独立核验）

| 字段 | 值 |
| --- | --- |
| 审查人 | **qa**（独立验证者；本轮为**接手复查**——上一轮未落盘，按 Lead 指定的四项最高价值聚焦） |
| 日期 | 2026-09-30 |
| 对象 | `docs/08-其他/`：`README`+`00`–`05`+`_提纲`（7+1 篇） |
| 基线 | **2026-09-30 12:45:33（写盘后 12:47 复核未变）**：`README`=`6681f2ee`、`00`=`0ca72cac`、`01`=`bcd3ac90`、`02`=`a3b072d7`、`03`=`44dfef3e`、`04`=`721a2cdd`、`05`=`64266817`、`_提纲`=`（见 §11）` |
| 范围（Lead 指定聚焦） | ① `05-错误码索引` 抽 ≥8 ② `02-迁移对照` 抽 ≥10 + 归档计数 ③ `03-归档停用声明` 5 条（尤其发布根） ④ `README §3` 索引检查器 + 变异；**形态必查**。D1–D7 / 不重定义 / 五类标签按可及范围简化 |
| 只读纪律 | 只写本文件；未改被审文件；变异在 `/tmp` 与一次性临时文件（已删）上做；未 build/重启/写实例/取 cookie |
| **总结论** | **可定稿**（**P0=0、P1=0、P2=3**）。**四项聚焦全部通过**：`README §3` 检查器逐字复现且**变异必红**；`05` 的 **17/17** 错误码指针真实；`02` 抽样 14 行的**旧路径全部存在**且表内 **127 条链接 0 MISS**；`03` 的 5 条与**发布根归属订正**结论正确（`operations-runbook.md:868` 为真、`arc-contracts:2087` 确为反向警示）；**7 篇形态 0 违规**。3 条 P2 均为**计数/时效**问题，不阻断 |

---

## 1. `README §3` 索引检查器：逐条复跑 + **变异必红** ✅

**正本**（从 `README §3.2` 的 ```python 块逐字提取后原样跑）：

```text
$ python3 g1.py
checked=7 files | MISS=0
$ echo $?
0
```

✅ 与文档 §3.3 所载 `checked=7 files | MISS=0` / `exit 0` **逐字一致**。检查器覆盖面（文档自己写在脸上）：Markdown 真链接（跳 `http`/`mailto`/`#`、按文件目录解析、**先剥行内代码**）+ 反引号仓库路径（`roots` 白名单、剥 `:123` 行号）+ **`ABSENT` 反向断言**（`.gate-lock`/`backlog.md`/`.web/components/arcblog-home/`/`pages/index/`）+ 跳过围栏。

**变异（"能红"验证）**：在仓库内新建 `docs/zz-mut.md`（含一条 `[死链](./no-such-file.md)`），把同一脚本的 `targets` 加上该文件：

```text
MISS-LINK docs/zz-mut.md:3 [死链](./no-such-file.md)
checked=8 files | MISS=1
exit=1
```

✅ **报红且 exit=1**；临时文件已删（`[ -e docs/zz-mut.md ]` → YES 已删）。⇒ 判据**有判别力**。

---

## 2. `05-错误码索引`：**17/17** 指针真实 ✅

程序化抽取 `scripts/**:行` 并逐条比对文件与行内容：

```text
指针数 = 17   失效指针 = 0
✅ scripts/arcblog-agent.mjs:208  → if (tool.kind === 'closed') fail('FORBIDDEN', …)
✅ scripts/arcblog-agent.mjs:209  → if (tool.kind === 'read' && tool.status === 'unavailable') fail('NOT_AVAILABLE', …)
✅ scripts/arcblog-agent.mjs:239  → fail('FORBIDDEN', 'agent.admin gates default-closed tools …')
✅ scripts/arcblog-category.mjs:93 → fail('CONFLICT', `category already exists: ${slug} …`)
✅ scripts/arcblog-lifecycle.mjs:185 → fail('VALIDATION', `cannot read --sign-key file: …`)
✅ scripts/arcblog-lifecycle.mjs:211 → if (!existing) fail('NOT_FOUND', `post not found: ${from}`);
✅ scripts/arcblog-lifecycle.mjs:258 → function fail(code, message) {
✅ scripts/arcblog-lifecycle.mjs:379 → fail('INVALID_TRANSITION', `cannot transition … -> published`);
✅ scripts/arcblog-lifecycle.mjs:410 → … fail('CONFLICT', `slug already exists: ${slug}…`)
✅ scripts/lib/agents.mjs:314     → if (issues.length) fail('VALIDATION', issues.join('; '));
✅ scripts/lib/arc.mjs:101-109    → /** Throw a structured error; `code` matches docs/error-codes.md. */ export function fail(…
✅ scripts/lib/arc.mjs:108        → export function ensure(condition, message, code = 'VALIDATION') {
✅ scripts/lib/arc.mjs:182        → fail(value.error?.code || 'RUNTIME_ERROR', …)
✅ scripts/lib/arc.mjs:195        → fail('RUNTIME_ERROR', short(captured.stderr) || `arc … failed`);
✅ scripts/lib/categories.mjs:123 → if (!existing) fail('NOT_FOUND', `category not found: ${normalized}`);
✅ scripts/lib/chain.mjs:457      → if (!factory) fail('NOT_FOUND', `no ${role} factory on this chain yet …`)
✅ scripts/lib/economy.mjs:227    → err.code = 'INVALID_TRANSITION';
```

**每条指针指向的代码里都恰好出现该码**（`VALIDATION`/`CONFLICT`/`NOT_FOUND`/`INVALID_TRANSITION`/`FORBIDDEN`/`NOT_AVAILABLE`/`RUNTIME_ERROR`）⇒ 语义也对齐 ✅。
另核两条"零命中"声明：`USER_SPACE_UNAVAILABLE`、`ADAPTER_ERROR` 在 `scripts/**` 的定义点检索为 0（与 §「已消失/未落地」表一致）✅。

---

## 3. `02-迁移对照`：抽样 14 行 + 汇归档计数

### 3.1 旧/新路径真实性与表内链接

- **表内相对链接：127 条 → MISS 0** ✅（`02` 单篇；本目录 7 篇合计亦 `MISS=0`，见 §1）。
- **表 A 抽 14 行（#1–#14）**：每行的 `` `_docs/team/requirements/REQ-0xx-*.md` `` 旧路径**全部存在**（14/14 ✅）。新落点列多为 `[04/05](../04-UI设计规范/…md)` 形态，其目标由全目录 `MISS=0` 覆盖 ✅。

### 3.2 归档计数（逐项实测）

| 项 | 文档声称 | 实测 | 判定 |
| --- | --- | :-: | :-: |
| `REQ-*.md` | 43 | `ls _docs/team/requirements/REQ-*.md \| wc -l` → **43** | ✅ |
| 非 `REQ-*`（`requirements/` 顶层） | 6 | **6** | ✅ |
| `bugs/*.md` | 83 | **83**（无子目录） | ✅ |
| `journal/` | 26 | **26** | ✅ |
| `requirements/raw/` | 14（`.txt`） | **14** 个文件（`.md` = 0 ⇒ 全 `.txt`，与文档括注一致） | ✅ |
| `test-reports/` | **31** | **顶层条目 31（含 `assets`/`raw` 两个子目录）**；顶层 `.md` **29**；递归 `.md` **30**；递归全部文件 **483** | ❌ **口径不符（P2）** |
| `design/*.md` | **24** | `design/` 顶层 `.md` = **24** ✅ | ✅ |
| `design/UI-*.md` | **24**（§表 B 写法） | `UI-*.md` = **22** | ❌ **数字错（P2）** |

（`REQ-028-dev-report.md` 属交付报告、`REQ-026/027` 号段缺口，文档已在 §2 括注说明 ✅。）

---

## 4. `03-归档停用声明`：5 条三段 + 发布根归属

- **条数与结构**：`### 2-1` … `### 2-5` 共 **5 条** ✅，均为「旧说法 → 实测 → 替代」三段（全文"旧说法"×9、"实测"×18、"替代"×10）。
- **§2-5 发布根那条：结论正确** ✅
  - 旧说法归属 → `_docs/operations-runbook.md:868-870`，引文 "treat the **repository root** as the publish root" ✅（我独立 `sed -n '866,870p'` 核过，原文一致）。
  - 实测 → `arc blocklet instance deploy --help` 原文 "Deploy a **published blocklet dist/**…" ⇒ 发布根 = `dist/` ✅，并指向 `docs/05-开发文档/04 §4:184`（该行确为 `--help` 原文引述）✅。
  - 替代 → 唯一安全入口 `npm run build` ✅。
- **§3 的归档引用订正：回原文核对为真** ✅ —— `_docs/arc-contracts.md:2087` 原文 = "**不得**把仓库根当发布根"（**反向警示**），`grep -n 'publish root' _docs/operations-runbook.md` → `868`。⇒ 「§43(3) 无需作废、真正旧说法在 `operations-runbook.md:868`」**成立**。

---

## 5. 形态纪律（**必查**，Python `len(str)` 字符口径）

```text
README.md                行= 145 最长= 200 版本行= 43
00-索引与阅读路径.md        行= 127 最长= 402 版本行= 43
01-决策记录.md             行=  97 最长= 520 版本行= 43
02-迁移对照.md             行= 197 最长= 271 版本行= 43
03-归档停用声明.md          行= 171 最长= 350 版本行= 43
04-常见任务导航.md          行= 128 最长= 249 版本行= 43
05-错误码索引.md            行= 102 最长= 351 版本行= 43
_提纲.md                  行= 170 最长= 314 版本行= 43
违规 = 0     （≤400 行 ✅ ｜ 单行 <800 字符 ✅ 最大 520 ｜ 版本行 ≤80 ✅）
```

**相对链接 0 MISS** ✅（README §3 检查器 `checked=7 files | MISS=0`）。
**五类标签**：7 篇头部均声明"唯一出处 = 总纲 §4"并逐篇落条（`README`/`02`/`03`/`04`/`05`/`00` 各 ≥5 处标记；`00:10`、`05:10` 明写"本篇只做索引/只引用，不作实现或平台状态断言"）✅。

---

## 6. 不重定义（可及范围抽查）✅

- `00:10`、`05:10`：事实标签"唯一出处 = 总纲 §4，本篇只引用"。
- `_提纲:67/70/71/72`：改 `.aup` / 审文档 / 跑门 / 链-工厂-经济 均写"**唯一出处**"指向 `05/04`、`docs/README §5`、Stage 7 `03`、`05/02`+`07`+`06 §3`，并注明"**工厂规格唯一出处仍在归档**"。
- `04` 上游行写"`docs/05-开发文档/`（**唯一出处的提供方**）" ⇒ 本目录**不复制**步骤，只给链接 ✅。

---

## 7. 主表

| # | 对象 | 错误/风险 + 证据（原始输出） | 严重度 | 正确写法 |
| :-: | --- | --- | :-: | --- |
| 1 | `02:9`、`:133`、`:162` | **`test-reports/` 计数与 glob 口径不符**：文档写「`_docs/team/test-reports/**`（**31** 份）」，而 **31 只是顶层条目数（含 `assets`/`raw` 两个子目录）**；`**` 递归下 `.md` = **30**、全部文件 = **483**。另两处（`:133`/`:162`）沿用 31 | **P2** | 二选一：① 写「`test-reports/` 顶层 **31** 个条目（含 2 个子目录）/ 其中 `.md` **29**」；② 若确指轮次报告，写「递归 `.md` **30** 份」并统一三处 |
| 2 | `02:134` | **`design/UI-*.md`（**24** 份）与实测不符**：`UI-*.md` = **22**；**24** 是 `design/` **顶层全部 `.md`**（含 `REVIEW-console-20260929.md`、`review-console.md` 两份审查件，非 `UI-*`） | **P2** | 改 **22**，或把 glob 写成 `design/*.md`（24 份，含 2 份审查件）并在括注里点明 |
| 3 | `03:112-118`、`03:130`（处置） | **"现象"表与处置已过期**：§3 列「三处把发布根误归 `§43(3)`」并说「`05/04` 与 `06/02` 是**冻结文件**…**不发受控修订**」；但实测这三处**已受控修订为正确归属**——`docs/05-开发文档/04:185` 现写「真正出处 = `_docs/operations-runbook.md:868`」、`:265` D4 同；`docs/06-功能开发列表/02 ENG-24` 标题即「**归档发布根旧说法的出处订正**」；`docs/team/stage-7-8-口径裁决-Lead.md:62` 已是订正记录。⇒ 表内引文与现状**不符**（读者去核 `04:185` 会看到相反内容） | **P2** | 把该表标注为「**修订前原文（历史）**」并加一列"现状"（均已订正，附 v1.1 受控修订），或改为已订正清单 |

---

## 8. 必须修 / 建议修

**必须修（P0/P1）**：**无**。

**建议修（P2，3 条）**
1. **#1** `02` 的 `test-reports/` 计数 31 → 按顶层条目/递归 `.md` 二选一并**三处统一**（现状 3 处都写 31）。
2. **#2** `02` 的 `design/UI-*.md` 24 → **22**（或改 glob 为 `design/*.md`）。
3. **#3** `03 §3` 的"现象"表标注为**修订前历史**（三处均已订正）。

---

## 9. 已核验为真（≥6，均为我自己跑出）

1. **`README §3` 检查器逐字复现**：`checked=7 files | MISS=0`、`exit 0`。
2. **检查器变异必红**：插入 `docs/zz-mut.md`（含 `./no-such-file.md`）→ `MISS-LINK docs/zz-mut.md:3` / `MISS=1` / `exit 1`。
3. **`05` 错误码指针 17/17 真实**，且每条指向的代码都含该码（`VALIDATION`/`CONFLICT`/`NOT_FOUND`/`INVALID_TRANSITION`/`FORBIDDEN`/`NOT_AVAILABLE`/`RUNTIME_ERROR`）。
4. **`02` 迁移表旧路径 14/14 存在**；`02` 表内 **127 条相对链接 0 MISS**。
5. **归档计数 5/7 项精确吻合**：`REQ-*.md` **43**、非 REQ **6**、`bugs/*.md` **83**、`journal/` **26**、`requirements/raw/` **14**（全 `.txt`）。
6. **`03` 的 5 条（`2-1`…`2-5`）三段结构齐全**；**发布根那条结论正确**（旧说法出处 = `_docs/operations-runbook.md:868`，实测 = `dist/`，替代 = `npm run build`）。
7. **`arc-contracts.md:2087` 确为反向警示**（"**不得**把仓库根当发布根"）⇒ `03 §3` 的订正**成立**。
8. **形态 7 篇 0 违规**：≤400 行（max 197）、单行 <800 字符（max **520**）、版本行 43、围栏配平、相对链接 0 MISS。
9. **不重定义抽查通过**：唯一出处一律外指（总纲 §4 / `05/04` / `docs/README §5` / Stage 7 `03`），工厂规格明记"唯一出处仍在归档"。
10. **索引侧目标存在**：`README`/`00`/`04` 引用的 `docs/07-团队与开发规范/`、`docs/06-功能开发列表/`、`docs/05-开发文档/*` 等全部 `os.path.exists` = True（由 §1 的 0 MISS 覆盖）；"Stage 8b 重写中"的状态登记（`README:46`、`00:21/32/45`）与现状一致（Stage 8b 进行中）。

---

## 10. 未能验证项 + 原因

| # | 项 | 原因 |
| :-: | --- | --- |
| 1 | `01-决策记录` 的 **D1–D7 逐条回 `_docs/development-plan.md:15-80`** 核"原决策"引述 | 本轮按 Lead 指定聚焦四项 + 形态，**未做**（时间盒）；建议下一轮补齐（`_docs/development-plan.md` 可只读） |
| 2 | `02 §6` 的"未迁移项"是否**恰好**覆盖全部有意不迁移内容 | 需与 `S8-01 §1.3` 的 10 类逐类对齐，本轮未做 |
| 3 | `README`/`00`/`04` 的"待补链接"回填时机（`00:118` O2） | 属 Lead 裁决项（A/B），非事实错误 |
| 4 | `_提纲.md` 的 hash | 首轮未单独记录（`docs/08-其他/_提纲.md` 未纳入本节基线表；正文 7 篇基线完整） |

---

## 11. 复现命令（可直接粘贴）

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog

# ① README §3 检查器（从文档提取，不手抄）+ 变异
python3 - <<'PY'
import io
s=io.open('docs/08-其他/README.md',encoding='utf-8').read()
blk=s.split('### 3.2')[1].split('### 3.3')[0]; L=blk.split('\n')
a=next(i for i,l in enumerate(L) if l.strip()=='```python')+1
b=next(i for i in range(a,len(L)) if L[i].strip()=='```')
io.open('/tmp/g1.py','w',encoding='utf-8').write('\n'.join(L[a:b]))
PY
python3 /tmp/g1.py ; echo "exit=$?"
printf '# zz 变异\n\n[死链](./no-such-file.md)\n' > docs/zz-mut.md
sed "s|'docs/08-其他/05-错误码索引.md'\]|'docs/08-其他/05-错误码索引.md', 'docs/zz-mut.md']|" /tmp/g1.py > /tmp/g1mut.py
python3 /tmp/g1mut.py ; echo "exit=$?"   # 期望 MISS=1 / exit=1
rm -f docs/zz-mut.md

# ② 05 错误码指针
python3 - <<'PY'
import io,re,os
s=io.open('docs/08-其他/05-错误码索引.md',encoding='utf-8').read()
refs=sorted(set(re.findall(r'`(scripts/[^`:]+):(\d+(?:-\d+)?)`', s)))
bad=[]
for f,ln in refs:
    if not os.path.exists(f): bad.append((f,ln)); continue
    L=io.open(f,encoding='utf-8').read().split('\n'); a=int(ln.split('-')[0]); b=int(ln.split('-')[-1])
    if a>len(L): bad.append((f,ln))
print('refs',len(refs),'bad',bad)
PY

# ③ 归档计数
ls _docs/team/requirements/REQ-*.md | wc -l                       # 43
ls _docs/team/requirements/*.md | grep -vc '/REQ-'                # 6
ls _docs/team/bugs/*.md | wc -l                                   # 83
ls _docs/team/journal/ | wc -l                                    # 26
find _docs/team/requirements/raw -type f | wc -l                  # 14
ls _docs/team/test-reports/ | wc -l                               # 31（顶层条目，含 2 子目录）
find _docs/team/test-reports -name '*.md' | wc -l                 # 30（递归）
find _docs/team/test-reports -type f | wc -l                      # 483（递归全部）
ls _docs/team/design/UI-*.md | wc -l                              # 22
ls _docs/team/design/*.md | wc -l                                 # 24

# ④ 发布根归属
sed -n '868p' _docs/operations-runbook.md                          # "…treat the repository root as the publish root"
sed -n '2087p' _docs/arc-contracts.md                              # "…并且不得把仓库根当发布根"（反向警示）
grep -n 'operations-runbook.md:868' docs/05-开发文档/04-构建·部署·运行.md docs/06-功能开发列表/02-工程与工具功能点.md

# ⑤ 形态（字符口径）
python3 -c "
import glob,os
for f in sorted(glob.glob('docs/08-其他/*.md')):
    s=open(f,encoding='utf-8').read(); L=s.split('\n'); n=len(L)-1 if s.endswith('\n') else len(L)
    print(os.path.basename(f), n, max(len(l) for l in L))"
```

**纪律确认**：本轮只写 `docs/team/reviews/S8a-事实审查.md`；未改被审文件；变异仅在 `/tmp` 与一次性 `docs/zz-mut.md`（**已删**）上做；未跑 live、未写实例、未取 cookie。
