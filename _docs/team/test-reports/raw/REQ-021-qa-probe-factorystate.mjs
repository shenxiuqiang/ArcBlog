#!/usr/bin/env node
// QA R17: read-only getFactoryState — confirm the recorded studio factory owner
// equals the node wallet recorded in node/factories.json (issuer).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const REPO='/Users/shenxiuqiang/workspace/ArcBlog';
for(const l of (existsSync(join(REPO,'.env.local'))?readFileSync(join(REPO,'.env.local'),'utf8').split('\n'):[])){
 const t=l.trim(); if(!t||t.startsWith('#')||!t.includes('='))continue; const i=t.indexOf('='); const k=t.slice(0,i).trim();
 if(!process.env[k])process.env[k]=t.slice(i+1).trim().replace(/^'|'$/g,'');}
const mod=await import('@ocap/client');
const c=new (mod.default??mod.GraphQLClient)(String(process.env.ARCBLOG_CHAIN_HOST??'').trim());
const r=await c.getFactoryState({address:'z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo'});
console.log(JSON.stringify({code:r?.code, address:r?.state?.address, name:r?.state?.name, owner:r?.state?.owner, numMinted:r?.state?.numMinted, settlement:r?.state?.settlement},null,2));
