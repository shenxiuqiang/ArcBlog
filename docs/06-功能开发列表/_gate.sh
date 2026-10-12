#!/usr/bin/env bash
# Stage 6（功能开发列表 / 台账）机检门 · Lead 2026-10-01
#
# 判据（每条都能红）：
#   A0 **行数对齐权威口径**：`01-功能台账` 的 `PRD-` **主键行数** == `docs/02-产品需求/_count.sh` 的
#        **口径A（需求总表行）**。⚠️ **不写死数字**——门**真的去跑那支计数器**（作者口径 = 权威口径）。
#        （口径B = 全文提及，**不用于** 1:1 回填；两者之差是索引表引的 v1 编号。）
#   A1 **主键 1:1**：口径A 的每个 `PRD-` 在 `01` 的 ID 列**恰出现一次**（缺 = FAIL；多 = FAIL）
#   A2 **六态只在 `00` 定义**：其它篇只引用、不展开定义
#   A3 **已废弃的记 `已废弃`**：hub / 经济体系 / `store` 门面的相关行不得写成 `未开工`
#   A4 形态 + 链接（豁免：标 Stage N/未落盘；或目标在 `_提纲` 列为计划文件）
#
# 用法：bash docs/06-功能开发列表/_gate.sh     0=PASS 1=FAIL 2=环境异常
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import re, glob, os, sys, subprocess

DIR = 'docs/06-功能开发列表'
F = chr(96) * 3
files = sorted(glob.glob(DIR + '/*.md'))
if not files:
    print('ENV-ERROR: 目录为空'); sys.exit(2)
plan = open(os.path.join(DIR, '_提纲.md'), encoding='utf-8').read() if os.path.exists(os.path.join(DIR, '_提纲.md')) else ''

def body(p): return open(p, encoding='utf-8').read()
def strip_fences(t): return re.sub(F + '.*?' + F, '', t, flags=re.S)

problems, links_miss = [], []
b00 = os.path.join(DIR, '00-台账总览与规范.md')
b01 = os.path.join(DIR, '01-功能台账.md')
PRD = re.compile(r'PRD-[A-Z]{2,4}-\d{2}')

# ---- A0 行数对齐权威口径（**跑** _count.sh，不写死）
authoritative = None
counter = 'docs/02-产品需求/_count.sh'
if os.path.exists(counter):
    r = subprocess.run(['bash', counter], capture_output=True, text=True, timeout=60)
    m = re.search(r'口径A.*?合计\s*=\s*(\d+)', r.stdout, re.S)
    if m:
        authoritative = int(m.group(1))
        print(f'A0 权威口径: `_count.sh` 口径A（需求总表行）= {authoritative}')
    else:
        problems.append('无法从 `_count.sh` 解析口径A')
else:
    problems.append(f'缺权威计数器 `{counter}`')

rows = []
if os.path.exists(b01):
    for i, l in enumerate(strip_fences(body(b01)).split('\n'), 1):
        if not l.lstrip().startswith('|'):
            continue
        cells = l.strip().strip('|').split('|')
        # 主键列 = 行**首列**恰为 `PRD-*`（主表表头 `| PRD- | 一句话需求 | 六态 | … |`）。
        # ⚠️ 不得扫"行内任一单元格"（2026-10-01 实测假阳性）：`§3 八项账落点` 这类**附录表**
        #    首列是 `A1`…`A8`、`PRD-` 只出现在"落点行"列里 —— 那是**引用**，不是主键行。
        first = cells[0].strip().strip('`*~').strip() if cells else ''
        if PRD.fullmatch(first):
            rows.append((i, first))
    print(f'A0 台账主键行数 = {len(rows)}' + (f' ｜ 权威 {authoritative}' if authoritative else ''))
    if authoritative is not None and len(rows) != authoritative:
        problems.append(f'`01` 主键行数 {len(rows)} ≠ 权威口径A {authoritative}')
else:
    # P13：**缺失必须红**，不得"跳过"
    problems.append('`01-功能台账.md` **缺失**（本阶段主键表）⇒ 不得以"跳过"放行')

# ---- A1 主键 1:1
if authoritative is not None and rows:
    seen = {}
    for ln, k in rows:
        seen.setdefault(k, []).append(ln)
    dup = {k: v for k, v in seen.items() if len(v) > 1}
    for k, v in dup.items():
        problems.append(f'主键 `{k}` 在 `01` 出现 {len(v)} 次（行 {v}）⇒ 违反 1:1')
    # 口径A 的成员（从 `docs/02` 的需求总表行取，而非全文提及）
    dom = 'docs/02-产品需求'
    expected = set()
    for p in sorted(glob.glob(dom + '/*.md')):
        t = strip_fences(body(p))
        for l in t.split('\n'):
            if not l.lstrip().startswith('|'):
                continue
            cells = [c.strip().strip('`*~').strip() for c in l.strip().strip('|').split('|')]
            for c in cells:
                if PRD.fullmatch(c):
                    expected.add(c); break
    miss = sorted(expected - set(seen))
    print(f'A1 主键 1:1: 需求总表 {len(expected)} 个 ｜ 台账 {len(seen)} 个 ｜ 缺 {len(miss)} ｜ 重复编号 {len(dup)}')
    if miss:
        problems.append(f'台账缺主键: {miss[:10]}')

# ---- A5 `待平台能力` 必须能指到 `B*`（Lead 裁决，2026-10-01）
#   动机：`01` 曾把 6 行"**本项目未接/未测**"（适配器 0 命中 / `updateAsset` 未接 / 未跑 / `U6` 未测）
#   标成 `待平台能力` —— 而 `02 §6` 自己写"三缺口是**本项目未接**，不是平台限制" ⇒ 两篇矛盾。
#   判据（可判）：**用 `待平台能力` ⇒ 该行必须出现 `B<数字>`**（平台给不了的事实证据）。
#   ⚠️ **只管 `待平台能力`**；`待前置` 的编号要求由人判（前置可以是 `PRD-`/`P-`/`U-`/`ENG-`）。
n_plat = 0
for p in files:
    for i, l in enumerate(strip_fences(body(p)).split('\n'), 1):
        if not l.lstrip().startswith('|'):
            continue
        cells = [c.strip().strip('`*~').strip() for c in l.strip().strip('|').split('|')]
        key = cells[0] if cells and PRD.fullmatch(cells[0]) else None
        if key is None or '待平台能力' not in l:
            continue
        n_plat += 1
        if not re.search(r'\bB\d{1,2}\b', l):
            problems.append(f'{os.path.basename(p)}:{i} `{key}` 标 `待平台能力` 却**指不到 `B*`**'
                            f'（"本项目未接/未测"不是平台限制 ⇒ 应改 `无` 或 `待前置<编号>`）')
print(f'A5 `待平台能力` 行 = {n_plat}（每行须能指到 `B*`）')

# ---- A6 `已验证` 必须带**原样输出**（对 `00 §2.1` 的机械化）
#   ⚠️ **前提修正（2026-10-01，qa `S6` P1#1 触发）**：本判据的**第一版**是
#      「`已实现待验` **或** `已验证` 且证据含 `输出=待补` ⇒ FAIL」，采自 pm 的机检上限建议。
#      **但它与 `00 §2.1` 冲突**：`00` 对 `已实现待验` 只要求「完整调用点/产物 + 有可跑命令」，
#      **原样输出只在 `已验证` 才要求**。⇒ 按 `00`（定稿定义点）**收窄为只管 `已验证`**。
#   另一处真实 bug（同一次审查）：原实现只认半角 `=`，而文档写的是 `输出: 待补`（半角冒号）
#      ⇒ **判据假绿**；**而我的"变异"恰好注入 `输出=待补`（正则认的那一版）⇒ 变异只验证了我的假设**。
#      现**标点无关**：`输出` 后接 `= : ：` 任一皆算。
#   教训：**假绿的判据会掩盖"判据前提本身就错"**——两者可能互相抵消。
OUT = re.compile(r'输出\s*[:：=]\s*待补')
n_verified_bad = 0
for p in files:
    for i, l in enumerate(strip_fences(body(p)).split('\n'), 1):
        if not l.lstrip().startswith('|'):
            continue
        cells = [c.strip().strip('`*~').strip() for c in l.strip().strip('|').split('|')]
        key = cells[0] if cells and PRD.fullmatch(cells[0]) else None
        if key is None or len(cells) < 5:
            continue
        if cells[2].replace('*', '') == '已验证' and OUT.search(cells[4]):
            n_verified_bad += 1
            problems.append(f'{os.path.basename(p)}:{i} `{key}` 标 `已验证` 却写「输出…待补」'
                            f'（`00 §2.1`：`已验证` 须有原样输出摘要 + 独立验证者署名）')
print(f'A6 `已验证` 而输出待补 = {n_verified_bad}（须为 0；`已实现待验` 不适用——按 `00 §2.1` 只要求调用点+可跑命令）')

# ---- A2 六态只在 `00` 定义
STATES = ['未开工', '开发中', '已实现待验', '已验证', '平台边界', '已废弃']
BLOCK = ['无', '待决策', '待批准', '待平台能力', '待前置']
if os.path.exists(b00):
    t00 = strip_fences(body(b00))
    miss00 = [s for s in STATES + BLOCK if s not in t00]
    print(f'A2 六态/阻塞定义于 `00`: 齐 {len(STATES) + len(BLOCK) - len(miss00)}/{len(STATES) + len(BLOCK)}' + (f' ｜ 缺 {miss00}' if miss00 else ''))
    if miss00:
        problems.append(f'`00` 未定义: {miss00}')
else:
    problems.append('`00-台账总览与规范.md` 缺失')

# ---- A3 已废弃的不得写成"未开工"
#   **只看 `PRD-` 主键行**（= 能力的记录行）。原因（2026-10-01 实测假阳性）：
#   `ENG-*`/`FP-*` 是**执行删除的工作项**（"删 6 个经济工具"/"删 hub 回退"/"删 6 个页面文件"），
#   它们标 `未开工` **正确** —— 删掉的能力要记 `已废弃`，而"去删它"这件事是待办工作。
GONE = re.compile(r'\b(hub|orders|policy|access|ledger|store|economy|经济)\b', re.I)
n_bad = 0
for p in files:
    t = strip_fences(body(p))
    for i, l in enumerate(t.split('\n'), 1):
        if not l.lstrip().startswith('|'):
            continue
        cells = [c.strip().strip('`*~').strip() for c in l.strip().strip('|').split('|')]
        key = next((c for c in cells if PRD.fullmatch(c)), None)
        if key is None:          # 非 `PRD-` 主键行 ⇒ 工作项，不适用本条
            continue
        if '未开工' in l and GONE.search(l) and '已废弃' not in l:
            n_bad += 1
            if n_bad <= 5:
                problems.append(f'{os.path.basename(p)}:{i} `{key}` 属废弃域却标 `未开工`（应为 `已废弃`）')
print(f'A3 废弃域 `PRD-` 行误标 `未开工` = {n_bad}')

# ---- A4 形态 + 链接
for p in files:
    base = os.path.basename(p)
    raw = body(p); lines = raw.split('\n')
    lim = 200 if base == '_提纲.md' else 400
    if len(lines) - 1 > lim:
        problems.append(f'{base}: {len(lines)-1} 行 > {lim}')
    over = [i for i, l in enumerate(lines, 1) if len(l) > 800]
    if over:
        problems.append(f'{base}: 超长行 {over[:3]}')
    for i, l in enumerate(strip_fences(raw).split('\n'), 1):
        for u in re.findall(r'\]\(([^)]+)\)', l):
            if u.startswith(('http', '#')): continue
            if os.path.exists(os.path.normpath(os.path.join(DIR, u.split('#')[0]))): continue
            if re.search(r'（Stage \d|未落盘', l): continue
            bu = os.path.basename(u.split('#')[0])
            if bu in plan or bu[:2] in re.findall(r'`(\d\d)`', plan): continue
            links_miss.append(f'{base}:{i} {u}')
print(f'A4 未声明死链 = {len(links_miss)}')

for x in links_miss[:5]: print('   ✗', x)
for x in problems[:10]: print('   ✗', x)
print('VERDICT', 'FAIL' if (problems or links_miss) else 'PASS')
sys.exit(1 if (problems or links_miss) else 0)
PY
