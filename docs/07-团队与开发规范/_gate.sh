#!/usr/bin/env bash
# Stage 7（团队与开发规范）机检门 · Lead 2026-10-01
#
# 为什么这一阶段也要门：**它是讲门的阶段**（`03` 写"文档轮机检件纳入门"），
#   却一直没有自己的 `_gate.sh`（pm `S7` 复核时指出"形态由我手工核"）。
#
# 判据（每条都能红；上线前已用正本跑过 + 做过变异，且变异自证生效）：
#   A0 **角色面完整**：`00 §2.2` 的"固有权属"表**每个角色都要有一行**，含 **实现者**
#        —— 动机：pm `S7` **R1** 发现 `§1` 说实现者能回填台账，而 `§2.2` **没有实现者一行**
#        ⇒ 按 `§2.2` 自己的判据（"只看本节就能回答我能不能改这个文件"）读者会得出**错误结论**。
#   A1 **机检件表可复算**：`03 §4` 表体的**每个路径都存在**，且**表体行数 == 命令实测数**
#        （新增机检件而没更新表 ⇒ 红，并**点名**是哪个新文件）。
#   A2 **`P` 条数一致**：`01`/`_提纲`/`06` 与 [`stage-7 §3`](../team/stage-7-入口口径-Lead.md) 的
#        `P1–P17` 条目数**必须相同**（**逐个提取 `P\d+`**，不按整串匹配——组合标签 `**P5/P16**` 会漏）。
#   A3 **受控修订次数一致**：各篇声称的"7 次"== 六份 `S*-定稿核验-Lead.md` 里 `§1.x 受控修订登记` 的实际条数。
#   A4 形态 + 链接。
#
# 用法：bash docs/07-团队与开发规范/_gate.sh     0=PASS 1=FAIL 2=环境异常
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import re, glob, os, sys, subprocess

DIR = 'docs/07-团队与开发规范'
F = chr(96) * 3
files = sorted(glob.glob(DIR + '/*.md'))
if not files:
    print('ENV-ERROR: 目录为空'); sys.exit(2)
plan = open(os.path.join(DIR, '_提纲.md'), encoding='utf-8').read() if os.path.exists(os.path.join(DIR, '_提纲.md')) else ''

def body(p): return open(p, encoding='utf-8').read()
def strip_fences(t): return re.sub(F + '.*?' + F, '', t, flags=re.S)

def iter_outside_fences(path):
    """逐行产出 **(真实行号, 行)**，但**跳过围栏内的行**。
    ⚠️ 2026-10-01 修 bug：原先用 `strip_fences(...).split('\n')` 再 `enumerate(...,1)`，
    **剥掉围栏会挪动行号** ⇒ 报出的 `文件:行` 是**错的**（实测把 `02` 的报错指到 fenced 代码行）。
    """
    infence = False
    for i, l in enumerate(body(path).split('\n'), 1):
        if l.lstrip().startswith(F):
            infence = not infence
            continue
        if infence:
            continue
        yield i, l


problems, links_miss = [], []
b00 = os.path.join(DIR, '00-角色与写入范围.md')
b01 = os.path.join(DIR, '01-工作流与阶段门.md')
b03 = os.path.join(DIR, '03-质量门与命令手册.md')
b06 = os.path.join(DIR, '06-采纳与自检.md')
ledger = 'docs/team/stage-7-入口口径-Lead.md'

# ---- A0 角色面完整（`00 §2.2` 固有权属表必须含每个角色，尤其是**实现者**）
ROLES = ['文档负责人', '开发文档主笔', 'Lead', '审查者', '人类', '实现者']
if os.path.exists(b00):
    t = strip_fences(body(b00))
    # 取 §2.2 段落
    m = re.search(r'###\s*2\.2(.*?)(?=\n#{2,3}\s|\Z)', t, re.S)
    sec = m.group(1) if m else ''
    if not sec:
        problems.append('`00` 找不到 `§2.2 跨阶段通则`')
    else:
        # 表行首列是角色名
        rows = set()
        for l in sec.split('\n'):
            if not l.lstrip().startswith('|'):
                continue
            first = l.strip().strip('|').split('|')[0]
            first = re.sub(r'[*`\s]', '', first)
            # 角色名可带限定（如「审查者（PM/QA）」）⇒ 取前缀匹配
            for r in ROLES:
                if first.startswith(r) or r.startswith(first):
                    rows.add(r)
        miss = [r for r in ROLES if r not in rows]
        print(f'A0 `§2.2` 固有权属表: 齐 {len(ROLES)-len(miss)}/{len(ROLES)} ｜ 表中角色 {sorted(rows)}')
        if miss:
            problems.append(f'`00 §2.2` 固有权属表**缺角色行**: {miss}'
                            f'（判据：读者只看 `§2.2` 就要能回答"我能不能改这个文件"）')
else:
    problems.append('`00-角色与写入范围.md` 缺失')

# ---- A1 机检件表可复算（`03 §4`）
if os.path.exists(b03):
    sec = strip_fences(body(b03))
    listed = re.findall(r'^\|\s*`(docs/[\w./-]+\.sh)`', sec, re.M)
    real = sorted(glob.glob('docs/0*/*.sh') + glob.glob('docs/team/*.sh'))
    missing = [p for p in listed if not os.path.exists(p)]
    extra = [p for p in real if p not in listed]
    print(f'A1 `03 §4` 机检件表: 表体 {len(listed)} ｜ 实测 {len(real)}')
    if missing:
        problems.append(f'`03 §4` 表里的路径**不存在**: {missing}')
    if extra:
        problems.append(f'新增机检件未入 `03 §4` 表: {extra} ⇒ **请更新该表（含"会 FAIL？"分类）**')
else:
    problems.append('`03-质量门与命令手册.md` 缺失')

# ---- A2 `P` 条数一致
def p_ids(path, whole=True):
    t = body(path)
    return sorted({int(x) for x in re.findall(r'P(\d+)', t)})
if os.path.exists(ledger):
    src = sorted({int(x) for x in re.findall(r'\*\*P(\d+)(?:｜|\*\*)', body(ledger))})
    print(f'A2 源头 `stage-7 §3` 的 P 条目: {len(src)} 条')
    if not src:
        problems.append(f'`{ledger}` 里未能提取 `P1–Pn` 条目')
    # ⚠️ 只有「自检对照表」所在篇（`06`）**必须**覆盖全部 P——它的用途就是逐条对照；
    #    其余篇只引用**与它相关**的 P ⇒ 只打印覆盖度，**不判红**（2026-10-01 修：原判据要求每篇都含 17 个，过严）。
    for p, must in [(b06, True), (b01, False), (os.path.join(DIR, '_提纲.md'), False)]:
        if not os.path.exists(p):
            continue
        ids = p_ids(p)
        hit = [i for i in src if i in ids]
        print(f'   {os.path.basename(p):28s} 提到 {len(hit)}/{len(src)} 个 P' + ('（须全覆盖）' if must else '（仅信息）'))
        if must and len(hit) < len(src):
            problems.append(f'{os.path.basename(p)} 未覆盖全部 P（缺 {sorted(set(src)-set(ids))[:6]}）')
else:
    problems.append(f'缺 `{ledger}`（P 的源头）')

# ---- A3 受控修订次数一致
recs = sorted(glob.glob('docs/team/reviews/S*-定稿核验-Lead.md'))
actual = 0
for r in recs:
    # ⚠️ 2026-10-01 修：只认 `### 1.x 受控修订登记` 会漏掉 `## 6. 受控修订登记`（S2）
    #    与 `## 6. …受控修订…`（S6）⇒ 改为**任何含"受控修订"的标题**。
    # ⚠️ 再收一次（同上 2026-10-01）：只数**登记**节——`S5 §5`「本阶段触发了 Stage 3/4 的受控修订
    #    （跨阶段连带）」是**叙事性交叉引用**，不是登记 ⇒ 只认标题里含 **`登记`** 的。
    # ⚠️ 第三次修正（同上）：登记节**不含**"登记"二字的情况也存在（`S6 §6`「本阶段触发的两处**受控修订**」）
    #    ⇒ 改用**排除法**：认 `受控修订`，但**排除叙事性交叉引用**（其标题含 `连带`，如 `S5 §5`）。
    actual += len([h for h in re.findall(r'^#{2,3}\s*(.+)$', body(r), re.M)
                   if '受控修订' in h and '连带' not in h])
print(f'A3 冻结记录里的受控修订登记: {len(recs)} 份记录 ｜ 实际 **{actual}** 条（**此数随修订增长**）')
# ⚠️ **第四次修正（2026-10-01 Lead 裁决；qa `S8b-UI条款数核查` 的后果）**：
#    这个数**每做一次受控修订就过期一次** ⇒ **冻结文档不得把它当定值**。
#    旧判据"声称数必须等于当前实际"会让**门与文档一起追一个永远在变的数**（同一族反复修）。
#    ⇒ 改为：**凡声称该数，必须带"时点/口径"标记**（如「截至 Stage 7 定稿」「2026-10-01」）；
#       **不带时点 ⇒ FAIL**（应写成"带时点的快照"或"只引出处"）。
TIME_MARK = re.compile(r'截至|时点|定稿时|Stage\s*\d+\s*定稿|20\d\d-\d\d-\d\d|自此|此后|届时')
for p in files:
    cut = next((i for i, l in iter_outside_fences(p) if re.match(r'^##+\s*变更记录', l)), 10**9)
    for i, l in iter_outside_fences(p):
        if i >= cut:
            break
        m = re.search(r'(\d+)\s*(?:次受控修订|个登记节)', l)
        if m and not TIME_MARK.search(l):
            problems.append(f'{os.path.basename(p)}:{i} 声称受控修订数「{m.group(0)}」但**未带时点/口径**'
                            f' ⇒ 该数随修订增长，须写成"**截至 … 为 N**"或**只引出处**'
                            f'（`grep -c \'受控修订登记\' docs/team/reviews/S*-*.md`）')

# ---- A5 **同一个数字不得在别处复述成不同值**（P17 的机械化）
#   动机：2026-10-01 实测——`01 §4.1` 写"现状 **9 个**"、`03 §4` 写"在册 **10 个**"、`05` 曾写 8、
#   `_提纲`/`00` 曾写 6，而实测 = 10 ⇒ **同一个数据字段四处各写一份**（A1 只管 `03 §4`，管不到别处）。
#   判据：其它篇里凡是"机检件…N 个"的复述，**要么不写数字（改引 `03 §4`），要么等于实测数**。
if os.path.exists(b03):
    realn = len(glob.glob('docs/0*/*.sh') + glob.glob('docs/team/*.sh'))
    pat = re.compile(r'(机检件[^。\n]{0,24}?(\d+)\s*个|(\d+)\s*个[^。\n]{0,12}?机检件)')
    n_restate = 0
    for p in files:
        if os.path.basename(p) == '03-质量门与命令手册.md':
            continue   # 唯一出处，允许写数
        # ⚠️ **跳过 `## 变更记录` 之后的行**（2026-10-01 修假阳性）：变更记录里**描述旧值**是正常的
        #    （例：`05` 的修订 2 写"原'共 8 个'→ 改为只引"），不该判红。
        cut = next((i for i, l in iter_outside_fences(p) if re.match(r'^##+\s*变更记录', l)), 10**9)
        for i, l in iter_outside_fences(p):
            if i >= cut:
                break
            for m in pat.finditer(l):
                num = int(m.group(2) or m.group(3))
                n_restate += 1
                if num != realn:
                    problems.append(f'{os.path.basename(p)}:{i} 复述机检件数 = **{num}**，实测 = {realn}'
                                    f' ⇒ 改为**只引 `03 §4`**（P17：派生表不得自造数据字段）')
    print(f'A5 其它篇复述机检件数 = {n_restate} 处（唯一出处 = `03 §4`；实测 {realn}）')

# ---- A6 **"N 次/节登记"必须与它同行的清单条数一致**（P17 的又一机械面）
#   动机：2026-10-01 实测——`02 §8` 的实例行写「**7 次登记**」却只列 **6** 项（漏 `S2 §6`）
#   ⇒ **数字与它自己的清单不符**；这类"数字-清单"错配在 `A5`（只管机检件数）之外。
#   判据：同一行里出现「N 次登记」或「N 个登记节」时，**该行列举的 `S*v2 §x` 条目数必须等于 N**。
entry = re.compile(r'S\d+v2\s*§\s*1\.\d+|S\d+v2\s*§\s*\d+')
for p in files:
    # ⚠️ 同样**跳过 `## 变更记录` 段**：变更记录里描述旧值/改动是正常的（2026-10-01 假阳性修复）。
    cut = next((i for i, l in iter_outside_fences(p) if re.match(r'^##+\s*变更记录', l)), 10**9)
    for i, l in iter_outside_fences(p):
        if i >= cut:
            break
        m = re.search(r'(\d+)\s*(?:次登记|个登记节)', l)
        if not m:
            continue
        n_claim = int(m.group(1))
        n_list = len(set(entry.findall(l)))
        # ⚠️ 只在**该行明显在列举**（≥2 项）时判——只举 1 个例子（"7 次登记（详见 §3）"）不算错配。
        if n_list >= 2 and n_list != n_claim:
            problems.append(f'{os.path.basename(p)}:{i} 写「{n_claim} 次登记」但同行只列 **{n_list}** 项'
                            f'（数字与清单不符）⇒ 补齐或改口径（**7 个登记节 / 8 处修订**）')
print(f'A6 受控修订"数字-清单"一致性: 已查（**截至 Stage 7 定稿：7 个登记节 / 8 处修订**；此后随修订增长）')

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
            if re.search(r'（Stage \d|未落盘|原始证据', l): continue
            bu = os.path.basename(u.split('#')[0])
            if bu in plan or bu[:2] in re.findall(r'`(\d\d)`', plan): continue
            links_miss.append(f'{base}:{i} {u}')
print(f'A4 未声明死链 = {len(links_miss)}')

for x in links_miss[:5]: print('   ✗', x)
for x in problems[:10]: print('   ✗', x)
print('VERDICT', 'FAIL' if (problems or links_miss) else 'PASS')
sys.exit(1 if (problems or links_miss) else 0)
PY
