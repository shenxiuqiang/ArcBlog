#!/usr/bin/env node
/**
 * QA task-108 (Round 25) — probe ⑤: console regression sweep (21 pages, en + zh)
 * plus R23 pagination spot checks and R21 hub/media queue spot checks.
 *
 * Same discipline: one fresh browser context per language, ONE tab navigated with
 * Page.navigate, every target/context opened here is closed in `finally`.
 */
import { writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const OUTFILE = process.argv[2] || 'docs/team/test-reports/raw/round-25/qa-r25-audit.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), pages: {}, zh: {}, pagination: {}, r21: {} };

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
    };
    return s;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify(msg));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
}

const HELPERS = `
  window.qaBtn = function (label) {
    const all = Array.from(document.querySelectorAll('button'));
    return all.find((b) => b.innerText.trim() === label) || all.find((b) => b.innerText.includes(label)) || null;
  };
  window.qaClick = function (label) {
    const btn = window.qaBtn(label);
    if (!btn) return 'NO BUTTON ' + label;
    btn.click();
    return 'clicked:' + btn.innerText.trim();
  };
  window.qaState = function () {
    const t = document.body.innerText || '';
    return JSON.stringify({
      url: location.href.replace('http://arcblog.localhost:4939', ''),
      active: document.querySelectorAll('[data-active="true"]').length,
      ariaCurrent: document.querySelectorAll('[aria-current="page"]').length,
      sessionFailed: /SESSION INIT FAILED/i.test(t),
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      textLen: t.length,
    });
  };
  window.qaPager = function () {
    const btns = Array.from(document.querySelectorAll('button')).map((b) => b.innerText.trim());
    const rows = document.querySelectorAll('.aup-list-template-item').length;
    return JSON.stringify({ buttons: btns.filter((b) => b && b.length < 12).slice(0, 24), rows, hasPagesizeNote: (document.body.innerText||'').includes('BUG-063') });
  };
`;

const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
const targetsBefore = (await browser.send('Target.getTargets')).targetInfos.map((t) => t.targetId);
const opened = [];

async function context({ admin = true, lang = 'en' } = {}) {
  const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  if (admin) await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/' }, sessionId);
  for (const domain of ['.arcblog.localhost', 'arcblog.localhost']) {
    await browser.send('Network.setCookie', { name: 'arc_lang', value: lang, domain, path: '/' }, sessionId);
  }
  const ev = async (expr, awaitPromise = false) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, waitMs = 2600) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(waitMs);
  };
  opened.push({ targetId, browserContextId });
  return { ev, nav, targetId, browserContextId };
}

try {
  const { CONSOLE_SECTIONS } = await import('../../../../../scripts/console-nav.mjs');
  out.sectionCount = CONSOLE_SECTIONS.length;
  for (const lang of ['en', 'zh']) {
    const ctx = await context({ admin: true, lang });
    for (const p of CONSOLE_SECTIONS) {
      await ctx.nav(`${ORIGIN}/?page=${p}&locale=${lang}`, 2400);
      const st = JSON.parse(await ctx.ev(`(() => { ${HELPERS} return qaState(); })()`));
      (lang === 'en' ? out.pages : out.zh)[p] = st;
    }
    await browser.send('Target.closeTarget', { targetId: ctx.targetId });
    await browser.send('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId });
  }
  out.pagesSummary = {
    count: Object.keys(out.pages).length,
    activeNotOne: Object.entries(out.pages).filter(([, v]) => v.active !== 1).map(([k]) => k),
    ariaNotOne: Object.entries(out.pages).filter(([, v]) => v.ariaCurrent !== 1).map(([k]) => k),
    sessionFailed: Object.entries(out.pages).filter(([, v]) => v.sessionFailed).map(([k]) => k),
    overflow: Object.entries(out.pages).filter(([, v]) => v.over > 0).map(([k, v]) => `${k}:${v.over}`),
  };
  out.zhSummary = {
    count: Object.keys(out.zh).length,
    activeNotOne: Object.entries(out.zh).filter(([, v]) => v.active !== 1).map(([k]) => k),
    sessionFailed: Object.entries(out.zh).filter(([, v]) => v.sessionFailed).map(([k]) => k),
  };

  // ---- R23 pagination spot check (ledger): real Next entry + deep link ------
  const ctx = await context({ admin: true, lang: 'en' });
  await ctx.nav(`${ORIGIN}/?page=ledger&locale=en`, 3600);
  out.pagination.ledgerDefault = JSON.parse(await ctx.ev(`(() => { ${HELPERS} return qaPager(); })()`));
  out.pagination.nextClick = await ctx.ev(`(() => { ${HELPERS} const b = qaBtn('Next'); if (!b) return 'NO NEXT'; b.click(); return 'clicked'; })()`);
  await sleep(2500);
  out.pagination.afterNext = JSON.parse(await ctx.ev(`(() => { ${HELPERS} return qaPager(); })()`));
  out.pagination.afterNextUrl = await ctx.ev('location.href.replace("http://arcblog.localhost:4939","")');
  // deep link page 2
  await ctx.nav(`${ORIGIN}/?page=ledger&ledger-list.page=2&locale=en`, 3200);
  out.pagination.deepLink2 = JSON.parse(await ctx.ev(`(() => { ${HELPERS} return qaPager(); })()`));
  out.pagination.deepLink2Url = await ctx.ev('location.href.replace("http://arcblog.localhost:4939","")');
  // a list whose total <= pageSize must NOT show a pager (R23 contract sanity)
  await ctx.nav(`${ORIGIN}/?page=policy&locale=en`, 3200);
  out.pagination.policyPager = JSON.parse(await ctx.ev(`(() => { ${HELPERS} return qaPager(); })()`));

  // ---- R21 spot check: hub + media queue surfaces still render -------------
  for (const p of ['hub', 'media', 'agents']) {
    await ctx.nav(`${ORIGIN}/?page=${p}&locale=en`, 3000);
    out.r21[p] = JSON.parse(await ctx.ev(`(() => { ${HELPERS}
      const t = document.body.innerText || '';
      return JSON.stringify({ url: location.href.replace('http://arcblog.localhost:4939',''), textLen: t.length, sessionFailed: /SESSION INIT FAILED/i.test(t), hasQueue: /queue/i.test(t), active: document.querySelectorAll('[data-active="true"]').length });
    })()`));
  }
  await browser.send('Target.closeTarget', { targetId: ctx.targetId });
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId });
} finally {
  out.targetsBefore = targetsBefore.length;
  for (const o of opened) {
    try { await browser.send('Target.closeTarget', { targetId: o.targetId }); } catch { /* noop */ }
    try { await browser.send('Target.disposeBrowserContext', { browserContextId: o.browserContextId }); } catch { /* noop */ }
  }
  const after = (await browser.send('Target.getTargets')).targetInfos.map((t) => t.targetId);
  out.targetsAfterFiltered = after.filter((x) => !targetsBefore.includes(x));
  writeFileSync(OUTFILE, JSON.stringify(out, null, 2));
  browser.ws.close();
}
console.log('wrote', OUTFILE);
console.log('pagesSummary', JSON.stringify(out.pagesSummary));
console.log('zhSummary', JSON.stringify(out.zhSummary));
console.log('targetsLeftOver', JSON.stringify(out.targetsAfterFiltered));
process.exit(0);
