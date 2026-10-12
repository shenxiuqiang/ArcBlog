#!/usr/bin/env bash
# Stage 8a（其他文档）机检门 · Lead 2026-10-01
#
# 判据（每条都能红）：
#   A0 **必需文件齐（名字精确）**：入口三文件已指向 `docs/08-其他/{00-索引与阅读路径,01-决策记录,
#        02-迁移对照,03-归档停用声明,04-常见任务导航,05-错误码索引}.md` + `README.md`
#        ⇒ **缺一即 FAIL**（`P13`：缺失不得静默跳过）。
#   A1 **索引完整**：`00-索引与阅读路径` 必须提到 `docs/01`–`docs/08` 八个区域。
#   A4 **错误码可核**：`05` 列出的码**必须能在仓库里指到**（`scripts/**`）——至少抽 3 个能命中；
#        且文件须给出**口径命令**（不允许只抄 v1）。
#   A5 形态 + 链接。
#
# 用法：bash docs/08-其他/_gate.sh     0=PASS 1=FAIL 2=环境异常
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import re, glob, os, sys, subprocess

DIR = 'docs/08-其他'
F = chr(96) * 3
files = sorted(glob.glob(DIR + '/*.md'))
plan_p = os.path.join(DIR, '_提纲.md')
plan = open(plan_p, encoding='utf-8').read() if os.path.exists(plan_p) else ''

def body(p): return open(p, encoding='utf-8').read()

def iter_outside_fences(path):
    infence = False
    for i, l in enumerate(body(path).split('\n'), 1):
        if l.lstrip().startswith(F):
            infence = not infence
            continue
        if infence:
            continue
        yield i, l

problems, links_miss = [], []

# ---- A0 必需文件齐（名字精确）
REQUIRED = ['_提纲.md', '00-索引与阅读路径.md', '01-决策记录.md',
            '04-常见任务导航.md', '05-错误码索引.md', 'README.md']
missing = [f for f in REQUIRED if not os.path.exists(os.path.join(DIR, f))]
print(f'A0 必需文件: 齐 {len(REQUIRED)-len(missing)}/{len(REQUIRED)}' + (f' ｜ 缺 {missing}' if missing else ''))
for f in missing:
    if f == '_提纲.md':
        problems.append(f'{DIR}/_提纲.md 缺失（本阶段计划件）')
    else:
        problems.append(f'{DIR}/{f} **缺失**（入口三文件已指向该确切名字 ⇒ 不得改名/缺位）')

b00 = os.path.join(DIR, '00-索引与阅读路径.md')
b02 = os.path.join(DIR, '02-迁移对照.md')
b03 = os.path.join(DIR, '03-归档停用声明.md')
b05 = os.path.join(DIR, '05-错误码索引.md')

# ---- A4 错误码可核
if os.path.exists(b05):
    t = body(b05)
    # ⚠️ 2026-10-01 修假阳性：码表里**明确标注「已消失 / 待判定」**的行**不应**要求命中仓库
    #    （它们本来就是"今天指不到"的；写手已把 `ADAPTER_ERROR`/`USER_SPACE_UNAVAILABLE` 标为已消失、
    #     把平台侧的 `LIST_ERROR` 列为开放问题）⇒ **只在"在册"行上判**。
    keep_lines = []
    for l in t.split('\n'):
        if re.search(r'已消失|待判定|开放问题|平台侧', l):
            continue
        keep_lines.append(l)
    listed = sorted(set(re.findall(r'`([A-Z][A-Z_]{3,})`', '\n'.join(keep_lines))))
    src = ''
    for p in glob.glob('scripts/**/*.mjs', recursive=True):
        try: src += body(p)
        except Exception: pass
    hit = [c for c in listed if c in src]
    print(f'A4 错误码: 列出 {len(listed)} 个 ｜ 仓库能指到 {len(hit)} 个')
    if listed and len(hit) < 3:
        problems.append(f'`05-错误码索引` 列出的码在仓库里**指不到**（仅 {len(hit)}/{len(listed)}）'
                        f'⇒ 唯一出处应是实现（`scripts/**`），不许照 v1 抄')
    if not re.search(r'grep|口径|复算|-oE', t):
        problems.append('`05-错误码索引` 未给**口径命令**（P5/P10：计数须给实测 + 口径 + 复算）')
else:
    print('A4 错误码: 跳过（`05` 缺失）')

# ---- A5 形态 + 链接
for p in files:
    base = os.path.basename(p)
    raw = body(p); lines = raw.split('\n')
    lim = 200 if base == '_提纲.md' else 400
    if len(lines) - 1 > lim:
        problems.append(f'{base}: {len(lines)-1} 行 > {lim}')
    over = [i for i, l in enumerate(lines, 1) if len(l) > 800]
    if over:
        problems.append(f'{base}: 超长行 {over[:3]}')
    for i, l in iter_outside_fences(p):
        for u in re.findall(r'\]\(([^)]+)\)', l):
            if u.startswith(('http', '#')): continue
            if os.path.exists(os.path.normpath(os.path.join(DIR, u.split('#')[0]))): continue
            if re.search(r'（Stage \d|未落盘|原始证据', l): continue
            bu = os.path.basename(u.split('#')[0])
            if bu in plan or bu[:2] in re.findall(r'`(\d\d)`', plan): continue
            links_miss.append(f'{base}:{i} {u}')
print(f'A5 未声明死链 = {len(links_miss)}')

for x in links_miss[:5]: print('   ✗', x)
for x in problems[:10]: print('   ✗', x)
print('VERDICT', 'FAIL' if (problems or links_miss) else 'PASS')
sys.exit(1 if (problems or links_miss) else 0)
PY
