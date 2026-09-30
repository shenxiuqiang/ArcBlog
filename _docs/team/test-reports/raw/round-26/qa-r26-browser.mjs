#!/usr/bin/env node
/**
 * QA Round 26 (task-112) — independent browser verification of REQ-034.
 *
 * ONE admin context + ONE tab per phase; every locale gets its OWN browser
 * context (REQ-034 H10). Page.navigate only — no second tab, no source writes.
 *
 * Modes (argv[2]):
 *   sweep   — 21 console pages × en/zh: exactly one active row, no SESSION INIT FAILED
 *   general — ?page=general (en + zh): the Roles & capabilities card DOM
 *   policy  — ?page=policy  (en + zh): queue empty/standing-note DOM (BUG-072)
 *   factory — ?page=factory (en): sample the existing four actions (zero regression)
 *   click   — click the real "Re-verify" button, then the row's Clear button
 *
 * Output: JSON next to this file (qa-r26-<mode>.json) + stdout summary.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';
const MODE = process.argv[2] || 'sweep';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { CONSOLE_SECTIONS } = await import('/Users/shenxiuqiang/workspace/ArcBlog/scripts/console-nav.mjs');

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) {
        const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id);
        d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
      }
    };
    return s;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify(msg));
      setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout ' + method)); } }, 40000);
    });
  }
}

const ver = await (await fetch(`${CDP}/json/version`)).json();
const browser = await S.open(ver.webSocketDebuggerUrl);
const { cookies } = await browser.send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('NO ADMIN COOKIE in the pinned browser'); process.exit(2); }

/** New context (per locale/identity) + one tab. */
async function openTab() {
  const browserContextId = (await browser.send('Target.createBrowserContext')).browserContextId;
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Runtime.enable', {}, sessionId);
  await browser.send('Network.enable', {}, sessionId);
  await browser.send('Network.setCookie', { name: 'login_token', value: token, domain: '.arcblog.localhost', path: '/', httpOnly: false }, sessionId);
  const ev = async (expr, awaitPromise = false) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, sessionId);
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) };
    return r.result.value;
  };
  const nav = async (url, settle = 1400) => {
    await browser.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(settle);
  };
  const close = async () => {
    try { await browser.send('Target.closeTarget', { targetId }); } catch { /* best effort */ }
    let disposeError = '';
    try { await browser.send('Target.disposeBrowserContext', { browserContextId }); } catch (e) { disposeError = String(e.message); }
    return { closedTarget: targetId, disposeError };
  };
  return { ev, nav, close, sessionId };
}

const STORE = {};
const run = async () => {
  if (MODE === 'sweep') {
    const tab = await openTab();
    const pages = [];
    for (const locale of ['en', 'zh']) {
      // a fresh context per locale (H10), one tab inside it
      const t = locale === 'en' ? tab : await openTab();
      for (const page of CONSOLE_SECTIONS) {
        await t.nav(`${ORIGIN}/?page=${page}&locale=${locale}`);
        const raw = await t.ev(`JSON.stringify({
          page: ${JSON.stringify(page)}, locale: ${JSON.stringify(locale)},
          lang: document.documentElement.lang,
          url: location.href,
          activeData: document.querySelectorAll('[data-active="true"]').length,
          activeAria: document.querySelectorAll('[aria-current="page"]').length,
          sessionFail: (document.body?document.body.innerText:'').includes('SESSION INIT FAILED'),
          title: document.title,
        })`);
        pages.push(typeof raw === 'string' ? JSON.parse(raw) : { page, locale, error: raw });
      }
      if (locale !== 'en') await t.close();
    }
    await tab.close();
    STORE.pages = pages;
    console.log(JSON.stringify({
      count: pages.length,
      activeNotOne: pages.filter((p) => p.activeData !== 1).map((p) => p),
      sessionFailed: pages.filter((p) => p.sessionFail).map((p) => p.page + '/' + p.locale),
      wrongLang: pages.filter((p) => p.lang !== p.locale).map((p) => p.page + '/' + p.locale + '=' + p.lang),
    }, null, 2));
  }

  if (MODE === 'general') {
    const out = {};
    for (const locale of ['en', 'zh']) {
      const tab = await openTab();
      await tab.nav(`${ORIGIN}/?page=general&locale=${locale}`, 2500);
      await tab.nav(`${ORIGIN}/?page=general&locale=${locale}`, 2500); // warm second load
      const raw = await tab.ev(`(() => {
        const heads = [...document.querySelectorAll('h1,h2,h3')].filter((h) => /Roles & capabilities|角色与能力/.test(h.innerText));
        if (!heads.length) return JSON.stringify({ found: false, bodyHead: document.body.innerText.slice(0, 1200) });
        // walk up to the card (the element carrying the card background)
        let card = heads[0];
        for (let i = 0; i < 6 && card.parentElement; i++) { card = card.parentElement; if (/card-bg/.test(getComputedStyle(card).backgroundColor) || card.style.background) break; }
        const text = card.innerText;
        const controls = [...card.querySelectorAll('button,a,input,textarea,select')].map((el) => ({
          tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', href: el.getAttribute('href') || '',
          text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60),
        }));
        const inputs = [...card.querySelectorAll('input,textarea,select')].map((el) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', name: el.getAttribute('name') || '', placeholder: el.getAttribute('placeholder') || '' }));
        return JSON.stringify({
          found: true,
          lang: document.documentElement.lang,
          activeData: document.querySelectorAll('[data-active="true"]').length,
          sessionFail: document.body.innerText.includes('SESSION INIT FAILED'),
          text,
          inputs,
          controls,
          fiveStates: ['none','acquired','staked','revoking','claimable'].map((s) => ({ s, inCard: new RegExp('\\\\b'+s+'\\\\b').test(text) })),
          hasNoInputSentence: /NO address or network|没有任何地址或网络输入框/.test(text),
          chainVerifPositive: /chain[- ]verified|链上已验证/i.test(text),
          snapshotNoneLine: /No verification snapshot yet|还没有验证快照/.test(text),
          factoryHref: [...card.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter(Boolean),
          bodyLen: document.body.innerText.length,
        });
      })()`);
      out[locale] = typeof raw === 'string' ? JSON.parse(raw) : { error: raw };
      await tab.close();
    }
    STORE.general = out;
    console.log(JSON.stringify({ enFound: out.en?.found, zhFound: out.zh?.found, enInputs: out.en?.inputs, enFactoryHref: out.en?.factoryHref, zhFactoryHref: out.zh?.factoryHref }, null, 2));
  }

  if (MODE === 'policy') {
    const out = {};
    for (const locale of ['en', 'zh']) {
      const tab = await openTab();
      await tab.nav(`${ORIGIN}/?page=policy&locale=${locale}`, 2500);
      await tab.nav(`${ORIGIN}/?page=policy&locale=${locale}`, 2500);
      const raw = await tab.ev(`(() => {
        const body = document.body.innerText;
        const lines = body.split('\\n').map((l) => l.trim()).filter(Boolean);
        const emptyRe = /Nothing queued yet|队列为空/;
        const standingRe = /Standing rule|常驻规则/;
        // the queue card: the element whose text carries the queue title
        const heads = [...document.querySelectorAll('h1,h2,h3')].filter((h) => /Policy intent queue|策略意图队列/.test(h.innerText));
        let queueText = '';
        if (heads.length) { let c = heads[0]; for (let i=0;i<6&&c.parentElement;i++){c=c.parentElement;} queueText = c.innerText; }
        return JSON.stringify({
          lang: document.documentElement.lang,
          activeData: document.querySelectorAll('[data-active="true"]').length,
          sessionFail: body.includes('SESSION INIT FAILED'),
          emptyStateLines: lines.filter((l) => emptyRe.test(l)),
          standingNoteLines: lines.filter((l) => standingRe.test(l)),
          queueClearButtons: [...document.querySelectorAll('button')].filter((b) => /^(Clear|清除)$/.test(b.innerText.trim())).length,
          queueLegend: (body.match(/(pending = [^\\n]*)/) || [])[1] || null,
          queueText: queueText.slice(0, 2600),
        });
      })()`);
      out[locale] = typeof raw === 'string' ? JSON.parse(raw) : { error: raw };
      await tab.close();
    }
    STORE.policy = out;
    console.log(JSON.stringify({
      en: { empty: out.en?.emptyStateLines, standing: out.en?.standingNoteLines, clear: out.en?.queueClearButtons, legend: out.en?.queueLegend && out.en.queueLegend.slice(0, 120) },
      zh: { empty: out.zh?.emptyStateLines, standing: out.zh?.standingNoteLines, clear: out.zh?.queueClearButtons, legend: out.zh?.queueLegend && out.zh.queueLegend.slice(0, 120) },
    }, null, 2));
  }

  if (MODE === 'factory') {
    const tab = await openTab();
    await tab.nav(`${ORIGIN}/?page=factory&locale=en`, 2500);
    await tab.nav(`${ORIGIN}/?page=factory&locale=en`, 2500);
    const raw = await tab.ev(`(() => {
      const text = document.body.innerText;
      const buttons = [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean);
      return JSON.stringify({
        lang: document.documentElement.lang,
        activeData: document.querySelectorAll('[data-active="true"]').length,
        sessionFail: text.includes('SESSION INIT FAILED'),
        hasFourActions: ['Buy','Stake','Revoke','Claim'].map((w) => ({ w, hit: new RegExp(w, 'i').test(buttons.join('|')) })),
        buttonSample: buttons.slice(0, 40),
        bodyHead: text.slice(0, 1500),
      });
    })()`);
    STORE.factory = typeof raw === 'string' ? JSON.parse(raw) : { error: raw };
    console.log(JSON.stringify(STORE.factory, null, 2).slice(0, 2500));
    await tab.close();
  }

  if (MODE === 'click') {
    const tab = await openTab();
    await tab.nav(`${ORIGIN}/?page=general&locale=en`, 2500);
    await tab.nav(`${ORIGIN}/?page=general&locale=en`, 2500);
    // 1. locate the Re-verify button inside the roles card
    const before = await tab.ev(`(() => {
      const btns = [...document.querySelectorAll('button')].map((b,i) => ({ i, text: b.innerText.trim() }));
      return JSON.stringify({ btns: btns.filter((b) => /Re-verify|重新验证/.test(b.text)), all: btns.length, url: location.href });
    })()`);
    STORE.clickBefore = JSON.parse(before);
    // click it (real DOM click via the same element the user presses)
    const clicked = await tab.ev(`(async () => {
      const b = [...document.querySelectorAll('button')].find((x) => /Re-verify|重新验证/.test(x.innerText));
      if (!b) return 'NO BUTTON';
      b.click();
      await new Promise((r) => setTimeout(r, 2500));
      const rows = [...document.querySelectorAll('button')].filter((x) => /^(Clear|清除)$/.test(x.innerText.trim())).length;
      const t = document.body.innerText;
      return JSON.stringify({ clicked: true, clearRows: rows, queuedToast: /Verification intent queued|验证意图已入队/.test(t) });
    })()`, true);
    STORE.clickAfter = typeof clicked === 'string' ? clicked : clicked;
    console.log('click ->', clicked);
    await tab.close();
  }
};
await run();
writeFileSync(join(HERE, `qa-r26-${MODE}.json`), JSON.stringify({ mode: MODE, at: new Date().toISOString(), ...STORE }, null, 2));
const remaining = (await browser.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').map((t) => t.url);
console.log('remaining page targets (pre-existing tabs are not mine):', JSON.stringify(remaining));
process.exit(0);
