#!/usr/bin/env bash
# Stage 5（开发文档）机检门 · Lead 2026-10-01
#
# 判据（每条都能红；上线前用正本跑过 + 做过变异，且变异自证生效）：
#   A0 平台边界齐：`02` 必含 `B1`–`B12`（十二项；B11 = 构建无 ignore 开关、B12 = 上传原语在但实测失败）
#   A1 **三缺口如实**（P7 的机械化）：重跑两个 grep，核**文档声称的"未接"与代码一致**
#        —— `grep -c listStakes|updateAsset|signTransferTx scripts/lib/chain.mjs` 必须为 **0**，
#           且 `02` 必须把这三点写成"本项目未接"而不是"平台支持"
#   A2 探针齐：`07` 必含 `P-1`–`P-4`
#   A3 无活着的残留：hub / 经济族出现时须带删除/作废标记
#   A4 形态 + 链接（豁免：标 Stage N/未落盘/原始证据；或目标在 `_提纲` 列为计划文件）
#       2026-10-13 起**覆盖 `附件/*.md`**：附件是逐字证据 ⇒ 不限行数、单行上限 2000（正文 800），死链判据相同
#   A7 文档里的 `arc <组> <子命令>` 必须能被 CLI 认得（`--help` 实测；ENG-58，属交付门）
#
# 用法：bash docs/05-开发文档/_gate.sh        退出码 0=PASS，1=FAIL，2=环境异常
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import re, glob, os, sys, subprocess

DIR = 'docs/05-开发文档'
F = chr(96) * 3
files = sorted(glob.glob(DIR + '/*.md'))
if not files:
    print('ENV-ERROR: 目录为空'); sys.exit(2)
plan = open(os.path.join(DIR, '_提纲.md'), encoding='utf-8').read()

def body(p):
    return open(p, encoding='utf-8').read()

def strip_fences(t):
    return re.sub(F + '.*?' + F, '', t, flags=re.S)

problems, links_miss = [], []
b02 = os.path.join(DIR, '02-平台能力与边界.md')
b07 = os.path.join(DIR, '07-未决技术问题与探针计划.md')

# ---- A0 平台边界齐（⚠️ **范围局限，勿当 G1 的充分条件**）
#   A0 只核「`02` 里 `B1`–`B10` 十项**都在**」——它**不核**"上游 `docs/01`–`04` 里每个
#   【平台边界】都能在 `02`/`02a` 找到对应条目"（那是 **G1**，需要**语义映射**，机制化会退化成脆弱的词表匹配）。
#   事故（pm S5 R2）：A0 PASS 而 G1 字面未满足（构建/密钥门、页内上传两条上游边界当时无对应条目）
#   —— 与 Stage 4"填 `K` 行过 A4"同族。**⇒ G1 的满足必须由审查者判，不得只看 A0。**
if os.path.exists(b02):
    t02 = strip_fences(body(b02))
    # **收紧（2026-10-01 变异实测）**：原写法查"`B{i}` 是否出现在任何地方" ⇒ 别处的交叉引用
    #   会让它**假绿**（把 `**B12**` 去粗体后仍 PASS）。现改为**必须出现在表格的 ID 列**——
    #   与 A2 同一手法（判据要认"定义位"，不是"被提及"）。
    BID = re.compile(r'^B\d{1,2}$')
    b_in_col = set()
    for l in t02.split('\n'):
        if not l.lstrip().startswith('|'):
            continue
        for cell in l.strip().strip('|').split('|'):
            c = cell.strip().strip('`*~').strip()
            if BID.match(c):
                b_in_col.add(c)
                break
    miss = [f'B{i}' for i in range(1, 13) if f'B{i}' not in b_in_col]
    print(f'A0 平台边界: 齐 {12 - len(miss)}/12（**ID 列**口径；不核上游→`02` 的映射 = G1）' + (f' ｜ 缺 {miss}' if miss else ''))
    if miss:
        problems.append(f'`02` 平台边界未在表中定义，缺: {miss}')
else:
    problems.append('`02-平台能力与边界.md` 缺失')

# ---- A1 三缺口如实（**真的重跑 grep**）
CHAIN = 'scripts/lib/chain.mjs'
src = open(CHAIN, encoding='utf-8').read() if os.path.exists(CHAIN) else ''
counts = {k: len(re.findall(k, src)) for k in ('listStakes', 'updateAsset', 'signTransferTx')}
print(f'A1 三缺口复核（重跑 grep）: ' + ' ｜ '.join(f'{k}={v}' for k, v in counts.items()) + f'（源 = {CHAIN}）')
not_wired = [k for k, v in counts.items() if v == 0]
if len(not_wired) == 3:
    if os.path.exists(b02):
        t02 = body(b02)
        # 文档必须把这三点放在"本项目未接"的语境里（口径 P7），而不是"平台支持"
        if not re.search(r'三处代码缺口|本项目未接|未接', t02):
            problems.append('`02` 未把三缺口写成"本项目未接"（P7）')
        for k in ('listStakes', 'updateAsset', 'signTransferTx'):
            if k not in t02:
                problems.append(f'`02` 未提及缺口 `{k}`')
    else:
        problems.append('缺 `02`，无法核 A1')
else:
    # 代码**已经接上**了 ⇒ 文档若还写"未接"就是过期断言（反向检查）
    # 修（qa S5 P2，2026-10-01）：原写法 `{k}[^\n]{0,40}未接` **有方向性**——要求标识符在前；
    # 而 `02` 实际写「**链上枚举未接**：`listStakes` …」⇒ `未接` 在前 ⇒ **正则永不命中、漂移无守卫**。
    # 现改为"**同一行内共现即算**"（与顺序无关）。
    print('   注：并非三者全为 0 ⇒ 进入**反向检查**（代码已接线而文档仍写"未接" ⇒ 应红）')
    body02 = body(b02) if os.path.exists(b02) else ''
    for k, v in counts.items():
        if v <= 0:
            continue
        hit = [l.strip()[:80] for l in body02.split('\n') if k in l and '未接' in l]
        if hit:
            problems.append(f'`{k}` 在代码里已有 {v} 处调用，但 `02` 同行仍写"未接" ⇒ 文档过期: {hit[0]}')

# ---- A2 探针齐（**收紧**：必须在**表格的 ID 列**里出现，不能只在正文被提及）
IDONLY = re.compile(r'^(P-[1-4]|U\d+)$')
def table_ids(path):
    got = set()
    for l in strip_fences(body(path)).split('\n'):
        if not l.lstrip().startswith('|'):
            continue
        for cell in l.strip().strip('|').split('|'):
            c = cell.strip().strip('`*~').strip()
            if IDONLY.match(c):
                got.add(c)
                break
    return got

if os.path.exists(b07):
    got = table_ids(b07)
    miss = [f'P-{i}' for i in range(1, 5) if f'P-{i}' not in got]
    print(f'A2 链上探针（**ID 列**口径）: 齐 {4 - len(miss)}/4 ｜ 表中探针 {sorted(got)}' + (f' ｜ 缺 {miss}' if miss else ''))
    if miss:
        problems.append(f'`07` 探针未在表中定义，缺: {miss}')
else:
    problems.append('`07-未决技术问题与探针计划.md` 缺失')

# ---- A3 残留（hub/经济族须带删除标记）
MARK = '删|已删|作废|不再|不设替代|不保留|退出|移除|无 hub|不再是|回退|失效|残留|债务|待删|待改|遗留|废弃|过期|未完成|未迁移|待迁移|物证'
# ⚠️ 已知局限（P13 同族）：A3 是**词表驱动**的，词表永远可能落后于作者的措辞。
#    因此 A3 报红**不等于**文档有缺陷——必须**逐行读上下文**再判（本门已在正本上反复出现这类假红）。
#    A3 的真正价值是**逼人去看每一处 hub/经济族的提及**；最终判定仍需审查者。
RESID = re.compile(r'\b(hub|orders|policy|access|ledger|store)\b', re.I)
n_res = 0
for p in files:
    for i, l in enumerate(strip_fences(body(p)).split('\n'), 1):
        for w in RESID.findall(l):
            if not re.search(MARK, l):
                n_res += 1
                if n_res <= 5:
                    problems.append(f'{os.path.basename(p)}:{i} `{w}` 出现但同行无删除标记')
print(f'A3 残留未标注 = {n_res}')

# ---- A4 形态 + 链接
#   `附件/` 2026-10-13 纳入：它此前完全不在门里（`files` 只 glob 顶层 `*.md`），而它是本卷最大的
#   文件、也是台账 `平台边界` 行引用的证据源。附件是**逐字证据**，所以口径不同：不限行数、
#   单行上限放宽到 2000（正文 800）；死链判据相同。
annex = sorted(glob.glob(os.path.join(DIR, '附件', '*.md')))
for p in files + annex:
    is_annex = p in annex
    base = ('附件/' + os.path.basename(p)) if is_annex else os.path.basename(p)
    raw = body(p)
    lines = raw.split('\n')
    lim = 200 if base == '_提纲.md' else (0 if is_annex else 400)
    if lim and len(lines) - 1 > lim:
        problems.append(f'{base}: {len(lines)-1} 行 > {lim}')
    over = [i for i, l in enumerate(lines, 1) if len(l) > (2000 if is_annex else 800)]
    if over:
        problems.append(f'{base}: 超长行 {over[:3]}')
    for i, l in enumerate(strip_fences(raw).split('\n'), 1):
        for u in re.findall(r'\]\(([^)]+)\)', l):
            if u.startswith(('http', '#')):
                continue
            if os.path.exists(os.path.normpath(os.path.join(os.path.dirname(p), u.split('#')[0]))):
                continue
            if re.search(r'（Stage \d|未落盘|原始证据', l):
                continue
            base_u = os.path.basename(u.split('#')[0])
            if base_u in plan or base_u[:2] in re.findall(r'`(\d\d)`', plan):
                continue
            links_miss.append(f'{base}:{i} {u}')
print(f'A4 未声明死链 = {len(links_miss)}')

for x in links_miss[:5]:
    print('   ✗', x)

# A7 文档里的 `arc …` 命令必须真的存在（ENG-58）。放在交付门而不是快层：实测 ~4.8 s（14 条 `--help`）。
r = subprocess.run(['node', 'scripts/arcblog-doc-arc-commands.mjs'], capture_output=True, text=True)
print((r.stdout or r.stderr).strip())
if r.returncode != 0:
    problems.append('A7 文档里的 arc 命令核验失败（见上）')

for x in problems[:10]:
    print('   ✗', x)
print('VERDICT', 'FAIL' if (problems or links_miss) else 'PASS')
sys.exit(1 if (problems or links_miss) else 0)
PY
