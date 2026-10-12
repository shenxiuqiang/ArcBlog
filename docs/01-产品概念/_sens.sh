#!/usr/bin/env bash
# Stage 1 v2 概念门 · G2（无 hub / 无经济）的**可复跑判据**
#
# 判据意图（Lead 2026-10-01 裁定，见本目录 _提纲.md §5 G2）：
#   「不得残留以 hub 或经济体系为前提的**设计**」——**不是**「这四个词永远不许出现」。
#   理由：`00-导读` 必须能说清"删掉了什么"，否则最大的变更反而写不明白；
#         而 v1→v2 的反向索引（`04 §2`）也必然要提到这些词。
#   ⇒ 可机检的代理判据 = **凡出现这四个词的行，必须同时带"删除标记"**。
#
# 用法： bash docs/01-产品概念/_sens.sh
# 退出码：0 = PASS；1 = 有未标注的残留；2 = 环境异常（文件缺失）
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import re, sys, os

WORDS = ['Hub', '分成', '账本', '付费阅读']
MARKERS = ['删除', '作废', '不含', '没有', '不再', '已删', '删掉', '整段删', '不做', '废除', '取消', '移除', '无此']
DIR = 'docs/01-产品概念'
# 正文 = 00..04；`_提纲.md` 是过程件（变更表里合法提及），不参与本门
files = sorted(f for f in os.listdir(DIR) if re.match(r'^0[0-4]-.*\.md$', f))
if not files:
    print('ENV-ERROR: 未找到任何正文（docs/01-产品概念/0X-*.md）'); sys.exit(2)

total = unmarked = 0
details = []
for f in files:
    for i, line in enumerate(open(os.path.join(DIR, f), encoding='utf-8'), 1):
        hits = [w for w in WORDS if w in line]
        if not hits:
            continue
        total += len(hits)
        if not any(m in line for m in MARKERS):
            unmarked += len(hits)
            details.append(f'  UNMARKED {f}:{i} {hits} :: {line.strip()[:90]}')

print(f'files={len(files)} ｜ 命中行词次 total={total} ｜ 未标注 unmarked={unmarked}')
for d in details[:12]:
    print(d)
print('VERDICT', 'PASS' if unmarked == 0 else 'FAIL')
sys.exit(0 if unmarked == 0 else 1)
PY
