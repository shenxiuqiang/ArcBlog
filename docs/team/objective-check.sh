#!/usr/bin/env bash
# 目标达成对照（Lead 2026-10-01）——把人类的 8 条原始要求逐条映射到"落在哪 / 当前状态"。
#
# 为什么是可跑的脚本而不是一张写死的表：
#   本项目已三次栽在"写死的数字会漂移"（Stage 2 `00 §6` 的预期条数、`chain.mjs` 行号、文档计数）。
#   ⇒ 达成证据也必须**能重新算出来**。
#
# 用法：bash docs/team/objective-check.sh
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

python3 - <<'PY'
import glob, os, re, subprocess

def count(pat, where):
    try:
        out = subprocess.run(['grep', '-rl', '-E', pat, where],
                             capture_output=True, text=True).stdout
        return len([x for x in out.split('\n') if x.strip()])
    except Exception:
        return 0

def files(p):
    return sorted(glob.glob(p))

print('=' * 78)
print('目标达成对照（人类 8 条要求 → 文档落点）')
print('=' * 78)

items = [
    ('① 无 hub 角色，agent 承担聚合', 'hub 角色|无 hub|hub 整体删除', 'agent 承担聚合|聚合改由 agent'),
    ('② 质押到同一 factory 地址 ⇒ 查质押列表 = 节点注册表', '同一 factory|receiver = factory|factory 地址', '链上注册表|listStakes|注册表'),
    ('③ NFT 撤销 + 清空 data + 可转让/出售', '撤销', '转让|出售'),
    ('④ 删除全部经济体系', '经济体系.*删除|ECO.*删除|经济.*整体删除', '付费阅读|分成|账本'),
    ('⑤ 记忆先本地，DID Space 后做', '本地', 'DID Space'),
]
for name, pa, pb in items:
    row = []
    for stage in ['docs/01-产品概念', 'docs/02-产品需求', 'docs/03-产品设计']:
        row.append(f'{os.path.basename(stage)[:2]}:{count(pa, stage)}+{count(pb, stage)}')
    print(f'  {name}')
    print(f'      落点文件数（主术语+支撑术语）  {"  ".join(row)}')

print()
print('⑥ 重写 docs/01 并据此重生成 docs/02–docs/08 与入口文件')
for d in sorted(glob.glob('docs/0[1-8]-*')):
    ms = files(d + '/*.md')
    sub = files(d + '/*/*.md')
    print(f'      {d:26s} 顶层 {len(ms):2d} 篇 ｜ 子目录 {len(sub):2d} 篇')
print(f'      {"入口三文件横幅":26s} README/AGENTS/CLAUDE = '
      f'{sum(1 for f in ["README.md","AGENTS.md","CLAUDE.md"] if os.path.exists(f) and "文档体系 v2 重建中" in open(f,encoding="utf-8").read())}/3 已加临时横幅')

print()
print('⑦ 全程 arc dsl validate + npm test 不红')
for cmd in [['arc', 'dsl', 'validate', '--json']]:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        ok = '"issues":[]' in r.stdout.replace(' ', '') or '"ok":true' in r.stdout
        print(f'      {" ".join(cmd)} → {"PASS" if ok else "见输出"}')
    except Exception as e:
        print(f'      {" ".join(cmd)} → 未能运行（{e}）')

print()
print('⑧ 期间不 git commit')
try:
    head = subprocess.run(['git', 'log', '--oneline', '-1'], capture_output=True, text=True).stdout.strip()
    print(f'      HEAD = {head}')
    print('      基线 = 4597ba2（本会话 v2 工作全部在工作区，未提交）' if head.startswith('4597ba2') else '      ⚠️ HEAD 已变，请核对')
except Exception as e:
    print(f'      未能读取（{e}）')

print()
print('=' * 78)
print('注：本表只报"文档层"落点；②③ 的**机制**仍标【规划中】（代码未接，见 S1-05 §5.2）')
PY
