#!/usr/bin/env bash
# Stage 2 计数检查器（Lead 2026-10-01）
#
# 为什么存在：`00 §6` 的计数曾三度漂移——
#   ① 最初写"预期 38–42 条"（预期必过期）；
#   ② 更正为 55 后，同一轮修订把 `PRD-AGT-12` 拆成 12+13 ⇒ 实际 56；
#   ③ 不同口径（"需求总表行" vs "全文提及"）会得出 55 / 56 / 57 三个数。
# ⇒ 结论：**凡写死的数字，就该能被命令重新验证**。本脚本是 `00 §6` 的复核来源。
#
# 用法：bash docs/02-产品需求/_count.sh
# 退出码：0 = 成功（只报告，不判对错）；2 = 环境异常
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import re, glob, os, collections, sys

DIR = 'docs/02-产品需求'
files = sorted(glob.glob(DIR + '/0[1-9]-*.md'))
if not files:
    print('ENV-ERROR: 未找到领域篇'); sys.exit(2)

# 口径 A（权威）：只数「需求总表」行 —— 这是 `00 §6` 用的口径
per = collections.Counter(); rows = 0; dups = []
# 口径 B（参考）：全文提及的唯一编号 —— 会把探针表/索引表里引用的其它编号算进来
loose = collections.Counter()
for p in files:
    sec = ''
    for l in open(p, encoding='utf-8'):
        if l.startswith('## '):
            sec = l.strip()
        for m in re.finditer(r'`(PRD-([A-Z]+)-\d{2})`', l):
            loose[m.group(1)] += 1
        if re.match(r'^\|\s*`PRD-', l) and '需求总表' in sec:
            m = re.search(r'`(PRD-([A-Z]+)-\d{2})`', l)
            if m:
                rows += 1
                per[m.group(1)] += 1

dups = [k for k, v in per.items() if v > 1]
byDomain = collections.Counter()
for k in per:
    byDomain[k.split('-')[1]] += 1

print('口径A（权威 = 需求总表行）')
print(f'  逐域: {dict(sorted(byDomain.items()))}')
print(f'  合计 = {rows} 条 ｜ 唯一编号 = {len(per)} ｜ 重复编号 = {dups or "无"}')
print(f'口径B（参考 = 全文 `PRD-` 唯一提及）= {len(loose)} 个')
print(f'  两者之差 = {len(loose) - len(per)}（通常 = 探针/索引表里引用的其它编号）')
print('提示: `00 §6` 的计数必须与本脚本的「口径A 合计」一致；不一致以本脚本为准。')
PY
