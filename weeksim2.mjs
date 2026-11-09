/* ★★★★★ 周一到周日 整周模拟 —— 严格端到端版
 *
 * ★ 与上一版 weeksim.mjs 的根本区别（上一版不严谨，已作废）：
 *   上一版的前端逻辑是我在测试里【手抄】的一份 bState —— 如果 pages.js
 *   改了，测试根本发现不了，等于自欺欺人。
 *
 *   本版走【真实代码路径】：
 *     服务端 → 直调 src/index.js 真实的 /api/market-state handler
 *     前端   → jsdom 真实执行 pages.js 生成页面里的脚本
 *     状态   → 从真实 DOM 徽标文本读取（"实时" / "休市中" / "连接中断"）
 *   任何一处代码改动，测试都会立刻发现。
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome } from './src/pages.js';
import mod, { mktTick } from './src/index.js';

const RealDate = Date;
let NOW = new RealDate('2026-10-26T00:00:00+08:00').getTime();   /* 周一 00:00 */
Date.now = () => NOW;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : (fail++, console.log('  NG  ✗ ' + n)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 服务端：真实 KV + 真实 handler ---------- */
function mkKV() {
  const m = new Map();
  return { puts: 0, gets: 0,
    async get(k) { this.gets++; const v = m.get(k); if (v == null) return null;
                   try { return JSON.parse(v); } catch (e) { return null; } },
    async put(k, v) { this.puts++; m.set(k, v); } };
}
const KV = mkKV();
const ENV = { MKT_STATE_KV: KV, ASSETS: { async fetch() { return new Response('', { status: 404 }); } } };

/* ★ 真实调用 src/index.js 的 fetch handler，不是我自己拼 JSON */
async function srvState() {
  const r = await mod.fetch(new Request('https://you.piccalc.com/api/market-state'), ENV, { waitUntil() {} });
  return await r.json();
}

/* ---------- 市场模型：纯函数，价格只由时间决定 ---------- */
let frozen = false, frozenPrice = null;
const OPEN_AT = NOW, BASE = 110.50;
function marketNow() {
  if (frozen) return frozenPrice;
  return +(BASE + Math.floor((NOW - OPEN_AT) / 30000) * 0.01).toFixed(2);
}
const freeze = () => { frozenPrice = marketNow(); frozen = true; };
const thaw   = () => { frozen = false; frozenPrice = null; };

async function cronOnce() {           /* 服务端跑一次真实 Cron */
  await mktTick(ENV, { oil: async () => ({ brent: marketNow(), wti: 101.20 }),
                       gold: async () => ({ usdOz: 4030.00 }) });
}

/* ---------- 前端：jsdom 真实执行 pages.js ---------- */
const M = { oil:{price:110.50,updated:'x'}, wti:{price:101.20,updated:'x'},
            gold:{usdOz:4030.00,updatedAt:'x'},
            cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:'x'} };
const FX = { base:'USD', rates:{CNY:6.68,EUR:0.89,JPY:157.4}, date:'2026-10-28' };
function mkstore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,
  setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},
  key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}

/* ★ 首页 HTML 走真实 handler（含 SSR 注入的 ps-mkt），不是测试里手拼 */
async function homeHtml(){
  const r = await mod.fetch(new Request('https://you.piccalc.com/zh/'), ENV, { waitUntil() {} });
  return await r.text();
}
async function bootHome(shared){
  const bag={timers:[],intervals:[],fetches:[]};
  const d=new JSDOM(await homeHtml(),{url:'https://you.piccalc.com/zh/',
   runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{constructor(...a){return a.length?new RD(...a):new RD(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     Object.defineProperty(w,'localStorage',{value:mkstore(),configurable:true});
     Object.defineProperty(w.Document.prototype,'hidden',{get:()=>false,configurable:true});
     Object.defineProperty(w.Document.prototype,'visibilityState',{get:()=>'visible',configurable:true});
     w.fetch=async(u)=>{ const s=String(u); bag.fetches.push(s);
       if(s.includes('/api/market-state')){
         const j = await srvState();               /* ★ 真实 handler 的真实返回 */
         if(process.env.DBG) console.log('      [DBG] market-state →', JSON.stringify(j));
         return {ok:true,status:200,headers:{get:()=>'application/json'},json:async()=>j};
       }
       if(s.includes('/api/oil-live')){
         const v = marketNow();
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({ok:true,brent:v,wti:101.20,provider:'biquote'})};
       }
       if(s.includes('/api/gold-live')){
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({priceUsdPerOz:4030.00,live:true})};
       }
       return {ok:true,status:200,headers:{get:()=>'application/json'},
               json:async()=>({bid:4030,ask:4030,price:4030,spot_usd_oz:4030,data_state:'fresh'})};
     };
     w.setTimeout=(fn,ms)=>{bag.timers.push({fn,at:NOW+(ms||0)});return bag.timers.length;};
     /* ★ 必须真的按周期触发：前端靠 setInterval(renderAll,1000) 每秒重渲染。
      *   只存不跑的话，chip 永远停在首屏那一帧，测试结果不可信。 */
     w.setInterval=(fn,ms)=>{bag.intervals.push({fn,ms:ms||1000,next:NOW+(ms||1000)});return bag.intervals.length;};
     w.clearTimeout=()=>{}; w.clearInterval=()=>{};
   }});
  for(let i=0;i<12;i++){ runTimers(bag); await sleep(2); }
  return {d,bag};
}
function runTimers(bag){
  let g=0;
  /* 先按周期触发 interval（秒数重渲染靠它） */
  for(const iv of bag.intervals){
    let n=0;
    while(iv.next<=NOW && n++<200){ iv.next+=iv.ms; try{ iv.fn(); }catch(e){} }
  }
  while(g++<500){
    const due=bag.timers.filter(t=>!t.done&&t.at<=NOW).sort((a,b)=>a.at-b.at);
    if(!due.length) break;
    const t=due[0]; t.done=true; bag.timers.splice(bag.timers.indexOf(t),1); t.fn();
  }
}
async function feStep(bag,ms){
  const end=NOW+ms;
  while(NOW<end){
    NOW+=1000;
    runTimers(bag);
    await sleep(0);
    /* 价格每 30 秒跳一次，前端 15 秒一拍 → 推进 */
    if((NOW-OPEN_AT)%15000===0) runTimers(bag);
  }
  runTimers(bag); await sleep(3);
}
function chip(d){
  const el=d.window.document.getElementById('home-oil-chip');
  return el?el.textContent.trim():'(找不到徽标)';
}

/* ================================================================= */
console.log('=== 严格端到端整周模拟（真实 handler + 真实前端脚本）===\n');

console.log('--- 周一 00:00 开市 ---');
await cronOnce();
let s = await srvState();
console.log('  服务端 = ' + s.brent + '（hasKV=' + s.hasKV + '）');
ok('★★ 服务端 handler 真实可用', s.hasKV === true);
ok('★★ 周一开市：服务端记 live', s.brent === 'live');

{ const sh=mkstore(); const h=await bootHome(sh);
  console.log('  前端徽标 = [' + chip(h.d) + ']');
  ok('★★★ 开市时前端显示实时', chip(h.d).indexOf('实时') >= 0); }

console.log('\n--- 周二 14:00 接口抽风，价格冻结 ---');
NOW += 3600000 * 38;                    /* 快进到周二 14:00 */
await cronOnce();
freeze();
let flipAt = null, cronCount = 0;
for (let i = 1; i <= 4; i++) {
  NOW += 600000; cronCount++;
  await cronOnce();
  const s2 = await srvState();
  console.log('    冻结 ' + (i * 10) + ' 分钟 → 服务端 = ' + s2.brent);
  if (s2.brent === 'closed' && flipAt == null) { flipAt = i * 10; break; }
}
ok('★★★★ 冻结后服务端确实翻休市', flipAt != null);
console.log('    ★ 实际确认耗时 = ' + flipAt + ' 分钟');

{ const sh=mkstore(); const h=await bootHome(sh);
  await feStep(h.bag, 3000);
  console.log('  全新会话打开 → [' + chip(h.d) + ']');
  ok('★★★★★ 服务端已判休市 → 新会话立刻显示休市（零等待）',
     chip(h.d).indexOf('休市') >= 0); }

console.log('\n--- 价格恢复跳动，前端必须立刻翻回实时 ---');
thaw();
{ const sh=mkstore(); const h=await bootHome(sh);
  await feStep(h.bag, 60000);           /* 推进 1 分钟，让价格真跳几次 */
  const c = chip(h.d);
  console.log('  服务端仍 = ' + (await srvState()).brent + '，前端 = [' + c + ']');
  ok('★★★★★ 价格在动 → 前端立刻实时（压过服务端旧 closed）', c.indexOf('实时') >= 0); }

console.log('\n--- 周五 22:00 收盘 ---');
NOW += 3600000 * 80;
await cronOnce();
freeze();
let wkFlip = null;
for (let i = 1; i <= 4; i++) {
  NOW += 600000; await cronOnce();
  const s3 = await srvState();
  if (s3.brent === 'closed' && wkFlip == null) { wkFlip = i * 10; break; }
}
console.log('    收盘后 ' + wkFlip + ' 分钟确认休市');
ok('★★★★★ 周五收盘确认休市', wkFlip != null);

console.log('\n--- 周末：KV 写入 + 5 个新会话 ---');
const putsBefore = KV.puts;
for (let i = 0; i < 24; i++) { NOW += 600000; await cronOnce(); }   /* 跑 4 小时 */
console.log('    休市期间连跑 24 次 Cron，新增写入 = ' + (KV.puts - putsBefore) + ' 次');
ok('★★★★★ 休市期间价格不动 → 一次都不写', KV.puts === putsBefore);

let zeroWait = 0, firstPaintClosed = 0;
for (const t of ['周六 03:00','周六 14:00','周日 09:00','周日 18:00','周日 21:00']) {
  NOW += 3600000 * 2;
  const sh = mkstore();                 /* 全新会话，本地零记录 */
  const h = await bootHome(sh);
  const first = chip(h.d);              /* ★ 首屏那一帧（SSR 注入生效则应为休市中）*/
  await feStep(h.bag, 3000);
  const c = chip(h.d);
  console.log('    ' + t + ' → 首屏[' + first + '] 稳定后[' + c + ']');
  if (c.indexOf('休市') >= 0) zeroWait++;
  if (first.indexOf('休市') >= 0) firstPaintClosed++;
}
ok('★★★★★ 周末 5 个新会话全部立刻显示休市', zeroWait === 5);
ok('★★★★★ 首屏【零闪烁】：第一帧就是休市中（SSR 注入生效）',
   firstPaintClosed === 5);

console.log('\n--- 周日 22:00 重开 ---');
thaw();
{ const sh=mkstore(); const h=await bootHome(sh);
  await feStep(h.bag, 60000);
  const c = chip(h.d);
  console.log('    服务端仍 = ' + (await srvState()).brent + '，前端 = [' + c + ']');
  ok('★★★★★ 开市即时：前端不等服务端，自己看到价格动就翻实时',
     c.indexOf('实时') >= 0);
  NOW += 600000; await cronOnce();
  console.log('    服务端下一次 Cron 后 = ' + (await srvState()).brent);
  ok('★★★★★ 服务端随后同步为 live', (await srvState()).brent === 'live'); }

console.log('\n--- 汇总 ---');
console.log('  KV 写入 ' + KV.puts + ' 次 / 读取 ' + KV.gets + ' 次');
console.log('  休市确认耗时：周二 ' + flipAt + ' 分钟，周五 ' + wkFlip + ' 分钟（两处应一致）');
ok('★★★★★ 两处确认耗时一致（说明是稳定特征，不是偶发）', flipAt === wkFlip);

Date.now = RealDate.now.bind(RealDate);
console.log('\n  通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
