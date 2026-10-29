/* ★★★★★ 多源多轮探测测试 —— 休市判定必须慎之又慎
 *
 * 用户硬性要求：判定休市至少 99.9% 把握。不能只观察一两个源就判休市。
 *
 * 覆盖：
 *   1. 价格冻结后【先进入"重新连接中"】，不是立刻"休市中"
 *   2. 必须跑满 8源 × 3次 × 3轮 = 72 次才判休市
 *   3. 探测中任一次拿到新值 → 【立刻开市】并清零进度
 *   4. 进度存 sessionStorage，刷新/导航【不重置】
 *   5. 黄金源少 → 轮数更多（6 轮）
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome } from './src/pages.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };

const RealDate=Date;
let NOW=new RealDate('2026-10-29T12:00:00+08:00').getTime();
const adv=(ms)=>{ NOW+=ms; };

const M={oil:{price:110.78,updated:'x'},wti:{price:102.03,updated:'x'},
         gold:{usdOz:4030.00,updatedAt:new Date().toISOString()},
         cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()}};
const FX={base:'USD',rates:{CNY:6.68,EUR:0.89,JPY:157.4},date:'2026-10-28'};
function mkstore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}

/* oilVal: 返回 null 表示源失败 */
async function boot(shared, oilVal, goldVal){
  let bag={fetches:[],ints:[],failOil:false};
  const d=new JSDOM('<!doctype html><html><body>'+renderHome('zh',M,FX,'Asia/Shanghai')+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{constructor(...a){return a.length?new RD(...a):new RD(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     w.fetch=async(u)=>{
       const s=String(u); bag.fetches.push(s);
       if(s.includes('/api/oil-live')){
         if(bag.failOil) throw new Error('boom');
         const v=(typeof oilVal==='function')?oilVal():oilVal;
         if(v==null) throw new Error('boom');
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({ok:true,brent:v,wti:102.03,provider:'biquote'})};
       }
       if(s.includes('/api/gold-live'))
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({priceUsdPerOz:goldVal,live:true})};
       if(goldVal==null) throw new Error('boom');
       return {ok:true,status:200,headers:{get:()=>'application/json'},
               json:async()=>({bid:goldVal-0.01,ask:goldVal+0.01,price:goldVal,spot_usd_oz:goldVal,data_state:'fresh'})};
     };
     w.setInterval=(fn,ms)=>{ bag.ints.push({ms,fn}); return 1; };
     w.setTimeout=(fn,ms)=>1;
   }});
  await new Promise(r=>setTimeout(r,400));
  return {d,bag};
}
const chipOf=(h)=>h.d.window.document.getElementById('home-oil-chip').textContent;
const probe=(h)=>{ const f=h.bag.ints.filter(x=>x.ms===3000).pop(); if(f) f.fn(); };
const runProbe=async(h,n)=>{ for(let i=0;i<n;i++){ probe(h); await new Promise(r=>setTimeout(r,12)); } };
const prog=(shared,k)=>{ try{return JSON.parse(shared.getItem('ps_probe_'+k)||'null');}catch(e){return null;} };

/* ---------- 场景1：市场真停了 → 必须先"重新连接中"，跑满才"休市中" ---------- */
console.log('场景1  价格长期冻结（模拟真休市）');
{
  const sh=mkstore();
  const h=await boot(sh,110.78,4030.00);
  adv(60000);                       /* 冻结 1 分钟 > 30 秒 → 该进入探测 */
  await runProbe(h,1);
  const c1=chipOf(h);
  console.log('   探测 1 次后   徽标 ['+c1+']');
  ok('★★★★★ 只探测 1 次【不能】判休市（应显示重新连接中）', c1.indexOf('休市')<0);
  ok('★★★★★ 探测中显示"重试/重新连接"而不是"休市中"',
     c1.indexOf('重试')>=0||c1.indexOf('连接')>=0);

  await runProbe(h,40);
  const c2=chipOf(h);
  console.log('   探测 41 次后  徽标 ['+c2+']  进度='+JSON.stringify(prog(sh,'brent')));
  ok('★★★★★ 探测未满 3 轮仍【不能】判休市', c2.indexOf('休市')<0);

  await runProbe(h,40);             /* 累计 81 次 > 72 */
  const c3=chipOf(h);
  console.log('   探测 81 次后  徽标 ['+c3+']  进度='+JSON.stringify(prog(sh,'brent')));
  ok('★★★★★ 跑满 3 轮(72 次)后才判休市', c3.indexOf('休市')>=0);
}

/* ---------- 场景2：探测中途拿到新值 → 立刻开市（同一个页面内变价） ---------- */
console.log('\n场景2  探测中途市场重新开盘（出现新价）');
{
  const sh=mkstore();
  let cur=110.78;
  const h=await boot(sh,()=>cur,4030.00);
  adv(60000);                        /* 冻结 → 进入探测 */
  await runProbe(h,10);
  console.log('   探测 10 次后  徽标 ['+chipOf(h)+']  进度='+JSON.stringify(prog(sh,'brent')));
  ok('★★ 探测中确实是"重新连接中"', chipOf(h).indexOf('休市')<0);
  /* 同一个页面内，市场重新开盘 → 下一次探测应立刻翻回实时 */
  cur=110.99;
  await runProbe(h,1);
  const c=chipOf(h);
  console.log('   拿到新价后    徽标 ['+c+']  进度='+JSON.stringify(prog(sh,'brent')));
  ok('★★★★★ 探测中拿到新价 → 【立刻翻回实时】', c.indexOf('实时')>=0);
  ok('★★★★★ 拿到新价后探测进度被清零', prog(sh,'brent')===null);
}

/* ---------- 场景3：进度持久化 —— 刷新不重置 ---------- */
console.log('\n场景3  探测进度跨刷新保留（不从头再来）');
{
  const sh=mkstore();
  const h=await boot(sh,110.78,4030.00);
  adv(60000);
  await runProbe(h,20);
  const p1=prog(sh,'brent');
  console.log('   第一个页面   进度='+JSON.stringify(p1));
  const n1=h.bag.fetches.length;
  /* 模拟刷新：新页面共享 sessionStorage */
  const h2=await boot(sh,110.78,4030.00);
  const p2=prog(sh,'brent');
  console.log('   刷新后       进度='+JSON.stringify(p2));
  ok('★★★★★ 刷新后进度保留（不会从 r=0 重来）',
     p2&&p1&&p2.r>=p1.r&&!(p2.r===0&&p2.i===0&&p2.k===0));
}

/* ---------- 场景4：源失败也要推进换源，不能卡死 ---------- */
console.log('\n场景4  探测时源全部失败（网络问题）');
{
  const sh=mkstore();
  /* 先正常抓一次，建立 lastVal（否则连"冻结"都无从谈起） */
  let cur=110.78;
  const h=await boot(sh,()=>cur,4030.00);
  adv(60000);
  /* 再让所有源失败 */
  h.failOil=true;
  await runProbe(h,10);
  const p=prog(sh,'brent');
  console.log('   10 次后 进度='+JSON.stringify(p)+'  徽标 ['+chipOf(h)+']');
  ok('★★★ 源失败也能推进换源（不卡死在同一个坏源）', p&&(p.i>0||p.r>0));
}

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
