import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { composeScript } from './arcblog-hero-carousel.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('script.js is in sync with the vendored widget and init.js', () => {
  // The web route inlines component `script.js`; the engine cannot be loaded from
  // a URL (a root-relative asset is swallowed by the AUP handler — measured), so
  // the concatenated file is what ships. Regenerate after editing either input.
  const committed = readFileSync(join(repoRoot, '.web/components/hero-carousel/script.js'), 'utf8');
  assert.equal(committed, composeScript(), 'run: node scripts/arcblog-hero-carousel.mjs');
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
  const app = readFileSync(join(repoRoot, '.aup/app.aup'), 'utf8');
  assert.match(app, /frame hero-carousel-frame src="\/p\/en\/hero-carousel\/"/);
  // The frame primitive has no `style` prop and its `autoHeight` did not take
  // effect, so sizing must go through the supported `aspectRatio`.
  assert.match(app, /frame hero-carousel-frame[^\n]*aspectRatio="\d+ \/ \d+"/);
  assert.ok(!/afs-list hero-carousel layout=slideshow/.test(app), 'the manual slideshow should be gone');
});
