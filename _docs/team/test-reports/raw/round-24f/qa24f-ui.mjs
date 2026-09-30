#!/usr/bin/env node
/**
 * QA task-104 (Round 24F) — INDEPENDENT re-verification of BUG-069 + the
 * 21-console-page regression sweep.
 *
 * Phases:
 *   layout : ?page=policy preset-button row at en/zh × 1803×908 / 1512×765 —
 *            row over, per-child over, card over, sibling-card bleed, doc over.
 *   nav    : all 21 console pages — exactly 1 active row, 0 SESSION INIT FAILED,
 *            document-level horizontal overflow, worst offending element.
 *   r21r23 : pagination (Next really moves the page) on >=3 pages + R21 queue
 *            entry presence on hub / categories.
 *
 * Discipline: one fresh browser context per viewport+language (single tab),
 * everything opened here is closed; no instance writes in any phase.
 *
 * Usage: node .../qa24f-ui.mjs <layout|nav|r21r23> [out.json]
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const HERE = dirname(fileURLToPath(import.meta.url));
const PHASE = process.argv[2] || 'layout';
const OUTFILE = process.argv[3] || join(HERE, `qa24f-${PHASE}.json`);
const PAGES = ['dashboard', 'posts', 'pages', 'compose', 'heroes', 'categories', 'tags', 'seo', 'feeds', 'appearance',
  'operations', 'hub', 'media', 'agents', 'orders', 'policy', 'access', 'ledger', 'factory', 'general', 'diagnostics'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), phase: PHASE, steps: {} };

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
    return s;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify(msg));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
}

const MEASURE = `(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right) }; };
  const over = (el) => el ? el.scrollWidth - el.clientWidth : null;
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.trim() === '0.80 / 0.15 / 0.05');
  const presetRow = btn ? btn.parentElement : null;
  const card = btn ? btn.closest('div[style*="card-bg"]') : null;
  const grid = card ? card.parentElement : null;
  const sibs = grid ? Array.from(grid.children).filter((c) => c !== card) : [];
  const pr = presetRow ? r(presetRow) : null;
  const bleed = sibs.map((s) => { const sr = r(s); return (pr && pr.right > sr.x && pr.y < sr.y + sr.h && pr.y + pr.h > sr.y) ? pr.right - sr.x : 0; });
  const childOver = presetRow ? Array.from(presetRow.children).map((c) => over(c)) : null;
  const kv = Array.from(document.querySelectorAll('p,div,span')).find((e) => (e.innerText || '').trim().startsWith('Set the split from the CLI'));
  const acct = kv ? kv.closest('div') : null;
  // worst overflowing visible element that is NOT a scroll container
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const o = el.scrollWidth - el.clientWidth;
    if (o > 1 && el.clientWidth > 0 && !['auto', 'scroll', 'hidden'].includes(cs.overflowX)) {
      bad.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 36), over: o, text: (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 42) });
    }
  }
  bad.sort((a, b) => b.over - a.over);
  return JSON.stringify({
    url: location.href.replace(${JSON.stringify(ORIGIN)}, ''),
    policyResolved: document.body.innerText.includes('v1'),
    presetRow: presetRow ? { over: over(presetRow), cw: presetRow.clientWidth, sw: presetRow.scrollWidth, rect: pr, overflowX: getComputedStyle(presetRow).overflowX, lines: new Set(Array.from(presetRow.children).map((c) => Math.round(c.getBoundingClientRect().y))).size } : null,
    presetChildMaxOver: childOver ? Math.max(0, ...childOver) : null,
    card: card ? { over: over(card), rect: r(card) } : null,
    accountRowOver: acct ? over(acct) : null,
    siblingBleedMax: bleed.length ? Math.max(0, ...bleed) : null,
    doc: { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight },
    active: document.querySelectorAll('[data-active="true"]').length,
    ariaCurrent: document.querySelectorAll('[aria-current="page"]').length,
    sessionFailed: /SESSION INIT FAILED/i.test(document.body.innerText),
    worstOver: bad.slice(0, 3),
    pageText: /Page \\d+ of \\d+/.exec(document.body.innerText || '') ? /Page \\d+ of \\d+[^\\n]*/.exec(document.body.innerText)[0] : null,
  });
})()`;

const ver = await (await fetch(`${CDP}/json/version`)).json();
out.browser = ver.Browser;
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
out.adminCookieFound = !!token;
if (!token) { console.error('NO ADMIN COOKIE'); process.exit(2); }
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => `${t.type}:${t.url}`);
const opened = [];
const save = () => writeFileSync(OUTFILE, JSON.stringify(out, null, 2));

async function context(width, height, lang) {
  const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
  await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
  for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) {
    await browser.send('Network.setCookie', { name: 'arc_lang', value: lang, domain, path: '/' }, sessionId);
  }
  opened.push({ targetId, browserContextId });
  const ev = async (expr) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 3400) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  const clickText = async (re) => ev(`(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => ${re}.test(x.innerText.trim())); if (!b) return 'NOT FOUND'; b.click(); return 'clicked:' + b.innerText.trim(); })()`);
  return { ev, nav, clickText };
}

try {
  if (PHASE === 'layout') {
    for (const [width, height, lang] of [[1803, 908, 'en'], [1803, 908, 'zh'], [1512, 765, 'en'], [1512, 765, 'zh']]) {
      const ctx = await context(width, height, lang);
      await ctx.nav(`${ORIGIN}/?page=hub&locale=${lang}`, 2600);
      await ctx.nav(`${ORIGIN}/?page=policy&locale=${lang}`, 4200);
      const m = await ctx.ev(MEASURE);
      out.steps[`${width}x${height}_${lang}`] = typeof m === 'string' ? JSON.parse(m) : m;
      save();
      console.log(`${width}x${height}_${lang}`, JSON.stringify(out.steps[`${width}x${height}_${lang}`].presetRow), 'bleed=', out.steps[`${width}x${height}_${lang}`].siblingBleedMax, 'docOver=', out.steps[`${width}x${height}_${lang}`].doc.over, 'acctOver=', out.steps[`${width}x${height}_${lang}`].accountRowOver);
    }
  }

  if (PHASE === 'nav') {
    const ctx = await context(1803, 908, 'en');
    await ctx.nav(`${ORIGIN}/?page=hub&locale=en`, 2600);
    out.steps.pages = {};
    out.steps.pageList = PAGES;
    for (const p of PAGES) {
      await ctx.nav(`${ORIGIN}/?page=${p}&locale=en`, 3400);
      const m = await ctx.ev(MEASURE);
      const v = typeof m === 'string' ? JSON.parse(m) : m;
      out.steps.pages[p] = { active: v.active, ariaCurrent: v.ariaCurrent, sessionFailed: v.sessionFailed, docOver: v.doc.over, worstOver: v.worstOver, url: v.url };
      save();
      console.log(p, JSON.stringify({ active: v.active, aria: v.ariaCurrent, failed: v.sessionFailed, docOver: v.doc.over, worst: v.worstOver[0] ? `${v.worstOver[0].over}px ${v.worstOver[0].cls}` : null }));
    }
    out.steps.summary = {
      pagesChecked: PAGES.length,
      activeExactlyOne: PAGES.filter((p) => out.steps.pages[p].active === 1).length,
      ariaExactlyOne: PAGES.filter((p) => out.steps.pages[p].ariaCurrent === 1).length,
      sessionFailedAny: PAGES.filter((p) => out.steps.pages[p].sessionFailed),
      docOverNonZero: PAGES.filter((p) => out.steps.pages[p].docOver !== 0),
    };
    save();
    console.log('summary', JSON.stringify(out.steps.summary));
  }

  if (PHASE === 'r21r23') {
    const ctx = await context(1803, 908, 'en');
    await ctx.nav(`${ORIGIN}/?page=hub&locale=en`, 2600);
    // --- R23 pagination: a real Next click must move the page + change the rows
    // of the SAME list that owns the pager (a page may carry several lists).
    const listState = `(() => {
      const pager = Array.from(document.querySelectorAll('div,span,p'))
        .find((e) => /^Page \\d+ of \\d+/.test((e.innerText || '').trim()) && e.children.length < 4);
      if (!pager) return JSON.stringify({ pager: null, rows: [] });
      let c = pager;
      for (let i = 0; i < 10 && c; i++) { if (c.querySelector && c.querySelector('.aup-list-template-item')) break; c = c.parentElement; }
      const rows = c ? Array.from(c.querySelectorAll('.aup-list-template-item')).slice(0, 2).map((r) => r.innerText.replace(/\\s+/g, ' ').slice(0, 70)) : [];
      return JSON.stringify({ pager: pager.innerText.trim(), rows });
    })()`;
    out.steps.pagination = {};
    for (const p of ['policy', 'ledger', 'dashboard', 'orders', 'factory']) {
      await ctx.nav(`${ORIGIN}/?page=${p}&locale=en`, 3800);
      const before = JSON.parse(await ctx.ev(listState));
      const clicked = await ctx.clickText('/^Next$|^下一页$|Next/');
      await sleep(2800);
      const after = JSON.parse(await ctx.ev(listState));
      out.steps.pagination[p] = {
        before, after, clicked,
        moved: !!before.pager && !!after.pager && before.pager !== after.pager,
        firstChanged: JSON.stringify(before.rows) !== JSON.stringify(after.rows),
      };
      save();
      console.log('pag', p, JSON.stringify(out.steps.pagination[p]));
    }
    // --- R21 queue + inline-action entries (presence only; no enqueue, no worker)
    out.steps.r21 = {};
    for (const p of ['hub', 'categories']) {
      await ctx.nav(`${ORIGIN}/?page=${p}&locale=en`, 3600);
      const labels = p === 'hub' ? ['Apply', 'Index a Studio', 'Rebuild index', 'Approve', 'Intent queue']
        : ['Merge into', 'Delete and migrate to'];
      out.steps.r21[p] = await ctx.ev(`(() => { const t = document.body.innerText; const want = ${JSON.stringify(labels)}; return Object.fromEntries(want.map((w) => [w, t.includes(w)])); })()`);
      save();
      console.log('r21', p, JSON.stringify(out.steps.r21[p]));
    }
  }
} finally {
  for (const t of opened) {
    try { await browser.send('Target.closeTarget', { targetId: t.targetId }); } catch { /* noop */ }
    try { await browser.send('Target.disposeBrowserContext', { browserContextId: t.browserContextId }); } catch { /* noop */ }
  }
  await sleep(600);
  out.targetsAfterFiltered = (await browser.send('Target.getTargets')).targetInfos
    .map((t) => `${t.type}:${t.url}`).filter((x) => !targetsBefore.includes(x));
  save();
  console.log('targetsAfterFiltered', JSON.stringify(out.targetsAfterFiltered));
}
process.exit(0);
