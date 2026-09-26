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
  list_products(opts, instance) {
    const products = recordsIn(`${INSTANCE_ROOT}/economy/products`, instance);
    return { count: products.length, products };
  },
  get_policy(opts, instance) {
    const record = readJson(`${INSTANCE_ROOT}/economy/policies/active.json`, instance);
    if (!record) fail('NOT_FOUND', 'settlement policy not found');
    return record.value;
  },
  // Aggregate counts over public surfaces only (spec §60). Economy analytics
  // stay closed: orders name buyers (privacy, spec §62).
  get_analytics(opts, instance) {
    const posts = recordsIn(`${INSTANCE_ROOT}/posts`, instance);
    const pages = recordsIn(`${INSTANCE_ROOT}/pages`, instance);
    const products = recordsIn(`${INSTANCE_ROOT}/economy/products`, instance);
    const byCategory = {};
    const tagCounts = new Map();
    for (const post of posts) {
      if (post.category) byCategory[post.category] = (byCategory[post.category] ?? 0) + 1;
      for (const tag of Array.isArray(post.tags) ? post.tags : []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    return {
      publishedPosts: posts.length,
      onlinePages: pages.length,
      productsListed: products.length,
      byCategory,
      topTags: [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
        .slice(0, 10),
    };
  },
};

// --- write tools: delegate to the operational CLIs (already tested) ---------

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
      ['draft', '--title', required(opts, 'title'), '--author-did', required(opts, 'author-did'), '--body', optString(opts.body), ...(opts.slug ? ['--slug', optString(opts.slug)] : [])],
      instance,
    ),
  'lifecycle-publish': (opts, instance) =>
    runCli(
      'arcblog-lifecycle.mjs',
      ['publish', '--title', required(opts, 'title'), '--author-did', required(opts, 'author-did'), '--body', optString(opts.body), ...(opts.slug ? ['--slug', optString(opts.slug)] : [])],
      instance,
    ),
  'economy-product-add': (opts, instance) =>
    runCli(
      'arcblog-economy.mjs',
      [
        'product', 'add',
        '--id', required(opts, 'id'),
        '--creator-did', required(opts, 'creator-did'),
        '--price-amount', required(opts, 'price-amount'),
        ...(opts['price-asset'] ? ['--price-asset', optString(opts['price-asset'])] : []),
        ...(opts['content-id'] ? ['--content-id', optString(opts['content-id'])] : []),
        '--update',
      ],
      instance,
    ),
};

// --- run (spec §130) --------------------------------------------------------

function commandRun(opts, instance) {
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

  const result = READ_RUNNERS[name](opts, instance);
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

function commandCheck() {
  const checks = checkDeclaredAgents();
  const verdict = summarizeAgentChecks(checks);
  console.log(
    JSON.stringify(
      {
        ok: verdict.ok,
        failed: verdict.failed,
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
  console.log(`ArcBlog Agent Access (spec §59–§62, §129–§130)

Usage:
  node scripts/arcblog-agent.mjs show          # declared agents and their tool scopes
  node scripts/arcblog-agent.mjs check         # enforce the agent policy
  node scripts/arcblog-agent.mjs tools [--tool <name>]
  node scripts/arcblog-agent.mjs run --tool <name> [--slug <s>] [--query <q>] [--category <c>]
                                       [--agent <did>] [--title <t>] [--body <markdown>] [--id <id>] [...]
  node scripts/arcblog-agent.mjs authorize --agent <did> --capability agent.write[,agent.publish] [--ttl <minutes>]
  node scripts/arcblog-agent.mjs revoke --agent <did>
  node scripts/arcblog-agent.mjs grants

Read tools run straight against AFS. Write tools require an unexpired grant at
their capability (spec §61) and delegate to the operational CLIs. Tools marked
closed never run here: buyer data stays private and settle_payment /
change_wallet / change_role are default-closed (spec §130).

Agent declarations live in agents/<name>/{agent.dsl,agent.json,system.md} and are
the platform's own contract (path + ops + maxDepth). The policy enforced here:

  read-only ops ....... ${READ_OPS.join(', ')}
  never exposed ....... drafts / orders / settlements / ledger / attributions / access grants
  default-closed ...... ${defaultClosedTools().join(', ')} (spec §130)
  capabilities ........ ${AGENT_CAPABILITIES.join(' | ')} (spec §61)

The agent surface itself (/mcp, AFS RPC, llms.txt) is provided by ARC Runtime;
ArcBlog does not implement its own protocol (spec §129).
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  try {
    if (!cmd || args.help || cmd === 'help' || cmd === '-h') return help();
    if (cmd === 'show') return commandShow();
    if (cmd === 'check') return commandCheck();
    if (cmd === 'tools') return commandTools(args);
    if (cmd === 'run') return commandRun(args, resolveInstance(args));
    if (cmd === 'authorize') return commandAuthorize(args, resolveInstance(args));
    if (cmd === 'revoke') return commandRevoke(args, resolveInstance(args));
    if (cmd === 'grants') return commandGrants(args, resolveInstance(args));
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
