// NET-07 evidence: a third party can read the on-chain node self-description
// with the public SDK alone (no ArcBlog code, no repo imports).
// Read-only. Baseline: 9b40aad. Date: 2026-10-01.
import Client from '@ocap/client';

const HOST = 'https://beta.abtnetwork.io/api/';
const STUDIO_FACTORY = 'z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo';
const client = new Client(HOST);

const stakes = await client.listStakes({
  addressFilter: { receiver: STUDIO_FACTORY },
  paging: { size: 10 },
});

console.log('third-party SDK only (@ocap/client — no ArcBlog code):');
console.log('code:', stakes.code, '| total:', stakes.page?.total);
for (const s of stakes.stakes ?? []) {
  console.log('\nstake:', s.address);
  console.log('  sender :', s.sender);
  console.log('  assets :', (s.assets ?? []).join(', ') || '(none)');
  console.log('  message:', s.message);
  for (const assetId of s.assets ?? []) {
    const { state } = await client.getAssetState({ address: assetId });
    let data = state?.data?.value ?? state?.data ?? null;
    try { data = JSON.parse(data); } catch { /* keep raw */ }
    console.log('  asset', assetId, '-> data fields:', data && typeof data === 'object' ? Object.keys(data).join(', ') : String(data).slice(0, 80));
    if (data && typeof data === 'object') {
      console.log('    endpoint:', data.endpoint ?? '(absent)', '| owner:', data.owner ?? '(absent)', '| pk:', data.pk ? '(present)' : '(absent)');
    }
  }
}
