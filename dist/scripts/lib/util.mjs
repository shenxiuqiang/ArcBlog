// Small shared text helpers used by the resource modules.

/** Normalize arbitrary text into a lowercase hyphen slug. */
export function slugify(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Last path segment, extension stripped (``/a/b/cover.png`` -> ``cover``). */
export function basenameStem(path) {
  const parts = String(path ?? '')
    .split('/')
    .filter(Boolean);
  const last = parts.at(-1) ?? '';
  return last.replace(/\.[a-z0-9]+$/i, '');
}
