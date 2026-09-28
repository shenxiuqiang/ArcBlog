// QA Round 22 — BUG-037 independent check: simulated banner + REQ-023 A5 byte-identity.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const R = new URL('.', import.meta.url).pathname;
const headPath = `${R}head-nft-factory.mjs`;
writeFileSync(headPath, execFileSync('git', ['show', 'HEAD:scripts/lib/nft-factory.mjs'], { encoding: 'utf8' }));

const now = await import(pathToFileURL('/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/nft-factory.mjs').href);
const head = await import(pathToFileURL(headPath).href);

const args = { role: 'studio', tokenAddress: '0xsample', issuerAddress: '0xissuer', stakeAmount: '1', pricing: { basic: '0.1', pro: '0.2', premium: '0.3', enterprise: '0.4' }, rules: 'r' };

const out = {
  defaultSVG_identical: {
    studio: now.buildNodeSVG('studio') === head.buildNodeSVG('studio'),
    hub: now.buildNodeSVG('hub') === head.buildNodeSVG('hub'),
  },
  defaultFactory_identical: {
    studio: JSON.stringify(now.buildNodeFactory(args)) === JSON.stringify(head.buildNodeFactory(args)),
  },
  simulatedBanner: (() => {
    const s = now.buildNodeSVG('studio', { simulated: true });
    return {
      hasChineseBanner: s.includes('未上链'),
      hasNotOnChain: s.includes('NOT ON CHAIN — SIMULATED'),
      ariaLabelFlagged: /aria-label="[^"]*not on chain \/ simulated"/.test(s),
      differsFromDefault: s !== now.buildNodeSVG('studio'),
    };
  })(),
  evidenceFields: (() => {
    const sim = now.buildNodeSVG('studio', { simulated: true });
    const plain = now.buildNodeSVG('studio');
    const fields = ['{{data.pk}}', '{{data.stake}}', '{{data.endpoint}}', '{{data.owner}}', '{{data.capacity}}'];
    const inBoth = fields.filter((f) => sim.includes(f) && plain.includes(f));
    return { fields, inBoth, removed: fields.filter((f) => !sim.includes(f) || !plain.includes(f)) };
  })(),
  factorySimulatedSVG: (() => {
    const f = now.buildNodeFactory({ ...args, simulated: true });
    return { containsBanner: f.output.display.content.includes('NOT ON CHAIN — SIMULATED') };
  })(),
};
console.log(JSON.stringify(out, null, 2));
