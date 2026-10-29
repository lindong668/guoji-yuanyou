/* ★★★★★ 本轮三个真 bug 的回归测试
 *
 * 1. 黄金点进去秒数归零 —— setGoldVal 没写节拍快照 t
 * 2. 详情页只剩一个绿点 —— 原油详情页探测模块漏插，probeTick 未定义 → 脚本崩溃
 * 3. 连接中断太频繁 —— 一冻结就显示，没跑完一整圈
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderGold } from './src/pages.js';

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
const secsOf=(t)=>{ const mm=/(\d+)s/.exec(t||''); return mm?+mm[1]:null; };

async function boot(html,shared,goldVal,errs){
  let bag={ints:[],fetches:[]};
  const d=new JSDOM('<!doctype html><html><body>'+html+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{constructor(...a){return a.length?new RD(...a):new RD(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     w.fetch=async(u)=>{ const s=String(u); bag.fetches.push(s);
       if(s.includes('/api/oil-live'))
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({ok:true,brent:110.78,wti:102.03,provider:'biquote'})};
       if(s.includes('/api/gold-live'))
         return {ok:true,status:200,headers:{get:()=>'application/json'},
                 json:async()=>({priceUsdPerOz:goldVal,live:true})};
       return {ok:true,status:200,headers:{get:()=>'application/json'},
               json:async()=>({bid:goldVal-0.01,ask:goldVal+0.01,price:goldVal,spot_usd_oz:goldVal,data_state:'fresh'})};
     };
     w.setInterval=(fn,ms)=>{ bag.ints.push({ms,fn}); return 1; };
     w.setTimeout=(fn,ms)=>1;
     w.addEventListener('error',e=>{ if(errs) errs.push(String(e.message||e.error)); });
   }});
  await new Promise(r=>setTimeout(r,500));
  return {d,bag};
}

/* ---------- 1. 黄金秒数：首页与详情页必须同源、连续 ---------- */
console.log('测试1  黄金秒数跨页面连续（修 setGoldVal 漏写节拍）');
{
  const sh=mkstore();
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,4030.00);
  /* ★ 复现用户场景：首页挂 10 秒（秒数跳到 10s），再点进黄金详情页 */
  const tick1s=h.bag.ints.filter(x=>x.ms===1000).pop();
  if(tick1s) tick1s.fn();
  adv(10000);
  if(tick1s) tick1s.fn();
  const homeChip=h.d.window.document.getElementById('home-gold-chip').textContent;
  console.log('   首页徽标 ['+homeChip+']   （应约 10s，不是 0s）');
  ok('★★ 首页秒数确实已跳到 10 秒（构造出用户看到的状态）',
     (secsOf(homeChip)!=null && secsOf(homeChip)>=8));
  const snap=JSON.parse(sh.getItem('ps_tick_gold')||'null');
  console.log('   节拍快照 t 存在？'+(snap&&snap.t?'是':'否'));
  ok('★★★★★ 首页黄金抓到值后【必须】写节拍快照（原漏写 → 详情页秒数归 0）',
     !!(snap&&snap.t));
  /* 进详情页：应沿用同一节拍，秒数与首页一致 */
  const gd=await boot(renderGold('zh',M,FX,'Asia/Shanghai'),sh,4030.00);
  /* ★ 黄金详情页的状态徽标 id 是 g-status（不是 gold-live-chip） */
  const dChip=gd.d.window.document.getElementById('g-status');
  const dTxt=dChip?dChip.textContent:'';
  console.log('   详情徽标 ['+dTxt+']   （原来会归零成 0s）');
  const hs=secsOf(homeChip), ds=secsOf(dTxt);
  ok('★★★★★ 详情页【一进来就有秒数】，不是 0s 也不是空', ds!=null && ds>0);
  ok('★★★★★ 详情页秒数与首页一致（误差 ≤2s）',
     (hs!=null&&ds!=null)?Math.abs(ds-hs)<=2:false);
}

/* ---------- 2. 原油详情页：脚本不能崩（探测模块必须存在） ---------- */
console.log('\n测试2  原油详情页脚本完整性（探测模块漏插会崩溃）');
{
  const sh=mkstore();
  const errs=[];
  const {renderOil}=await import('./src/pages.js');
  const od=await boot(renderOil('zh',M,FX,'Asia/Shanghai','brent'),sh,4030.00,errs);
  const chip=od.d.window.document.getElementById('oil-live-chip');
  const txt=chip?chip.textContent:'(无 chip)';
  console.log('   详情徽标 ['+txt+']   脚本错误 '+(errs.length?errs.join('|'):'无'));
  ok('★★★★★ 原油详情页脚本【不抛错】（probeTick 必须有定义）', errs.length===0);
  ok('★★★★★ 原油详情页徽标有文字（不是只剩一个点）', txt.length>1);
  ok('★★★★★ 原油详情页徽标显示秒数', /实时|s/.test(txt));
}

/* ---------- 3. 连接中断不能频繁：第一圈内必须仍是"实时" ---------- */
console.log('\n测试3  冻结后不能立刻显示连接中断（要跑完一整圈）');
{
  const sh=mkstore();
  const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,4030.00);
  adv(70000);                       /* 冻结 70 秒 → 超过 60 秒阈值，开始探测 */
  const probe=h.bag.ints.filter(x=>x.ms===3000).pop();
  /* 跑 10 次探测：远未跑完一整圈（8源×3次=24 次） */
  for(let i=0;i<10;i++){ if(probe) probe.fn(); await new Promise(r=>setTimeout(r,10)); }
  const c=h.d.window.document.getElementById('home-oil-chip').textContent;
  console.log('   探测 10 次后徽标 ['+c+']');
  ok('★★★★★ 第一圈内【不显示】连接中断（仍实时）', c.indexOf('中断')<0 && c.indexOf('实时')>=0);

  /* 继续跑到跑完整圈以上 */
  for(let i=0;i<20;i++){ if(probe) probe.fn(); await new Promise(r=>setTimeout(r,10)); }
  const c2=h.d.window.document.getElementById('home-oil-chip').textContent;
  console.log('   探测 30 次后徽标 ['+c2+']');
  ok('★★★★★ 跑完一整圈后才显示连接中断', c2.indexOf('中断')>=0);
}

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
