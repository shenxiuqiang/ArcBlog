/**
 * Load `.env.local` (gitignored) into `process.env` if present — the operator's
 * chain credentials live there and the CLIs must not require a manual `source`
 * before a documented command works.
 *
 * WHY A SHARED HELPER (2026-10-12): `arcblog-chain-worker.mjs` loaded the file inline
 * while `arcblog-network.mjs` did not, so the SAME documented one-liner
 * (`node scripts/arcblog-network.mjs registry refresh --adapter ocap`) worked for the
 * worker and answered CHAIN_UNAVAILABLE for the network CLI — measured: the registry row
 * for PRD-NET-05 could not be reproduced without `set -a; . ./.env.local; set +a`.
 *
 * Precedence: an already-set environment variable always wins (never overwrite), and a
 * missing file is not an error. Values are trimmed and surrounding single quotes dropped;
 * nothing is logged, so no secret can leak into stdout/stderr by accident.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadLocalEnv(repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')) {
  const path = join(repoRoot, '.env.local');
  if (!existsSync(path)) return { loaded: false, path, keys: [] };
  const keys = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^'|'$/g, '');
    if (!key) continue;
    if (!process.env[key]) {
      process.env[key] = value;
      keys.push(key);
    }
  }
  return { loaded: true, path, keys };
}
