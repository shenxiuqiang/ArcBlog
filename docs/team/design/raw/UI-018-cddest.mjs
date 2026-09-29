const CDP='http://127.0.0.1:9333', ORIGIN='http://arcblog.localhost:4939';
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const j=async p=>(await fetch(CDP+p)).json();
class S{constructor(ws){this.ws=ws;this.id=0;this.pend=new Map();}
static async open(u){const ws=new WebSocket(u);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});const s=new S(ws);
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&s.pend.has(d.id)){const{res,rej}=s.pend.get(d.id);s.pend.delete(d.id);d.error?rej(new Error(JSON.stringify(d.error))):res(d.result);}};return s;}
send(m,p={}){const id=++this.id;const pr=new Promise((res,rej)=>{this.pend.set(id,{res,rej});this.ws.send(JSON.stringify({id,method:m,params:p}));});return Promise.race([pr,sleep(25000).then(()=>{throw new Error('timeout '+m);})]);}
async eval(e){const r=await this.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error('EVAL '+JSON.stringify(r.exceptionDetails).slice(0,400));return r.result.value;}
close(){this.ws.close();}}
// EXACT equivalent assertion from docs/ArcBlog-admin-ui-design.md §9 (2026-09-28 wording)
const DOC = String.raw`(() => {
  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  const isFormControl = el => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName);
  const contentColumns = [...document.querySelectorAll('*')].filter(el =>
    /auto|scroll/.test(getComputedStyle(el).overflowY) && !isFormControl(el) &&
    !(header && el.contains(header)) &&
    !(activeNav && el.contains(activeNav)));
  const links = contentColumns.flatMap(el => [...el.querySelectorAll('a:not([target])')]);
  return JSON.stringify({
    url: location.href, candidates: contentColumns.length,
    linksPerColumn: contentColumns.map(el => el.querySelectorAll('a:not([target])').length),
    total: contentColumns.reduce((n, el) => n + el.querySelectorAll('a:not([target])').length, 0),
    offenders: links.map(a => ({ text: (a.innerText||'').trim().slice(0,40), href: a.getAttribute('href'), id: a.getAttribute('data-aup-id') })),
  });
})()`;
const main=async()=>{
  const ver=await j('/json/version'); const browser=await S.open(ver.webSocketDebuggerUrl);
  const pages0=(await j('/json/list')).filter(t=>t.type==='page'); let cookie=null;
  for(const t of pages0){const pk=await S.open(t.webSocketDebuggerUrl);try{const raw=await pk.eval('document.cookie');const m=/login_token=([^;]+)/.exec(raw||'');if(m)cookie=m[1];}catch(e){}pk.close();if(cookie)break;}
  for(const [VW,VH] of [[1803,908],[1512,765]]){
    for(const pg of ['general','policy','hub','pages']){
      const {browserContextId:ctx}=await browser.send('Target.createBrowserContext',{});
      const {targetId}=await browser.send('Target.createTarget',{url:'about:blank',browserContextId:ctx});
      const tg=(await j('/json/list')).find(t=>t.id===targetId); const page=await S.open(tg.webSocketDebuggerUrl);
      await page.send('Page.enable');await page.send('Runtime.enable');await page.send('Network.enable');
      if(cookie) await page.send('Network.setCookie',{name:'login_token',value:cookie,domain:'arcblog.localhost',path:'/',httpOnly:false});
      await page.send('Emulation.setDeviceMetricsOverride',{width:VW,height:VH,deviceScaleFactor:1,mobile:false});
      await page.send('Page.navigate',{url:ORIGIN+'/?page='+pg+'&locale=en'}); await sleep(3700);
      console.log(VW+'x'+VH+'|'+pg+' '+await page.eval(DOC));
      page.close(); await browser.send('Target.disposeBrowserContext',{browserContextId:ctx}); await sleep(250);
    }
  }
  browser.close();
};
main().catch(e=>{console.error('FATAL '+e.message);process.exit(1);});
