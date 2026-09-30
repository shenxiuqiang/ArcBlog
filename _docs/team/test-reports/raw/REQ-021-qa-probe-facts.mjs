#!/usr/bin/env node
// QA R17: independently re-measure the four headline platform facts Dev put in
// the arc-contracts candidate list (all read-only).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const REPO='/Users/shenxiuqiang/workspace/ArcBlog';
const OK=new Set(['getChainInfo','getAccountState','getAccountTokens','getTokenState','listFactories']);
const calls=[];function guard(n){if(!OK.has(n))throw new Error('QA REFUSES '+n);calls.push(n);return n;}
for(const l of (existsSync(join(REPO,'.env.local'))?readFileSync(join(REPO,'.env.local'),'utf8').split('\n'):[])){
 const t=l.trim(); if(!t||t.startsWith('#')||!t.includes('='))continue; const i=t.indexOf('='); const k=t.slice(0,i).trim();
 if(!process.env[k])process.env[k]=t.slice(i+1).trim().replace(/^'|'$/g,'');}
const mod=await import('@ocap/client');
const client=new (mod.default??mod.GraphQLClient)(String(process.env.ARCBLOG_CHAIN_HOST??'').trim());
const W='z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a';
const TOKEN=String(process.env.ARCBLOG_CHAIN_TOKEN_ID??'').trim();
const out={errors:{},calls:[]};
const c=async(l,m,p)=>{guard(m);try{out[l]=await client[m](p);}catch(e){out.errors[l]=String(e?.message??e).slice(0,300);}};
await c('chainInfo','getChainInfo');
await c('accountState','getAccountState',{address:W});
await c('accountTokens','getAccountTokens',{address:W});
await c('tokenState','getTokenState',{address:TOKEN});
await c('factoriesByOwner','listFactories',{owner:W,paging:{size:10}});
out.calls=calls;
console.log(JSON.stringify(out,null,2));
