/* ★ 首屏真值表：手机全新会话打开时，第一帧显示什么
 * 用户实测：电脑已休市，手机刷新却显示"实时 · 5s前更新" —— 必须复现 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil } from './src/pages.js';
let pass=0,fail=0;
const ok=(n,c)=>{ if(c){pass++;console.log('  ✓ '+n);} else {fail++;console.log('  ✗ '+n);} };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RD=Date; let NOW=new RD('2026-10-29T12:00:00+08:00').getTime();
const M={oil:{price:110.51,updated:'x'},wti:{price:101.76,updated:'x'},
         gold:{usdOz:4027.9,updatedAt:new Date().toISOString()},
         cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()}};
const FX={base:'USD',rates:{CNY:6.68,EUR:0.89,JPY:157.4},date:'2026-10-28'};
function mk(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}

/* SSR 注入：模拟服务端把已确认状态写进 HTML */
function withSsr(html, srv){
  if(!srv) return html;
  const tag='<script type="application/json" id="ps-mkt">'+JSON.stringify(srv)+'<\/script>';
  return html.replace('<head>', '<head>'+tag);
}
async function open(html, shared, srv, slowMs){
  const d=new JSDOM('<!doctype html><html lang="zh"><head></head><body>'+html+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const R=w.Date;
     w.Date=class extends R{constructor(...a){return a.length?new R(...a):new R(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     Object.defineProperty(w,'localStorage',{value:mk(),configurable:true});
     Object.defineProperty(w.Document.prototype,'hidden',{get:()=>false,configurable:true});
     w.fetch=async(u)=>{
       await sleep(slowMs);            /* 模拟网络往返 */
       const s=String(u);
       if(s.indexOf('/api/market-state')>=0) return {ok:true,json:async()=>srv||{}};
       if(s.indexOf('/api/oil-live')>=0) return {ok:true,json:async()=>({brent:110.51,wti:101.76})};
       if(s.indexOf('/api/gold-live')>=0) return {ok:true,json:async()=>({priceUsdPerOz:4027.9})};
       return {ok:true,json:async()=>({})};
     };
   }});
  await sleep(30);
  return d.window;
}
const homeBadge=w=>{const e=w.document.getElementById('home-oil-chip');return e?e.textContent.trim():null;};

console.log('\n[首屏真值表 12 格]');
const SRVC={brent:'closed',wti:'closed',gold:'closed'};
const SRVL={brent:'live',wti:'live',gold:'live'};
/* 1-4：首页，服务端休市 */
{
  const w=await open(withSsr(renderHome('zh',M,FX,'Asia/Shanghai'),SRVC),mk(),SRVC,400);
  ok('1 首页·服务端休市·首帧', /休市/.test(homeBadge(w)||''));
  console.log('      实际: '+homeBadge(w));
}
{
  const w=await open(withSsr(renderOil('zh',M,FX,'Asia/Shanghai'),SRVC),mk(),SRVC,400);
  const e=w.document.getElementById('oil-live-chip');
  ok('2 原油页·服务端休市·首帧', /休市/.test(e?e.textContent.trim():''));
  console.log('      实际: '+(e?e.textContent.trim():null));
}
/* 3-4：服务端开市，必须是实时 */
{
  const w=await open(withSsr(renderHome('zh',M,FX,'Asia/Shanghai'),SRVL),mk(),SRVL,400);
  ok('3 首页·服务端开市·首帧=实时', !/休市|连接中断/.test(homeBadge(w)||''));
  console.log('      实际: '+homeBadge(w));
}
{
  const w=await open(renderHome('zh',M,FX,'Asia/Shanghai'),mk(),null,400);
  ok('4 首页·无服务端状态·不乱判休市', !/休市/.test(homeBadge(w)||''));
}
/* 5-6：网络慢（1.5 秒）时首帧仍须正确 —— 手机真实场景 */
{
  const w=await open(withSsr(renderHome('zh',M,FX,'Asia/Shanghai'),SRVC),mk(),SRVC,1500);
  await sleep(120);
  ok('5 首页·慢网首帧也不闪实时', /休市/.test(homeBadge(w)||''));
  console.log('      实际: '+homeBadge(w));
}
/* 7-8：2 秒后（已 boot）仍须保持休市，不能被价格拉取翻回实时 */
{
  const w=await open(withSsr(renderHome('zh',M,FX,'Asia/Shanghai'),SRVC),mk(),SRVC,100);
  await sleep(2200);
  ok('6 首页·2 秒后仍是休市', /休市/.test(homeBadge(w)||''));
  console.log('      实际: '+homeBadge(w));
}
/* 9：服务端休市但价格真的动了 → 必须即时开市（不能被标记压住） */
{
  let v=110.51;
  const d=new JSDOM('<!doctype html><html lang="zh"><head></head><body>'+withSsr(renderHome('zh',M,FX,'Asia/Shanghai'),SRVC)+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const R=w.Date; w.Date=class extends R{constructor(...a){return a.length?new R(...a):new R(NOW);}static now(){return NOW;}};
     const SH=globalThis.__SH=mk();
     Object.defineProperty(w,'sessionStorage',{value:SH,configurable:true});
     Object.defineProperty(w,'localStorage',{value:mk(),configurable:true});
     Object.defineProperty(w.Document.prototype,'hidden',{get:()=>false,configurable:true});
     w.fetch=async(u)=>{ const s=String(u);
       if(s.indexOf('/api/oil-live')>=0){ v=+(v+0.5).toFixed(2); return {ok:true,json:async()=>({brent:v,wti:101.76})}; }
       if(s.indexOf('/api/gold-live')>=0) return {ok:true,json:async()=>({priceUsdPerOz:4027.9})};
       if(s.indexOf('/api/market-state')>=0) return {ok:true,json:async()=>SRVC};
       return {ok:true,json:async()=>({})}; };
   }});
  const clk=setInterval(()=>{ NOW += 1000; }, 500);   /* 时钟推进，Beat 才能排队 */
  await sleep(40000); clearInterval(clk);
  try{ console.log('      [debug] '+globalThis.__SH.getItem('ps_beat_brent')); }catch(e){ console.log('      [debug] err '+e.message); }
  const b=homeBadge(d.window);
  ok('7 服务端标记休市但价格在动 → 翻回开市', !/休市/.test(b||''));
  console.log('      实际: '+b);
}
/* 10-12：断线不能被误判成休市 */
{
  const d=new JSDOM('<!doctype html><html lang="zh"><head></head><body>'+renderHome('zh',M,FX,'Asia/Shanghai')+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const R=w.Date; w.Date=class extends R{constructor(...a){return a.length?new R(...a):new R(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:mk(),configurable:true});
     Object.defineProperty(w,'localStorage',{value:mk(),configurable:true});
     Object.defineProperty(w.Document.prototype,'hidden',{get:()=>false,configurable:true});
     w.fetch=async()=>({ok:false,json:async()=>({})});
   }});
  await sleep(200); NOW+=30000; await sleep(1500);
  const b=homeBadge(d.window);
  ok('8 全部源失败 → 连接中断（不是休市）', /连接中断/.test(b||''));
  console.log('      实际: '+b);
}
console.log('\n通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
