#!/usr/bin/env node
// QA independent re-verification probe for REQ-027 (copyright single source).
// Written by QA from scratch for this task; does NOT reuse Dev/UI probes
// (docs/team/design/raw/REQ-027-probe.mjs) and does not read their JSON.
//
// Browser discipline: ONE browser context + ONE page target, reused via
// Page.navigate; locale is reset through a same-origin neutral document
// (/robots.txt) + sessionStorage.clear(); target closed + context disposed at end.
//
// Usage: node REQ-027-reverify-probe.mjs --out <json> [--wait 3200]
const CDP = 'http://127.0.0.1:9333';
const ORIGIN = 'http://arcblog.localhost:4939';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', null);
const WAIT_MS = Number(arg('wait', 3200));
const SHOT = arg('shot', null);

const PUBLIC7 = [
  { label: 'index', path: '/' },
  { label: 'store', path: '/store' },
  { label: 'about', path: '/?page=about' },
  { label: 'author', path: '/?page=author' },
  { label: 'reader', path: '/posts/hello-arcblog' },
  { label: 'page-view', path: '/pages/page-test-1790504571866' },
  { label: 'preview', path: '/preview/sign-keys-1790482924742' },
];
const CONSOLE = [{ label: 'dashboard', path: '/?page=dashboard' }];
const NEGATIVE = [{ label: 'missing-post', path: '/posts/qa-req027-does-not-exist-1790599999' }];
const VP = ['1803x908', '1512x765'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jget = async (p) => (await fetch(CDP + p)).json();

class S {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.events = []; }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const s = new S(ws);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && s.pend.has(d.id)) { const { res, rej } = s.pend.get(d.id); s.pend.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
      else if (d.method) { s.events.push(d); if (s.events.length > 4000) s.events.splice(0, 2000); }
    };
    return s;
  }
  send(method, params = {}) {
    const id = ++this.id;
    const p = new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
    return Promise.race([p, sleep(30000).then(() => { throw new Error('CDP timeout: ' + method); })]);
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails).slice(0, 600));
    return r.result.value;
  }
  drainExceptions() { const n = this.events.filter((e) => e.method === 'Runtime.exceptionThrown').length; this.events = []; return n; }
  close() { this.ws.close(); }
}

// ---- QA-authored measurement (raw DOM text, geometry, overflow) -----------
const MEASURE = String.raw`(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const R = e => e.getBoundingClientRect();
  const gs = e => getComputedStyle(e);
  const txt = e => (e.textContent || '').replace(/\s+/g, ' ').trim();
  const box = e => { const r = R(e); return { x: r2(r.x), y: r2(r.y), top: r2(r.top), left: r2(r.left), w: r2(r.width), h: r2(r.height), right: r2(r.right), bottom: r2(r.bottom) }; };
  const vis = e => { const r = R(e); return r.width > 0.5 && r.height > 0.5; };
  const clsPath = e => { const p = []; let c = e; while (c && c !== document.body && p.length < 4) { const cn = (typeof c.className === 'string' ? c.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.'); p.unshift(c.tagName.toLowerCase() + (cn ? '.' + cn : '')); c = c.parentElement; } return p.join(' > '); };
  const de = document.documentElement;
  const out = { url: location.href, lang: de.lang, vp: innerWidth + 'x' + innerHeight, title: document.title };
  const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
  out.sessionInitFailed = /SESSION INIT FAILED/.test(bodyText);
  out.bodyHasDollarT = bodyText.indexOf('$t(') >= 0;
  out.bodyHasLiteralKey = bodyText.indexOf('wrapper.footer-copyright') >= 0;
  out.overflow = { de_sw: de.scrollWidth, de_cw: de.clientWidth, body_sw: document.body.scrollWidth, body_cw: document.body.clientWidth };

  // every visible node whose text carries the copyright sign (site-wide)
  const copyAll = [...document.querySelectorAll('*')].filter(e => vis(e) && txt(e).indexOf('\u00a9') >= 0);
  out.copyrightSignNodes = copyAll.map(e => ({ tag: clsPath(e), text: txt(e).slice(0, 60), box: box(e) }));

  const footer = document.querySelector('.aup-app-footer');
  out.footerPresent = !!footer;
  if (!footer) { out.bodyTextHead = bodyText.slice(0, 200); return JSON.stringify(out); }

  const fb = box(footer), fcs = gs(footer);
  out.footer = {
    box: fb, height: fb.h, padding: fcs.padding, display: fcs.display, flexDirection: fcs.flexDirection, flexWrap: fcs.flexWrap,
    contentLeft: r2(fb.left + (parseFloat(fcs.paddingLeft) || 0)), contentRight: r2(fb.right - (parseFloat(fcs.paddingRight) || 0)),
    scrollWidth: footer.scrollWidth, clientWidth: footer.clientWidth,
  };
  const bar = footer.querySelector('.aup-footer-bottom-bar');
  out.bar = bar ? { present: true, text: txt(bar), box: box(bar) } : { present: false };
  const cp = footer.querySelector('.aup-footer-copyright');
  out.copyright = cp ? {
    present: true, textContent: cp.textContent, innerText: cp.innerText, trimmed: txt(cp),
    box: box(cp), count: footer.querySelectorAll('.aup-footer-copyright').length,
    outerHTML: cp.outerHTML.slice(0, 200),
    isLiteralTemplate: /^\s*\$t\(/.test(cp.textContent || ''),
    isEmpty: (cp.textContent || '').trim() === '',
  } : { present: false };
  const links = [...footer.querySelectorAll('.aup-footer-link')];
  out.footerLinks = { count: links.length, texts: links.map(e => txt(e)), boxes: links.map(e => box(e)) };
  const linkU = links.length ? (() => { const bs = links.map(e => R(e)); const u = { top: Math.min(...bs.map(r => r.top)), bottom: Math.max(...bs.map(r => r.bottom)), left: Math.min(...bs.map(r => r.left)), right: Math.max(...bs.map(r => r.right)) }; return { top: r2(u.top), bottom: r2(u.bottom), left: r2(u.left), right: r2(u.right), h: r2(u.bottom - u.top) }; })() : null;
  out.linkUnion = linkU;
  const cb = cp ? box(cp) : null;
  const cbRaw = cp ? R(cp) : null;
  out.alignment = {
    copyRight: cb ? cb.right : null, linkUnionRight: linkU ? linkU.right : null, contentRight: out.footer.contentRight,
    deltaCopyVsContent: cb ? r2(out.footer.contentRight - cb.right) : null,
    deltaLinkVsContent: linkU ? r2(out.footer.contentRight - linkU.right) : null,
    deltaCopyVsLinkRight: (cb && linkU) ? r2(Math.abs(cb.right - linkU.right)) : null,
  };
  if (cbRaw && links.length) {
    const bs = links.map(e => R(e));
    const linkTop = Math.min(...bs.map(r => r.top)), linkBottom = Math.max(...bs.map(r => r.bottom));
    const ix = Math.min(cbRaw.right, Math.max(...bs.map(r => r.right))) - Math.max(cbRaw.left, Math.min(...bs.map(r => r.left)));
    const iy = Math.min(cbRaw.bottom, linkBottom) - Math.max(cbRaw.top, linkTop);
    out.copyVsLinks = { ix: r2(ix), iy: r2(iy), intersect: ix > 1 && iy > 1, copyTop: cb.top, linkBottom, verticalGap: r2(cb.top - linkBottom) };
  }
  // locale-sensitive sibling $t() evidence: the tagline and the nav labels
  const footerText = (footer.innerText || '').replace(/\s+/g, ' ').trim();
  out.footerInnerText = footerText;
  return JSON.stringify(out);
})()`;

const SHOT_JS = String.raw`(() => {
  const f = document.querySelector('.aup-app-footer');
  if (!f) return null;
  const r = f.getBoundingClientRect();
  return JSON.stringify({ x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) });
})()`;

const main = async () => {
  const ver = await jget('/json/version');
  const fs = await import('node:fs');
  const browser = await S.open(ver.webSocketDebuggerUrl);
  const pages0 = (await jget('/json/list')).filter((t) => t.type === 'page');
  const before = pages0.length;

  let cookie = null;
  if (pages0[0]) {
    const peek = await S.open(pages0[0].webSocketDebuggerUrl);
    try { const raw = await peek.eval('document.cookie'); const m = /login_token=([^;]+)/.exec(raw || ''); cookie = m ? m[1] : null; } catch (e) { cookie = null; }
    peek.close();
  }

  const { browserContextId: ctx } = await browser.send('Target.createBrowserContext', {});
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const target = (await jget('/json/list')).find((t) => t.id === targetId);
  const page = await S.open(target.webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable'); await page.send('DOM.enable');

  const runs = [];
  let exTotal = 0;
  const neutral = async () => {
    await page.send('Page.navigate', { url: ORIGIN + '/robots.txt' });
    await sleep(400);
    await page.eval('try{sessionStorage.clear()}catch(e){};"cleared"');
  };
  const go = async (url, loc) => {
    await neutral();
    await page.send('Page.navigate', { url });
    await sleep(WAIT_MS);
    let probe = null, err = null;
    try { probe = JSON.parse(await page.eval(MEASURE)); } catch (e) { err = String(e.message).slice(0, 300); }
    let retried = false;
    if (!probe || !String(probe.lang || '').toLowerCase().startsWith(loc)) {
      retried = true;
      await neutral();
      await page.send('Page.navigate', { url });
      await sleep(WAIT_MS);
      try { probe = JSON.parse(await page.eval(MEASURE)); } catch (e) { err = String(e.message).slice(0, 300); }
    }
    exTotal += page.drainExceptions();
    return { probe, err, retried };
  };

  const sweep = async (name, pages, vpstr, locales, authed) => {
    const [VW, VH] = vpstr.split('x').map(Number);
    await page.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    if (authed && cookie) await page.send('Network.setCookie', { name: 'login_token', value: cookie, domain: 'arcblog.localhost', path: '/', httpOnly: false });
    if (!authed) await page.send('Network.deleteCookies', { name: 'login_token', domain: 'arcblog.localhost' });
    for (const p of pages) for (const loc of locales) {
      const url = ORIGIN + p.path + (p.path.includes('?') ? '&' : '?') + 'locale=' + loc;
      const { probe, err, retried } = await go(url, loc);
      const rec = { sweep: name, vp: vpstr, loc, authed, page: p.label, requestedUrl: url, retried, err, ...(probe || {}) };
      if (probe && probe.footerPresent && probe.copyright && probe.copyright.present) {
        const q = await page.eval(SHOT_JS);
        rec.shotBox = q ? JSON.parse(q) : null;
        if (SHOT) {
          try {
            const rc = JSON.parse(q);
            const shot = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: rc.x, y: rc.y, width: rc.width, height: rc.height, scale: 1 } });
            fs.mkdirSync(SHOT.replace(/\/[^/]+$/, ''), { recursive: true });
            fs.writeFileSync(SHOT.replace(/\.png$/, '') + '-' + name + '-' + vpstr + '-' + loc + '-' + p.label + '.png', Buffer.from(shot.data, 'base64'));
          } catch (e) { rec.shotErr = String(e.message).slice(0, 150); }
        }
      }
      runs.push(rec);
      console.log(JSON.stringify({ run: name + '|' + vpstr + '|' + loc + '|' + p.label, lang: probe && probe.lang, retried,
        footer: probe && probe.footerPresent, h: probe && probe.footer && probe.footer.height,
        copy: probe && probe.copyright && probe.copyright.trimmed, cpCount: probe && probe.copyright && probe.copyright.count,
        dCopy: probe && probe.alignment && probe.alignment.deltaCopyVsContent,
        dLink: probe && probe.alignment && probe.alignment.deltaLinkVsContent,
        dCL: probe && probe.alignment && probe.alignment.deltaCopyVsLinkRight,
        iy: probe && probe.copyVsLinks && probe.copyVsLinks.iy, gap: probe && probe.copyVsLinks && probe.copyVsLinks.verticalGap,
        deOver: probe && probe.overflow ? probe.overflow.de_sw - probe.overflow.de_cw : null,
        dT: probe && probe.bodyHasDollarT, sessFail: probe && probe.sessionInitFailed, err }));
    }
    await page.send('Emulation.clearDeviceMetricsOverride');
  };

  // guest, one locale sweep at a time (en first, zh second) — never zh->en in-tab
  await sweep('guest-public7', PUBLIC7, VP[0], ['en'], false);
  await sweep('guest-public7', PUBLIC7, VP[0], ['zh'], false);
  await sweep('guest-public7', PUBLIC7, VP[1], ['en'], false);
  await sweep('guest-public7', PUBLIC7, VP[1], ['zh'], false);
  await sweep('guest-negative', NEGATIVE, VP[0], ['en'], false);
  // console sidebar footer (admin session read-only from the pinned tab)
  await sweep('auth-console', CONSOLE, VP[0], ['en'], true);
  await sweep('auth-console', CONSOLE, VP[0], ['zh'], true);

  const out = {
    meta: {
      req: 'REQ-027', by: 'QA independent re-verification probe', origin: ORIGIN, cdp: CDP,
      chrome: ver.Browser, cookieFound: !!cookie, waitMs: WAIT_MS, targetId: target.id,
      pagesBefore: before, pagesAfter: (await jget('/json/list')).filter((t) => t.type === 'page').length,
      runtimeExceptions: exTotal, startedAt: new Date().toISOString(),
    },
    runs,
  };
  if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }
  console.error('#' + ' pageTargets: before=' + before + ' afterProbe=' + out.meta.pagesAfter + ' runs=' + runs.length + ' runtimeExceptions=' + exTotal);
  page.close();
  await browser.send('Target.disposeBrowserContext', { browserContextId: ctx });
  await sleep(300);
  console.error('afterClose=' + (await jget('/json/list')).filter((t) => t.type === 'page').length);
  browser.close();
};
main().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
