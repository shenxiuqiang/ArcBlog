/**
 * The flag surface of every ArcBlog CLI, in one place (D32 / BUG-032).
 *
 * `parseCliArgs(argv, import.meta.url)` is the only argv entry point: it makes
 * `--k v` and `--k=v` the same option and **fails closed** on any flag that is
 * not listed here, so a typo can never be silently ignored (that is exactly how
 * `ledger list --type=payment` used to run unfiltered with exit 0).
 *
 * Rules for keeping this honest:
 * - a flag is listed under the CLI that *consumes* it; passthrough flags (one
 *   CLI building another CLI's argv) are listed too, a superset is harmless;
 * - `scripts/arcblog-economy.test.mjs` re-derives this set from the sources and
 *   fails when a CLI reads a flag (`opts.x` / `opts["x"]` / `--x`) that is
 *   missing here — so new flags cannot rot the registry.
 *
 * `help` / `instance` / `json` live in `BASE_FLAGS` (`scripts/lib/arc.mjs`) and
 * `CHAIN_FLAGS` covers what `scripts/lib/chain.mjs` reads off the shared opts
 * object (`openChain(opts)`), so neither has to be repeated per CLI.
 */

import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fail, parseArgs } from './arc.mjs';

/** Re-exported so a CLI needs only one import for the whole flag contract. */
export { BASE_FLAGS, FLAG_SYNTAX_NOTE } from './arc.mjs';

/**
 * Flags read by `scripts/lib/chain.mjs` from the CLI's own options object, plus
 * the mock clock. Every CLI (not just the chain-aware ones) accepts them: the
 * chain boundary is shared, and a superset never lets a typo through.
 */
export const CHAIN_FLAGS = [
  'adapter',
  'network',
  'chain-host',
  'chain-id',
  'token-id',
  'token-decimals',
  'factory-owner',
  'mnemonic',
  'now',
];

/** Per-script flag names, keyed by the script's basename. */
export const SCRIPT_FLAGS = {
  "arcblog-agent.mjs": ["agent", "agent-access", "author-did", "body", "capability", "category", "content-id", "creator-did", "help", "id", "instance", "limit", "note", "price-amount", "price-asset", "query", "slug", "title", "tool", "ttl", "update"],
  "arcblog-attribution.mjs": ["content", "content-id", "context", "help", "hub", "hub-did", "key", "label", "out", "pubkey", "store", "studio-did", "ttl"],
  "arcblog-audit.mjs": ["action", "actor", "content", "detail", "help", "instance", "json", "mode", "path", "slug"],
  "arcblog-bookmarks.mjs": ["help", "json", "slug", "title", "user"],
  "arcblog-category.mjs": ["action", "by", "description", "from", "help", "id", "instance", "interval", "migrate-to", "name", "slug", "sort", "to", "update"],
  "arcblog-chain-worker.mjs": ["action", "adapter", "by", "endpoint", "instance", "interval", "json", "name", "owner", "pk", "region", "role", "stake"],
  "arcblog-clean.mjs": ["confirm", "dir", "help", "sign-key"],
  "arcblog-console-nav.mjs": ["check", "fix"],
  "arcblog-daily-report.mjs": ["args", "instance", "json", "limit"],
  "arcblog-doctor.mjs": ["help", "instance", "json", "record"],
  "arcblog-economy.mjs": ["adapter", "all", "amount", "asset", "buyer-did", "chain-host", "content", "content-id", "creator", "creator-did", "expect-amount", "expect-asset", "expect-receiver", "help", "hub", "hub-did", "id", "json", "limit", "order", "payment-adapter", "payment-ref", "period-days", "price-amount", "price-asset", "product-id", "protocol", "reader", "reason", "settlement-policy", "tx-hash", "type", "update", "version", "visibility"],
  "arcblog-factory.mjs": ["adapter", "chain-host", "description", "endpoint", "help", "instance", "issuer", "json", "keep-registry", "name", "out", "pricing-basic", "region", "role", "rules", "stake", "token-id", "update"],
  "arcblog-hero-carousel.mjs": ["check"],
  "arcblog-lifecycle.mjs": ["action", "actor", "args", "author-did", "author-name", "body", "body-file", "category", "content", "cover-image", "detail", "help", "if-match", "ifMatch", "instance", "json", "mode", "og-description", "og-image", "og-title", "path", "product-id", "push", "seo-description", "seo-title", "sign-key", "signer-did", "signer-label", "slug", "summary", "tags", "title", "update", "visibility"],
  "arcblog-media.mjs": ["action", "alt", "by", "force", "height", "help", "id", "ids", "instance", "intent-id", "interval", "mime", "path", "size", "title", "update", "uploader-did", "width"],
  "arcblog-network.mjs": ["action", "base-url", "by", "endpoint", "error", "hash", "help", "hub-did", "instance", "intent-id", "interval", "publish", "purge", "q", "query", "stale-after", "status", "update", "version"],
  "arcblog-node-nft.mjs": ["adapter", "asset", "description", "dry-run", "endpoint", "evidence", "help", "instance", "message", "name", "now", "owner", "pk", "pricing-basic", "region", "role", "rules", "sign-key", "stake", "stake-address", "waiting-period"],
  "arcblog-node.mjs": ["auth-method", "caller", "capabilities", "description", "did", "endpoint", "help", "instance", "json", "name", "roles", "update"],
  "arcblog-pages.mjs": ["action", "actor", "author-did", "body", "body-file", "help", "instance", "online", "push", "slug", "summary", "title"],
  "arcblog-query-posts.mjs": ["args", "category", "instance", "json", "limit", "tag"],
  "arcblog-roles.mjs": ["asset-id", "chain-verification", "claimable-at", "help", "hub-collection", "link-exit", "network", "reason", "role", "stake-id", "state", "studio-collection", "update"],
  "arcblog-rss.mjs": ["args", "feed-description", "feed-link", "feed-title", "instance", "json", "limit"],
  "arcblog-settings.mjs": ["agent-access", "comments", "help", "instance", "language", "palette", "rss", "site-name", "theme", "timezone", "tone"],
  "arcblog-tags.mjs": ["action", "by", "from", "help", "id", "interval", "to"],
  "arcblog-ui-budget.mjs": ["card-bg", "includes", "json", "strict", "write-baseline"],
  "arcblog-verify.mjs": ["did", "expect-did", "forget", "help", "instance", "public-key", "sign-key", "slug"],
};

/** The registered flag names for one CLI script (its basename). */
export function knownFlagsFor(script) {
  const entry = SCRIPT_FLAGS[basename(String(script))];
  if (!entry) {
    fail(
      'VALIDATION',
      `no CLI flag registry entry for ${basename(String(script))} — add it to scripts/lib/cli-flags.mjs`,
    );
  }
  return [...entry];
}

/**
 * Parse a CLI's argv with the strict, equals-form-aware parser.
 *
 * @param {string[]} argv   e.g. `process.argv.slice(2)`
 * @param {string} scriptUrl  pass `import.meta.url` from the CLI entry point
 */
export function parseCliArgs(argv, scriptUrl) {
  try {
    return parseArgs(argv, { known: [...CHAIN_FLAGS, ...knownFlagsFor(fileURLToPath(scriptUrl))] });
  } catch (err) {
    // Every CLI must fail the same way on a bad flag, including the ones whose
    // entry point has no try/catch of its own (they used to get a raw stack).
    if (err && err.code === 'VALIDATION') {
      console.error(JSON.stringify({ ok: false, code: 'VALIDATION', error: err.message }, null, 2));
      process.exit(1);
    }
    throw err;
  }
}
