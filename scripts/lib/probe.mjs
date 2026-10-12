// Read-only endpoint probe (PRD-NET-03 input).
//
// WHY THIS EXISTS: the chain records what a node *declares* (the `endpoint` in
// the staked NFT's `data.value`, or the stake `message`) but never whether that
// endpoint answers. The requirement's `offline` state means "declared and not
// reaching", so it needs one piece of evidence the ledger cannot carry — a
// point-in-time reachability probe. This module is that input, and it is
// deliberately tiny:
//
//   * READ-ONLY: HTTP HEAD (falling back to GET on 405/501, with the body dumped)
//     — no POST/PUT, no query string built from node data, no cookies.
//   * BOUNDED: `timeoutMs` is required (the CLI defaults it), and the CLI caps how
//     many endpoints one refresh may probe.
//   * FAILURE IS DATA, NOT AN EXCEPTION: a timeout, DNS failure or TLS refusal
//     resolves to `{reachable: false, detail: '<code>'}`; the code is recorded
//     verbatim so an operator reads what actually happened. A probe NEVER changes
//     chain facts — it only annotates the projection the CLI writes.
//   * REDIRECTS ARE NOT FOLLOWED: a 3xx therefore counts as "the endpoint
//     answered" without this tool walking a node's redirect chain.
//   * NO PROXY, EVER (measured 2026-10-12): this shell exports
//     `NODE_USE_ENV_PROXY=1` + `http_proxy=http://127.0.0.1:10808`, and under those
//     a child process's `fetch` routes even `http://127.0.0.1:<port>/` through the
//     proxy — the local endpoint then times out and a LIVE node is reported
//     `offline`. That is a false fact, so the probe uses `node:http`/`node:https`
//     directly (they ignore environment proxies): the answer must be "did THIS
//     machine reach THIS endpoint", not "did a proxy". `fetchImpl` stays
//     injectable for tests, whose fakes must follow the same two rules.

import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

/** What counts as "the endpoint answered": any HTTP status, and 2xx–3xx as reached. */
export function isAnswered(status) {
  return Number.isInteger(status) && status > 0;
}

/**
 * A `fetch`-shaped request with the semantics the probe needs, over node:http /
 * node:https so environment proxies cannot silently reroute it.
 * Resolves to `{ status, arrayBuffer() }`; rejects on a transport failure.
 */
function requestNoProxy(url, { method = 'GET', timeoutMs = 3000, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const send = parsed.protocol === 'https:' ? httpsRequest : httpRequest;
    // `agent: false` keeps no connection pool alive: a probe must not leave
    // sockets behind that later hold a test's `server.close()` open.
    const req = send(
      url,
      { method, headers, agent: false, timeout: timeoutMs },
      (res) => {
        // Drain and discard the body — only the status is evidence. Never inspect
        // (or trust) a node's response payload.
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode ?? 0, arrayBuffer: async () => new ArrayBuffer(0) }));
      },
    );
    req.on('timeout', () => {
      const err = new Error(`timeout after ${timeoutMs}ms`);
      err.code = 'ETIMEDOUT';
      req.destroy(err);
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Probe one http(s) endpoint. Resolves — never rejects — to
 * `{ endpoint, reachable, detail, status }`. `detail` is either the HTTP status
 * (`http 200`) or the raw error code/message (`ECONNREFUSED`, `timeout after 2500ms`).
 */
export async function probeEndpoint(endpoint, { timeoutMs = 3000, fetchImpl = requestNoProxy } = {}) {
  const url = String(endpoint ?? '').trim();
  const record = { endpoint: url, reachable: false, detail: '', status: 0 };
  if (!url) return { ...record, detail: 'no endpoint declared' };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ...record, detail: 'unparsable endpoint (not an absolute URL)' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ...record, detail: `unsupported scheme ${parsed.protocol}` };
  }
  const budget = Number(timeoutMs) > 0 ? Number(timeoutMs) : 3000;

  const attempt = async (method) => {
    try {
      const response = await fetchImpl(url, {
        method,
        // Documented contract for injectable implementations: never auto-follow.
        redirect: 'manual',
        timeoutMs: budget,
        headers: { 'user-agent': 'arcblog-registry-probe/1 (read-only reachability check)' },
      });
      const status = Number(response?.status ?? 0);
      try {
        await response?.arrayBuffer?.();
      } catch {
        /* body unreadable — the status is the answer */
      }
      return { status, answered: isAnswered(status) };
    } catch (err) {
      const message = String(err?.message ?? err);
      const aborted = err?.name === 'AbortError' || err?.name === 'TimeoutError' || /abort/i.test(message);
      const timedOut = err?.code === 'ETIMEDOUT' || /timeout/i.test(message);
      return {
        status: 0,
        answered: false,
        error: aborted || timedOut ? `timeout after ${budget}ms` : String(err?.code || message),
      };
    }
  };

  let result = await attempt('HEAD');
  // A HEAD the endpoint does not implement (405) or rejects without an answer
  // still proves the host is alive; one GET retry is the documented fallback. A
  // hard network failure (no status at all) is NOT retried — probing a dead host
  // twice only doubles the timeout.
  if (result.status === 405 || result.status === 501) result = await attempt('GET');
  if (result.status === 0) return { ...record, detail: result.error || 'no response' };
  return {
    ...record,
    reachable: isAnswered(result.status),
    detail: `http ${result.status}`,
    status: result.status,
  };
}

/**
 * Probe a set of nodes, one at a time (a refresh should not open a connection to
 * every node at once). `nodes` = `[{stakeAddress, endpoint}]`; the result is keyed
 * by stakeAddress, so the projection can look a node up by the same id it emits.
 */
export async function probeEndpoints(nodes = [], { timeoutMs = 3000, limit = 200, fetchImpl = requestNoProxy } = {}) {
  const probes = {};
  let mapped = 0;
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const stakeAddress = String(node?.stakeAddress ?? '');
    const endpoint = String(node?.endpoint ?? '').trim();
    if (!stakeAddress) continue;
    if (!endpoint) {
      // No declared endpoint ⇒ the node is `stale`; a probe of nothing would
      // only invent an answer.
      probes[stakeAddress] = { endpoint: '', reachable: false, detail: 'no endpoint declared', status: 0 };
      continue;
    }
    if (mapped >= limit) {
      probes[stakeAddress] = { endpoint, reachable: null, detail: `probe skipped: --probe-limit ${limit} reached`, status: 0 };
      continue;
    }
    probes[stakeAddress] = await probeEndpoint(endpoint, { timeoutMs, fetchImpl });
    mapped += 1;
  }
  return probes;
}
