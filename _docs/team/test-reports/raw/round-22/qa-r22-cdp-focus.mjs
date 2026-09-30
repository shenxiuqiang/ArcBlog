// QA Round 22 — focused probe: residual hub overflow identity, pages navigation,
// factory NFT <img> rendering (data: URI), SIMULATED text context.
const CDP = 'http://127.0.0.1:9333';
const SITE = 'http://arcblog.localhost:4939';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { id += 1; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  return { ws, send };
}

async function main() {
  const created = await (await fetch(`${CDP}/json/new?${encodeURIComponent(`${SITE}/robots.txt`)}`, { method: 'PUT' })).json();
  const { ws, send } = await connect(created.webSocketDebuggerUrl);
  await send('Page.enable');
  const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const goto = async (url, wait = 3400) => { await send('Page.navigate', { url }); await sleep(wait); };
  const vp = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  try {
    // (a) hub @1512 en — identify residual overflowing elements
    await vp(1512, 765);
    await goto(`${SITE}/?page=hub&locale=en`, 3600);
    out.hubResidual = await ev(`(() => {
      const list = [];
      for (const el of document.querySelectorAll('*')) {
        if (!el.innerText || !el.innerText.trim()) continue;
        const over = el.scrollWidth - el.clientWidth;
        if (over > 1) {
          const cs = getComputedStyle(el);
          list.push({ cls: String(el.className), cw: el.clientWidth, sw: el.scrollWidth, over,
            overflowX: cs.overflowX, text: (el.innerText || '').replace(/\\s+/g, ' ').slice(0, 90),
            parentCls: String(el.parentElement?.className || ''),
            ancestors: (() => { const a = []; let n = el; while (n && a.length < 5) { a.push(String(n.className).slice(0, 30)); n = n.parentElement; } return a; })() });
        }
      }
      return { items: list, docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    })()`);

    // (b) pages — View href + click navigation (target=_blank)
    await vp(1512, 765);
    await goto(`${SITE}/?page=pages&locale=en`, 3400);
    out.pagesLink = await ev(`(() => { const row = document.querySelector('.aup-list-template-item'); const a = row && [...row.querySelectorAll('a')].find(x => (x.innerText||'').trim()); return a ? { text: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target'), box: (() => { const r = a.getBoundingClientRect(); return { w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; })() } : null; })()`);
    const before = (await fetch(`${CDP}/json/list`)).json ? await (await fetch(`${CDP}/json/list`)).json() : [];
    const beforeIds = new Set(before.map((t) => t.id));
    await ev(`(() => { const row = document.querySelector('.aup-list-template-item'); const a = row && [...row.querySelectorAll('a')].find(x => (x.innerText||'').trim()); if (a) a.click(); return !!a; })()`);
    await sleep(2500);
    const after = await (await fetch(`${CDP}/json/list`)).json();
    const created2 = after.filter((t) => !beforeIds.has(t.id));
    out.pagesNavigation = { newTargets: created2.map((t) => ({ url: t.url, title: t.title })) };
    for (const t of created2) await fetch(`${CDP}/json/close/${t.id}`);

    // (c) factory — is the data: URI really rendered? + SIMULATED context
    await vp(1803, 908);
    await goto(`${SITE}/?page=factory&locale=en`, 4400);
    out.factoryImg = await ev(`(() => { const m = document.querySelector('[data-aup-id="factory-nft-svg"]'); const img = m && m.querySelector('img'); const t = document.body.innerText || '';
      const idx = []; let i = t.indexOf('SIMULATED'); while (i !== -1 && idx.length < 6) { idx.push(t.slice(Math.max(0, i - 45), i + 55).replace(/\\n+/g, ' | ')); i = t.indexOf('SIMULATED', i + 1); }
      return { hasImg: !!img, srcScheme: img ? String(img.getAttribute('src')).slice(0, 30) : null,
        naturalWidth: img ? img.naturalWidth : null, naturalHeight: img ? img.naturalHeight : null, complete: img ? img.complete : null,
        alt: img ? img.getAttribute('alt') : null, simulatedContexts: idx, dashOnly: (t.match(/—/g)||[]).length };
    })()`);

    // (d) operations cold — confirm real values not dashes
    await goto(`${SITE}/?page=operations&locale=en`, 4400);
    out.operationsCold = await ev(`(() => { const t = document.body.innerText || ''; const kvs = [...document.querySelectorAll('.aup-kv-row')].map(k => k.innerText.replace(/\\s+/g,' ').trim()); return { kvs, dashValues: kvs.filter(s => /—\\s*$/.test(s)).length, notePresent: /not bound yet|unavailable/.test(t) }; })()`);
  } finally {
    try { ws.close(); } catch {}
    await fetch(`${CDP}/json/close/${created.id}`);
  }
  console.log(JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
