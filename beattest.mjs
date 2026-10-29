/* ★★★★ 行情节拍测试：导航不触发刷新、也不推迟刷新
 *
 * 用户实测发现的两个 bug（本轮修复）：
 *   bug1：beatMark() 在页面加载时无条件调用 → 每次导航都把节拍往后推 15 秒
 *         → 一直点进点出就永远刷不了新数据。
 *   bug2：锚点让首屏不抓，但秒数从旧时刻继续走 → 秒数涨到 20s/30s 才刷，
 *         看起来像"30 秒才刷一次"。
 *
 * 修法：锚点与节拍【合并】成一个快照 {v,t,mv}，
 *       只有【真抓到数据】才更新 t，导航【不】更新 t。
 *
 * ⚠️ mock 让价格持续跳动：否则"不抓"与"抓了"返回同一个数，测试会假阳性。
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil, renderGold } from './src/pages.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };

const RealDate=Date;
let NOW=new RealDate('2026-10-29T12:00:00+08:00').getTime();
const adv=(ms)=>{ NOW+=ms; };

let TICK=0;
const nextPrice=(base)=>{ TICK++; return base+TICK*0.01; };
const M={oil:{price:110.78,updated:'x'},wti:{price:102.03,updated:'x'},
         gold:{usdOz:4030.00,updatedAt:new Date().toISOString()},
         cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()}};
const FX={base:'USD',rates:{CNY:6.68,EUR:0.89,JPY:157.4},date:'2026-10-28'};

function makeStorage(){
  const m=new Map();
  return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>{m.set(k,String(v));},
           removeItem:k=>{m.delete(k);}, clear:()=>{m.clear();},
           key:i=>Array.from(m.keys())[i]??null, get length(){return m.size;} };
}

let bag;
async function load(html, priceId, shared){
  const _t0=bag?bag.timeouts.length:0, _i0=bag?bag.intervals.length:0;
  const d=new JSDOM('<!doctype html><html><body>'+html+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{ constructor(...a){return a.length?new RD(...a):new RD(NOW);} static now(){return NOW;} };
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     w.fetch=async(u)=>{
       const s=String(u); bag.fetches.push(s);
       if(s.includes('/api/oil-live'))
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({ok:true,brent:nextPrice(110.78),wti:nextPrice(102.03),provider:'biquote'})};
       if(s.includes('/api/gold-live'))
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({priceUsdPerOz:nextPrice(4030.00),live:true})};
       return {ok:true,status:200,headers:{get:()=>'application/json'},
               json:async()=>({bid:nextPrice(4030.00)-0.01,ask:nextPrice(4030.00)+0.01,
                               price:nextPrice(4030.00),spot_usd_oz:nextPrice(4030.00),data_state:'fresh'})};
     };
     w.setInterval=(fn,ms)=>{ bag.intervals.push({ms,fn}); return 1; };
     w.setTimeout=(fn,ms)=>{ if(ms>=1000) bag.timeouts.push({ms,fn}); return 1; };
   }});
  await new Promise(r=>setTimeout(r,350));
  const el=d.window.document.getElementById(priceId);
  /* ★ 返回本页注册的定时器 —— 后面要【按页面】触发，
   *   否则触发到上一个页面的回调，测的就是别的页面了 */
  const mine=[].concat(bag.timeouts.slice(_t0), bag.intervals.slice(_i0));
  return { text: el?el.textContent.trim():null, mine: mine };
}
const tickT=(shared,k)=>{ try{const o=JSON.parse(shared.getItem('ps_tick_'+k)||'null');return o?o.t:null;}catch(e){return null;} };
/* 触发某个页面的节拍回调：逐个试，【直到真的发出请求为止】。
 * ⚠️ 不能只取最后一个 —— 页面里还有 paint(1000) 之类的纯重画回调；
 *    也不能无差别全触发 —— 会把黄金直连的超时回调也点着，污染请求计数。 */
const fire=async(mine)=>{
  for(const f of mine){
    const b=bag.fetches.length;
    try{ f.fn(); }catch(e){}
    await new Promise(r=>setTimeout(r,80));
    if(bag.fetches.length>b) return true;
  }
  return false;
};

const shared=makeStorage();
bag={fetches:[],intervals:[],timeouts:[]};

console.log('==== 场景1：进首页 → 布伦特页 → 回首页 → 黄金页（每次隔 1~2 秒）====\n');
const H1=await load(renderHome('zh',M,FX,'Asia/Shanghai'),'home-oil-price',shared);
const h1=H1.text;
const t0=tickT(shared,'brent');
console.log('  ① 首页(抓)      :',h1,' 请求='+bag.fetches.length);
adv(1200);
const d1=(await load(renderOil('zh',M,'Asia/Shanghai'),'oil-live-price',shared)).text;
console.log('  ② 布伦特页      :',d1,' 请求='+bag.fetches.length);
adv(1200);
const H2=await load(renderHome('zh',M,FX,'Asia/Shanghai'),'home-oil-price',shared);
const h2=H2.text;
console.log('  ③ 回首页        :',h2,' 请求='+bag.fetches.length);
adv(1200);
const g1=(await load(renderGold('zh',M,FX,'Asia/Shanghai'),'g-usd',shared)).text;
console.log('  ④ 黄金页        :',g1,' 请求='+bag.fetches.length);

console.log('\n==== 判定 ====');
ok('★★ 四个页面显示同一个布伦特价（导航数字不动）', h1===d1&&d1===h2&&h1!=null);
ok('★★★ 导航 4 次，真实抓取 ≤ 2 次（导航不触发刷新）', bag.fetches.length<=2);

console.log('\n==== 场景2（关键，修 bug1）：导航【不推迟】刷新时刻 ====');
const tAfter=tickT(shared,'brent');
console.log('   首次抓取时刻 t0 =',t0);
console.log('   导航 3 次后 t   =',tAfter);
ok('★★★★★ 导航后快照时刻 t 不变（否则节拍会被无限推迟）', tAfter===t0&&t0!=null);

console.log('\n==== 场景3：推进到 15 秒，应准时刷新 ====');
const before=bag.fetches.length;
adv(15000-3600);   /* 补足到距首次抓取正好 15 秒 */
await fire(H2.mine);
console.log('   触发节拍后请求 '+bag.fetches.length+'（之前 '+before+'）');
ok('★★★★★ 15 秒到了确实刷新（不会被导航卡住）', bag.fetches.length>before);
const tNew=tickT(shared,'brent');
console.log('   刷新后 t =',tNew,'（应比 t0 晚约 15000ms）');
ok('★★★★ 刷新后 t 正好推进了一个周期', tNew!=null&&Math.abs((tNew-t0)-15000)<2000);

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
