// Deterministic aggregation for PRD-AGT-07 (采集 → 预筛 → 评分 → 组合).
//
// WHAT THIS MODULE IS: the pure half of `scripts/arcblog-summarize.mjs`. The CLI
// collects (registry projection + each node's public `/p/llms.txt`) and writes the
// record; everything between — pre-screen, score, order, compose, validate — is
// here, and takes only its arguments.
//
// PURITY CONTRACT (the determinism the PRD asks for):
//   * no network, no filesystem, no `arc`, no child process — this file imports
//     nothing at all;
//   * no clock and no randomness take part in ORDERING. `discoveredAt` /
//     `generatedAt` are display fields the caller passes in; the rank is decided
//     only by the source-fixed `WEIGHTS` plus the total tiebreaker
//     `(-score.total, slug, stakeAddress)` — a full order, so `Array.sort` can
//     never fall back to an implementation-defined order on equal scores;
//   * `reason` (human string) and `score.terms` (structured) come from the SAME
//     terms array, so a reason can never disagree with the score;
//   * `cited` names the exact record fields each hit read, and
//     `validateSummaryRecord` re-resolves every one of them — a citation that
//     does not point into the record fails closed instead of shipping.
//
// HONESTY BOUNDARY (B5/F5/F6): this module never says "all nodes". The record's
// `total` is the count of nodes this projection actually read, `totalNote` spells
// out the 口径 (`registry refreshedAt <t> 时刻的 N 条`), and `truncated` marks a
// collection that the `--max-collect` cap cut short. Consumers read `total` /
// `pickCount` from the record — they must not recompute them.

export const SUMMARY_KIND = 'SummaryPick';

/**
 * Scoring weights — FIXED SOURCE CONSTANTS (PRD-AGT-07). A config file or an
 * environment variable would make two runs on the same input disagree, so these
 * are literals. The record echoes them back in `weights` for auditability.
 */
export const WEIGHTS = Object.freeze({
  reachable: 3,
  agentSurface: 2,
  endpointFromAsset: 1,
  staked: 1,
  selfDescribed: 1,
});

/** The term keys, in the fixed order `score.terms` is always built in. */
export const TERM_KEYS = Object.freeze(Object.keys(WEIGHTS));

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;
export const DEFAULT_MAX_COLLECT = 25;
export const MAX_MAX_COLLECT = 200;
/** A remote body is kept only as a hash + this many characters of preview. */
export const BODY_PREVIEW_CHARS = 200;

/**
 * The exact field set a source may carry into the public projection. Anything
 * else the caller hands over is dropped by `publicSource`, so a future private
 * field on a registry row cannot leak through this record.
 */
export const SOURCE_FIELDS = Object.freeze([
  'stakeAddress',
  'owner',
  'slug',
  'endpoint',
  'url',
  'ok',
  'status',
  'contentType',
  'bytes',
  'bodyHash',
  'bodyPreview',
  'truncated',
  'code',
  'error',
  'endpointSource',
  'region',
  'dataUpdatedAt',
  'assetCount',
  'reachability',
  'reachabilityReason',
  'discoveredAt',
]);

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value).trim();
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function invalid(message) {
  const err = new Error(message);
  err.code = 'VALIDATION';
  return err;
}

/** True when `value` is an http(s) origin a node surface can be read from. */
export function isHttpEndpoint(value) {
  return /^https?:\/\/\S+$/i.test(str(value));
}

/**
 * A stable, readable id for one node — the second sort key. Derived from public
 * registry fields only: the owner DID, else the endpoint, else the stake address.
 * Two nodes with the same owner still get a total order from `stakeAddress`.
 */
export function nodeSlug(node) {
  const source = str(node?.owner) || str(node?.endpoint) || str(node?.stakeAddress);
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return slug || 'node';
}

/**
 * The stable sort key: `(-score.total, slug, stakeAddress)`. Total, so equal
 * scores can never be ordered by insertion order or by the engine.
 */
export function comparePicks(a, b) {
  const scoreA = num(a?.score?.total);
  const scoreB = num(b?.score?.total);
  if (scoreA !== scoreB) return scoreB - scoreA;
  const slugA = str(a?.slug);
  const slugB = str(b?.slug);
  if (slugA !== slugB) return slugA < slugB ? -1 : 1;
  const stakeA = str(a?.stakeAddress);
  const stakeB = str(b?.stakeAddress);
  if (stakeA !== stakeB) return stakeA < stakeB ? -1 : 1;
  return 0;
}

/**
 * Build one `sources[]` entry from a registry node plus its read outcome.
 * `read` is this module's own shape (the CLI maps `fetchNodeSurface` onto it):
 * `{url, ok, status, contentType, bytes, bodyHash, bodyPreview, truncated, code, error, discoveredAt}`.
 * A read failure is a first-class value — it must never be dropped silently.
 */
export function sourceFrom(node, read = {}) {
  const endpoint = str(node?.endpoint);
  const status = num(read.status);
  const ok = read.ok === true && !str(read.code);
  const url = str(read.url);
  const failure = str(read.code) || (ok ? '' : `HTTP_${status}`);
  return {
    stakeAddress: str(node?.stakeAddress),
    owner: str(node?.owner),
    slug: nodeSlug({ ...node, endpoint }),
    endpoint,
    url,
    ok,
    status,
    contentType: str(read.contentType),
    bytes: num(read.bytes),
    bodyHash: str(read.bodyHash),
    bodyPreview: str(read.bodyPreview).slice(0, BODY_PREVIEW_CHARS),
    truncated: read.truncated === true ? 'true' : '',
    code: ok ? '' : failure,
    error: str(read.error) || (ok ? '' : `GET ${url || '(no url)'} answered ${status || '(no status)'}`),
    endpointSource: str(node?.endpointSource),
    region: str(node?.region),
    dataUpdatedAt: str(node?.dataUpdatedAt),
    assetCount: Array.isArray(node?.assets) ? node.assets.length : num(node?.assetCount),
    reachability: str(node?.reachability),
    reachabilityReason: str(node?.reachabilityReason),
    discoveredAt: str(read.discoveredAt),
  };
}

/** Project a source down to the public field set (a private field cannot pass). */
export function publicSource(source) {
  const projected = {};
  for (const field of SOURCE_FIELDS) projected[field] = source?.[field];
  // Re-typed, so a caller's stray value cannot change the JSON shape of the
  // record: determinism covers the whole record, not just the rank.
  projected.stakeAddress = str(projected.stakeAddress);
  projected.owner = str(projected.owner);
  projected.slug = str(projected.slug) || nodeSlug(projected);
  projected.endpoint = str(projected.endpoint);
  projected.url = str(projected.url);
  projected.ok = projected.ok === true;
  projected.status = num(projected.status);
  projected.contentType = str(projected.contentType);
  projected.bytes = num(projected.bytes);
  projected.bodyHash = str(projected.bodyHash);
  projected.bodyPreview = str(projected.bodyPreview).slice(0, BODY_PREVIEW_CHARS);
  projected.truncated = projected.truncated === 'true' ? 'true' : '';
  projected.code = str(projected.code);
  projected.error = str(projected.error);
  projected.endpointSource = str(projected.endpointSource);
  projected.region = str(projected.region);
  projected.dataUpdatedAt = str(projected.dataUpdatedAt);
  projected.assetCount = num(projected.assetCount);
  projected.reachability = str(projected.reachability);
  projected.reachabilityReason = str(projected.reachabilityReason);
  projected.discoveredAt = str(projected.discoveredAt);
  return projected;
}

/**
 * The five fixed terms, each reading named public fields of one source. Built in
 * `TERM_KEYS` order so the terms array (and therefore the reason string) is
 * itself deterministic.
 */
export function scoreTerms(source) {
  const ok = source?.ok === true;
  const status = num(source?.status);
  const contentType = str(source?.contentType);
  const bytes = num(source?.bytes);
  const assetCount = num(source?.assetCount);
  const region = str(source?.region);
  const dataUpdatedAt = str(source?.dataUpdatedAt);
  const selfNote = region ? `region=${region}` : dataUpdatedAt ? `data=${dataUpdatedAt}` : '(none)';
  return [
    {
      key: 'reachable',
      weight: WEIGHTS.reachable,
      hit: ok,
      note: ok ? `HTTP ${status}` : str(source?.code) || `HTTP ${status}`,
    },
    {
      key: 'agentSurface',
      weight: WEIGHTS.agentSurface,
      hit: ok && /^text\/plain/i.test(contentType) && bytes > 0 && str(source?.bodyHash) !== '',
      note: `${contentType || '(no content-type)'} ${bytes}B`,
    },
    {
      key: 'endpointFromAsset',
      weight: WEIGHTS.endpointFromAsset,
      hit: str(source?.endpointSource) === 'asset.data',
      note: str(source?.endpointSource) || '(unset)',
    },
    {
      key: 'staked',
      weight: WEIGHTS.staked,
      hit: assetCount > 0,
      note: `${assetCount} asset(s)`,
    },
    {
      key: 'selfDescribed',
      weight: WEIGHTS.selfDescribed,
      hit: region !== '' || dataUpdatedAt !== '',
      note: selfNote,
    },
  ];
}

/** Sum of the weights of the terms that hit. */
export function scoreTotal(terms) {
  return (Array.isArray(terms) ? terms : []).reduce(
    (sum, term) => sum + (term?.hit === true ? num(term?.weight) : 0),
    0,
  );
}

/**
 * The human-readable "为什么入选" string. Derived from the same terms array the
 * score comes from, so the two can never drift:
 * `reachable=HTTP 200(+3) · agentSurface=text/plain; charset=utf-8 540B(+2) ⇒ 5`
 */
export function reasonFrom(terms, total) {
  const hits = (Array.isArray(terms) ? terms : []).filter((term) => term?.hit === true);
  const body = hits.length ? hits.map((term) => `${term.key}=${term.note}(+${term.weight})`).join(' · ') : 'no term hit';
  return `${body} ⇒ ${num(total)}`;
}

/**
 * The fields a hit actually read, as resolvable record pointers:
 * `{field: 'sources[3].status', value: 200}`. The first two entries are the
 * provenance (which source this pick came from and at which URL); then one entry
 * per hit term. `validateSummaryRecord` re-resolves every pointer.
 */
export function citationsFor(index, source) {
  const at = (field) => ({ field: `sources[${index}].${field}`, value: source?.[field] });
  const cited = [at('stakeAddress'), at('url')];
  for (const term of scoreTerms(source)) {
    if (term.hit !== true) continue;
    if (term.key === 'reachable') cited.push(at('status'));
    if (term.key === 'agentSurface') cited.push(at('contentType'), at('bytes'), at('bodyHash'));
    if (term.key === 'endpointFromAsset') cited.push(at('endpointSource'));
    if (term.key === 'staked') cited.push(at('assetCount'));
    if (term.key === 'selfDescribed') cited.push(str(source?.region) !== '' ? at('region') : at('dataUpdatedAt'));
  }
  return cited;
}

/** The pre-screen: a node is readable-and-non-empty, or it is `skipped` with a code. */
export function preScreenSource(source) {
  if (source?.ok !== true) {
    return { ok: false, code: str(source?.code) || 'NOT_READABLE', error: str(source?.error) || 'the public surface was not readable' };
  }
  if (num(source?.bytes) <= 0) {
    return { ok: false, code: 'EMPTY_BODY', error: `GET ${str(source?.url)} returned an empty body` };
  }
  return { ok: true, code: '', error: '' };
}

function limitNote({ total, pickCount, registryTotal, limit, maxCollect, truncated, refreshedAt, skipped }) {
  return (
    `本投影口径 = registry refreshedAt ${refreshedAt || '(unset)'} 时刻的 ${total} 条` +
    (truncated === 'true' ? `（registry total=${registryTotal}，采集上限 --max-collect ${maxCollect} 已截断）` : '') +
    `；可读 ${total - skipped} 条、跳过 ${skipped} 条、产出 ${pickCount} 条（--limit ${limit}）；` +
    'total/pickCount 由记录自带，页面与消费方禁自算'
  );
}

function stateNoteFor({ total, pickCount, skipped, refreshedAt }) {
  if (total === 0) {
    return `registry 在 ${refreshedAt || '(unset)'} 时刻为 0 条：没有可比对的节点（这不是"全部节点为空"的结论）`;
  }
  if (pickCount === 0) {
    return `${total} 条节点均未产出可读的公开面（跳过 ${skipped} 条）：本投影不宣称覆盖全网节点`;
  }
  return (
    `本投影 = registry refreshedAt ${refreshedAt || '(unset)'} 时刻的 ${total} 条中的 ${pickCount} 条` +
    `（跳过 ${skipped} 条；顺序稳定键 = -score.total, slug, stakeAddress）`
  );
}

/**
 * Compose the record. Pure: same `registry` + same `sources` + same `limit` ⇒ the
 * same `picks` order, whatever order `sources` arrives in.
 */
export function buildSummaryRecord({
  id,
  registry = {},
  sources = [],
  limit = DEFAULT_LIMIT,
  maxCollect = DEFAULT_MAX_COLLECT,
  discoveredAt = '',
  generatedAt = '',
} = {}) {
  const summaryId = str(id);
  if (!summaryId) throw invalid('summary id is required (node/summaries/<id>.json)');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(summaryId)) {
    throw invalid(`summary id must be a file-safe token like s1 or weekly-2026-10: ${summaryId}`);
  }
  const limitValue = num(limit, DEFAULT_LIMIT);
  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > MAX_LIMIT) {
    throw invalid(`limit must be an integer in 1..${MAX_LIMIT} (got ${limit})`);
  }
  const maxCollectValue = num(maxCollect, DEFAULT_MAX_COLLECT);
  if (!Number.isInteger(maxCollectValue) || maxCollectValue < 1 || maxCollectValue > MAX_MAX_COLLECT) {
    throw invalid(`maxCollect must be an integer in 1..${MAX_MAX_COLLECT} (got ${maxCollect})`);
  }

  const nodes = (Array.isArray(sources) ? sources : []).map(publicSource);
  const scored = [];
  const skipped = [];
  nodes.forEach((source, index) => {
    const verdict = preScreenSource(source);
    if (!verdict.ok) {
      skipped.push({ stakeAddress: source.stakeAddress, code: verdict.code, error: verdict.error });
      return;
    }
    const terms = scoreTerms(source);
    const total = scoreTotal(terms);
    scored.push({
      stakeAddress: source.stakeAddress,
      slug: source.slug,
      owner: source.owner,
      endpoint: source.endpoint,
      endpointSource: source.endpointSource,
      url: source.url,
      status: source.status,
      contentType: source.contentType,
      bytes: source.bytes,
      bodyHash: source.bodyHash,
      bodyPreview: source.bodyPreview,
      truncated: source.truncated,
      reachability: source.reachability,
      reachabilityReason: source.reachabilityReason,
      region: source.region,
      dataUpdatedAt: source.dataUpdatedAt,
      assetCount: source.assetCount,
      discoveredAt: source.discoveredAt,
      score: { total, terms },
      reason: reasonFrom(terms, total),
      cited: citationsFor(index, source),
    });
  });

  // The ONE ordering rule (PRD-AGT-07): a total key, so the result cannot depend
  // on the input order or on the engine's sort stability.
  const ordered = scored.slice().sort(comparePicks);
  const picks = ordered.slice(0, limitValue).map((pick, position) => ({ rank: position + 1, ...pick }));

  const registryTotal = num(registry.total);
  const total = nodes.length;
  const truncated = registryTotal > total ? 'true' : '';
  const record = {
    kind: SUMMARY_KIND,
    id: summaryId,
    generatedAt: str(generatedAt),
    discoveredAt: str(discoveredAt),
    registryRefreshedAt: str(registry.refreshedAt),
    adapter: str(registry.adapter),
    network: str(registry.network),
    factory: str(registry.factory),
    registryTotal,
    // Display-only freshness of the registry snapshot the aggregation ran on
    // (registryFreshness owns the rule). It never touches the order.
    registryStale: registry.stale === true ? 'true' : '',
    registryHint: str(registry.hint),
    total,
    pickCount: picks.length,
    limit: limitValue,
    maxCollect: maxCollectValue,
    truncated,
    weights: { ...WEIGHTS },
    totalNote: limitNote({
      total,
      pickCount: picks.length,
      registryTotal,
      limit: limitValue,
      maxCollect: maxCollectValue,
      truncated,
      refreshedAt: str(registry.refreshedAt),
      skipped: skipped.length,
    }),
    stateNote: stateNoteFor({
      total,
      pickCount: picks.length,
      skipped: skipped.length,
      refreshedAt: str(registry.refreshedAt),
    }),
    empty: picks.length ? '' : 'true',
    sources: nodes,
    picks,
    skipped,
  };
  return record;
}

/** Resolve `sources[3].status`-style pointers inside a record (no dependency). */
export function resolveField(record, field) {
  const parts = String(field ?? '').match(/[A-Za-z0-9_]+|\[\d+\]/g) || [];
  let current = record;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    const index = part.match(/^\[(\d+)\]$/);
    current = index ? current[Number(index[1])] : current[part];
  }
  return current;
}

function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Machine-check the record before it is written: the counts, the fixed weights,
 * the sort order, the score/term/reason agreement, and — the point of `cited` —
 * that every citation resolves to the value it claims. Any issue fails the build.
 */
export function validateSummaryRecord(record) {
  const issues = [];
  if (!record || typeof record !== 'object') return ['summary record must be an object'];
  if (str(record.kind) !== SUMMARY_KIND) issues.push(`kind must be ${SUMMARY_KIND}`);
  if (!str(record.id)) issues.push('id is required');
  if (!str(record.registryRefreshedAt)) {
    issues.push('registryRefreshedAt is required (the registry projection carries it — refresh it first)');
  }
  if (!Array.isArray(record.sources)) issues.push('sources must be an array');
  if (!Array.isArray(record.picks)) issues.push('picks must be an array');
  if (!Array.isArray(record.skipped)) issues.push('skipped must be an array');
  if (!Array.isArray(record.sources) || !Array.isArray(record.picks) || !Array.isArray(record.skipped)) return issues;

  const sources = record.sources;
  const picks = record.picks;
  const total = num(record.total);
  const registryTotal = num(record.registryTotal);
  if (total !== sources.length) issues.push(`total (${total}) must equal sources.length (${sources.length})`);
  if (num(record.pickCount) !== picks.length) issues.push(`pickCount (${record.pickCount}) must equal picks.length (${picks.length})`);
  if (num(record.limit) < 1) issues.push('limit must be >= 1');
  if (picks.length > num(record.limit)) issues.push(`picks.length (${picks.length}) must not exceed limit (${record.limit})`);
  if (record.truncated !== 'true' && registryTotal !== total) {
    issues.push(`registryTotal (${registryTotal}) must equal total (${total}) unless truncated`);
  }
  if (record.truncated === 'true' && registryTotal <= total) {
    issues.push(`truncated is 'true' but registryTotal (${registryTotal}) <= total (${total})`);
  }
  if (!sameValue(record.weights, { ...WEIGHTS })) issues.push('weights must be the fixed WEIGHTS constants');
  const note = str(record.totalNote);
  if (!note.includes(String(total))) issues.push('totalNote must state the total it was measured over');
  if (!note.includes(str(record.registryRefreshedAt))) issues.push('totalNote must state the registry refreshedAt 口径');
  if (!str(record.stateNote)) issues.push('stateNote is required (the page cannot build it)');
  if (!(record.empty === 'true' || record.empty === '')) issues.push("empty must be 'true' or ''");
  if (!(record.registryStale === 'true' || record.registryStale === '')) issues.push("registryStale must be 'true' or ''");

  // Sources carry the public field set only.
  for (const [index, source] of sources.entries()) {
    for (const field of Object.keys(source ?? {})) {
      if (!SOURCE_FIELDS.includes(field)) issues.push(`sources[${index}] carries a non-public field: ${field}`);
    }
  }

  // Picks: rank, order, score/term/reason agreement, citations.
  let previous = null;
  for (const [position, pick] of picks.entries()) {
    const at = `picks[${position}]`;
    if (num(pick.rank) !== position + 1) issues.push(`${at}.rank must be ${position + 1}`);
    if (previous && comparePicks(previous, pick) > 0) {
      issues.push(`${at} breaks the stable order (-score.total, slug, stakeAddress)`);
    }
    previous = pick;
    const terms = pick?.score?.terms;
    if (!Array.isArray(terms)) {
      issues.push(`${at}.score.terms must be an array`);
      continue;
    }
    if (terms.map((term) => term.key).join(',') !== TERM_KEYS.join(',')) {
      issues.push(`${at}.score.terms must be the fixed term set in order (${TERM_KEYS.join(',')})`);
    }
    for (const term of terms) {
      if (num(term.weight) !== num(WEIGHTS[term.key])) issues.push(`${at}.score.terms[${term.key}] weight drifted from WEIGHTS`);
      if (typeof term.hit !== 'boolean') issues.push(`${at}.score.terms[${term.key}].hit must be a boolean`);
      if (!str(term.note)) issues.push(`${at}.score.terms[${term.key}].note is required`);
    }
    const expected = scoreTotal(terms);
    if (num(pick?.score?.total) !== expected) issues.push(`${at}.score.total (${pick?.score?.total}) must equal the hit terms (${expected})`);
    const reason = str(pick.reason);
    if (!reason) issues.push(`${at}.reason is required`);
    else if (!reason.endsWith(`⇒ ${num(pick?.score?.total)}`)) issues.push(`${at}.reason must end with the score it explains`);
    const cited = pick.cited;
    if (!Array.isArray(cited) || cited.length === 0) {
      issues.push(`${at}.cited must be a non-empty array (every pick cites its 判据来源)`);
      continue;
    }
    for (const citation of cited) {
      const field = str(citation?.field);
      if (!field) {
        issues.push(`${at}.cited has an entry without a field`);
        continue;
      }
      if (!/^sources\[\d+\]\./.test(field)) issues.push(`${at}.cited must point into sources (got ${field})`);
      const resolved = resolveField(record, field);
      if (resolved === undefined) issues.push(`${at}.cited points at a missing field: ${field}`);
      else if (!sameValue(resolved, citation.value)) {
        issues.push(`${at}.cited ${field} does not resolve to the cited value`);
      }
    }
    const stake = str(pick.stakeAddress);
    const source = sources.find((candidate) => str(candidate?.stakeAddress) === stake);
    if (!source) issues.push(`${at}.stakeAddress ${stake || '(empty)'} is not in sources[]`);
    else if (!cited.some((citation) => sameValue(citation, { field: `sources[${sources.indexOf(source)}].stakeAddress`, value: stake }))) {
      issues.push(`${at}.cited must name its source record (sources[${sources.indexOf(source)}].stakeAddress)`);
    }
  }
  return issues;
}
