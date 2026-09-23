// Shared `blocklet.yaml` reader.
//
// Scripts need the package's own id / name / DID / version (the node profile and
// identity default their `did` from it, the doctor matches its DID Space entry
// against it). Parsing is deliberately minimal — see parseManifest.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseManifest } from './node-profile.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Repository root (this file lives in `<repo>/scripts/lib/`). */
export const REPO_ROOT = join(HERE, '..', '..');

/** Scalar keys from `<repo>/blocklet.yaml`; `{}` when unreadable. */
export function readBlockletMeta() {
  try {
    return parseManifest(readFileSync(join(REPO_ROOT, 'blocklet.yaml'), 'utf8'));
  } catch {
    return {};
  }
}

/** Identifiers a DID Space listing might file this blocklet under. */
export function blockletIdentifiers(meta = readBlockletMeta()) {
  return [meta.id, meta.name, meta.did].map((v) => String(v ?? '').trim()).filter(Boolean);
}
