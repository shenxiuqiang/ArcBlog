#!/usr/bin/env bash
# Stage 4（UI 设计规范）机检门 · Lead 2026-10-01
#
# 判据（每条都能红；上线前用正本跑过 + 做过变异，且变异自证生效）：
#   A0 条款 ID 唯一：全目录 `**ID**` 不得跨篇重复（同一条款只能定义一次）
#   A1 无残留：hub / 经济族（orders|policy|access|ledger|store）出现时须带删除标记
#   A2 BD 完整性：BD-01 … BD-08 八条平台边界条款必须齐
#   A3 形态：行数 / 行长 / 链接（豁免"已声明前向引用"）
#
# 用法：bash docs/04-UI设计规范/_gate.sh        退出码 0=PASS，1=FAIL，2=环境异常
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import re, glob, os, sys, collections

DIR = 'docs/04-UI设计规范'
F = chr(96) * 3                        # 三反引号（不在本文写字面量，避免自截断）
MARK = '删|已删|作废|不再|不设替代|不保留|禁止|不得|不说|无此|退出'
RESIDUAL = re.compile(r'\b(hub|orders|policy|access|ledger|store)\b', re.I)

files = sorted(glob.glob(DIR + '/*.md'))
if not files:
    print('ENV-ERROR: 目录为空'); sys.exit(2)
plan = open(os.path.join(DIR, '_提纲.md'), encoding='utf-8').read() if os.path.exists(os.path.join(DIR, '_提纲.md')) else ''

def strip_fences(t):
    return re.sub(F + '.*?' + F, '', t, flags=re.S)

ids = collections.defaultdict(list)
problems, links_miss = [], []

for p in files:
    base = os.path.basename(p)
    raw = open(p, encoding='utf-8').read()
    lines = raw.split('\n')
    body = strip_fences(raw)

    # A0 条款 ID（去掉围栏后统计，避免把示例/脚本里的 ID 当定义）
    for m in re.finditer(r'\*\*((?:BD-)?[A-Z]{1,3}-?\d{1,2})\*\*', body):
        ids[m.group(1)].append(base)

    # A1 残留：逐行看是否带删除标记
    for i, l in enumerate(body.split('\n'), 1):
        for w in RESIDUAL.findall(l):
            if not re.search(MARK, l):
                problems.append(f'{base}:{i} `{w}` 出现但同行无删除标记')

    # A3a 行长
    for i, l in enumerate(lines, 1):
        if len(l) > 800:
            problems.append(f'{base}:{i} 行长 {len(l)} > 800')

    # A3b 链接（豁免：标 Stage N/未落盘/原始证据；或目标在本目录 _提纲 里列为计划文件）
    for i, l in enumerate(body.split('\n'), 1):
        for u in re.findall(r'\]\(([^)]+)\)', l):
            if u.startswith(('http', '#')):
                continue
            if os.path.exists(os.path.normpath(os.path.join(DIR, u.split('#')[0]))):
                continue
            if re.search(r'（Stage \d|未落盘|原始证据', l):
                continue
            if os.path.basename(u.split('#')[0]) in plan:
                continue
            links_miss.append(f'{base}:{i} {u}')

# A0 判定（**跨篇**重复 = FAIL；**同表**重复 = FAIL；**同篇跨表**复述 = INFO）
#   理由（2026-10-01 两次补维）：
#   ① 跨篇同 ID 指不同条款 = 无法对账 ⇒ FAIL；
#   ② **同一张表**内同 ID 占两行 = 重复行、判定式可能互相矛盾 ⇒ FAIL；
#   ③ 「定义表 + 现状盘查表」分属**两张表** ⇒ 合法复述，只报 INFO。
cross = {k: v for k, v in ids.items() if len(set(v)) > 1}
same = {k: v for k, v in ids.items() if len(set(v)) == 1 and len(v) > 1}
for k, v in cross.items():
    problems.append(f'条款 ID `{k}` **跨篇**重复（可能指不同条款）: {sorted(set(v))}')

# A0′ **同表**重复（比"同篇"更精确）：**在"同一张表内"**同一 ID 出现 ≥2 次 ⇒ FAIL
#   注意：出现在**多张不同表**里属合法复述（定义表 + 盘查/追溯表），**不算**。
tbl_count = collections.Counter()            # (file, 表序号, id) -> 次数（**只数 ID 列**）
IDONLY = re.compile(r'^(?:BD-)?[A-Z]{1,3}-?\d{1,2}$')
for p in files:
    base = os.path.basename(p)
    idx, in_tbl = 0, False
    for l in strip_fences(open(p, encoding='utf-8').read()).split('\n'):
        is_row = l.lstrip().startswith('|')
        if is_row and not in_tbl:
            idx += 1
        in_tbl = is_row
        if not is_row:
            continue
        # 只认「ID 列」= 行内第一个**去掉 markup 后恰为 ID** 的单元格；
        # 后续单元格里对同表其它 ID 的**交叉引用**不算重复行。
        rid = None
        for cell in l.strip().strip('|').split('|'):
            c = cell.strip().strip('`*~').strip()
            if IDONLY.match(c):
                rid = c
                break
        if rid:
            tbl_count[(base, idx, rid)] += 1
for (base, idx, cid), n in tbl_count.items():
    if n > 1:
        problems.append(f'{base}: 条款 `{cid}` 在**同一张表（第 {idx} 张）的 ID 列**出现 {n} 次 ⇒ 重复行')

if same:
    print(f'A0 同篇跨表复述（INFO，非失败）: {len(same)} 个 → {sorted(same)[:8]}')

# A2 判定
missing_bd = [f'BD-{i:02d}' for i in range(1, 9) if f'BD-{i:02d}' not in ids]

# A4 完整性：`07` 的条款总表必须覆盖 `00/01/02/03/06` 里定义的全部条款 ID
#    （`_提纲` 的 B1–B8 是 Stage 3 的引用，不计；`07` 自身的表就是被检对象）
#    **排除 `OQ-*`**：那是"开放问题登记"（Lead 2026-10-01 裁决，pm R5）——
#    开放问题**不是条款**，不得为提高 A4 覆盖率而收进条款总表。
OWNERS = [p for p in files if os.path.basename(p) not in ('_提纲.md', '07-验收清单与机检.md')]
IDRE = r'\*\*((?:BD-|OQ-?)?[A-Z]{1,3}-?\d{1,2})\*\*'
declared = set()
for p in OWNERS:
    declared |= set(re.findall(IDRE, strip_fences(open(p, encoding='utf-8').read())))
declared = {x for x in declared if not x.startswith('OQ')}
ledger_p = os.path.join(DIR, '07-验收清单与机检.md')
covered = set()
if os.path.exists(ledger_p):
    covered = set(re.findall(r'`((?:BD-)?[A-Z]{1,3}-?\d{1,2})`', open(ledger_p, encoding='utf-8').read()))
covered = {x for x in covered if not x.startswith('OQ')}
uncovered = sorted(declared - covered)
print(f'A4 条款完整性: 各篇定义 {len(declared)} 个 ｜ 总表覆盖 {len(declared & covered)} ｜ 未覆盖 {len(uncovered)}')
if uncovered:
    problems.append(f'`07` 条款总表未覆盖: {uncovered[:10]}')

print(f'A0 条款 ID: 唯一 {len(ids)} 个 ｜ **跨篇**重复 {len(cross)}')
print(f'A2 BD 平台边界条款: 齐 {8 - len(missing_bd)}/8' + (f' ｜ 缺 {missing_bd}' if missing_bd else ''))
print(f'A1 残留未标注 = {sum(1 for x in problems if "无删除标记" in x)} ｜ A3 未声明死链 = {len(links_miss)}')

# A5 内联检查器**必须真的能跑**（P11 的前置）：抽 `07 §3` 的 python 块并执行，要求 rc = 0。
#    动机：`07 §3` 曾贴出**旧版本的崩溃输出**（Traceback + rc=1）而无人察觉；
#    "文档里的检查器跑不起来"与"它不红"是两级失效，前者更该被机检拦住。
import subprocess, tempfile
ledger_src = open(ledger_p, encoding='utf-8').read() if os.path.exists(ledger_p) else ''
if os.environ.get('ARCBLOG_GATE_NESTED'):
    # 嵌套守卫（2026-10-01 实测踩坑）：`07 §3` 的内联脚本会**回调本门**（`bash _gate.sh`），
    # 而本门的 A5 又去执行它 ⇒ **无限递归**（门曾挂死 60s+）。
    # 内层直接跳过 A5：A5 的正确性由**外层**这一次负责。
    print('A5 内联检查器可运行: 跳过（嵌套调用，避免 门↔内联脚本 互调成环）')
else:
    blk = None
    for b in re.findall(F + r'[a-z]*\n(.*?)\n' + F, ledger_src, re.S):
        if 'VERDICT' in b and ('import ' in b or 'python3' in b):
            blk = b
            break
    if blk:
        body = re.sub(r"^\s*python3 - <<'?[A-Za-z]+'?\s*$", '', blk, flags=re.M)
        body = re.sub(r'^\s*[A-Z]{2}\s*$', '', body, flags=re.M)
        with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False, encoding='utf-8') as tf:
            tf.write(body + '\n')
            tmp = tf.name
        env2 = dict(os.environ); env2['ARCBLOG_GATE_NESTED'] = '1'
        try:
            r = subprocess.run(['python3', tmp], capture_output=True, text=True, timeout=25, env=env2)
            rc, err = r.returncode, (r.stderr or '')
        except subprocess.TimeoutExpired:
            rc, err = 'TIMEOUT', '超过 25s 未结束（脚本可能互调成环或阻塞）'
        os.unlink(tmp)
        ok = (rc == 0)
        print(f'A5 内联检查器可运行: rc={rc}' + ('' if ok else ' ⇒ 崩溃/超时/失败'))
        if not ok:
            tail = err.strip().split('\n')[-1] if err.strip() else ''
            problems.append(f'`07 §3` 内联检查器 rc={rc}（不可作为门呈现）{("：" + tail) if tail else ""}')
    else:
        # ⚠️ "找不到" 必须红，不能跳过：本阶段要求 `07` 提供**可运行**的内联检查器，
        #    若脚本块缺失（或被杀掉），A5 的"跳过"就是一条**假绿通道**（2026-10-01 实测发生）。
        print('A5 内联检查器可运行: 未找到含 VERDICT 的脚本块 ⇒ FAIL（本篇应提供可运行检查器）')
        problems.append('`07 §3` 内联检查器**缺失**（找不到含 VERDICT 的脚本块）⇒ 不得以"跳过"放行')

if missing_bd:
    problems.append(f'BD 条款不齐，缺: {missing_bd}')
for x in problems[:10]:
    print('   ✗', x)
for x in links_miss[:5]:
    print('   ✗', x)
print('VERDICT', 'FAIL' if (problems or links_miss) else 'PASS')
sys.exit(1 if (problems or links_miss) else 0)
PY
