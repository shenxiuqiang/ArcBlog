// ArcBlog Node NFT factories (spec §8.1–§8.4) — the *specification* half.
//
// Design reference: GLofter's factories
// (`glofter/studio/mock/create-glofter-studio-node-nft-factory.ts` and
// `glofter/hub/mock/create-glofter-hub-node-nft-factory.ts`). ArcBlog keeps the
// same on-chain shape so both networks are readable by the same tooling:
//
//   createAssetFactory({ wallet, factory })            ← `arcblog-factory.mjs create`
//   factory.moniker / settlement / limit / input / output / data / hooks
//   output.data.value uses {{input.*}} / {{ctx.*}} templates
//   output.display is an inline SVG card
//   hooks[0] = { type: 'contract', name: 'mint', hook: "transferToken(...)" }
//
// What ArcBlog adds on top of the GLofter shape: node metadata comes from the
// node profile (`node/profile.json` — name, description, endpoint, roles,
// capabilities, protocol version) instead of a studio database, and the two
// roles (studio / hub) are two factories of one product.
//
// This module is pure: no AFS, no chain, no dependencies (the blocklet has
// none). `{{...}}` templates are expanded by `renderTemplate` below — a small
// subset of mustache (dotted paths, no sections), which is all the factories use.

/** ABT has 18 decimals; GLofter mints/stakes 1 ABT (`fromTokenToUnit(1, 18)`). */
export const TOKEN_DECIMALS = 18;

/** Capacity formula shared with GLofter (`hub/api/src/utils/node/capacity.ts`). */
export const CAPACITY_COEFFICIENT = 1442.695;
export const CAPACITY_MAX = 10000;

/** Default hub pricing tiers (ABT per day), same numbers GLofter ships. */
export const DEFAULT_HUB_PRICING = { basic: '0.1', pro: '0.2', premium: '0.3', enterprise: '0.4' };

/** Default per-node stake, in ABT (GLofter stakes 1 ABT for both roles). */
export const DEFAULT_STAKE_AMOUNT = '1';

export const DEFAULT_HUB_RULES =
  'Comply with local laws and regulations; Prohibit pornographic, violent and false information; ' +
  'Ensure original works or authorized use; Violations result in rejection of the application.';

/** Decimal string → smallest unit string (`1` + 18 decimals → `1{18 zeros}`). */
export function fromTokenToUnit(amount, decimals = TOKEN_DECIMALS) {
  const text = String(amount ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`amount must be a non-negative decimal: ${amount}`);
  const [whole, fraction = ''] = text.split('.');
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return `${whole}${padded}`.replace(/^0+(?=\d)/, '');
}

/**
 * Capacity for a Hub node (studios), derived from the staked amount.
 * `capacity = min(ceil(1442.695 * ln(stake + 1)), 10000)` — 1 ABT ≈ 1000.
 */
export function capacityForStake(stakeAmount) {
  const stake = Number(stakeAmount);
  if (!Number.isFinite(stake) || stake < 0) throw new Error(`stake must be a non-negative number: ${stakeAmount}`);
  return Math.min(Math.ceil(CAPACITY_COEFFICIENT * Math.log(stake + 1)), CAPACITY_MAX);
}

/** The role-specific half of a factory. Keep both entries symmetric. */
export const ROLE_FACTORIES = {
  studio: {
    role: 'studio',
    name: 'ArcBlog Studio Node',
    moniker: 'ArcBlogStudioNode',
    tag: 'ArcBlogStudioNode',
    description:
      'Non-fungible asset representing a Studio node in the ArcBlog network. Each NFT establishes on-chain ' +
      'studio identity and records the node metadata ArcBlog publishes in its node profile.',
    // ArcBlog studio nodes are the publishing side: identity + endpoint + what
    // the node is allowed to do. Pricing/capacity belong to hubs.
    variables: [
      { name: 'endpoint', required: true },
      { name: 'region', required: true },
      { name: 'name', required: true },
      { name: 'description', required: false },
      { name: 'stake', required: true },
      { name: 'pk', required: true },
      { name: 'roles', required: false },
      { name: 'capabilities', required: false },
      { name: 'protocolVersion', required: false },
      { name: 'nodeVersion', required: false },
    ],
    dataKeys: ['name', 'description', 'endpoint', 'region', 'stake', 'pk', 'roles', 'capabilities', 'protocolVersion', 'nodeVersion'],
    ownerKey: 'owner',
  },
  hub: {
    role: 'hub',
    name: 'ArcBlog Hub Node',
    moniker: 'ArcBlogHubNode',
    tag: 'ArcBlogHubNode',
    description:
      'Non-fungible asset representing a Hub node in the ArcBlog network. Each NFT establishes on-chain node ' +
      'identity and records the hub metadata: capacity, pricing tiers and the rules it enforces.',
    variables: [
      { name: 'endpoint', required: true },
      { name: 'region', required: true },
      { name: 'pk', required: true },
      { name: 'name', required: false },
      { name: 'description', required: false },
      { name: 'stake', required: true },
      { name: 'rules', required: false },
      { name: 'pricing', required: false },
    ],
    dataKeys: ['name', 'description', 'endpoint', 'region', 'pk', 'stake', 'rules', 'pricing', 'capacity'],
    ownerKey: 'owner',
  },
};

/**
 * The NFT display: an inline SVG card, generated from the same template data the
 * `output.data.value` block uses. Self-contained (no fonts, no external refs) so
 * the chain can render it without network access — same intent as GLofter's
 * `buildNodeSVG()` / `buildStudioNodeSVG()`.
 */
export function buildNodeSVG(role) {
  const spec = ROLE_FACTORIES[role];
  if (!spec) throw new Error(`unknown node role: ${role}`);
  const accent = role === 'studio' ? '#2563eb' : '#0f766e';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" width="480" height="300" role="img" aria-label="${spec.name}">
  <rect width="480" height="300" rx="18" fill="#0b1020"/>
  <rect x="1" y="1" width="478" height="298" rx="17" fill="none" stroke="${accent}" stroke-width="2"/>
  <text x="32" y="58" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" letter-spacing="2" fill="${accent}">ARCBLOG</text>
  <text x="32" y="96" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26" font-weight="600" fill="#f8fafc">{{data.name}}</text>
  <text x="32" y="132" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" fill="#94a3b8">{{data.endpoint}}</text>
  <text x="32" y="158" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" fill="#94a3b8">region {{data.region}}</text>
  <text x="32" y="206" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="#64748b">stake</text>
  <text x="32" y="228" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" fill="#f8fafc">{{data.stake}} ABT</text>
  <text x="248" y="206" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="#64748b">${role === 'hub' ? 'capacity' : 'owner'}</text>
  <text x="248" y="228" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" fill="#f8fafc">${role === 'hub' ? '{{data.capacity}} studios' : '{{data.owner}}'}</text>
  <text x="32" y="268" font-family="ui-monospace, SFMono-Regular, monospace" font-size="11" fill="#475569">pk {{data.pk}}</text>
</svg>`;
}

/**
 * Build the `createAssetFactory` payload for a role.
 *
 * @param {object} input
 * @param {'studio'|'hub'} input.role
 * @param {string} input.tokenAddress   ABT token address on the target chain
 * @param {string} input.issuerAddress  factory owner / issuer wallet address
 * @param {string} [input.stakeAmount]  ABT to stake (also the mint price basis)
 * @param {{basic:string,pro:string,premium:string,enterprise:string}} [input.pricing] hub tiers
 * @param {string} [input.rules]        hub rules text
 */
export function buildNodeFactory({ role, tokenAddress, issuerAddress, stakeAmount = DEFAULT_STAKE_AMOUNT, pricing, rules } = {}) {
  const spec = ROLE_FACTORIES[role];
  if (!spec) throw new Error(`unknown node role: ${role} (use studio|hub)`);
  if (!tokenAddress) throw new Error('tokenAddress is required (the ABT token used to mint)');
  if (!issuerAddress) throw new Error('issuerAddress is required (the factory owner wallet)');

  const token = { address: tokenAddress, value: fromTokenToUnit(stakeAmount) };
  const tiers = { ...DEFAULT_HUB_PRICING, ...(pricing ?? {}) };
  const capacity = capacityForStake(Number(stakeAmount));
  const rulesText = rules || DEFAULT_HUB_RULES;

  // The data block is what the NFT carries. Studio nodes carry identity +
  // endpoint; hub nodes additionally carry capacity/pricing/rules (§8.3).
  const dataValue = {
    name: '{{input.name}}',
    description: '{{input.description}}',
    endpoint: '{{input.endpoint}}',
    region: '{{input.region}}',
    stake: '{{input.stake}}',
    pk: '{{input.pk}}',
    owner: '{{ctx.owner}}',
  };
  if (role === 'studio') {
    dataValue.roles = '{{input.roles}}';
    dataValue.capabilities = '{{input.capabilities}}';
    dataValue.protocolVersion = '{{input.protocolVersion}}';
    dataValue.nodeVersion = '{{input.nodeVersion}}';
  } else {
    // GLofter bakes the tiers and the rules into the factory (they are the
    // hub's terms, not something a buyer types at mint time). Capacity follows
    // the stake, so it is resolved per mint.
    dataValue.pricing = { ...tiers };
    dataValue.capacity = '{{input.capacity}}';
    dataValue.rules = rulesText;
  }

  // `data.value` is the mutable projection the issuer can refresh later
  // (GLofter does exactly this in its node-status route).
  const mutableData = {};
  for (const key of spec.dataKeys) mutableData[key] = `{{data.${key}}}`;
  if (role === 'hub') {
    mutableData.pricing = {
      basic: '{{data.pricing.basic}}',
      pro: '{{data.pricing.pro}}',
      premium: '{{data.pricing.premium}}',
      enterprise: '{{data.pricing.enterprise}}',
    };
  }

  return {
    name: spec.name,
    description: spec.description,
    moniker: spec.moniker,
    settlement: 'instant',
    limit: 0,
    input: {
      tokens: [token],
      assets: [],
      variables: [
        ...spec.variables,
        // hub capacity is derived from the stake by ArcBlog, not typed by the buyer
        ...(role === 'hub' ? [{ name: 'capacity', required: false }] : []),
      ],
    },
    output: {
      moniker: `${spec.moniker} #{{ctx.id}}`,
      data: { type: 'json', value: dataValue },
      display: { type: 'svg', content: buildNodeSVG(role) },
      readonly: false,
      transferrable: true,
      parent: '{{ctx.factory}}',
      issuer: '{{ctx.issuer.id}}',
      tags: [spec.tag],
    },
    data: { type: 'json', value: mutableData },
    hooks: [
      {
        type: 'contract',
        name: 'mint',
        hook: `transferToken('${token.address}', '${issuerAddress}', '${token.value}');`,
      },
    ],
    // ArcBlog-only metadata (ignored by the chain, read back by our CLIs/tests):
    // it documents which role this factory mints and what it costs to stake.
    arcblog: {
      role,
      token,
      stakeAmount: String(stakeAmount),
      capacity: role === 'hub' ? capacity : undefined,
      pricing: role === 'hub' ? tiers : undefined,
      rules: role === 'hub' ? rulesText : undefined,
      capacityFormula: 'min(ceil(1442.695 * ln(stake + 1)), 10000)',
    },
  };
}

/** Structural validation of a factory payload (mirrors the chain's requirements). */
export function validateNodeFactory(factory) {
  const issues = [];
  if (!factory || typeof factory !== 'object') return ['factory must be an object'];
  for (const key of ['name', 'description', 'moniker']) {
    if (!factory[key]) issues.push(`${key} is required`);
  }
  if (factory.settlement !== 'instant') issues.push('settlement must be instant');
  if (!Array.isArray(factory.input?.tokens) || factory.input.tokens.length === 0) issues.push('input.tokens is required');
  if (!Array.isArray(factory.input?.variables) || factory.input.variables.length === 0) {
    issues.push('input.variables is required');
  }
  const required = (factory.input?.variables ?? []).filter((v) => v.required).map((v) => v.name);
  if (!required.includes('endpoint')) issues.push('endpoint must be a required input variable');
  if (!required.includes('pk')) issues.push('pk must be a required input variable (identity binding)');
  if (factory.output?.data?.type !== 'json') issues.push('output.data.type must be json');
  if (!String(factory.output?.data?.value?.owner ?? '').includes('ctx.owner')) {
    issues.push('output.data.value.owner must bind {{ctx.owner}} (the node DID)');
  }
  if (!String(factory.output?.data?.value?.pk ?? '')) issues.push('output.data.value.pk must bind the public key');
  if (factory.output?.display?.type !== 'svg') issues.push('output.display.type must be svg');
  if (factory.output?.transferrable !== true) issues.push('output.transferrable must be true');
  if (factory.output?.readonly !== false) issues.push('output.readonly must be false');
  if (!Array.isArray(factory.output?.tags) || factory.output.tags.length === 0) issues.push('output.tags is required');
  if (!Array.isArray(factory.hooks) || factory.hooks.length === 0 || !String(factory.hooks[0]?.hook ?? '').includes('transferToken(')) {
    issues.push('a mint hook calling transferToken(...) is required');
  }
  return issues;
}

/**
 * Expand `{{dotted.path}}` placeholders from a scope. Unknown paths render as an
 * empty string, and a `{{...}}` wrapper is never left behind (a half-rendered
 * template would look like data on chain but be unusable).
 */
export function renderTemplate(value, scope) {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const resolved = path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), scope);
      return resolved === undefined || resolved === null ? '' : String(resolved);
    });
  }
  if (Array.isArray(value)) return value.map((item) => renderTemplate(item, scope));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = renderTemplate(item, scope);
    return out;
  }
  return value;
}

/**
 * The inputs a mint needs for a node profile (spec §8.2): the factory templates
 * consume exactly these names. `pk` is the node's signing public key (§67 reuses
 * it for content provenance).
 */
export function buildMintInputs({ role, profile = {}, pk = '', stakeAmount = DEFAULT_STAKE_AMOUNT, pricing, rules } = {}) {
  const spec = ROLE_FACTORIES[role];
  if (!spec) throw new Error(`unknown node role: ${role} (use studio|hub)`);
  const tiers = { ...DEFAULT_HUB_PRICING, ...(pricing ?? {}) };
  const inputs = {
    endpoint: String(profile.endpoint ?? ''),
    region: String(profile.region ?? profile.regionLabel ?? ''),
    name: String(profile.name ?? 'ArcBlog'),
    description: String(profile.description ?? ''),
    stake: String(stakeAmount),
    pk: String(pk ?? ''),
  };
  if (role === 'studio') {
    inputs.roles = Array.isArray(profile.roles) ? profile.roles.join(',') : String(profile.roles ?? 'basic');
    inputs.capabilities = Array.isArray(profile.capabilities) ? profile.capabilities.join(',') : String(profile.capabilities ?? '');
    inputs.protocolVersion = String(profile.protocolVersion ?? '');
    inputs.nodeVersion = String(profile.version ?? '');
  } else {
    // tiers + rules live in the factory; only the capacity follows the stake
    inputs.capacity = String(capacityForStake(Number(stakeAmount)));
  }
  return inputs;
}

/** Mint inputs that satisfy the factory's `required` variables (fail closed). */
export function validateMintInputs(inputs, factory) {
  const issues = [];
  for (const variable of factory?.input?.variables ?? []) {
    if (!variable.required) continue;
    const value = inputs?.[variable.name];
    if (value === undefined || value === null || String(value).trim() === '') {
      issues.push(`required mint input missing: ${variable.name}`);
    }
  }
  return issues;
}
