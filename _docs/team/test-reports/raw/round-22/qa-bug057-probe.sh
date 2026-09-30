#!/usr/bin/env bash
# QA Round 22 — independent BUG-057 probe (own intent ids, own cleanup).
# Runs under docs/team/.gate-lock. Zero chain writes (AFS only).
set -u
cd /Users/shenxiuqiang/workspace/ArcBlog
AFS='arc afs exec /blocklets/arcblog/.actions'
READ() { arc afs exec /blocklets/arcblog/.actions/read --args "{\"path\":\"$1\"}" 2>&1; }
DEL()  { arc afs exec /blocklets/arcblog/.actions/delete --args "{\"path\":\"$1\"}" 2>&1 | tail -2; }
LIST() { arc afs exec /blocklets/arcblog/.actions/list --args "{\"path\":\"$1\"}" 2>&1; }
NET() { node scripts/arcblog-network.mjs "$@"; }

STAMP=$(date +%s)
ID_EMPTY="qa-r22-b57-empty-$STAMP"
ID_BAD="qa-r22-b57-baddid-$STAMP"
ID_DUP1="qa-r22-b57-dup1-$STAMP"
ID_DUP2="qa-r22-b57-dup2-$STAMP"
HUBDID="did:key:zQA22DupProbe$STAMP"

echo "### 0) registrations before"
rm -rf /tmp/qa-b57-before-rec /tmp/qa-b57-after-rec; mkdir -p /tmp/qa-b57-before-rec /tmp/qa-b57-after-rec
NET hub list --json > /tmp/qa-b57-before.json 2>&1
node -e "const j=require('/tmp/qa-b57-before.json');console.log('count',j.count,'ids',JSON.stringify(j.registrations.map(r=>r.id)))"
for p in $(node -e "const j=require('/tmp/qa-b57-before.json');for(const r of j.registrations)console.log('/instance/app/arcblog/hub/registrations/'+r.id+'.json')"); do
  READ "$p" > "/tmp/qa-b57-before-rec/$(basename $p)"
done

echo; echo "### 1) empty-DID intent -> apply -> terminal record"
NET request --action add --intent-id "$ID_EMPTY" --json > /tmp/qa-b57-req1.json 2>&1; echo "request exit=$?"
NET apply --json > /tmp/qa-b57-apply1.json 2>&1; echo "apply exit=$?"
READ "/instance/app/arcblog/config/hub-intents/$ID_EMPTY.json" > /tmp/qa-b57-term1.json
node -e "
const raw=require('fs').readFileSync('/tmp/qa-b57-term1.json','utf8');
const j=JSON.parse(raw); const c=typeof j.content==='string'?JSON.parse(j.content):j.content;
const m=c.message||''; const n=(m.match(/no data changed/g)||[]).length;
console.log(JSON.stringify({status:c.status,code:c.code,changed:c.changed,elapsedMs:c.elapsedMs,suffixCount:n,message:m},null,1));
"

echo; echo "### 2) malformed-DID intent -> apply"
NET request --action register --hub-did not-a-did --intent-id "$ID_BAD" --endpoint 'https://hub.example.com' --json > /tmp/qa-b57-req2.json 2>&1; echo "request exit=$?"
NET apply --json > /tmp/qa-b57-apply2.json 2>&1; echo "apply exit=$?"
READ "/instance/app/arcblog/config/hub-intents/$ID_BAD.json" > /tmp/qa-b57-term2.json
node -e "
const j=JSON.parse(require('fs').readFileSync('/tmp/qa-b57-term2.json','utf8')); const c=typeof j.content==='string'?JSON.parse(j.content):j.content;
const m=c.message||''; console.log(JSON.stringify({status:c.status,code:c.code,suffixCount:(m.match(/no data changed/g)||[]).length,message:m},null,1));
"

echo; echo "### 3) duplicate registration -> CONFLICT"
NET request --action register --hub-did "$HUBDID" --intent-id "$ID_DUP1" --endpoint 'https://hub.example.com' --json > /tmp/qa-b57-req3.json 2>&1
NET apply --json > /tmp/qa-b57-apply3.json 2>&1
NET request --action register --hub-did "$HUBDID" --intent-id "$ID_DUP2" --endpoint 'https://hub.example.com' --json > /tmp/qa-b57-req4.json 2>&1
NET apply --json > /tmp/qa-b57-apply4.json 2>&1
for id in "$ID_DUP1" "$ID_DUP2"; do
  READ "/instance/app/arcblog/config/hub-intents/$id.json" > "/tmp/qa-b57-dup-$id.json"
  node -e "
const j=JSON.parse(require('fs').readFileSync('/tmp/qa-b57-dup-$id.json','utf8')); const c=typeof j.content==='string'?JSON.parse(j.content):j.content;
const m=c.message||''; console.log('$id',JSON.stringify({status:c.status,code:c.code,suffixCount:(m.match(/no data changed/g)||[]).length,message:m}));
"
done

echo; echo "### 4) registrations after (byte compare with before)"
NET hub list --json > /tmp/qa-b57-after.json 2>&1
node -e "const j=require('/tmp/qa-b57-after.json');console.log('count',j.count,'ids',JSON.stringify(j.registrations.map(r=>r.id)))"
for p in $(node -e "const j=require('/tmp/qa-b57-after.json');for(const r of j.registrations)console.log('/instance/app/arcblog/hub/registrations/'+r.id+'.json')"); do
  READ "$p" > "/tmp/qa-b57-after-rec/$(basename $p)"
done
if diff -r /tmp/qa-b57-before-rec /tmp/qa-b57-after-rec; then echo "BEFORE/AFTER byte-identical: yes (diff -r empty)"; fi

echo; echo "### 5) cleanup my probes"
DEL "/instance/app/arcblog/config/hub-intents/$ID_EMPTY.json"
DEL "/instance/app/arcblog/config/hub-intents/$ID_BAD.json"
DEL "/instance/app/arcblog/config/hub-intents/$ID_DUP1.json"
DEL "/instance/app/arcblog/config/hub-intents/$ID_DUP2.json"
REGID=$(NET hub show --hub-did "$HUBDID" --json 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).registration?.id||'')}catch{console.log('')}})")
REG="/instance/app/arcblog/hub/registrations/$REGID.json"
echo "synthetic registration: $REG"
[ -n "$REGID" ] && DEL "$REG"
echo "--- probe residue check: my 4 intent ids and the synthetic DID must be gone ---"
for id in "$ID_EMPTY" "$ID_BAD" "$ID_DUP1" "$ID_DUP2"; do
  r=$(READ "/instance/app/arcblog/config/hub-intents/$id.json" | head -c 60)
  echo "$id -> $r"
done
NET hub show --hub-did "$HUBDID" --json 2>&1 | head -4
