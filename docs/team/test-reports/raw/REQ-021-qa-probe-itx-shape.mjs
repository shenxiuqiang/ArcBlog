#!/usr/bin/env node
// QA R17 follow-up: dump info.tx / row.tx to see whether itx + memo are readable.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const REPO='/Users/shenxiuqiang/workspace/ArcBlog';
const OK=new Set(['getTx','listTransactions']);const calls=[];
function guard(n){if(!OK.has(n))throw new Error('QA REFUSES '+n);calls.push(n);return n;}
for(const l of (existsSync(join(REPO,'.env.local'))?readFileSync(join(REPO,'.env.local'),'utf8').split('\n'):[])){
 const t=l.trim(); if(!t||t.startsWith('#')||!t.includes('='))continue; const i=t.indexOf('='); const k=t.slice(0,i).trim();
 if(!process.env[k])process.env[k]=t.slice(i+1).trim().replace(/^'|'$/g,'');}
const mod=await import('@ocap/client');
const client=new (mod.default??mod.GraphQLClient)(String(process.env.ARCBLOG_CHAIN_HOST??'').trim());
const W='z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a';
guard('getTx');
const r=await client.getTx({hash:'ABDBD742C055E3574261DE8FD4C1EEDBEE7DC34CC4C77AF4B50279BFAC50B70D'});
const info=r?.info??{};
const tx=info.tx??null;
const txKeys=tx?Object.keys(tx):null;
guard('listTransactions');
const l=await client.listTransactions({addressFilter:{sender:W,direction:'ONE_WAY'},paging:{size:20}});
const rows=(l?.transactions??[]);
const transferRow=rows.find(x=>x.type==='transfer_v2')||rows[rows.length-1];
console.log(JSON.stringify({
  getTx_infoTxKeys:txKeys,
  getTx_infoTx_itx:tx&&tx.itx?tx.itx:null,
  getTx_infoTx_sample:tx?JSON.stringify(tx).slice(0,2000):null,
  listRow_type:transferRow?.type, listRow_time:transferRow?.time, listRow_hash:transferRow?.hash,
  listRow_txKeys:transferRow?.tx?Object.keys(transferRow.tx):null,
  listRow_tx_itx:transferRow?.tx&&transferRow.tx.itx?transferRow.tx.itx:null,
  listRow_tx_sample:transferRow?.tx?JSON.stringify(transferRow.tx).slice(0,2000):null,
},null,2));
