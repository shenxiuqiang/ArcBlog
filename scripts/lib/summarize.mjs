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

// ---------------------------------------------------------------------------
// PRD-AGT-08 (chat) — the deterministic, citation-backed half.
//
// WHAT THIS IS: `summarize ask` answers a question about ONE already-written
// summary record. There is no model here and no second data source: the answer
// is assembled from the record's own fields, and EVERY assertion carries `cited`
// pointers (`picks[0].reason`, `picks[0].score.terms[2].note`, `sources[1].url`,
// …) that `validateSummaryAnswer` re-resolves against that same record before
// the answer is printed. An answer that cannot cite the record is not guessed:
// it says `记录里没有依据` (`basis: 'none'`, empty `cited`).
//
// WHY IT IS NOT A CHATBOT (docs/05-开发文档/02 B11, 02a P3): the AUP page surface
// has no LLM primitive and may not hold a key, and `05-AGT §4` forbids binding an
// external agent framework — so the page renders the copyable `ask` command and
// the natural-language layer stays outside the node (the CLI's `--llm` wiring
// point hands the deterministic context to an operator-side command; this build
// wires none).
//
// DETERMINISM: intent selection is keyword scoring over a FIXED catalogue with a
// fixed tie break (catalogue order), and every string is built from record
// fields, so the same record + same question always produce the same answer.

/** The exact sentence an answer must carry when the record has no 判据. */
export const NO_BASIS_NOTE = '记录里没有依据';

/**
 * The fixed intent catalogue. `keywords` are matched case-insensitively as
 * substrings of the question; the intent with the most distinct hits wins and a
 * tie is broken by this array's order (never by the object key order).
 */
export const ASK_INTENTS = Object.freeze([
  {
    key: 'pick-reason',
    title: '为什么入选 / why a node was picked',
    keywords: ['为什么', '入选', '判据', '依据', 'why', 'reason', 'picked', 'selected'],
  },
  {
    key: 'score-terms',
    title: '评分与权重 / score terms and weights',
    keywords: ['评分', '权重', '得分', '打分', '加了多少分', 'score', 'weight', 'term', 'scoring'],
  },
  {
    key: 'ranking',
    title: '排名与顺序 / rank and order',
    keywords: ['排名', '排序', '顺序', '第几', '最高分', 'rank', 'order', 'sort', 'top', 'best'],
  },
  {
    key: 'skipped',
    title: '跳过与失败 / skipped nodes',
    keywords: ['跳过', '失败', '不可达', '错误', '没读', 'skip', 'skipped', 'unreachable', 'failed', 'error'],
  },
  {
    key: 'sources',
    title: '来源节点 / source nodes',
    keywords: ['来源', '节点', '地址', '端点', '链接', 'source', 'node', 'stake', 'endpoint', 'url'],
  },
  {
    key: 'coverage',
    title: '口径与覆盖 / total and coverage',
    keywords: ['口径', '覆盖', '总数', '多少条', '几条', '条数', '时间', 'coverage', 'total', 'how many', 'count', 'when'],
  },
]);

/** The catalogue's keys, in the fixed order tie-breaking uses. */
export const ASK_INTENT_KEYS = Object.freeze(ASK_INTENTS.map((intent) => intent.key));

const NO_BASIS_ANSWER =
  `${NO_BASIS_NOTE}：该问题在汇总记录里没有可引用的字段（记录只包含 picks / sources / skipped / weights / totalNote / stateNote）。` +
  ' 请改问记录覆盖的问题：为什么入选、评分权重、排名顺序、跳过节点、来源节点、口径覆盖。';

function citation(record, field) {
  return { field, value: resolveField(record, field) };
}

/** Every term index of one pick that actually hit, in `score.terms` order. */
function hitTermIndexes(pick) {
  const terms = Array.isArray(pick?.score?.terms) ? pick.score.terms : [];
  const out = [];
  terms.forEach((term, index) => {
    if (term?.hit === true) out.push(index);
  });
  return out;
}

function pickHead(pick) {
  return (
    `picks[${pick.index}] rank=${num(pick.rank)} score=${num(pick?.score?.total)}` +
    ` slug=${str(pick.slug) || '(no slug)'} stake=${str(pick.stakeAddress) || '(no stake)'}`
  );
}

function pickReasonAssertion(record, pick) {
  const at = `picks[${pick.index}]`;
  const cited = [
    citation(record, `${at}.reason`),
    citation(record, `${at}.rank`),
    citation(record, `${at}.score.total`),
    citation(record, `${at}.stakeAddress`),
  ];
  for (const index of hitTermIndexes(pick)) cited.push(citation(record, `${at}.score.terms[${index}].note`));
  return { claim: `${pickHead(pick)} — ${str(pick.reason)}`, cited };
}

function rankingAssertion(record, pick) {
  const at = `picks[${pick.index}]`;
  return {
    claim: `${pickHead(pick)} (endpoint=${str(pick.endpoint) || '(none)'})`,
    cited: [
      citation(record, `${at}.rank`),
      citation(record, `${at}.score.total`),
      citation(record, `${at}.slug`),
      citation(record, `${at}.endpoint`),
    ],
  };
}

function termAssertions(record, pick) {
  const at = `picks[${pick.index}]`;
  const terms = Array.isArray(pick?.score?.terms) ? pick.score.terms : [];
  return terms.map((term, index) => ({
    claim: `${at}.score.terms[${index}] ${str(term.key)} weight=${num(term.weight)} hit=${term.hit === true ? 'true' : 'false'} note=${str(term.note)}`,
    cited: [
      citation(record, `${at}.score.terms[${index}].key`),
      citation(record, `${at}.score.terms[${index}].weight`),
      citation(record, `${at}.score.terms[${index}].hit`),
      citation(record, `${at}.score.terms[${index}].note`),
    ],
  }));
}

/**
 * The answer builders, one per intent. Each returns `{ answer, assertions }`
 * where every assertion carries its own citations; the caller flattens them.
 */
const ASK_BUILDERS = Object.freeze({
  'pick-reason': (record) => {
    const picks = record.picks;
    if (!picks.length) {
      return {
        answer:
          `本记录 id=${str(record.id)} 没有入选记录（pickCount=0），因此没有"哪条入选"可解释：` +
          ` ${str(record.stateNote)}`,
        assertions: [
          {
            claim: `pickCount=${num(record.pickCount)}，empty=${str(record.empty) || '(unset)'}`,
            cited: [citation(record, 'pickCount'), citation(record, 'empty'), citation(record, 'stateNote')],
          },
        ],
      };
    }
    const assertions = picks.map((pick, index) => pickReasonAssertion(record, { ...pick, index }));
    return {
      answer:
        `本记录 id=${str(record.id)} 的 ${picks.length} 条入选各有判据（reason 与 score.terms 同源，cited 逐条回填）：` +
        ` ${picks.map((pick) => `#${num(pick.rank)} ${str(pick.slug)} (${str(pick.stakeAddress) || 'no stake'}) ⇒ ${num(pick?.score?.total)}`).join('；')}`,
      assertions,
    };
  },

  'score-terms': (record) => {
    const assertions = Object.entries(record.weights ?? {}).map(([key, weight]) => ({
      claim: `weights.${key} = ${num(weight)}`,
      cited: [citation(record, `weights.${key}`)],
    }));
    const picks = record.picks;
    if (!picks.length) {
      assertions.push({
        claim: `pickCount=${num(record.pickCount)}：没有入选，权重未作用于任何节点`,
        cited: [citation(record, 'pickCount'), citation(record, 'stateNote')],
      });
    } else {
      termAssertions(record, { ...picks[0], index: 0 }).forEach((assertion) => assertions.push(assertion));
    }
    return {
      answer:
        `评分是源码固定常量（不读时钟、不读随机、不读 LLM）：` +
        ` ${Object.entries(record.weights ?? {}).map(([key, weight]) => `${key}(+${num(weight)})`).join(' · ')}；` +
        ` 排序键 = -score.total, slug, stakeAddress（totalNote 自述口径）。`,
      assertions,
    };
  },

  ranking: (record) => {
    const picks = record.picks;
    if (!picks.length) {
      return {
        answer: `本记录 id=${str(record.id)} 没有入选记录（pickCount=0），没有排名可引用： ${str(record.stateNote)}`,
        assertions: [
          {
            claim: `pickCount=${num(record.pickCount)}，empty=${str(record.empty) || '(unset)'}`,
            cited: [citation(record, 'pickCount'), citation(record, 'empty'), citation(record, 'stateNote')],
          },
        ],
      };
    }
    return {
      answer:
        `排名按稳定全序键 -score.total → slug → stakeAddress 落定（同一输入两次排序一致）：` +
        ` ${picks.map((pick) => `#${num(pick.rank)} ${str(pick.slug)} (${str(pick.stakeAddress) || 'no stake'}, ${num(pick?.score?.total)})`).join(' → ')}`,
      assertions: picks.map((pick, index) => rankingAssertion(record, { ...pick, index })),
    };
  },

  skipped: (record) => {
    const skipped = Array.isArray(record.skipped) ? record.skipped : [];
    if (!skipped.length) {
      return {
        answer:
          `本记录 id=${str(record.id)} 没有跳过节点：skipped[] 为空（${num(record.total)} 条节点中 ${num(record.pickCount)} 条入选，` +
          ` 其余由记录自身口径说明）。${str(record.stateNote)}`,
        assertions: [
          {
            claim: `skipped=[] · total=${num(record.total)} · pickCount=${num(record.pickCount)}`,
            cited: [citation(record, 'skipped'), citation(record, 'total'), citation(record, 'pickCount'), citation(record, 'stateNote')],
          },
        ],
      };
    }
    return {
      answer: `本记录 id=${str(record.id)} 跳过 ${skipped.length} 条，每条带自己的 code/error（失败是记录下来的值，不是静默丢弃）：`,
      assertions: skipped.map((entry, index) => ({
        claim: `skipped[${index}] ${str(entry.stakeAddress) || '(no stake)'} ${str(entry.code)} — ${str(entry.error)}`,
        cited: [
          citation(record, `skipped[${index}].stakeAddress`),
          citation(record, `skipped[${index}].code`),
          citation(record, `skipped[${index}].error`),
        ],
      })),
    };
  },

  sources: (record) => {
    const sources = Array.isArray(record.sources) ? record.sources : [];
    if (!sources.length) {
      return {
        answer: `本记录 id=${str(record.id)} 的 sources[] 为空（total=0），没有来源节点可引用： ${str(record.stateNote)}`,
        assertions: [
          {
            claim: `sources=[] · total=${num(record.total)}`,
            cited: [citation(record, 'sources'), citation(record, 'total'), citation(record, 'stateNote')],
          },
        ],
      };
    }
    return {
      answer: `本记录 id=${str(record.id)} 的来源节点（每条读到的公开面只留 hash 与截断预览）：`,
      assertions: sources.map((source, index) => ({
        claim:
          `sources[${index}] ${str(source.stakeAddress) || '(no stake)'} ${str(source.url) || '(no url)'}` +
          ` HTTP ${num(source.status)} ${str(source.contentType) || '(no content-type)'} ${num(source.bytes)}B`,
        cited: [
          citation(record, `sources[${index}].stakeAddress`),
          citation(record, `sources[${index}].url`),
          citation(record, `sources[${index}].status`),
          citation(record, `sources[${index}].contentType`),
          citation(record, `sources[${index}].bytes`),
          citation(record, `sources[${index}].bodyHash`),
        ],
      })),
    };
  },

  coverage: (record) => ({
    answer:
      `本记录的覆盖口径由它自己的字段给出：registryRefreshedAt=${str(record.registryRefreshedAt) || '(unset)'}、` +
      ` total=${num(record.total)}、pickCount=${num(record.pickCount)}、skipped=${(record.skipped ?? []).length}、` +
      ` truncated=${str(record.truncated) || '(no)'}。${str(record.totalNote)}`,
    assertions: [
      { claim: str(record.totalNote), cited: [citation(record, 'totalNote'), citation(record, 'registryRefreshedAt'), citation(record, 'total'), citation(record, 'registryTotal')] },
      { claim: str(record.stateNote), cited: [citation(record, 'stateNote'), citation(record, 'pickCount'), citation(record, 'truncated'), citation(record, 'empty')] },
      { claim: `weights 自述：${Object.keys(record.weights ?? {}).join(', ')}`, cited: [citation(record, 'weights')] },
    ],
  }),
});

/**
 * Which intent a question hits: the most distinct keyword hits, ties broken by
 * `ASK_INTENT_KEYS` order. `''` means the record is not asked anything it covers.
 */
export function matchAskIntent(question) {
  const text = String(question ?? '').toLowerCase();
  if (!text.trim()) return { key: '', hits: [] };
  let best = { key: '', hits: [] };
  for (const intent of ASK_INTENTS) {
    const hits = intent.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
    if (!hits.length) continue;
    if (hits.length > best.hits.length) best = { key: intent.key, hits };
  }
  return best;
}

/**
 * Answer ONE question from ONE summary record. Pure: no I/O, no clock, no model.
 * Returns the answer object `validateSummaryAnswer` re-checks before it ships.
 */
export function answerFromSummary(record, question) {
  const asked = str(question);
  if (!asked) throw invalid('question is required (--question <q>)');
  if (!record || typeof record !== 'object') throw invalid('a summary record is required to answer');
  const id = str(record.id);
  const match = matchAskIntent(asked);
  if (!match.key) {
    return {
      id,
      question: asked,
      matched: '',
      matchedKeywords: [],
      basis: 'none',
      answerable: false,
      answer: NO_BASIS_ANSWER,
      assertions: [],
      cited: [],
    };
  }
  const built = ASK_BUILDERS[match.key](record);
  const cited = [];
  for (const assertion of built.assertions) {
    for (const entry of assertion.cited) {
      if (!cited.some((seen) => sameValue(seen, entry))) cited.push(entry);
    }
  }
  return {
    id,
    question: asked,
    matched: match.key,
    matchedKeywords: match.hits,
    basis: cited.length ? 'record' : 'none',
    answerable: cited.length > 0,
    answer: built.answer,
    assertions: built.assertions,
    cited,
  };
}

const POINTER = /^[A-Za-z0-9_]+(?:\[\d+\])?(?:\.[A-Za-z0-9_]+(?:\[\d+\])?)*$/;

/**
 * Machine-check one answer against the record it claims to speak about. This is
 * the AGT-08 判定式 as code: `cited` must be non-empty for an answerable
 * question, every pointer must resolve inside THAT record to the value it
 * claims, every assertion must carry at least one resolvable citation, and an
 * `basis: 'none'` answer must carry none and say `记录里没有依据`.
 */
export function validateSummaryAnswer(answer, record) {
  const issues = [];
  if (!answer || typeof answer !== 'object') return ['answer must be an object'];
  if (!record || typeof record !== 'object') return ['a summary record is required to check an answer'];
  if (!str(answer.id)) issues.push('answer.id is required');
  else if (str(answer.id) !== str(record.id)) issues.push(`answer.id (${str(answer.id)}) must be the record it cites (${str(record.id)})`);
  if (!str(answer.question)) issues.push('answer.question is required');
  if (!str(answer.answer)) issues.push('answer.answer is required');
  if (!(answer.basis === 'record' || answer.basis === 'none')) issues.push("answer.basis must be 'record' or 'none'");
  if (!Array.isArray(answer.assertions)) issues.push('answer.assertions must be an array');
  if (!Array.isArray(answer.cited)) issues.push('answer.cited must be an array');
  if (!Array.isArray(answer.assertions) || !Array.isArray(answer.cited)) return issues;

  if (answer.basis === 'none') {
    if (answer.assertions.length) issues.push("a basis:'none' answer must not assert anything");
    if (answer.cited.length) issues.push("a basis:'none' answer must not cite anything");
    if (!str(answer.answer).includes(NO_BASIS_NOTE)) {
      issues.push(`a basis:'none' answer must say ${NO_BASIS_NOTE} instead of generalising`);
    }
    return issues;
  }

  if (!answer.cited.length) issues.push('answer.cited must be non-empty for an answerable question (each assertion cites its 判据)');
  for (const [index, entry] of answer.cited.entries()) {
    const field = str(entry?.field);
    if (!field) {
      issues.push(`answer.cited[${index}] has no field`);
      continue;
    }
    if (!POINTER.test(field)) issues.push(`answer.cited[${index}] is not a record pointer: ${field}`);
    const resolved = resolveField(record, field);
    if (resolved === undefined) issues.push(`answer.cited[${index}] points at a field this record does not have: ${field}`);
    else if (!sameValue(resolved, entry.value)) issues.push(`answer.cited[${index}] ${field} does not resolve to the cited value`);
  }
  for (const [index, assertion] of answer.assertions.entries()) {
    if (!str(assertion?.claim)) issues.push(`answer.assertions[${index}].claim is required`);
    const cited = Array.isArray(assertion?.cited) ? assertion.cited : [];
    if (!cited.length) {
      issues.push(`answer.assertions[${index}] must cite the record fields it read`);
      continue;
    }
    for (const entry of cited) {
      const field = str(entry?.field);
      if (!field || resolveField(record, field) === undefined) {
        issues.push(`answer.assertions[${index}] cites a missing field: ${field || '(empty)'}`);
      } else if (!sameValue(resolveField(record, field), entry.value)) {
        issues.push(`answer.assertions[${index}] ${field} does not resolve to the cited value`);
      }
    }
  }
  return issues;
}
