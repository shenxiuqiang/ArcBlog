#!/bin/bash
# Stage 3 判据敏感性用例：抽文档里的判据块 -> 造反例副本 -> 跑块。正本必须全绿；ce1/ce2b/ce3b 必须红，ce2a/ce3a 必须绿。
set -u; cd "$(dirname "$0")/../.." || exit 1
python3 - <<'ZZ'
import re,os,shutil,subprocess
ROOT=os.getcwd()
def blocks(p):
    s=open(p,encoding='utf-8').read()
    return [b for b in re.findall(r'```(?:bash|sh)\n(.*?)```',s,re.S) if 'python3' in b]
B={k:blocks(f'docs/03-产品设计/{k}')[0] for k in ['01-控制台骨架与页面族.md','02-公开面.md','03-交互模式与状态.md','04-流程与跨页契约.md']}
run=lambda c,d: (subprocess.run(['bash','-c',c],capture_output=True,text=True,cwd=d).stdout+
                 subprocess.run(['bash','-c',c],capture_output=True,text=True,cwd=d).stderr).strip().splitlines()[-1]
for k,v in B.items(): print('正本',k[:2],run(v,ROOT))
def stage(name,mut):
    d=f'/tmp/sens3/{name}'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d+'/docs/03-产品设计')
    os.symlink(os.path.join(ROOT,'docs/02-产品需求'),d+'/docs/02-产品需求')
    for f in os.listdir('docs/03-产品设计'):
        if f.endswith('.md'): shutil.copy('docs/03-产品设计/'+f,d+'/docs/03-产品设计/'+f)
    mut(d); return d
def m1(d):
    p=d+'/docs/03-产品设计/03-交互模式与状态.md';s=open(p,encoding='utf-8').read()
    open(p,'w',encoding='utf-8').write(re.sub(r'^\| \*\*M15 [^\n]*$','| **M15 权限与能力** |  |  |  |',s,flags=re.M))
def m2a(d):
    p=d+'/docs/03-产品设计/01-控制台骨架与页面族.md';s=open(p,encoding='utf-8').read()
    open(p,'w',encoding='utf-8').write(s.replace('- **信息分级**：主=','- **信息分级**（四态见下）：主=',1))
def m2b(d):
    p=d+'/docs/03-产品设计/01-控制台骨架与页面族.md';s=open(p,encoding='utf-8').read()
    open(p,'w',encoding='utf-8').write(s.replace('；降级=—\n','；\n',1))
def m3a(d):
    p=d+'/docs/03-产品设计/04-流程与跨页契约.md';s=open(p,encoding='utf-8').read()
    open(p,'w',encoding='utf-8').write(s.replace('| M02/M11/M15 | 署名形态','| M02/M11/M15（见 /99 处说明） | 署名形态',1))
def m3b(d):
    p=d+'/docs/03-产品设计/04-流程与跨页契约.md';s=open(p,encoding='utf-8').read()
    open(p,'w',encoding='utf-8').write(s.replace('| M14 | 主题桥 |','| M14（另见 `PRD-SET-99`） | 主题桥 |',1))
for nm,mut,bk,exp in [('ce1',m1,'03-交互模式与状态.md','红'),('ce2a',m2a,'01-控制台骨架与页面族.md','绿'),
                      ('ce2b',m2b,'01-控制台骨架与页面族.md','红'),('ce3a',m3a,'04-流程与跨页契约.md','绿'),
                      ('ce3b',m3b,'04-流程与跨页契约.md','红')]:
    print(f'{nm} 期望={exp}  实际: {run(B[bk],stage(nm,mut))}')
ZZ
