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

print()
print('⑦ 完成判据三门（**真的跑**，不只报标题）')
def run(cmd, ok_when):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
        out = (r.stdout or '') + (r.stderr or '')
        return ('PASS' if ok_when(r.returncode, out) else 'FAIL')
    except Exception as e:
        return f'未能运行（{e}）'
print(f'      arc dsl validate --json          → {run(["arc", "dsl", "validate", "--json"], lambda rc, out: chr(34) + "issues" + chr(34) + ":[]" in out.replace(" ", "") or chr(34) + "ok" + chr(34) + ":true" in out)}')
print(f'      npm test（快层）                 → {run(["npm", "test"], lambda rc, out: rc == 0 and "fast tier passed" in out)}')
print(f'      npm run gate:docs（六卷交付门）   → {run(["npm", "run", "gate:docs", "--silent", "--", "--quiet"], lambda rc, out: rc == 0 and "6/6 volume gates PASS" in out)}')

print()
print('⑧ 台账 / 开放问题 / 工作区（完成判据的另三面）')
try:
    led = open('docs/06-功能开发列表/01-功能台账.md', encoding='utf-8').read()
    rows = re.findall(r'^\| `(PRD-[A-Z]+-\d+)` \|', led, re.M)
    states = {}
    for line in led.split('\n'):
        if re.match(r'^\| `PRD-[A-Z]+-\d+` \|', line):
            c = [re.sub(r'[*`]', '', x).strip() for x in line.split('|')]
            if len(c) > 4 and c[3]:
                key = c[3].split('（')[0].strip()
                states[key] = states.get(key, 0) + 1
    print(f'      PRD 台账：{len(rows)} 行 ｜ 六态 = ' + '，'.join(f'{k} {v}' for k, v in sorted(states.items())))
except Exception as e:
    print(f'      台账读取失败（{e}）')
try:
    first = subprocess.run(['node', 'scripts/arcblog-open-questions.mjs'], capture_output=True, text=True, timeout=120).stdout.strip().split('\n')[0]
    print(f'      {first}')
except Exception as e:
    print(f'      开放问题统计失败（{e}）')
try:
    head = subprocess.run(['git', 'log', '--oneline', '-1'], capture_output=True, text=True).stdout.strip()
    dirty = [x for x in subprocess.run(['git', 'status', '--short'], capture_output=True, text=True).stdout.strip().split('\n') if x.strip()]
    print(f'      HEAD = {head}')
    print(f'      工作区 = {"干净（无未提交的改动）" if not dirty else str(len(dirty)) + " 项未提交"}')
except Exception as e:
    print(f'      未能读取（{e}）')

print()
print('=' * 78)
print('注：本表只报"文档层"落点。② 的机制（agent 承担聚合 + 链上注册表发现）**已实现并在台账有证据**：'
      '聚合 = PRD-AGT-07/08（arcblog-summarize.mjs，含 cited[] 可追溯）；发现 = PRD-NET-03（arcblog-network.mjs registry refresh → node/registry.json，四种可达态）。'
      '（原注"仍标【规划中】"为 2026-10-01 的状态，2026-10-12 Lead 按台账更正。）')
PY
