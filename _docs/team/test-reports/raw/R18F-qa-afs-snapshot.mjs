#!/usr/bin/env node
/**
 * QA Round 18F — read-only AFS snapshot for the records the D37 backfill / D37c
 * guard touch. Prints ifMatch for each so a before/after diff proves what the
 * (authorized) projection refresh wrote and, more importantly, what it did NOT
 * touch (node-nft.json, nft-factories.json, the intent queue).
 *
 * usage: node docs/team/test-reports/raw/R18F-qa-afs-snapshot.mjs <label>
 */
const { readJson, list } = await import('/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs');

const label = process.argv[2] ?? 'snapshot';
const paths = [
  '/instance/app/arcblog/node/factories.json',
  '/instance/app/arcblog/config/node-nft.json',
  '/instance/app/arcblog/config/nft-factories.json',
];
const out = { probe: 'QA-R18F AFS snapshot', label, at: new Date().toISOString(), records: {}, queues: {} };
for (const p of paths) {
  const r = readJson(p, '');
  out.records[p] = { ifMatch: r?.ifMatch ?? null, updatedAt: r?.value?.updatedAt ?? null, present: Boolean(r) };
}
for (const dir of ['/instance/app/arcblog/config/chain-intents', '/instance/app/arcblog/config/category-intents', '/instance/app/arcblog/tags/intents']) {
  const entries = [];
  for (const e of list(dir, '')) {
    const raw = typeof e === 'string' ? e : e?.path ?? e?.key ?? '';
    const name = String(raw).split('/').pop();
    const full = String(raw).startsWith('/') ? String(raw) : `${dir}/${name}`;
    const r = readJson(full, '');
    entries.push({ name, ifMatch: r?.ifMatch ?? null, status: r?.value?.status ?? null, id: r?.value?.id ?? null });
  }
  out.queues[dir] = entries;
}
console.log(JSON.stringify(out, null, 2));
