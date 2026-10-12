// Reading a DISCOVERED node's public content (PRD-AGT-06).
//
// PRD-AGT-06: "agent 读链上注册表得到全部节点，再按节点 endpoint 读内容". The first
// half is `list_studios`/`get_studio` over the AFS projection; this module is
// the second half — a read-only HTTP read of another node's public surface, at
// the endpoint the registry carries.
//
// NO API IS INVENTED HERE. The two surfaces below were measured on the running
// node (2026-10-12) and are the ones the node's own agent card advertises:
//
//   * `<endpoint>/p/llms.txt` — the ARC Runtime's generated agent index,
//     `GET` → 200 `text/plain` (540 B). This is the only custom-read surface a
//     blocklet can serve: root-level custom endpoints return the app shell with
//     `text/html` (docs/05-开发文档/02 B1), and `<endpoint>/llms-full.txt`
//     answers with that shell, not text.
//   * `<endpoint>/api/afs/rpc` — the Runtime's AFS-over-HTTP JSON-RPC, the
//     transport `/p/llms.txt` and `/.well-known/mcp.json` both name for
//     "generic AFS public read". A request body is `{"type":"<op>","path":"…"}`;
//     the op set is enforced here, so this client can only ever READ.
//
// The read is bounded and never silently succeeds: an unreachable endpoint, an
// HTTP error, a non-JSON answer or a remote AFS refusal each fail closed with
// its own code and the URL that produced it.

import { fail } from './arc.mjs';

/** The Runtime-generated agent index every node serves (measured 200 text/plain). */
export const NODE_AGENT_SURFACE = '/p/llms.txt';
/** The Runtime's AFS-over-HTTP JSON-RPC path (measured anonymous public read). */
export const NODE_AFS_RPC_PATH = '/api/afs/rpc';
/** Ops this client may send. A write op is not expressible here — by construction. */
export const REMOTE_READ_OPS = ['list', 'read', 'stat', 'search'];
/** Bodies are truncated at this size; `truncated: true` says so. */
export const CONTENT_MAX_BYTES = 64 * 1024;
/** Per-request budget. A hung remote node must not hang the agent turn. */
export const DEFAULT_TIMEOUT_MS = 8000;

/** `https://host/` + `p/llms.txt` → one absolute URL; endpoint must be http(s). */
export function nodeSurfaceUrl(endpoint, path = NODE_AGENT_SURFACE) {
  const base = String(endpoint ?? '').trim().replace(/\/+$/, '');
  if (!base) {
    fail(
      'NO_ENDPOINT',
      'this node record carries no endpoint — the operator must stake one, then: ' +
        'node scripts/arcblog-network.mjs registry refresh',
    );
  }
  if (!/^https?:\/\//i.test(base)) fail('NO_ENDPOINT', `node endpoint is not an http(s) origin: ${base}`);
  const suffix = String(path ?? '').trim() || NODE_AGENT_SURFACE;
  return `${base}${suffix.startsWith('/') ? '' : '/'}${suffix}`;
}

/** One bounded request; a transport failure is a fail-closed code, never a throw-through. */
async function request(url, init, { timeoutMs, fetchImpl, method }) {
  try {
    return await fetchImpl(url, { ...init, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    fail(
      'REMOTE_UNREACHABLE',
      `${method} ${url} failed after ${timeoutMs}ms: ${err?.message ?? err} ` +
        '(the CLI host must be able to reach the endpoint the registry carries)',
    );
  }
}

/**
 * Read one public text surface from another node (read-only `GET`).
 * A non-2xx answer is NOT hidden: `ok` is false and the status is returned, so a
 * caller sees exactly what the remote node said (e.g. a 404 for `/p/rss.xml`
 * before the operator generated it).
 */
export async function fetchNodeSurface({
  endpoint,
  path = NODE_AGENT_SURFACE,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = new Date().toISOString(),
} = {}) {
  const url = nodeSurfaceUrl(endpoint, path);
  const response = await request(
    url,
    { method: 'GET', headers: { accept: 'text/plain, application/json, application/xml, text/xml, */*' } },
    { timeoutMs, fetchImpl, method: 'GET' },
  );
  const text = await response.text();
  const over = text.length > CONTENT_MAX_BYTES;
  return {
    endpoint: String(endpoint).trim().replace(/\/+$/, ''),
    path: String(path ?? '').trim() || NODE_AGENT_SURFACE,
    url,
    status: response.status,
    ok: Boolean(response.ok),
    contentType: String(response.headers?.get?.('content-type') ?? ''),
    bytes: Buffer.byteLength(text),
    truncated: over,
    body: over ? `${text.slice(0, CONTENT_MAX_BYTES)}\n…[truncated at ${CONTENT_MAX_BYTES} bytes]` : text,
    fetchedAt: now,
  };
}

/**
 * Anonymous AFS read on another node (the Runtime's public read face).
 * `op` is restricted to `REMOTE_READ_OPS` and the path to this blocklet's own
 * instance space, so this cannot become a generic fetch-and-write proxy.
 */
export async function fetchNodeAfs({
  endpoint,
  path,
  op = 'list',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = new Date().toISOString(),
} = {}) {
  const remotePath = String(path ?? '').trim();
  if (!remotePath.startsWith('/instance/app/arcblog/')) {
    fail(
      'VALIDATION',
      `remote AFS path must be inside /instance/app/arcblog/ (got: ${remotePath || '(none)'}) — ` +
        'this reads ArcBlog public surfaces, not another blocklet\'s space',
    );
  }
  const requested = String(op ?? '').trim() || 'list';
  if (!REMOTE_READ_OPS.includes(requested)) {
    fail('VALIDATION', `remote AFS op must be a read op: ${REMOTE_READ_OPS.join(', ')} (got: ${requested})`);
  }
  const base = String(endpoint ?? '').trim().replace(/\/+$/, '');
  const url = nodeSurfaceUrl(base, NODE_AFS_RPC_PATH);
  const response = await request(
    url,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ type: requested, path: remotePath }),
    },
    { timeoutMs, fetchImpl, method: 'POST' },
  );
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!payload || typeof payload !== 'object') {
    fail('REMOTE_BAD_RESPONSE', `${url} did not answer the AFS RPC JSON envelope (status ${response.status})`);
  }
  if (!payload.ok) {
    fail(
      'REMOTE_AFS_ERROR',
      `${requested} ${remotePath} on ${base} answered ${payload.code ? `${payload.code}: ` : ''}${payload.error ?? 'unknown error'}`,
    );
  }
  return {
    endpoint: base,
    path: remotePath,
    op: requested,
    url,
    status: response.status,
    data: payload.data,
    fetchedAt: now,
  };
}
