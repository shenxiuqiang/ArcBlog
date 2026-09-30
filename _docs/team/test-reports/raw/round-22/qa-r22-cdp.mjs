// QA Round 22 — independent CDP probe (single tab, Page.navigate only).
// Covers: BUG-033 geometry, BUG-034 overflow, BUG-036 cold-load honesty,
// BUG-037 NFT card visible text, BUG-057-4 queue message rendering,
// and the 21-page regression (exactly 1 active, no SESSION INIT FAILED).
//
// Usage: node qa-r22-cdp.mjs <expectedHubMessageFile|-> 
import { readFileSync, writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9333';
const SITE = 'http://arcblog.localhost:4939';
const PAGES = ['dashboard','posts','pages','compose','heroes','categories','tags','seo','feeds','appearance','operations','hub','media','agents','orders','policy','access','ledger','factory','general','diagnostics'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const J = (fn) => `(() => { try { return ${fn} } catch (e) { return { __error: String(e) } } })()`;

const LANG = `({ lang: document.documentElement.lang, dir: document.documentElement.dir })`;

const REGRESSION = `(() => {
  const text = document.body.innerText || '';
  return {
    lang: document.documentElement.lang,
    active: document.querySelectorAll('[data-active="true"]').length,
    ariaCurrent: document.querySelectorAll('[aria-current="page"]').length,
    sessionInitFailed: /SESSION INIT FAILED/i.test(text),
    loginGate: /Sign in with DID Wallet|使用 DID Wallet 登录/.test(text),
    navActions: document.querySelectorAll('.aup-action').length,
    docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    head: text.replace(/\\n+/g, ' | ').slice(0, 110),
  };
})()`;

const PAGES_GEOM = `(() => {
  const rows = [...document.querySelectorAll('.aup-list-template-item')];
  const items = rows.map((row) => {
    const link = [...row.querySelectorAll('a')].find((a) => (a.innerText || '').trim().length);
    if (!link) return null;
    const r = link.getBoundingClientRect(); const cs = getComputedStyle(link);
    const hit = [];
    for (const btn of row.querySelectorAll('.aup-action')) {
      const b = btn.getBoundingClientRect();
      const ix = Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left));
      const iy = Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top));
      if (ix > 0 && iy > 0) hit.push({ target: (btn.innerText || '').trim(), ix: +ix.toFixed(2), iy: +iy.toFixed(2) });
    }
    return { text: (link.innerText || '').trim(), href: link.getAttribute('href'),
      w: +r.width.toFixed(2), h: +r.height.toFixed(2), cw: link.clientWidth, sw: link.scrollWidth,
      over: link.scrollWidth - link.clientWidth, flex: cs.flex, flexBasis: cs.flexBasis, flexGrow: cs.flexGrow, hit };
  }).filter(Boolean);
  return { lang: document.documentElement.lang, rows: rows.length, items,
    hitCount: items.reduce((n, i) => n + i.hit.length, 0),
    docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth };
})()`;

const HUB = `(() => {
  const overflowing = [];
  for (const el of document.querySelectorAll('*')) {
    if (!el.innerText || !el.innerText.trim()) continue;
    const over = el.scrollWidth - el.clientWidth;
    if (over > 1) overflowing.push({ tag: el.tagName, cls: String(el.className).slice(0, 50), cw: el.clientWidth, sw: el.scrollWidth, over });
  }
  const rows = [...document.querySelectorAll('.aup-list-template-item')];
  const kv = [];
  for (const row of rows) for (const k of row.querySelectorAll('.aup-kv-row')) kv.push({ w: +k.getBoundingClientRect().width.toFixed(2), cw: k.clientWidth, sw: k.scrollWidth, over: k.scrollWidth - k.clientWidth });
  const hits = [];
  for (const row of rows) {
    for (const t of row.querySelectorAll('.aup-text, .aup-kv')) {
      const tr = t.getBoundingClientRect(); if (!tr.width) continue;
      for (const btn of row.querySelectorAll('.aup-action')) {
        const br = btn.getBoundingClientRect();
        const ix = Math.max(0, Math.min(tr.right, br.right) - Math.max(tr.left, br.left));
        const iy = Math.max(0, Math.min(tr.bottom, br.bottom) - Math.max(tr.top, br.top));
        if (ix > 0 && iy > 0) hits.push({ target: (btn.innerText || '').trim(), ix: +ix.toFixed(2), iy: +iy.toFixed(2) });
      }
    }
  }
  return { lang: document.documentElement.lang, itemW: rows[0] ? +rows[0].getBoundingClientRect().width.toFixed(2) : null,
    rows: rows.length, kvCount: kv.length, kv, overflowCount: overflowing.length,
    maxOver: overflowing.reduce((m, o) => Math.max(m, o.over), 0), worst: overflowing.sort((a, b) => b.over - a.over).slice(0, 8),
    hitCount: hits.length, hits: hits.slice(0, 5),
    docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth };
})()`;

const PROJ = `(() => {
  const kvs = [...document.querySelectorAll('.aup-kv-row')].map((k) => (k.innerText || '').replace(/\\s+/g, ' ').trim());
  const text = document.body.innerText || '';
  const media = document.querySelector('[data-aup-id="factory-nft-svg"]');
  return { lang: document.documentElement.lang, kvCount: kvs.length, kvs: kvs.slice(0, 40),
    dashCount: (text.match(/—/g) || []).length,
    loadingOrUnavailable: /not bound yet|unavailable|尚未绑定|暂不可用/.test(text),
    simulatedWords: (text.match(/simulated|未上链|模拟/gi) || []),
    mediaHTML: media ? media.outerHTML.slice(0, 500) : null,
    mediaImg: media ? !!media.querySelector('img') : null,
    mediaInnerLen: media ? media.innerText.length : null,
    docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    head: text.replace(/\\n+/g, ' | ').slice(0, 200) };
})()`;

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { id += 1; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  return { ws, send };
}

const out = {};
const expectedMsg = process.argv[2] && process.argv[2] !== '-' ? readFileSync(process.argv[2], 'utf8').trim() : null;

async function main() {
  const created = await (await fetch(`${CDP}/json/new?${encodeURIComponent(`${SITE}/robots.txt`)}`, { method: 'PUT' })).json();
  const { ws, send } = await connect(created.webSocketDebuggerUrl);
  await send('Page.enable');
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) return { __exception: r.result.exceptionDetails.text };
    return r.result?.result?.value;
  };
  const goto = async (url, wait = 3000) => { await send('Page.navigate', { url }); await sleep(wait); };
  const setViewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const setLocale = async (locale) => { await goto(`${SITE}/robots.txt`, 800); await evaluate('sessionStorage.clear()'); await goto(`${SITE}/robots.txt`, 500); };
  try {
    // ---- Phase 1: 21-page regression (en, 1803x908) ----
    await setViewport(1803, 908);
    await goto(`${SITE}/?page=dashboard&locale=en`, 3200);
    await setLocale('en');
    out.regression = {};
    for (const p of PAGES) {
      await goto(`${SITE}/?page=${p}&locale=en`, 2300);
      out.regression[p] = await evaluate(REGRESSION);
    }
    // ---- Phase 2: BUG-033 pages geometry, en/zh x 2 viewports ----
    out.bug033 = {};
    for (const locale of ['en', 'zh']) {
      await setLocale(locale);
      for (const vp of ['1803x908', '1512x765']) {
        const [w, h] = vp.split('x').map(Number);
        await setViewport(w, h);
        await goto(`${SITE}/?page=pages&locale=${locale}`, 3200);
        out.bug033[`${locale}_${vp}`] = await evaluate(PAGES_GEOM);
      }
    }
    // ---- Phase 3: BUG-034 hub overflow ----
    out.bug034 = {};
    for (const locale of ['en', 'zh']) {
      await setLocale(locale);
      for (const vp of ['1803x908', '1512x765']) {
        const [w, h] = vp.split('x').map(Number);
        await setViewport(w, h);
        await goto(`${SITE}/?page=hub&locale=${locale}`, 3600);
        out.bug034[`${locale}_${vp}`] = await evaluate(HUB);
      }
    }
    // ---- Phase 4: BUG-036/037 factory + operations cold vs reload ----
    out.bug036 = {}; out.bug037 = {};
    for (const locale of ['en', 'zh']) {
      await setLocale(locale);
      await setViewport(1803, 908);
      // cold: a fresh document load (Page.navigate), measured at >=4.2s
      await goto(`${SITE}/?page=factory&locale=${locale}`, 4400);
      out.bug036[`factory_cold_${locale}`] = await evaluate(PROJ);
      const cold037 = await evaluate(`(() => { const m = document.querySelector('[data-aup-id="factory-nft-svg"]'); const t = document.body.innerText || ''; return { mediaHTML: m ? m.outerHTML.slice(0,400) : null, mediaImg: m ? !!m.querySelector('img') : null, sim: (t.match(/simulated|未上链|模拟/gi)||[]), notChain: /NOT ON CHAIN/.test(t) }; })()`);
      out.bug037[`factory_cold_${locale}`] = cold037;
      await send('Page.reload');
      await sleep(4400);
      out.bug036[`factory_reload_${locale}`] = await evaluate(PROJ);
      await goto(`${SITE}/?page=operations&locale=${locale}`, 4400);
      out.bug036[`operations_cold_${locale}`] = await evaluate(PROJ);
      await send('Page.reload');
      await sleep(4400);
      out.bug036[`operations_reload_${locale}`] = await evaluate(PROJ);
    }
    // ---- Phase 5: BUG-057-4 queue message rendered once (hub, en) ----
    if (expectedMsg) {
      await setLocale('en');
      await setViewport(1803, 908);
      await goto(`${SITE}/?page=hub&locale=en`, 3600);
      out.bug057 = await evaluate(`(() => { const t = (document.body.innerText || '').replace(/\\s+/g, ' '); const needle = ${JSON.stringify(expectedMsg)}; const count = t.split(needle).length - 1; return { needle, count, hasSuffixTwice: /no data changed — no data changed/.test(t) }; })()`);
    }
    out.viewport = await evaluate('({w: innerWidth, h: innerHeight})');
  } finally {
    try { ws.close(); } catch {}
    await fetch(`${CDP}/json/close/${created.id}`);
  }
  writeFileSync(process.argv[3] || '/tmp/qa-r22-cdp.json', JSON.stringify(out, null, 2));
  console.log('written', process.argv[3] || '/tmp/qa-r22-cdp.json');
}

main().catch((e) => { console.error('PROBE FAILED', e); process.exit(1); });
