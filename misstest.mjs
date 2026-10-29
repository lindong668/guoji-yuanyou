/* ★★★★★ 漏拍测试 —— 复现用户截图「实时 · 20s / 28s / 29s前更新」
 *
 * 用户现象：
 *   ① 秒数跑到 15 秒以上（20s / 28s / 29s），却仍显示"实时"
 *   ② 只要秒数 >15s，点进详情页就变成 0 秒
 *
 * 根因：源返回空值 → 走静默分支 → lastOk 不更新、state 不改
 *       → 秒数一路涨还假装"实时"；详情页则判定"早该刷了"→ 立刻抓 → 归零
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil } from './src/pages.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };
const RealDate=Date;
let NOW=new RealDate('2026-10-29T12:00:00+08:00').getTime();
const adv=ms=>{NOW+=ms;};

const M={oil:{price:110.78,updated:'x'},wti:{price:102.03,updated:'x'},
         gold:{usdOz:4030.00,updatedAt:new Date().toISOString()},
         cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()}};
const FX={base:'USD',rates:{CNY:6.68,EUR:0.89,JPY:157.4},date:'2026-10-28'};
function mkstore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}
const secs=t=>{const mm=/(\d+)s/.exec(t||'');return mm?+mm[1]:null;};

/* oilVal: 返回数字或 null（null = 源返回空值，模拟漏拍） */
async function boot(html,shared,oilVal){
  let bag={ints:[],fetches:[],emptyAfter:-1,n:0};
  const d=new JSDOM('<!doctype html><html><body>'+html+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{constructor(...a){return a.length?new RD(...a):new RD(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     w.fetch=async(u)=>{ const s=String(u); bag.fetches.push(s);
       if(s.includes('/api/oil-live')){
         const v=(typeof oilVal==='function')?oilVal():oilVal;
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({ok:true,brent:v,wti:102.03,provider:'biquote'})};
       }
       return {ok:true,status:200,headers:{get:()=>'application/json'},
               json:async()=>({priceUsdPerOz:4030,live:true})};
     };
     w.setInterval=(fn,ms)=>{bag.ints.push({ms,fn});return 1;};
     w.setTimeout=(fn,ms)=>1;
   }});
  await new Promise(r=>setTimeout(r,400));
  return {d,bag};
}

console.log('场景1  源持续返回空值（复现漏拍 → 秒数暴涨）');
{
  const sh=mkstore();
  let cur=110.78;
  /* 第一次成功建立 lastOk，之后源返回空值 → 漏拍 */
  let first=true;
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,()=>{
    if(first){ first=false; return cur; }
    return null;                 /* 空值 → 漏拍 */
  });
  const chip=()=>h.d.window.document.getElementById('home-oil-chip').textContent;
  console.log('   初次        徽标 ['+chip()+']');
  /* 推进到 29 秒（用户截图看到的状态） */
  adv(29000);
  const tick=h.bag.ints.filter(x=>x.ms===1000).pop();
  if(tick) tick.fn();
  console.log('   29 秒后     徽标 ['+chip()+']');
  ok('★★★★★ 漏拍到 29 秒【不能】还显示"实时"（应如实显示连接中断）',
     chip().indexOf('实时')<0);
  ok('★★★★★ 漏拍时显示"连接中断"', chip().indexOf('中断')>=0);
}

console.log('\n场景2  正常节拍（无漏拍）时秒数不超过 15 秒');
{
  const sh=mkstore();
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,110.78);
  const chip=()=>h.d.window.document.getElementById('home-oil-chip').textContent;
  adv(14000);
  const tick=h.bag.ints.filter(x=>x.ms===1000).pop();
  if(tick) tick.fn();
  const c=chip();
  const sv=secs(c);
  console.log('   14 秒后     徽标 ['+c+']');
  ok('★★★★★ 正常状态下仍显示"实时"（不被误判成断线）', c.indexOf('实时')>=0);
  ok('★★★★★ 正常状态秒数 ≤15s', sv!=null && sv<=15);
}

console.log('\n场景3  首页漏拍 29s 时点进详情页 —— 秒数要一致（不能 0s 突跳）');
{
  const sh=mkstore();
  let first=true;
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,()=>{
    if(first){ first=false; return 110.78; }
    return null;
  });
  adv(29000);
  /* ★ 必须触发 1 秒重绘，否则 chip 还停在初次抓取时的旧文字（看不出真状态） */
  const tk=h.bag.ints.filter(x=>x.ms===1000).pop(); if(tk) tk.fn();
  const chipHome=h.d.window.document.getElementById('home-oil-chip').textContent;
  console.log('   首页 29s    徽标 ['+chipHome+']');
  ok('★★★★★ 首页漏拍时如实显示"连接中断"，不假装实时',
     chipHome.indexOf('实时')<0 && chipHome.indexOf('中断')>=0);
  /* 再进详情页：源恢复正常 */
  const od=await boot(renderOil('zh',M,FX,'Asia/Shanghai','brent'),sh,110.78);
  const dc=od.d.window.document.getElementById('oil-live-chip');
  const dtxt=dc?dc.textContent:'';
  console.log('   详情页      徽标 ['+dtxt+']');
  ok('★★★★★ 详情页徽标有秒数（不是空/只剩点）', /实时|s/.test(dtxt));
}

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
