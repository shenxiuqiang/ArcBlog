// The ROUTING plane (2026-10-12, ENG-47): nothing guarded it, and it is the layer every boundary
// claim sits on — `.route/root` sends `/` to the AUP handler and `.route/web` sends `/p` to the web
// handler (docs/05/02 B1/B6 rest on exactly that split), while the AUP app embeds its two SSR
// surfaces with `frame … src="/p/<lang>/<name>/"`, which only resolve if `pages/<name>/layout.aup`
// exists. A typo in either place fails at runtime, in a browser, as a blank frame — the kind of
// defect that costs an operator an afternoon and leaves no trace in any gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

const routeFile = (name) => {
  const text = readFileSync(join(REPO, '.route', name), 'utf8');
  return Object.fromEntries(
    text
      .split('\n')
      .map((l) => /^([a-z]+):\s*(.+)$/.exec(l.trim()))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim()]),
  );
};

function aupFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) aupFiles(full, out);
    else if (entry.endsWith('.aup')) out.push(full);
  }
  return out;
}

test('the route mounts split / and /p exactly as the boundary file claims', () => {
  assert.ok(existsSync(join(REPO, '.route', 'root')), '.route/root is missing');
  assert.ok(existsSync(join(REPO, '.route', 'web')), '.route/web is missing');

  const root = routeFile('root');
  const web = routeFile('web');
  assert.equal(root.path, '/', `the AUP handler must own / (found ${root.path})`);
  assert.equal(root.handler, 'aup', `the AUP handler must own / (found ${root.handler})`);
  assert.equal(web.path, '/p', `the web handler must own /p (found ${web.path})`);
  assert.equal(web.handler, 'web', `the web handler must own /p (found ${web.handler})`);
  // The two mounts are NOT symmetric and that is the platform's shape, not a defect: `.route/web`
  // declares `access: public`, `.route/root` declares nothing (the AUP app governs access itself —
  // the guest permission matrix covers that, over HTTP). What matters here is that neither mount
  // ever becomes restrictive, so `access` may be absent but never anything else.
  for (const [name, route] of [['root', root], ['web', web]]) {
    if (route.access !== undefined) assert.equal(route.access, 'public', `.route/${name} access must stay public`);
  }
  assert.equal(web.access, 'public', '.route/web must keep its explicit public access');

  // the site name ties the mounts to blocklet.yaml's only site
  const manifest = readFileSync(join(REPO, 'blocklet.yaml'), 'utf8');
  const site = /^\s+- name:\s*(\S+)/m.exec(manifest)?.[1];
  assert.ok(site, 'blocklet.yaml declares no site');
  assert.equal(root.site, site, `.route/root site '${root.site}' != blocklet.yaml site '${site}'`);
  assert.equal(web.site, site, `.route/web site '${web.site}' != blocklet.yaml site '${site}'`);
});

test('every /p/<lang>/<name>/ frame in the app has its SSR layout, and no layout is orphaned', () => {
  const referenced = new Set();
  const odd = [];
  for (const file of aupFiles(join(REPO, '.aup'))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/src="(\/p\/[^"]*)"/g)) {
      // Check the SHAPE, not only the well-formed values: the first version matched `[a-z-]+`, so a
      // typo carrying an uppercase letter fell outside the pattern and the guard saw nothing —
      // a typo can hide precisely by not matching the pattern that is meant to catch it.
      const shape = /^\/p\/[a-z]{2}\/([a-z0-9-]+)\/$/.exec(m[1]);
      if (!shape) odd.push(`${file.replace(REPO + '/', '')}: ${m[1]}`);
      else referenced.add(shape[1]);
    }
  }
  assert.deepEqual(odd, [], `frame src values under /p/ that are not /p/<lang>/<name>/: ${odd.join(', ')}`);
  assert.ok(referenced.size >= 2, `SSR frames referenced: ${[...referenced].join(', ')}`);

  const missing = [...referenced].filter((name) => !existsSync(join(REPO, 'pages', name, 'layout.aup')));
  assert.deepEqual(missing, [], `frames pointing at an SSR page that does not exist: ${missing.join(', ')}`);

  const available = readdirSync(join(REPO, 'pages')).filter((d) => existsSync(join(REPO, 'pages', d, 'layout.aup')));
  const orphan = available.filter((name) => !referenced.has(name));
  assert.deepEqual(orphan, [], `SSR layouts no AUP frame references: ${orphan.join(', ')}`);
});
