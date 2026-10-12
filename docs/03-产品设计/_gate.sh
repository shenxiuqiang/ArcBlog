#!/usr/bin/env bash
# Stage 3（产品设计）机检门 · Lead 2026-10-01
#
# 判据（每条都能红；上线前用正本跑过 + 做过变异）：
#   A0 页面 id 合法：增删表第一列 id 必须 ∈ 已知 21 个 ?page= + 允许新增的 id
#   A1 该删的必须删：hub / orders / policy / access / ledger 五行处置必须 = 删
#   A2 新增/改 必须可追溯：依据列非空且含 `PRD-` 或 `概念`
#   A3 计数自洽：正文"留 + 新增 = N；删 = M"必须等于表内实测行数
#   A4 形态：链接（豁免已声明前向引用）/ 行数
#   A5 G1 落点覆盖：Stage 2 的 56 条 PRD- 必须都被本阶段提及
#      ⚠️ 局限（勿当充分条件）：A5 只查"**提及**"，不查"**落点列是否非空**"、
#      也不查"写『非界面项』的有没有给理由"。⇒ 充分条件仍需**审查者**判。
#      若日后落点总账的列格式稳定，再收紧为"必须出现在带落点列的表格行里"。
#
# 用法：bash docs/03-产品设计/_gate.sh       退出码 0=PASS，1=FAIL，2=环境异常
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import re, glob, os, sys

DIR = 'docs/03-产品设计'
# 实测自 `node -e` 读 scripts/console-nav.mjs 的 CONSOLE_SECTIONS（2026-10-01）
KNOWN = set('dashboard posts pages compose heroes categories tags seo feeds appearance '
            'operations hub media agents orders policy access ledger factory general diagnostics'.split())
MUST_DELETE = {'hub', 'orders', 'policy', 'access', 'ledger'}

files = sorted(glob.glob(DIR + '/*.md'))
if not files:
    print('ENV-ERROR: 目录为空'); sys.exit(2)

problems = []
table_rows = []          # (file, id, 处置, 依据)
links_miss = []

def strip_fences(t):
    F = chr(96) * 3
    return re.sub(F + '.*?' + F, '', t, flags=re.S)

def unmark(s):
    """去掉 markdown 强调/代码/删除线包装，便于按单元格判读。"""
    s = s.strip()
    s = re.sub(r'^\*{1,2}|\*{1,2}$', '', s)
    s = re.sub(r'^~~|~~$', '', s)
    return s.strip('`').strip()

for p in files:
    raw = open(p, encoding='utf-8').read()
    lines = raw.split('\n')
    body = strip_fences(raw)

    # A4a 链接（豁免"已声明前向引用"：该行含链接且标了 Stage N / 未落盘 / 原始证据）
    for i, l in enumerate(body.split('\n'), 1):
        for u in re.findall(r'\]\(([^)]+)\)', l):
            if u.startswith(('http', '#')):
                continue
            if os.path.exists(os.path.normpath(os.path.join(DIR, u.split('#')[0]))):
                continue
            if re.search(r'（Stage \d|未落盘|原始证据', l):
                continue
            links_miss.append(f'{os.path.basename(p)}:{i} {u}')

    # A4b 行长
    for i, l in enumerate(lines, 1):
        if len(l) > 800:
            problems.append(f'{os.path.basename(p)}:{i} 行长 {len(l)} > 800')

    # 增删表行：| `id` | 处置 | 理由 | 依据 |
    for l in lines:
        if not l.lstrip().startswith('|'):
            continue
        cells = [unmark(c) for c in l.strip().strip('|').split('|')]
        if len(cells) < 3:
            continue
        pid_raw, act = cells[0], cells[1]
        act = act.replace('*', '').strip()
        # 处置允许带限定，如「留（收窄）」「新增（.aup/pages/...）」⇒ 取首个关键字
        m_act = re.match(r'(留|删|新增|改)', act)
        if not m_act:
            continue
        act = m_act.group(1)
        pid = re.sub(r'^\??page=', '', pid_raw).strip('`').strip()
        if not re.fullmatch(r'[a-z][a-z0-9-]*', pid):
            continue                      # 表头/族名等非页面行
        why = cells[2] if len(cells) > 2 else ''
        basis = cells[3] if len(cells) > 3 else ''
        table_rows.append((os.path.basename(p), pid, act, why, basis))
        if pid not in KNOWN and act != '新增':
            problems.append(f'{os.path.basename(p)}: 未知页面 id `{pid}` 且未标「新增」（不在实测的 21 个 ?page= 内）')
        if pid in MUST_DELETE and act != '删':
            problems.append(f'{os.path.basename(p)}: `{pid}` 应删却写「{act}」')
        if act in ('新增', '改') and not re.search(r'PRD-|概念', basis + why):
            problems.append(f'{os.path.basename(p)}: `{pid}`（{act}）依据列缺 `PRD-` 或 `概念` ⇒ 不可追溯')

# A3 计数自洽：找"留 + 新增 = N"与"删 = M"的判据行
count_checks = []
for p in files:
    for l in open(p, encoding='utf-8'):
        m1 = re.search(r'留\s*[+＋]\s*新增\s*=\s*\*{0,2}(\d+)', l)
        m2 = re.search(r'删\s*=\s*\*{0,2}(\d+)', l)
        if m1 and m2 and ('判据' in l or '行数' in l):
            count_checks.append((os.path.basename(p), int(m1.group(1)), int(m2.group(1))))

if table_rows:
    keep = sum(1 for r in table_rows if r[2] in ('留', '新增'))
    gone = sum(1 for r in table_rows if r[2] == '删')
    print(f'增删表实测: 行数 = {len(table_rows)} ｜ 留+新增 = {keep} ｜ 删 = {gone}')
    for src, claim_keep, claim_gone in count_checks:
        if claim_keep != keep or claim_gone != gone:
            problems.append(f'{src}: 判据声称 留+新增={claim_keep}/删={claim_gone}，实测 {keep}/{gone}')
    missing = MUST_DELETE - {r[1] for r in table_rows if r[2] == '删'}
    if missing:
        problems.append(f'必须删的页面未在表中标为「删」: {sorted(missing)}')
else:
    print('增删表: 未解析到行（本阶段文件可能尚未落盘）')

# A5 G1 落点覆盖：Stage 2 的每条 PRD- 必须在本阶段被提及或声明为「非界面项」
#    口径 = 需求总表行（与 docs/02-产品需求/_count.sh 的口径A 一致）
s2 = sorted(glob.glob('docs/02-产品需求/0[1-9]-*.md'))
need = set()
for p in s2:
    sec = ''
    for l in open(p, encoding='utf-8'):
        if l.startswith('## '):
            sec = l.strip()
        if re.match(r'^\|\s*`PRD-', l) and '需求总表' in sec:
            m = re.search(r'`(PRD-[A-Z]+-\d{2})`', l)
            if m:
                need.add(m.group(1))
have = set()
for p in files:
    have |= set(re.findall(r'PRD-[A-Z]+-\d{2}', open(p, encoding='utf-8').read()))
missing = sorted(need - have)
print(f'A5 落点覆盖: 需求 {len(need)} 条 ｜ 本阶段提及 {len(need & have)} ｜ 未提及 {len(missing)}')
if missing:
    problems.append(f'G1 落点覆盖不足：{len(missing)} 条 PRD- 既无落点也未声明"非界面项" ⇒ {missing[:8]}…')

# A5′ 强判据（qa P3 建议，Lead 2026-10-01 机制化）：
#   `04 §6` 落点总账里，每条 PRD- 行的「落点」格必须非空；
#   写「非界面项」的行必须同时给**理由**。
ledger = [p for p in files if '落点总账' in open(p, encoding='utf-8').read()]
if ledger:
    lp = ledger[0]
    rows = 0
    for l in open(lp, encoding='utf-8'):
        if not l.lstrip().startswith('|'):
            continue
        cells = [unmark(c) for c in l.strip().strip('|').split('|')]
        if len(cells) < 3 or not re.match(r'PRD-[A-Z]+-\d{2}', cells[0]):
            continue
        rows += 1
        landing = cells[1]
        if not landing:
            problems.append(f'{os.path.basename(lp)}: `{cells[0]}` 落点格为空')
        elif '非界面项' in landing and not (cells[2] if len(cells) > 2 else ''):
            problems.append(f'{os.path.basename(lp)}: `{cells[0]}` 写"非界面项"但未给理由')
    print(f"A5′ 落点总账: {os.path.basename(lp)} 共 {rows} 行 ｜ 判据 = 落点格非空 且 非界面项须给理由")
else:
    print('A5′ 落点总账: 未找到（缺"落点总账"节）')

print(f'链接未声明死链 = {len(links_miss)}')
for x in links_miss[:5]:
    print('   ✗', x)
for x in problems[:10]:
    print('   ✗', x)
print('VERDICT', 'FAIL' if (problems or links_miss) else 'PASS')
sys.exit(1 if (problems or links_miss) else 0)
PY
