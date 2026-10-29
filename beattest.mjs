/* ★★★ 全局节拍测试：来回导航【不应该】触发刷新
 *
 * 用户拍板的方案：刷新由"15 秒到了"触发，不由"打开页面"触发。
 *
 * 判定：记录每次真实网络请求。用户"进去→出来→再进去"这一串动作，
 *       如果触发了超过 1 次请求，就说明导航还是会导致刷新 = 不合格。
 *
 * ⚠️ mock 让价格【持续跳动】：否则"不抓"和"抓了"返回同一个数，
 *    测试会假阳性通过。
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil, renderGold } from './src/pages.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };

let TICK=0;
const nextPrice=(base)=>{ TICK++; return base + TICK*0.01; };
const M = {
  oil:{price:110.78,updated:'x'}, wti:{price:102.03,updated:'x'},
  gold:{usdOz:4030.00, updatedAt:new Date().toISOString()},
  cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()},
};
const FX = { base:'USD', rates:{CNY:6.68,EUR:0.89,JPY:157.4}, date:'2026-10-28' };

function makeStorage(){
  const m=new Map();
  return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>{m.set(k,String(v));},
           removeItem:k=>{m.delete(k);}, clear:()=>{m.clear();},
           key:i=>Array.from(m.keys())[i]??null, get length(){return m.size;} };
}

/* 记录定时器：jsdom 里不真跑，我们手动推进 */
let timers=[];
async function load(html, priceId, shared, bag){
  const d = new JSDOM('<!doctype html><html><body>'+html+'</body></html>',
    { runScripts:'dangerously', beforeParse(w){
      Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
      w.fetch = async (u) => {
        const s=String(u); bag.fetches.push(s);
        if (s.includes('/api/oil-live'))
          return { ok:true,status:200,headers:{get:()=>'application/json'},
                   json:async()=>({ok:true,brent:nextPrice(110.78),wti:nextPrice(102.03),provider:'biquote'}) };
        if (s.includes('/api/gold-live'))
          return { ok:true,status:200,headers:{get:()=>'application/json'},
                   json:async()=>({priceUsdPerOz:nextPrice(4030.00),live:true}) };
        return { ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({bid:nextPrice(4030.00)-0.01,ask:nextPrice(4030.00)+0.01,
                                 price:nextPrice(4030.00),spot_usd_oz:nextPrice(4030.00),data_state:'fresh'}) };
      };
      /* ★ 捕获回调，后面手动"推进时间"触发 —— 否则测不到"15 秒后到底刷不刷" */
      w.setInterval=(fn,ms)=>{ bag.intervals.push({ms:ms,fn:fn}); return 1; };
      w.setTimeout=(fn,ms)=>{ if(ms>=1000) bag.timeouts.push({ms:ms,fn:fn}); return 1; };
    }});
  await new Promise(r=>setTimeout(r,350));
  const el=d.window.document.getElementById(priceId);
  return el?el.textContent.trim():null;
}

const shared=makeStorage();
const bag={fetches:[],intervals:[],timeouts:[]};

console.log('==== 用户动作序列：进首页 → 进布伦特页 → 回首页 → 进黄金页 ====');
console.log('   （每次间隔 1~2 秒，远小于 15 秒节拍）\n');

const h1 = await load(renderHome('zh',M,FX,'Asia/Shanghai'),'home-oil-price',shared,bag);
console.log('  ① 首页          :', h1, ' 累计请求 '+bag.fetches.length);
await new Promise(r=>setTimeout(r,1200));
const d1 = await load(renderOil('zh',M,'Asia/Shanghai'),'oil-live-price',shared,bag);
console.log('  ② 布伦特详情页  :', d1, ' 累计请求 '+bag.fetches.length);
await new Promise(r=>setTimeout(r,1200));
const h2 = await load(renderHome('zh',M,FX,'Asia/Shanghai'),'home-oil-price',shared,bag);
console.log('  ③ 回到首页      :', h2, ' 累计请求 '+bag.fetches.length);
await new Promise(r=>setTimeout(r,1200));
const g1 = await load(renderGold('zh',M,FX,'Asia/Shanghai'),'g-usd',shared,bag);
console.log('  ④ 黄金详情页    :', g1, ' 累计请求 '+bag.fetches.length);

console.log('\n==== 判定 ====');
ok('★★ 四个页面显示同一个布伦特价（进进出出数字不动）', h1===d1 && d1===h2 && h1!=null);
ok('★★★ 来回导航 4 次，真实抓取次数 ≤ 2（不应每次导航都拉）', bag.fetches.length<=2);

/* ---- 节拍周期必须统一为 15 秒 ---- */
const beats = [].concat(bag.intervals, bag.timeouts).filter(x=>x.ms===15000);
ok('★★ 所有页面节拍周期统一为 15000ms（不再是黄金页 30 秒）', beats.length>=3);
ok('★★ 节拍周期里没有 30 秒的旧值',
   [].concat(bag.intervals,bag.timeouts).filter(x=>x.ms===30000).length===0);

/* ---- 手动推进时间：15 秒后【应该】刷新，且拿到新值 ---- */
console.log('\n==== 推进 15 秒后：应该刷新并拿到新价 ====');
const before = bag.fetches.length;
beats.forEach(x=>{ try{ x.fn(); }catch(e){} });
await new Promise(r=>setTimeout(r,350));
console.log('   触发节拍后累计请求 '+bag.fetches.length+'（之前 '+before+'）');
ok('★★★ 15 秒到了确实会刷新（不会一直显示旧值）', bag.fetches.length>before);

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
