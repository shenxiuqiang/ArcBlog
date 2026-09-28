#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';

function optString(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value);
}

function nowIso() {
  return new Date().toISOString();
}

function ensure(condition, message) {
  if (!condition) throw new Error(`VALIDATION: ${message}`);
}

function arcAfs(args, instance) {
  const full = ['afs', ...args, '--json'];
  if (instance) full.push('-i', instance);
  try {
    const stdout = execFileSync('arc', full, { encoding: 'utf8' });
    return stdout ? JSON.parse(stdout) : {};
  } catch (err) {
    const msg = (err.stderr || err.stdout || err.message || '').toString();
    throw new Error(msg.trim() || 'arc command failed');
  }
}

function commandLog(opts) {
  const instance = optString(opts.instance);
  const action = optString(opts.action).trim();
  const slug = optString(opts.slug).trim();
  const actor = optString(opts.actor).trim();
  ensure(action, 'action is required');
  ensure(actor, 'actor is required');

  const now = nowIso();
  const safeSlug = slug || 'unknown';
  const path = `/blocklets/arcblog/instance/audits/${safeSlug}.audit.jsonl`;
  const line = JSON.stringify({
    ts: now,
    action,
    slug: safeSlug,
    actor,
    detail: optString(opts.detail),
  });

  arcAfs(['write', '--path', path, '--mode', 'append', '--content', `${line}\n`], instance);
  console.log(JSON.stringify({ ok: true, action: 'audit-log', path }, null, 2));
}

function commandRead(opts) {
  const instance = optString(opts.instance);
  const slug = optString(opts.slug).trim();
  ensure(slug, 'slug is required');
  const path = `/blocklets/arcblog/instance/audits/${slug}.audit.jsonl`;
  try {
    const raw = arcAfs(['read', '--path', path], instance);
    const content = raw?.data?.content || '';
    const lines = content.split('\n').filter(Boolean);
    const records = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
    console.log(JSON.stringify({ ok: true, slug, count: records.length, records }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  }
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog audit helper

Usage:
  node scripts/arcblog-audit.mjs log --action publish --slug my-post --actor did:key:z... [--detail "..."]
  node scripts/arcblog-audit.mjs read --slug my-post
`);
}

(function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const [cmd] = args._;
  try {
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();
    if (cmd === 'log') return commandLog(args);
    if (cmd === 'read') return commandRead(args);
    throw new Error(`unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  }
})();
