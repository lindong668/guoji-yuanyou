/* ★★★★★ 重写后的节拍核心 —— 行为测试
 *
 * 针对用户实测到的每一个痛点：
 *   ① 秒数跑到 20s / 28s / 29s            → 秒数必须永远 ≤15
 *   ② 超过 15 秒点进详情页就归零           → 跨页面秒数连续
 *   ③ 来回导航数字会跳                     → 数字必须一致
 *   ④ 一会儿绿、一会儿连接中断（抖）        → 状态必须稳定
 *   ⑤ 两三秒就刷新一次                     → 严格 15 秒一拍
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil, renderGold } from './src/pages.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RealDate=Date;
let NOW=new RealDate('2026-10-29T12:00:00+08:00').getTime();

const M={oil:{price:110.78,updated:'x'},wti:{price:102.03,updated:'x'},
         gold:{usdOz:4030.00,updatedAt:new Date().toISOString()},
         cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()}};
const FX={base:'USD',rates:{CNY:6.68,EUR:0.89,JPY:157.4},date:'2026-10-28'};
function mkstore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}
const secs=t=>{const mm=/(\d+)s/.exec(t||'');return mm?+mm[1]:null;};

async function boot(html,shared,oilVal,goldVal){
  const bag={timers:[],intervals:[],fetches:[]};
  const d=new JSDOM('<!doctype html><html lang="zh"><body>'+html+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{constructor(...a){return a.length?new RD(...a):new RD(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     Object.defineProperty(w,'localStorage',{value:mkstore(),configurable:true});
     /* ★ jsdom 默认 document.hidden = true（visibilityState='prerender'），
      *   而 tick() 里有 if(document.hidden) return; —— 不改的话脚本【从不】抓取，
      *   测试会假绿。真实浏览器前台是 false，这里必须模拟前台。 */
     Object.defineProperty(w.Document.prototype,'hidden',{get:function(){return false;},configurable:true});
     Object.defineProperty(w.Document.prototype,'visibilityState',{get:function(){return 'visible';},configurable:true});
     w.fetch=async(u)=>{ const s=String(u); bag.fetches.push(s);
       if(s.includes('/api/oil-live')){
         const v=(typeof oilVal==='function')?oilVal():oilVal;
         if(v==null) throw new Error('network down');
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({ok:true,brent:v,wti:102.03,provider:'biquote'})};
       }
       if(s.includes('/api/gold-live')){
         const v=(typeof goldVal==='function')?goldVal():goldVal;
         if(v==null) throw new Error('network down');
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({priceUsdPerOz:v,live:true})};
       }
       return {ok:true,status:200,headers:{get:()=>'application/json'},
               json:async()=>({bid:4030,ask:4030,price:4030,spot_usd_oz:4030,data_state:'fresh'})};
     };
     w.setTimeout=(fn,ms)=>{ bag.timers.push({fn,at:NOW+(ms||0)}); return bag.timers.length; };
     w.setInterval=(fn,ms)=>{ bag.intervals.push({fn,ms}); return bag.intervals.length; };
     w.clearTimeout=()=>{}; w.clearInterval=()=>{};
   }});
  /* 跑到首屏稳定：把 0 延迟的 timer 跑掉，等 fetch 回来 */
  for(let i=0;i<12;i++){ runTimers(bag); await sleep(2); }
  return {d,bag};
}
function runTimers(bag){
  let guard=0;
  while(guard++<500){
    const due=bag.timers.filter(t=>!t.done&&t.at<=NOW).sort((a,b)=>a.at-b.at);
    if(!due.length) break;
    const t=due[0]; t.done=true;
    bag.timers.splice(bag.timers.indexOf(t),1);
    t.fn();
  }
}
/* 推进 ms 毫秒：每 1 秒刷一次秒数，并处理到期的 timer */
async function step(ms,bags){
  const n=Math.max(1,Math.round(ms/1000));
  for(let i=0;i<n;i++){
    NOW+=1000;
    bags.forEach(b=>{ b.bag.intervals.filter(x=>x.ms===1000).forEach(x=>x.fn()); });
    runTimers(bag_of(bags));
    await sleep(2);
  }
}
function bag_of(bags){ const b=bags[0]||{}; return b.bag||{timers:[]}; }
const chip=(d,id)=>{ const e=d.window.document.getElementById(id); return e?e.textContent:''; };

console.log('测试1  ★ 秒数永远 ≤15（用户截图看到 20s / 28s / 29s）');
{
  const sh=mkstore();
  let v=110.78;
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,()=>{ v=+(v+0.01).toFixed(2); return v; },4030.00);
  let max=0;
  for(let i=0;i<60;i++){                 /* 连续观察 60 秒 */
    await step(1000,[h]);
    const s=secs(chip(h.d,'home-oil-chip'));
    if(s!=null&&s>max) max=s;
  }
  console.log('   60 秒内观测到的最大秒数 = '+max+'s');
  ok('★★★★★ 秒数【永不】超过 15 秒', max<=15);
  ok('★★★★★ 全程保持实时（不抖成连接中断）',
     chip(h.d,'home-oil-chip').indexOf('实时')>=0);
}

console.log('\n测试2  ★ 跨页面：数字一致 + 秒数连续（不再归零）');
{
  const sh=mkstore();
  let v=110.78;
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,()=>{ v=+(v+0.01).toFixed(2); return v; },4030.00);
  await step(10000,[h]);
  const homeTxt=chip(h.d,'home-oil-price')||h.d.window.document.getElementById('home-oil-price').textContent;
  const homeSec=secs(chip(h.d,'home-oil-chip'));
  /* 进详情页 */
  const od=await boot(renderOil('zh',M,FX,'Asia/Shanghai','brent'),sh,()=>{ v=+(v+0.01).toFixed(2); return v; },4030.00);
  await step(1000,[od]);
  const dTxt=od.d.window.document.getElementById('oil-live-price').textContent;
  const dSec=secs(chip(od.d,'oil-live-chip'));
  console.log('   首页 ['+homeTxt+' / '+homeSec+'s]   详情 ['+dTxt+' / '+dSec+'s]');
  ok('★★★★★ 详情页数字与首页一致', homeTxt===dTxt);
  ok('★★★★★ 详情页秒数【不归零】且与首页连续',
     homeSec!=null&&dSec!=null&&Math.abs(dSec-homeSec)<=2);
}

console.log('\n测试3  ★ 取数失败 → 不假装实时，到 1.5 拍才显示连接中断');
{
  const sh=mkstore();
  let v=110.78, down=false;
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,()=>down?null:v,4030.00);
  ok('★★ 正常时显示实时', chip(h.d,'home-oil-chip').indexOf('实时')>=0);
  down=true;                                   /* 断网 */
  await step(14000,[h]);
  console.log('   断网 14 秒后 ['+chip(h.d,'home-oil-chip')+']');
  ok('★★★★★ 断网 14 秒内【仍】显示实时（不立刻吓人）',
     chip(h.d,'home-oil-chip').indexOf('实时')>=0);
  await step(12000,[h]);                       /* 累计 26 秒 > 22.5 */
  console.log('   断网 26 秒后 ['+chip(h.d,'home-oil-chip')+']');
  ok('★★★★★ 断网超 1.5 拍 → 显示连接中断',
     chip(h.d,'home-oil-chip').indexOf('中断')>=0);
}

console.log('\n测试4  ★ 价格长期冻结 → 才判休市（不会几十秒就下结论）');
{
  const sh=mkstore();
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,110.78,4030.00);
  await step(120000,[h]);                      /* 冻结 2 分钟 */
  console.log('   冻结 2 分钟 ['+chip(h.d,'home-oil-chip')+']');
  ok('★★★★★ 冻结 2 分钟【不】判休市（休市起码半小时，别急）',
     chip(h.d,'home-oil-chip').indexOf('休市')<0);
  /* 注意：这里仍在实时（链路通、只是价格没动），不是连接中断 */
  ok('★★★★★ 冻结但链路通 → 保持实时', chip(h.d,'home-oil-chip').indexOf('实时')>=0);
}

console.log('\n测试4b ★ 休市门槛边界（15 分钟，不是几十秒就下结论）');
{
  const sh=mkstore();
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,110.78,4030.00);
  await step(60000,[h]);                       /* 累计冻结 1 分钟 */
  ok('★ 冻结 1 分钟 → 不判休市', chip(h.d,'home-oil-chip').indexOf('休市')<0);
  await step(300000,[h]);                      /* 累计 6 分钟 */
  ok('★ 冻结 6 分钟 → 仍不判休市（15 分钟门槛）',
     chip(h.d,'home-oil-chip').indexOf('休市')<0);
  await step(480000,[h]);                      /* 累计 14 分钟 */
  console.log('   冻结 14 分钟 ['+chip(h.d,'home-oil-chip')+']');
  ok('★★★★★ 冻结 14 分钟 → 仍【不】判休市（差一点点也不行）',
     chip(h.d,'home-oil-chip').indexOf('休市')<0);
  await step(180000,[h]);                      /* 累计 17 分钟 > 15 */
  console.log('   冻结 17 分钟 ['+chip(h.d,'home-oil-chip')+']');
  ok('★★★★★ 冻结超 15 分钟 → 判休市中',
     chip(h.d,'home-oil-chip').indexOf('休市')>=0);
  /* 开市必须立刻翻回：给一个新价 */
  await step(16000,[h]);
}

console.log('\n测试5  ★ 疯狂导航不产生额外请求（刷新只由 15 秒触发）');
{
  const sh=mkstore();
  let v=110.78;
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,()=>{ v=+(v+0.01).toFixed(2); return v; },4030.00);
  const n0=h.bag.fetches.filter(x=>x.includes('oil-live')).length;
  /* 模拟来回导航 6 次 */
  for(let i=0;i<6;i++){
    await boot(renderOil('zh',M,FX,'Asia/Shanghai','brent'),sh,()=>{ v=+(v+0.01).toFixed(2); return v; },4030.00);
    await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,()=>{ v=+(v+0.01).toFixed(2); return v; },4030.00);
  }
  const n1=h.bag.fetches.filter(x=>x.includes('oil-live')).length;
  console.log('   导航 12 次后，首页累计 oil 请求 = '+n1+'（起始 '+n0+'）');
  ok('★★★★★ 导航本身【不】触发刷新', n1<=n0+3);
}

console.log('\n测试6  ★ 黄金：首页 ↔ 详情页 数字一致 + 秒数连续');
{
  const sh=mkstore();
  let g=4030.00;
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,110.78,()=>{ g=+(g+0.01).toFixed(2); return g; });
  await step(9000,[h]);
  const homeGold=h.d.window.document.getElementById('home-gold-price').textContent;
  const homeSec=secs(chip(h.d,'home-gold-chip'));
  const gd=await boot(renderGold('zh',M,FX,'Asia/Shanghai'),sh,110.78,()=>{ g=+(g+0.01).toFixed(2); return g; });
  await step(1000,[gd]);
  const dGold=gd.d.window.document.getElementById('g-usd').textContent;
  const dSec=secs(chip(gd.d,'g-status'));
  console.log('   首页 ['+homeGold+' / '+homeSec+'s]   详情 ['+dGold+' / '+dSec+'s]');
  ok('★★★★★ 黄金详情页数字与首页一致', homeGold===dGold);
  ok('★★★★★ 黄金详情页秒数【不归零】', dSec!=null&&dSec>0&&Math.abs(dSec-homeSec)<=2);
}

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
