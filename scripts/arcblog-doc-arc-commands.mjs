// Documented `arc …` commands must resolve (ENG-58, delivery tier).
//
// The constitution's first iron rule is "do not invent ARC APIs — verify with `arc <cmd> --help`
// first". The living docs tell operators to run fourteen distinct `arc` subcommands.
//
// The check CANNOT be `arc <group> <sub> --help`: yargs treats an unknown subcommand as a positional
// and `--help` still exits 0 while printing the GROUP help, so a typo passes (measured 2026-10-12:
// `arc blocklet frobnicate --help` → rc=0, "arc blocklet / Blocklet package + instance lifecycle").
// The real source of truth is the group help, which lists every subcommand as `arc <group> <sub> …`
// — five calls instead of fourteen, and it actually fails on a typo.
//
// Cost ~1.7 s, which is why it belongs to the DELIVERY gate (`npm run gate:docs`, wired into
// docs/05's `_gate.sh`) and not to the ~2 s fast tier.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

const files = [
  ...readdirSync(join(REPO, 'docs/05-开发文档')).map((f) => `docs/05-开发文档/${f}`),
  ...readdirSync(join(REPO, 'docs/06-功能开发列表')).map((f) => `docs/06-功能开发列表/${f}`),
  ...readdirSync(join(REPO, 'docs/07-团队与开发规范')).map((f) => `docs/07-团队与开发规范/${f}`),
  ...readdirSync(join(REPO, 'docs/08-其他')).map((f) => `docs/08-其他/${f}`),
  'CLAUDE.md',
  'README.md',
  'AGENTS.md',
].filter((f) => f.endsWith('.md') && !f.includes('_提纲'));

const mentioned = new Map();
for (const rel of files) {
  for (const [i, line] of readFileSync(join(REPO, rel), 'utf8').split('\n').entries()) {
    for (const m of line.matchAll(/`?(arc ([a-z]+) ([a-z-]+))/g)) {
      if (!mentioned.has(`${m[2]} ${m[3]}`)) mentioned.set(`${m[2]} ${m[3]}`, `${rel}:${i + 1}`);
    }
  }
}
if (mentioned.size < 8) {
  console.error(`✗ only ${mentioned.size} documented arc commands found — the scan is probably broken`);
  process.exit(2);
}

const groups = [...new Set([...mentioned.keys()].map((k) => k.split(' ')[0]))];
const help = new Map();
for (const group of groups) {
  const res = spawnSync('bash', ['-c', `arc ${group} --help`], { cwd: REPO, encoding: 'utf8', timeout: 30000 });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  if (!/Commands:/m.test(out) && res.status !== 0) {
    console.error(`✗ \`arc ${group} --help\` did not run (exit ${res.status}) — cannot verify its subcommands`);
    process.exit(2);
  }
  help.set(group, out);
}

const failures = [];
for (const [command, where] of mentioned) {
  const [group, sub] = command.split(' ');
  const source = help.get(group) ?? '';
  const known = new RegExp(`arc ${group} ${sub}(?![a-z-])`, 'i').test(source);
  if (!known) failures.push(`${where}: \`arc ${command}\` is not in \`arc ${group} --help\``);
}

if (failures.length) {
  for (const f of failures) console.log('   ✗', f);
  console.log(`arc 命令核验: ${mentioned.size} 条中 ${failures.length} 条不在 CLI 的子命令表里`);
  process.exit(1);
}
console.log(`arc 命令核验 = ${mentioned.size} 条全部存在（${groups.length} 组 \`--help\` 子命令表实测）`);
