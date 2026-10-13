import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { composeRender, composeScript } from './arcblog-hero-carousel.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('script.js is in sync with the vendored widget and init.js', () => {
  // The web route inlines component `script.js`; the engine cannot be loaded from
  // a URL (a root-relative asset is swallowed by the AUP handler — measured), so
  // the concatenated file is what ships. Regenerate after editing either input.
  const committed = readFileSync(join(repoRoot, '.web/components/hero-carousel/script.js'), 'utf8');
  assert.equal(committed, composeScript(), 'run: node scripts/arcblog-hero-carousel.mjs');
});

test('render.js is in sync with the inlined shell (DEF-47)', () => {
  // The platform stopped appending a component's script.js/style.css to the page (measured: the
  // built `/p/en/hero-carousel/` carried zero `photo-story` bytes, and no blocklet path is
  // reachable as a static asset), so `render.js` itself must carry the engine + CSS inline — and
  // it must stay GENERATED, because a hand-written version that reads files at render time
  // rendered an empty section silently (the site server's sandbox has no `node:fs`).
  const committed = readFileSync(join(repoRoot, '.web/components/hero-carousel/render.js'), 'utf8');
  assert.equal(committed, composeRender(), 'run: node scripts/arcblog-hero-carousel.mjs');
  assert.match(committed, /photo-story/, 'the inlined engine must be in render.js');
  assert.match(committed, /data-hero-carousel/, 'the container must be in render.js');
});

test('the vendored engine keeps its provenance header', () => {
  const vendor = readFileSync(join(repoRoot, '.web/components/hero-carousel/vendor/photo-story.js'), 'utf8');
  assert.match(vendor, /^\/\*\*\n \* VENDORED — DO NOT EDIT\./);
  assert.match(vendor, /ARC web-device widget/);
});

test('the component is declared with a client script and the page wires it up', () => {
  const dir = join(repoRoot, '.web/components/hero-carousel');
  for (const file of ['component.dsl', 'manifest.json', 'render.js', 'script.js', 'style.css', 'init.js']) {
    assert.ok(existsSync(join(dir, file)), `${file} is missing`);
  }
  const component = readFileSync(join(dir, 'component.dsl'), 'utf8');
  assert.match(component, /component hero-carousel \{/);
  assert.match(component, /script/);

  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.name, 'hero-carousel');
  assert.equal(manifest.hasScript, true);

  const page = readFileSync(join(repoRoot, 'pages/hero-carousel/layout.aup'), 'utf8');
  assert.match(page, /hero-carousel slot=main/);
});

test('the home page embeds the carousel frame instead of the old slideshow', () => {
  // The home page (`index`) may be inline in `.aup/app.aup` or an external
  // `.aup/pages/index.aup` source; scan every `.aup` source so a future split
  // cannot silently hide the page from this guard.
  const app = [
    readFileSync(join(repoRoot, '.aup/app.aup'), 'utf8'),
    ...readdirSync(join(repoRoot, '.aup/pages'))
      .filter((name) => name.endsWith('.aup'))
      .map((name) => readFileSync(join(repoRoot, '.aup/pages', name), 'utf8')),
  ].join('\n');
  assert.match(app, /frame hero-carousel-frame src="\/p\/en\/hero-carousel\/"/);
  // The frame primitive has no `style` prop and its `autoHeight` did not take
  // effect, so sizing must go through the supported `aspectRatio`.
  assert.match(app, /frame hero-carousel-frame[^\n]*aspectRatio="\d+ \/ \d+"/);
  assert.ok(!/afs-list hero-carousel layout=slideshow/.test(app), 'the manual slideshow should be gone');
});
