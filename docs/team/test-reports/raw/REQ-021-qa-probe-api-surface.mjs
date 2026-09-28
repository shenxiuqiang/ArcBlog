#!/usr/bin/env node
// QA R17: verify Dev's §10.1 runtime API-surface counts (read-only introspection).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const REPO='/Users/shenxiuqiang/workspace/ArcBlog';
for (const l of (existsSync(join(REPO,'.env.local'))?readFileSync(join(REPO,'.env.local'),'utf8').split('\n'):[])){
  const t=l.trim(); if(!t||t.startsWith('#')||!t.includes('='))continue; const i=t.indexOf('='); const k=t.slice(0,i).trim();
  if(!process.env[k])process.env[k]=t.slice(i+1).trim().replace(/^'|'$/g,'');
}
const mod=await import('@ocap/client');
const client=new (mod.default??mod.GraphQLClient)(String(process.env.ARCBLOG_CHAIN_HOST??'').trim());
const q=(client.getQueries?.()??[]).slice().sort();
const m=(client.getMutations?.()??[]).slice().sort();
const s=(client.getTxSendMethods?.()??[]).slice().sort();
console.log(JSON.stringify({queryCount:q.length,queries:q,mutationCount:m.length,mutations:m,sendCount:s.length,sendMethods:s},null,2));
