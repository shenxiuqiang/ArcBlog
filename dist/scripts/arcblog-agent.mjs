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

import { fail, parseArgs } from './lib/arc.mjs';
import {
  AGENT_CAPABILITIES,
  AGENT_TOOLS,
  READ_OPS,
  SENSITIVE_PATH_PREFIXES,
  WRITE_OPS,
  checkDeclaredAgents,
  defaultClosedTools,
  readDeclaredAgents,
  summarizeAgentChecks,
  toolPolicy,
} from './lib/agents.mjs';

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
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
