#!/usr/bin/env node
// QA helper (REQ-028, task-68): read the pinned browser's login_token over CDP
// and re-run the RPC probe as the signed-in session — without ever printing the
// token (it is a credential). Child gets it through the environment only.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CDP = 'http://127.0.0.1:9333';
const here = dirname(fileURLToPath(import.meta.url));

const ver = await (await fetch(CDP + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pend = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { const { res } = pend.get(d.id); pend.delete(d.id); res(d.result); }
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method, params })); });

const { cookies } = await send('Storage.getCookies');
const token = (cookies.find((c) => c.name === 'login_token' && c.domain.endsWith('arcblog.localhost')) || {}).value;
if (!token) { console.error('no login_token cookie found'); process.exit(2); }
console.error(`login_token found: len=${token.length} domain=.arcblog.localhost (value not printed)`);

const r = spawnSync(process.execPath, [join(here, 'REQ-028-qa-rpc.mjs')], {
  env: { ...process.env, ARCBLOG_LOGIN_TOKEN: token },
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});
process.stdout.write(r.stdout);
process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
