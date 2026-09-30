#!/bin/bash
# Stage 4 判据敏感性用例（v1.0 冻结 2026-09-30：Stage 4 定稿，Lead 核验放行）（**只覆盖 C02/C04 两条**；其余条款的输出见 07 §2）。
# 正本必须绿；两个回滚副本必须红；扫描文件数不足 30 视为环境错误（防"空目录假绿"）。
set -u; cd "$(dirname "$0")/../.." || exit 1
run() {
python3 - "$1" <<'ZZ'
import re,glob,sys
root=sys.argv[1]
files=glob.glob(root+'/**/*.aup',recursive=True)
if len(files)<30: print(f'ENV-ERROR files scanned = {len(files)} (<30)'); sys.exit(2)
t={f:open(f,encoding='utf-8').read() for f in files}
c02=sum(v.count('pagination=auto') for v in t.values())
c04=sum(len(re.findall(r'state=\{value: *"\$\{',v)) for v in t.values())
print(f'files scanned = {len(files)} | C02 = {c02} | C04 = {c04}')
print('VERDICT', '红' if (c02 or c04) else '绿')
ZZ
}
echo "=== 正本（期望 绿）==="; run .aup/pages || true
rm -rf /tmp/sens4; mkdir -p /tmp/sens4; cp -R .aup/pages /tmp/sens4/pages
printf '\n  view pagination=auto { }\n' >> "$(ls /tmp/sens4/pages/*/*.aup | head -1)"
echo "=== ce-s1 注入 pagination=auto（期望 红）==="; run /tmp/sens4/pages || true
rm -rf /tmp/sens4b; mkdir -p /tmp/sens4b; cp -R .aup/pages /tmp/sens4b/pages
printf '\n  input state={value:"${state.x}"}\n' >> "$(ls /tmp/sens4b/pages/*/*.aup | head -1)"
echo "=== ce-s2 注入 state={value:\"\${（期望 红）==="; run /tmp/sens4b/pages || true
echo "=== ce-s3 空目录（期望 ENV-ERROR，不得绿）==="; mkdir -p /tmp/sens4c/empty; run /tmp/sens4c/empty || true
