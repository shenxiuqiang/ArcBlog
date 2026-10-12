#!/usr/bin/env node
// ArcBlog Agent Access (spec §59–§62, §129–§130).
//
//   node scripts/arcblog-agent.mjs show     # what the declared agents may touch
//   node scripts/arcblog-agent.mjs check    # enforce the agent policy (exit 1 on violation)
//   node scripts/arcblog-agent.mjs tools    # the tool catalogue and its capabilities
//
// ARC Runtime already exposes the agent surface (`/mcp`, AFS RPC, `llms.txt`), so
// ArcBlog declares rather than implements it (spec §129). These commands read the
// platform declaration under `agents/` and apply the spec's rules: read-only by
// default, no buyer/reader data, bounded scopes, and a default-closed list of
// high-risk tools.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { INSTANCE_ROOT, ensure, fail, list, optString, parseArgs, queryRecords, readJson, remove, resolveInstance, whereAll, whereEq } from './lib/arc.mjs';
import { FLAG_SYNTAX_NOTE, parseCliArgs } from './lib/cli-flags.mjs';
import {
  AGENT_CAPABILITIES,
  AGENT_GRANTS_DIR,
  AGENT_TOOLS,
  READ_OPS,
  SENSITIVE_PATH_PREFIXES,
  WRITE_OPS,
  buildAgentGrant,
  checkDeclaredAgents,
  defaultClosedTools,
  agentGrantPath,
  getAgentGrant,
  grantAllows,
  listAgentGrants,
  readDeclaredAgents,
  saveAgentGrant,
  summarizeAgentChecks,
  toolPolicy,
} from './lib/agents.mjs';
import { REPO_ROOT } from './lib/manifest.mjs';
import { readGeneralSettings } from './lib/general-settings.mjs';
import { listStudioNodes, readStudioNode } from './lib/studio-registry.mjs';
import { NODE_AGENT_SURFACE, fetchNodeAfs, fetchNodeSurface } from './lib/node-content.mjs';

/**
 * The Instance-level Agent Access master switch (spec §15.9, the settings page).
 * Fail open to `true` when the record is unreadable, so an instance that never
 * opened the settings page keeps exactly the policy it had before — and fail
 * closed when an operator explicitly switched the surface off.
 */
function agentAccessEnabled(instance) {
  try {
    return readGeneralSettings(instance).agentAccess !== false;
  } catch {
    return true;
  }
}

const AGENT_DISABLED =
  'Agent Access is switched off for this instance (Settings → General, spec §15.9). ' +
  'Turn it back on there, or run: node scripts/arcblog-settings.mjs general set --agent-access on';


// --- read tools: real AFS reads ---------------------------------------------

function recordsIn(dir, instance) {
  const out = [];
  for (const entry of list(dir, instance)) {
    const id = String(entry?.id ?? '').replace(/\.json$/, '');
    if (!id) continue;
    const value = readJson(`${dir}/${id}.json`, instance)?.value;
    if (value) out.push(value);
  }
  return out;
}

function required(opts, flag) {
  const value = optString(opts[flag]).trim();
  ensure(value, `--${flag} is required for this tool`);
  return value;
}

const READ_RUNNERS = {
  search_posts(opts, instance) {
    const query = optString(opts.query).trim().toLowerCase();
    const category = optString(opts.category).trim().toLowerCase();
    const limit = Number(opts.limit ?? 20);
    // Provider-native query: category is filtered server-side and the content
    // comes back inline, so this is one call instead of list + one read per post.
    // Free text stays client-side — this provider does not support `text`.
    let posts = queryRecords(
      `${INSTANCE_ROOT}/posts`,
      { where: whereAll([whereEq('category', category)]), select: ['slug', 'title', 'summary', 'category', 'tags', 'publishedAt', 'authorDid'] },
      instance,
    );
    if (query) {
      posts = posts.filter((post) =>
        [post.title, post.summary, post.body, Array.isArray(post.tags) ? post.tags.join(' ') : post.tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      );
    }
    return {
      count: posts.length,
      posts: posts.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 20).map((post) => ({
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        category: post.category,
        publishedAt: post.publishedAt,
        authorDid: post.authorDid,
      })),
    };
  },
  get_post(opts, instance) {
    const slug = required(opts, 'slug');
    const record = readJson(`${INSTANCE_ROOT}/posts/${slug}.json`, instance);
    if (!record) fail('NOT_FOUND', `post not found: ${slug}`);
    return record.value;
  },
  list_categories(opts, instance) {
    const categories = recordsIn(`${INSTANCE_ROOT}/categories`, instance);
    return { count: categories.length, categories };
  },
  get_node_profile(opts, instance) {
    const record = readJson(`${INSTANCE_ROOT}/node/profile.json`, instance);
    if (!record) fail('NOT_FOUND', 'node profile not found');
    return record.value;
  },
  // Aggregate counts over public surfaces only (spec §60/§62).
  get_analytics(opts, instance) {
    const posts = recordsIn(`${INSTANCE_ROOT}/posts`, instance);
    const pages = recordsIn(`${INSTANCE_ROOT}/pages`, instance);
    const byCategory = {};
    const tagCounts = new Map();
    for (const post of posts) {
      if (post.category) byCategory[post.category] = (byCategory[post.category] ?? 0) + 1;
      for (const tag of Array.isArray(post.tags) ? post.tags : []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    return {
      publishedPosts: posts.length,
      onlinePages: pages.length,
      byCategory,
      topTags: [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
        .slice(0, 10),
    };
  },
  // --- on-chain registry discovery (AGT-12/AGT-06) ---------------------------
  // A read tool never talks to a chain: the chain is enumerated by the operator
  // CLI (`registry refresh`), which writes the public projection these two read.
  // A stale projection is still the last known truth about the chain, so it is
  // returned WITH its refresh hint — never silently trusted, never hidden.
  list_studios(opts, instance) {
    return listStudioNodes(instance, { now: optString(opts.now) || undefined });
  },
  // --- aggregation projection (PRD-AGT-07/AGT-08) ----------------------------
  // The agent surface only LISTS what the operator CLI already built: collecting
  // from remote nodes, scoring and ranking live in `arcblog-summarize.mjs build`,
  // which owns `node/summaries/<id>.json` (public fields only). A read tool that
  // aggregated here would duplicate that pipeline and break its determinism.
  list_summaries(opts, instance) {
    const summaries = recordsIn(`${INSTANCE_ROOT}/node/summaries`, instance);
    return { count: summaries.length, summaries };
  },
  // `get_studio` alone returns the registry record for one node; with `--content`
  // it also reads that node's public surface over the endpoint the registry
  // carries (GET /p/llms.txt by default, `--path` for another public path), and
  // with `--afs <path>` it makes one anonymous AFS read on that node instead.
  async get_studio(opts, instance) {
    const now = optString(opts.now) || undefined;
    // Fail closed on a switch used like a value flag, so nothing is silently
    // ignored (the same rule that makes an unknown flag a VALIDATION error).
    ensure(opts.content === undefined || opts.content === true, '--content is a switch (no value); use --path <public path> to read a different path');
    ensure(opts.afs === undefined || Boolean(optString(opts.afs).trim()), '--afs needs an AFS path, e.g. --afs /instance/app/arcblog/posts');
    ensure(opts.path === undefined || Boolean(optString(opts.path).trim()), '--path needs a public path, e.g. --path /p/llms.txt');
    ensure(opts.endpoint === undefined || Boolean(optString(opts.endpoint).trim()), '--endpoint needs an http(s) origin, e.g. --endpoint https://node.example.com');

    const node = readStudioNode(instance, required(opts, 'stake-address'), { now });
    const endpoint = optString(opts.endpoint).trim() || node.endpoint;
    const afsPath = optString(opts.afs).trim();
    const wantsContent = Boolean(opts.content) || Boolean(afsPath);
    if (!wantsContent) {
      ensure(
        !optString(opts.path).trim() && !optString(opts.endpoint).trim() && !optString(opts['afs-op']).trim(),
        '--path / --endpoint / --afs-op only modify a remote read: add --content (the agent surface) or --afs <path> (an AFS read)',
      );
      return node;
    }
    if (afsPath) {
      node.afs = await fetchNodeAfs({ endpoint, path: afsPath, op: optString(opts['afs-op']) || 'list', now });
    } else {
      node.content = await fetchNodeSurface({ endpoint, path: optString(opts.path) || NODE_AGENT_SURFACE, now });
    }
    return node;
  },
};

// --- write tools: delegate to the operational CLIs (already tested) ---------

/**
 * The body of a write tool: `--body <markdown>` or `--body-file <path>`, the two
 * spellings `arcblog-lifecycle.mjs` accepts.
 *
 * **Both at once fails closed.** The lifecycle CLI prefers the file (`readBody`),
 * so a caller passing both would never learn which body was stored — on the agent
 * surface that must be a loud VALIDATION, not a silent pick. Exactly one is
 * required, and an unknown flag already fails at parse time.
 */
function bodyArgs(opts) {
  const body = optString(opts.body);
  const bodyFile = optString(opts['body-file']).trim();
  ensure(
    !(body.trim() && bodyFile),
    '--body and --body-file are mutually exclusive: pass exactly one (the lifecycle CLI would silently prefer the file)',
  );
  ensure(body.trim() || bodyFile, '--body or --body-file is required for this tool');
  return bodyFile ? ['--body-file', bodyFile] : ['--body', body];
}

function runCli(scriptName, args, instance) {
  const argv = [join(REPO_ROOT, 'scripts', scriptName), ...args];
  if (instance) argv.push('--instance', instance);
  const stdout = execFileSync(process.execPath, argv, { encoding: 'utf8' });
  return stdout ? JSON.parse(stdout) : {};
}

const WRITE_RUNNERS = {
  'lifecycle-draft': (opts, instance) =>
    runCli(
      'arcblog-lifecycle.mjs',
      ['draft', '--title', required(opts, 'title'), '--author-did', required(opts, 'author-did'), ...bodyArgs(opts), ...(opts.slug ? ['--slug', optString(opts.slug)] : [])],
      instance,
    ),
  'lifecycle-publish': (opts, instance) =>
    runCli(
      'arcblog-lifecycle.mjs',
      ['publish', '--title', required(opts, 'title'), '--author-did', required(opts, 'author-did'), ...bodyArgs(opts), ...(opts.slug ? ['--slug', optString(opts.slug)] : [])],
      instance,
    ),
};

// --- run (spec §130) --------------------------------------------------------

async function commandRun(opts, instance) {
  if (!agentAccessEnabled(instance)) fail('AGENT_DISABLED', AGENT_DISABLED);
  const name = required(opts, 'tool');
  const tool = toolPolicy(name);
  if (!tool) fail('NOT_FOUND', `unknown tool: ${name} (see: node scripts/arcblog-agent.mjs tools)`);

  if (tool.kind === 'closed') fail('FORBIDDEN', `${name} is not available to agents: ${tool.reason}`);
  if (tool.kind === 'read' && tool.status === 'unavailable') fail('NOT_AVAILABLE', `${name}: ${tool.reason}`);

  if (tool.kind === 'write') {
    const agentDid = required(opts, 'agent');
    const grant = getAgentGrant(agentDid, instance)?.value ?? null;
    const verdict = grantAllows(grant, tool.capability);
    if (!verdict.ok) {
      fail(
        'FORBIDDEN',
        `${name} requires ${tool.capability}: ${verdict.reason} (grant it with: authorize --agent ${agentDid} --capability ${tool.capability})`,
      );
    }
    const result = WRITE_RUNNERS[tool.command](opts, instance);
    console.log(JSON.stringify({ ok: true, tool: name, capability: tool.capability, via: tool.command, result }, null, 2));
    return;
  }

  const result = await READ_RUNNERS[name](opts, instance);
  console.log(JSON.stringify({ ok: true, tool: name, capability: tool.capability, result }, null, 2));
}

// --- capability grants (spec §61) -------------------------------------------

function commandAuthorize(opts, instance) {
  const agentDid = required(opts, 'agent');
  const capabilities = optString(opts.capability).split(',').map((value) => value.trim()).filter(Boolean);
  ensure(capabilities.length > 0, '--capability is required (e.g. agent.write,agent.publish)');
  // spec §130: the admin tier gates default-closed tools, which never run from
  // the agent surface — granting it would only imply an access that cannot exist.
  if (capabilities.includes('agent.admin')) {
    fail('FORBIDDEN', 'agent.admin gates default-closed tools (spec §130) which never run from the agent surface; use the operator CLI with a DID session');
  }
  const grant = buildAgentGrant({
    agentDid,
    capabilities,
    ttlMinutes: opts.ttl !== undefined ? Number(opts.ttl) : undefined,
    note: optString(opts.note),
  });
  saveAgentGrant(grant, instance);
  console.log(JSON.stringify({ ok: true, action: 'authorize', path: AGENT_GRANTS_DIR, grant }, null, 2));
}

function commandRevoke(opts, instance) {
  const agentDid = required(opts, 'agent');
  const existing = getAgentGrant(agentDid, instance);
  if (!existing) fail('NOT_FOUND', `no grant for agent: ${agentDid}`);
  remove(agentGrantPath(agentDid), instance);
  console.log(JSON.stringify({ ok: true, action: 'revoke', agentDid, path: AGENT_GRANTS_DIR }, null, 2));
}

function commandGrants(opts, instance) {
  const grants = listAgentGrants(instance);
  console.log(JSON.stringify({ ok: true, path: AGENT_GRANTS_DIR, count: grants.length, grants }, null, 2));
}

function commandShow() {
  const { dirs, agents } = readDeclaredAgents();
  const declared = dirs.map((dir) => {
    const agent = agents.find((entry) => entry.dirName === dir.name);
    return {
      name: agent?.manifest?.name ?? dir.name,
      dir: `agents/${dir.name}`,
      type: agent?.manifest?.type ?? '',
      model: agent?.manifest?.model ?? '',
      instructions: agent?.manifest?.instructions ?? '',
      tools: (agent?.manifest?.tools ?? []).map((tool) => ({
        path: tool.path,
        ops: tool.ops,
        maxDepth: tool.maxDepth,
      })),
      budget: agent?.manifest?.budget ?? null,
    };
  });
  console.log(JSON.stringify({ ok: true, count: declared.length, agents: declared }, null, 2));
}

function commandCheck(instance) {
  const enabled = agentAccessEnabled(instance);
  const switchCheck = { id: 'agent-access-switch', ok: enabled, detail: enabled ? 'on' : AGENT_DISABLED };
  const checks = [...checkDeclaredAgents(), switchCheck];
  const verdict = summarizeAgentChecks(checks);
  console.log(
    JSON.stringify(
      {
        // `ok` / `failed` keep the shape the existing suite asserts
        // (`failed` is the list of failing check ids, empty when healthy) —
        // the Instance switch only adds a check plus the `agentAccess` field.
        ok: verdict.ok,
        failed: verdict.failed,
        agentAccess: enabled ? 'on' : 'off',
        checks,
        policy: {
          readOnlyOps: READ_OPS,
          blockedOps: WRITE_OPS,
          neverExposed: SENSITIVE_PATH_PREFIXES,
          defaultClosedTools: defaultClosedTools(),
        },
      },
      null,
      2,
    ),
  );
  if (!verdict.ok) process.exit(1);
}

function commandTools(opts) {
  const name = String(opts.tool ?? '').trim();
  if (name) {
    const tool = toolPolicy(name);
    if (!tool) fail('NOT_FOUND', `unknown tool: ${name} (see: node scripts/arcblog-agent.mjs tools)`);
    console.log(JSON.stringify({ ok: true, tool }, null, 2));
    return;
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        capabilities: AGENT_CAPABILITIES,
        defaultClosed: defaultClosedTools(),
        count: AGENT_TOOLS.length,
        tools: AGENT_TOOLS,
      },
      null,
      2,
    ),
  );
}

function help() {
  console.log(FLAG_SYNTAX_NOTE);
  console.log(`ArcBlog Agent Access (spec §59–§62, §129–§130)

Usage:
  node scripts/arcblog-agent.mjs show          # declared agents and their tool scopes
  node scripts/arcblog-agent.mjs check         # enforce the agent policy
  node scripts/arcblog-agent.mjs tools [--tool <name>]
  node scripts/arcblog-agent.mjs run --tool <name> [--slug <s>] [--query <q>] [--category <c>]
                                       [--agent <did>] [--title <t>] (--body <markdown> | --body-file <path>)
  node scripts/arcblog-agent.mjs run --tool list_studios
  node scripts/arcblog-agent.mjs run --tool get_studio --stake-address <addr>
                                       [--content [--path <public path>] [--endpoint <origin>]]
                                       [--afs <afs path> [--afs-op list|read|stat|search]]
  node scripts/arcblog-agent.mjs run --tool list_summaries
  node scripts/arcblog-agent.mjs authorize --agent <did> --capability agent.write[,agent.publish] [--ttl <minutes>]
  node scripts/arcblog-agent.mjs revoke --agent <did>
  node scripts/arcblog-agent.mjs grants

Read tools run straight against AFS. Write tools require an unexpired grant at
their capability (spec §61) and delegate to the operational CLIs. Tools marked
closed never run here: change_role is default-closed (spec §130).
(settle_payment / change_wallet were retired with the economy surface.)

The two discovery reads (AGT-12/AGT-06) act on the ON-CHAIN REGISTRY once the
operator has projected it to AFS:

  node scripts/arcblog-network.mjs registry refresh   # chain -> node/registry.json
  ... run --tool list_studios                         # every staked node
  ... run --tool get_studio --stake-address <addr>    # one node

list_studios/get_studio never touch a chain themselves. A projection older than
24h is still read but reported "stale" with the refresh command. get_studio
--content additionally reads that node's PUBLIC surface over the endpoint the
registry carries (default /p/llms.txt, --path for another public path; --afs
for one anonymous AFS read) — read-only, never a write.

list_summaries (PRD-AGT-07/AGT-08) lists the aggregation projection the operator
CLI writes — one record per id under node/summaries/:

  node scripts/arcblog-summarize.mjs build --from-registry --id <id>
  ... run --tool list_summaries

It lists only: collecting from remote nodes, scoring and ranking belong to that
CLI (its order is deterministic and must not be recomputed here).

Write tools take their body as exactly one of --body <markdown> or
--body-file <path>; passing both fails closed (every unknown flag does too).

Agent declarations live in agents/<name>/{agent.dsl,agent.json,system.md} and are
the platform's own contract (path + ops + maxDepth). The policy enforced here:

  read-only ops ....... ${READ_OPS.join(', ')}
  never exposed ....... drafts / page-drafts / /blocklets
  default-closed ...... ${defaultClosedTools().join(', ')} (spec §130)
  capabilities ........ ${AGENT_CAPABILITIES.join(' | ')} (spec §61)

The agent surface itself (/mcp, AFS RPC, llms.txt) is provided by ARC Runtime;
ArcBlog does not implement its own protocol (spec §129).
`);
}

(async function main() {
  const args = parseCliArgs(process.argv.slice(2), import.meta.url);
  const [cmd] = args._;
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'show') return commandShow();
    if (cmd === 'check') return commandCheck(resolveInstance(args));
    if (cmd === 'tools') return commandTools(args);
    if (cmd === 'run') return await commandRun(args, resolveInstance(args));
    if (cmd === 'authorize') return commandAuthorize(args, resolveInstance(args));
    if (cmd === 'revoke') return commandRevoke(args, resolveInstance(args));
    if (cmd === 'grants') return commandGrants(args, resolveInstance(args));
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
