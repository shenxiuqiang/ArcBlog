// QA R19 — BUG-048 close criteria C1/C2/C3/C5 (read-only, no deletion).
import { isTestRecordId, TEST_RECORD_PREFIXES } from '/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/doctor.mjs';
import { CLEAN_DIRS } from '/Users/shenxiuqiang/workspace/ArcBlog/scripts/arcblog-clean.mjs';
import { list, readJson } from '/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs';

const KNOWN9 = [
  'mock-chain-test-1790602604314',
  'nft-factories-test-1790602604314',
  'node-nft-test-1790602604314',
  'roles-test-1790602604314',
  'mock-worker-1790602675663',
  'factories-worker-1790602675663',
  'chain-intents-worker-1790602675663',
  'nft-factories-worker-1790602675663',
  'node-nft-worker-1790602675663',
  'roles-worker-1790602675663',
];
const FAMILIES11 = ['nft-factories-test-','node-nft-test-','roles-test-','mock-worker-','nft-factories-worker-','chain-intents-worker-','node-nft-worker-','roles-worker-','factories-test-','factories-worker-','sign-keys-'];
const REAL = ['factories.json','identity.json','profile.json','health.json','discovery.json','post-detail.json','diagnostics','general','mock-chain.json','chain-intents','nft-factories.json','roles.json','trusted-hubs','switches','media-orphan-candidates.json'];
const out = {
  c1_known9: KNOWN9.map((n) => ({ name: n, recognised: isTestRecordId(n) })),
  c2_families11: FAMILIES11.map((p) => ({ prefix: p, probe: `${p}1790600000000`, recognised: isTestRecordId(`${p}1790600000000`) })),
  c2_prefixTableLength: TEST_RECORD_PREFIXES.length,
  c3_cleanDirsHasNode: CLEAN_DIRS.includes('node'),
  c3_cleanDirsHasMediaIntents: CLEAN_DIRS.includes('config/media-intents'),
  c3_cleanDirsHasCategoryIntents: CLEAN_DIRS.includes('config/category-intents'),
  c5_realRecords: REAL.map((n) => ({ name: n, recognised: isTestRecordId(n) })),
};
// real drafts must never be residue: read every live draft id
const drafts = list('/instance/app/arcblog/drafts','').map((e)=>String(e?.id ?? ''));
out.c5_draftsMatchingPrefix = drafts.filter(isTestRecordId);
out.c5_draftsTotal = drafts.length;
const node = list('/instance/app/arcblog/node','').map((e)=>String(e?.id ?? ''));
out.c5_nodeMatchingPrefix = node.filter(isTestRecordId);
out.c5_nodeTotal = node.length;
const config = list('/instance/app/arcblog/config','').map((e)=>String(e?.id ?? ''));
out.c5_configMatchingPrefix = config.filter(isTestRecordId);
out.c5_configTotal = config.length;
// the live chain-intents directory itself must NOT be seen as residue
out.c5_chainIntentsDirIsResidue = isTestRecordId('chain-intents');
out.c5_orphanCandidatesIsResidue = isTestRecordId('media-orphan-candidates.json');
console.log(JSON.stringify(out, null, 1));
