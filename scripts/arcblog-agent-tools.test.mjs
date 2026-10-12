#!/usr/bin/env node
// Fast guard: the agent tool table's declared `params` must cover the flags its
// handler really reads.
//
// WHY: `AGENT_TOOLS` (scripts/lib/agents.mjs) is the machine-readable description of the
// agent surface — it is what a reader (or a future MCP client) consults instead of the
// code. Two entries had fallen behind reality (measured 2026-10-12): `get_studio` declared
// only `stakeAddress` while its handler reads --content/--afs/--afs-op/--path/--endpoint,
// and `search_posts` declared [] while it reads --query/--limit/--category. Worse, the
// shipped `agents/arcblog-agent/system.md` DID document `--afs` — so the prose and the table
// disagreed with each other and only the code was right.
//
// Scope: the read tools whose handlers live in scripts/arcblog-agent.mjs. Infrastructure
// flags (--instance/--json/--help/--now) are not params and are skipped by name.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = join(REPO, 'scripts', 'lib', 'agents.mjs');
const CLI = join(REPO, 'scripts', 'arcblog-agent.mjs');
const INFRA = new Set(['instance', 'json', 'help', 'now', 'tool']);

/** The tool table's declared params, keyed by tool name. */
export function declaredParams() {
  const src = readFileSync(LIB, 'utf8');
  const table = src.slice(src.indexOf('export const AGENT_TOOLS'), src.indexOf('];', src.indexOf('export const AGENT_TOOLS')));
  const out = {};
  for (const chunk of table.split(/\n\s*\{ name: '/).slice(1)) {
    const name = chunk.split("'")[0];
    const m = /params: \[([^\]]*)\]/.exec(chunk);
    out[name] = m ? m[1].split(',').map((p) => p.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : [];
  }
  return out;
}

/** One handler body from the CLI, or '' when the tool has no handler there. */
function handlerBody(src, name) {
  const m = new RegExp('\\n  (?:async\\s+)?' + name + '\\(opts, instance\\)\\s*\\{').exec(src);
  if (!m) return '';
  const start = src.indexOf('{', m.index);
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i);
    }
  }
  return '';
}

/** Flags a handler reads, normalised to the table's camelCase style. */
export function handlerFlags(src, name) {
  const body = handlerBody(src, name);
  const flags = new Set();
  for (const m of body.matchAll(/opts(?:\.([\w-]+)|\[['"]([\w-]+)['"]\])/g)) flags.add(m[1] ?? m[2]);
  for (const m of body.matchAll(/required\(opts,\s*'([\w-]+)'/g)) flags.add(m[1]);
  return [...flags]
    .filter((f) => !INFRA.has(f))
    .map((f) => f.replace(/-([a-z])/g, (_, c) => c.toUpperCase()))
    .sort();
}

test('every flag a tool handler reads is declared in the tool table', () => {
  const declared = declaredParams();
  const src = readFileSync(CLI, 'utf8');
  assert.ok(Object.keys(declared).length >= 10, `expected a full tool table, found ${Object.keys(declared).length}`);
  const gaps = [];
  let compared = 0;
  for (const [name, params] of Object.entries(declared)) {
    const flags = handlerFlags(src, name);
    if (!handlerBody(src, name)) continue; // write tools dispatch elsewhere
    compared += 1;
    const missing = flags.filter((f) => !params.includes(f));
    if (missing.length) gaps.push(`${name}: ${missing.join(', ')}`);
  }
  assert.ok(compared >= 6, `expected to compare several handlers, compared ${compared}`);
  assert.deepEqual(gaps, [], `tool params not declared: ${gaps.join(' | ')}`);
});

test('the extractor really works (guard against a silently empty comparison)', () => {
  const src = readFileSync(CLI, 'utf8');
  assert.deepEqual(handlerFlags(src, 'search_posts'), ['category', 'limit', 'query']);
  assert.deepEqual(handlerFlags(src, 'get_studio'), ['afs', 'afsOp', 'content', 'endpoint', 'path', 'stakeAddress']);
  assert.deepEqual(handlerFlags(src, 'get_post'), ['slug']);
  assert.deepEqual(handlerFlags(src, 'this_tool_does_not_exist'), []);
});

/**
 * Three-way consistency, added 2026-10-12: the tool catalogue (code), the MCP declaration the
 * runtime publishes (agents/<name>/agent.json) and the manifest's guest grants. Measured before
 * writing it: all eight read tools' resource paths are covered by the declaration's three scopes
 * (posts/**, categories/**, node/**), and all three scopes are guest-readable in blocklet.yaml —
 * true today, checked by nobody, and a drift here is invisible until an MCP client is denied
 * while our own CLI succeeds.
 */
test('the MCP declaration covers every read tool, and the manifest grants cover the declaration', async () => {
  const { AGENT_TOOLS } = await import(LIB);
  const declaration = JSON.parse(readFileSync(join(REPO, 'agents', 'arcblog-agent', 'agent.json'), 'utf8'));
  const scopes = declaration.tools.map((t) => ({
    path: String(t.path).replace(/\/\*\*$/, ''),
    ops: [...t.ops].sort(),
  }));
  assert.ok(scopes.length >= 1, 'the declaration must expose at least one scope');

  // (1) read-only declaration: a write op here would promise the MCP surface more than spec §59's
  // policy allows; widening it is a deliberate edit of this expectation.
  const READ_OPS = ['list', 'read', 'stat'];
  const writable = scopes.filter((s) => s.ops.some((op) => !READ_OPS.includes(op)));
  assert.deepEqual(writable, [], `declared scopes with non-read ops: ${JSON.stringify(writable)}`);

  // (2) every read tool's resource path sits inside a declared scope
  const reads = Object.values(AGENT_TOOLS).filter((t) => t.kind === 'read');
  assert.ok(reads.length >= 8, `read tools found: ${reads.length}`);
  const uncovered = reads
    .filter((t) => {
      const path = t.resource?.path ?? '';
      return !scopes.some((s) => path === s.path || path.startsWith(s.path + '/'));
    })
    .map((t) => `${t.name} (${t.resource?.path})`);
  assert.deepEqual(uncovered, [], `read tools outside the MCP declaration: ${uncovered.join(', ')}`);

  // (3) every declared scope is guest-readable in the manifest (else the declaration lies)
  const manifest = readFileSync(join(REPO, 'blocklet.yaml'), 'utf8');
  const guestPrefixes = [...manifest.matchAll(/networkRead:\n((?:\s+.*\n)+?)(?=\n\S|\Z)/gm)]
    .flatMap((m) => [...m[1].matchAll(/path:\s*(\S+)\n\s+role:\s*guest/g)].map((x) => x[1]));
  assert.ok(guestPrefixes.length >= 3, `guest prefixes parsed: ${guestPrefixes.length}`);
  const denied = scopes
    .filter((s) => !guestPrefixes.some((p) => s.path === p || s.path.startsWith(p)))
    .map((s) => s.path);
  assert.deepEqual(denied, [], `declared scopes no guest grant covers: ${denied.join(', ')}`);
});
