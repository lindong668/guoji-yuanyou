/* ★ 后台切回前台，不能闪"连接中断"
 * 用户实测：页面最小化几分钟再最大化，第一眼必然是"连接中断"，几秒后才恢复实时。
 * 那是【页面睡了一觉】，不是 API 断线 —— 属于误报。 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome } from './src/pages.js';
let pass=0,fail=0;
const ok=(n,c)=>{ if(c){pass++;console.log('  ✓ '+n);} else {fail++;console.log('  ✗ '+n);} };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RealDate=Date;
let NOW=new RealDate('2026-10-29T12:00:00+08:00').getTime();
const M={oil:{price:110.78,updated:'x'},wti:{price:102.03,updated:'x'},
         gold:{usdOz:4030.00,updatedAt:new Date().toISOString()},
         cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()}};
const FX={base:'USD',rates:{CNY:6.68,EUR:0.89,JPY:157.4},date:'2026-10-28'};
function mkstore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}
let SRV_STATE=null;
let OIL_VAL=110.78, GOLD_VAL=4030.00;

async function boot(shared){
  const html=renderHome('zh',M,FX,'Asia/Shanghai');
  const bag={fetches:[]};
  const d=new JSDOM('<!doctype html><html lang="zh"><body>'+html+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{constructor(...a){return a.length?new RD(...a):new RD(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     Object.defineProperty(w,'localStorage',{value:mkstore(),configurable:true});
     let hidden=false;
     Object.defineProperty(w.Document.prototype,'hidden',{get:function(){return hidden;},configurable:true});
     Object.defineProperty(w.Document.prototype,'visibilityState',{get:function(){return hidden?'hidden':'visible';},configurable:true});
     w.__setHidden=v=>{hidden=v;};
     w.fetch=async(u)=>{
       bag.fetches.push(String(u));
       const s=String(u);
       if(s.indexOf('/api/market-state')>=0) return {ok:true,json:async()=>SRV_STATE||{}};
       if(s.indexOf('/api/oil-live')>=0) return {ok:true,json:async()=>({brent:OIL_VAL,wti:102.03})};
       if(s.indexOf('/api/gold-live')>=0) return {ok:true,json:async()=>({usdOz:GOLD_VAL})};
       return {ok:true,json:async()=>({})};
     };
   }});
  await sleep(60);
  return {win:d.window,bag,setHidden:v=>d.window.__setHidden(v)};
}
const badge=w=>{ const e=w.document.getElementById('home-oil-chip'); return e?e.textContent.trim():null; };

console.log('\n[场景一：最小化 3 分钟再回来 —— 不应闪"连接中断"]');
{
  const shared=mkstore();
  const h=await boot(shared);
  await sleep(1200);                     /* 正常跑几拍 */
  const before=badge(h.win);
  ok('切走前是实时', /实时|更新/.test(before||''));
  h.setHidden(true);                     /* 最小化 */
  NOW += 3*60*1000; await sleep(1200);   /* 后台 3 分钟，tick 不抓取 */
  h.setHidden(false);                    /* 切回前台 */
  h.win.document.dispatchEvent(new h.win.Event('visibilitychange'));
  await sleep(1500);
  const after=badge(h.win);
  ok('切回前台没有显示"连接中断"', !/连接中断/.test(after||''));
  console.log('    切回后徽标: '+after);
}

console.log('\n[场景二：真休市时切回前台 —— 应直接显示休市中，不闪断线]');
{
  SRV_STATE={brent:'closed',wti:'closed',gold:'closed'};
  const shared=mkstore();
  const h=await boot(shared);
  await sleep(1200);
  h.setHidden(true);
  NOW += 3*60*1000; await sleep(1200);
  h.setHidden(false);
  h.win.document.dispatchEvent(new h.win.Event('visibilitychange'));
  await sleep(300);
  const after=badge(h.win);
  console.log('    [debug] sessionStorage: '+JSON.stringify([...Array.from({length:shared.length},(_,i)=>shared.key(i))].map(k=>[k,shared.getItem(k)])));
  ok('切回前台立刻显示休市中（不是连接中断）', /休市/.test(after||''));
  console.log('    切回后徽标: '+after);
  SRV_STATE=null;
}

console.log('\n[场景三：API 真断了 —— 必须照样报连接中断，不能被宽限掩盖]');
{
  const shared=mkstore();
  const h=await boot(shared);
  await sleep(1200);
  /* 让所有接口失败 */
  h.win.fetch=async()=>({ok:false,json:async()=>({})});
  NOW += 30000; await sleep(1500);
  const after=badge(h.win);
  ok('真实断链仍报连接中断（未被宽限吃掉）', /连接中断/.test(after||''));
  console.log('    断链后徽标: '+after);
}

console.log('\n[场景四：切回前台必须【立刻补一拍】，不能干等定时器（秒数僵住的根因）]');
{
  SRV_STATE=null;
  const shared=mkstore();
  const h=await boot(shared);
  await sleep(1500);
  const n0=h.bag.fetches.filter(u=>u.indexOf('/api/oil-live')>=0).length;
  h.setHidden(true);
  NOW += 3*60*1000; await sleep(1500);
  const nBack=h.bag.fetches.filter(u=>u.indexOf('/api/oil-live')>=0).length;
  ok('后台期间确实没抓取（tick 被 hidden 拦住）', nBack===n0);
  h.setHidden(false);
  h.win.document.dispatchEvent(new h.win.Event('visibilitychange'));
  await sleep(1200);                     /* 只给 1.2 秒 */
  const n1=h.bag.fetches.filter(u=>u.indexOf('/api/oil-live')>=0).length;
  ok('切回前台 1.2 秒内就补了新的一拍', n1>nBack);
  console.log('    后台前='+n0+' 后台后='+nBack+' 切回后='+n1);
  const after=badge(h.win);
  ok('切回后秒数已刷新（不再僵在旧值）', !/3m/.test(after||''));
  console.log('    切回后徽标: '+after);
}

console.log('\n[场景五：秒数僵住时长不能超过 2 秒]');
{
  const shared=mkstore();
  const h=await boot(shared);
  await sleep(1500);
  h.setHidden(true);
  NOW += 5*60*1000; await sleep(1500);
  h.setHidden(false);
  h.win.document.dispatchEvent(new h.win.Event('visibilitychange'));
  await sleep(2000);
  const after=badge(h.win);
  const mm=/(\d+)m/.exec(after||'');
  ok('2 秒内秒数已归位（不再是 5m 前）', !mm);
  console.log('    切回后徽标: '+after);
}

console.log('\n通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
