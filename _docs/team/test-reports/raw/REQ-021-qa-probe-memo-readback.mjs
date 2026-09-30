#!/usr/bin/env node
// QA R17: do real transfer_v2/v3 txs carry an itx `data` (the memo slot)?
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const REPO='/Users/shenxiuqiang/workspace/ArcBlog';
const OK=new Set(['listTransactions']);const calls=[];
function guard(n){if(!OK.has(n))throw new Error('QA REFUSES '+n);calls.push(n);return n;}
for(const l of (existsSync(join(REPO,'.env.local'))?readFileSync(join(REPO,'.env.local'),'utf8').split('\n'):[])){
 const t=l.trim(); if(!t||t.startsWith('#')||!t.includes('='))continue; const i=t.indexOf('='); const k=t.slice(0,i).trim();
 if(!process.env[k])process.env[k]=t.slice(i+1).trim().replace(/^'|'$/g,'');}
const mod=await import('@ocap/client');
const client=new (mod.default??mod.GraphQLClient)(String(process.env.ARCBLOG_CHAIN_HOST??'').trim());
const out={scans:{},errors:{},calls:[]};
async function scan(label,params){
  guard('listTransactions');
  try{ const r=await client.listTransactions(params);
    out.scans[label]={page:r?.page, rows:(r?.transactions??[]).slice(0,6).map(t=>({
      hash:t.hash,type:t.type,time:t.time,
      itxKeys:t.tx?.itxJson?Object.keys(t.tx.itxJson):null,
      data:t.tx?.itxJson?.data??null,
      to:t.tx?.itxJson?.to??null,
    }))};
  }catch(e){out.errors[label]=String(e?.message??e).slice(0,300);}
}
await scan('transfer_v2_recent',{typeFilter:{types:['transfer_v2']},paging:{size:6}});
await scan('transfer_v3_recent',{typeFilter:{types:['transfer_v3']},paging:{size:6}});
await scan('transfer_exact_recent',{typeFilter:{types:['transfer']},paging:{size:6}});
out.calls=calls;
console.log(JSON.stringify(out,null,2));
