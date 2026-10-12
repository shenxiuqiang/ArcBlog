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
