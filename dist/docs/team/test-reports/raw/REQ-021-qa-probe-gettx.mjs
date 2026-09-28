#!/usr/bin/env node
// QA R17 replay of Dev's A2 claim: getTx(hash) for 4 real hashes + 1 unknown.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const REPO='/Users/shenxiuqiang/workspace/ArcBlog';
const OK=new Set(['getTx']);
const calls=[];
function guard(n){ if(!OK.has(n)) throw new Error('QA REFUSES '+n); calls.push(n); return n; }
for (const l of (existsSync(join(REPO,'.env.local'))?readFileSync(join(REPO,'.env.local'),'utf8').split('\n'):[])){
  const t=l.trim(); if(!t||t.startsWith('#')||!t.includes('='))continue; const i=t.indexOf('='); const k=t.slice(0,i).trim();
  if(!process.env[k])process.env[k]=t.slice(i+1).trim().replace(/^'|'$/g,'');
}
const mod=await import('@ocap/client');
const client=new (mod.default??mod.GraphQLClient)(String(process.env.ARCBLOG_CHAIN_HOST??'').trim());
const H=[
 ['studio.acquireTx','ABDBD742C055E3574261DE8FD4C1EEDBEE7DC34CC4C77AF4B50279BFAC50B70D'],
 ['studio.stakeTx','0C2D04987CB365BF4C0E522CF74684E109AFC40EA567402558F47B5BE0D11F46'],
 ['studio.revokeTx','E99717953CD5BD9EFE2A2B75321A26AB8796C241EEEEEF32CF919B9C8C79EA66'],
 ['studio.claimTx','631F210A219B8330C2D3A6BB273CDB53A5AF137D2FE2DA52832D1B79206C7AD0'],
 ['hub.acquireTx(0x.. mock residue from factories.json)','0xte32482c95fb67c26b0834619c44ac321b5428e'],
 ['SYNTHETIC unverified-governance-address(not a tx)','z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a'],
];
const out={probe:'QA replay of A2', getTx:{}, errors:{}, clientCallInventory:[]};
for (const [label,hash] of H){
  guard('getTx');
  try{ const r=await client.getTx({hash});
    const i=r&&r.info;
    out.getTx[label]={code:r&&r.code, infoIsNull:i===null||i===undefined,
      hash:i&&i.hash, sender:i&&i.sender, receiver:i&&i.receiver, time:i&&i.time,
      innerCode:i&&i.code, height:i&&i.height, index:i&&i.index,
      tokenSymbols:i&&i.tokenSymbols, receiptsCount:i&&i.receipts?i.receipts.length:null, receipts:i&&i.receipts};
  }catch(e){out.errors[label]=String(e?.message??e).slice(0,300);}
}
out.clientCallInventory=calls;
console.log(JSON.stringify(out,null,2));
