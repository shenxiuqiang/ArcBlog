#!/usr/bin/env bash
# `docs/` 现状目录地图（Lead 2026-10-01）
#
# 用途 = **打印 `docs/` 的现状目录地图**（每目录篇数），供体量与缺目录核对。
#
# 用法：bash docs/team/doc-map.sh
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import glob, os, collections

def tree(base):
    d = collections.defaultdict(list)
    for p in sorted(glob.glob(base + '/**/*.md', recursive=True)):
        rel = os.path.relpath(p, base)
        d[os.path.dirname(rel) or '.'].append(os.path.basename(rel))
    return d

docs_tree = tree('docs')
print('=' * 78)
print('docs/ 现状目录地图')
print('=' * 78)
print(f"  {'目录':40s} {'篇数':>4s}")
for k in sorted(docs_tree):
    print(f'  {k:40s} {len(docs_tree[k]):4d}')
print()
print(f'  合计：docs/ {sum(len(v) for v in docs_tree.values())} 篇')


print()
print('  逐篇索引见 docs/08-其他/00-索引与阅读路径.md')
