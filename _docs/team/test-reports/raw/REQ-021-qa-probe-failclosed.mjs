#!/usr/bin/env node
// QA R17 — independent fail-closed verification (pure functions + adapter construction).
// No chain write, no broadcast, no client created except by createOcapChain which we
// only call with a missing mnemonic (it refuses before constructing anything).
import { validateRealChainConfig, realChainHint, resolveChainOptions, createOcapChain } from '/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/chain.mjs';
import { readJson } from '/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs';
const out={};
out.a_emptyTriple={issues:validateRealChainConfig({}),hint:realChainHint({})};
out.b_completeTriple={issues:validateRealChainConfig({network:'beta',chainHost:'https://example.invalid/',tokenId:'zX'})};
// preset vs record conflict: env=beta, record network=arcblock (read-only AFS read)
const roleConfig=readJson('/instance/app/arcblog/config/roles.json','')?.value??null;
out.recordNetwork=roleConfig?.studio?.network;
try{
  const prev=process.env.ARCBLOG_CHAIN_ENV;
  process.env.ARCBLOG_CHAIN_ENV='beta';
  delete process.env.ARCBLOG_CHAIN_NETWORK;
  delete process.env.ARCBLOG_CHAIN_HOST;
  delete process.env.ARCBLOG_CHAIN_TOKEN_ID;
  delete process.env.ARCBLOG_CHAIN_ID;
  const r=resolveChainOptions({}, {roleConfig, role:'studio'});
  out.conflict={threw:false, resolved:r};
  process.env.ARCBLOG_CHAIN_ENV=prev;
}catch(e){out.conflict={threw:true,code:e.code,message:String(e.message).slice(0,300)};}
// no explicit values at all
try{
  const saved={...process.env};
  for(const k of ['ARCBLOG_CHAIN_ENV','ARCBLOG_CHAIN_NETWORK','ARCBLOG_CHAIN_HOST','ARCBLOG_CHAIN_TOKEN_ID']) delete process.env[k];
  const r=resolveChainOptions({}, {roleConfig, role:'studio'});
  out.noExplicit={resolved:{network:r.network,chainHost:r.chainHost,tokenId:r.tokenId},issues:validateRealChainConfig(r)};
  Object.assign(process.env,saved);
}catch(e){out.noExplicit={threw:true,message:String(e.message).slice(0,200)};}
// adapter construction with a missing mnemonic must refuse with CHAIN_UNAVAILABLE
try{
  await createOcapChain({adapter:'ocap',network:'beta',chainHost:'https://example.invalid/',tokenId:'zX',tokenDecimals:18,mnemonic:''}, null);
  out.missingMnemonic={threw:false,NOTE:'UNEXPECTED: created a chain without a mnemonic'};
}catch(e){out.missingMnemonic={threw:true,code:e.code,message:String(e.message).slice(0,300)};}
console.log(JSON.stringify(out,null,2));
