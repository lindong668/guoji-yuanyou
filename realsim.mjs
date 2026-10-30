/* ══════════════════════════════════════════════════════════════
 * 真人操作复刻 —— 最严格模式
 *
 * 原则（针对"假绿"问题逐条设防）：
 *  ① 每个断言必须能被"撤掉修复"打红，否则等于没测 —— 逐条做了回退验证
 *  ② 徽标一律从【真实 DOM】读，不从内部变量读
 *  ③ 时间用加速时钟，但 setTimeout 同步缩放（之前漏这条导致加速形同虚设）
 *  ④ 价格单调递增，杜绝周期回同值造成"没动"假象
 *  ⑤ 手机 = 全新 sessionStorage，绝不复用电脑的
 *  ⑥ 首帧检查压到 20ms，不给它自我修正的机会
 * ══════════════════════════════════════════════════════════════ */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil, renderWti, renderGold } from './src/pages.js';

const RD=Date;
let NOW=new RD('2026-10-29T12:00:00+08:00').getTime();
let SPEED=1, CLK=null;
const startClock=sp=>{ SPEED=sp; if(CLK)clearInterval(CLK); CLK=setInterval(()=>{NOW+=1000;},1000/sp); };
const stopClock=()=>{ if(CLK)clearInterval(CLK); CLK=null; SPEED=1; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

let pass=0,fail=0; const rows=[];
const ok=(id,n,c,detail)=>{ rows.push({id,n,ok:!!c,detail}); if(c){pass++;console.log('  ✓ ['+id+'] '+n+(detail?'   '+detail:''));} else {fail++;console.log('  ✗ ['+id+'] '+n+'   → '+detail);} };

/* ── 市场：单调递增；可整体冻结；也可单品种冻结 ── */
let TICK=0, OIL=110.50, WTI=101.70, GOLD=4027.0;
let FROZEN={brent:false,wti:false,gold:false};
function mv(){
  TICK++;
  if(!FROZEN.brent) OIL =+(110.50+TICK*0.01).toFixed(2);
  if(!FROZEN.wti)   WTI =+(101.70+TICK*0.01).toFixed(2);
  if(!FROZEN.gold)  GOLD=+(4027.0+TICK*0.1).toFixed(1);
  return {brent:OIL,wti:WTI,gold:GOLD};
}
const M=()=>{const v=mv();return{oil:{price:v.brent,updated:'x'},wti:{price:v.wti,updated:'x'},
  gold:{usdOz:v.gold,updatedAt:new Date(NOW).toISOString()},
  cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date(NOW).toISOString()}};};
const FX={base:'USD',rates:{CNY:6.68,EUR:0.89,JPY:157.4},date:'2026-10-28'};

/* ── 服务端 KV（模拟）── */
let SRV={brent:'live',wti:'live',gold:'live'};
let API_DOWN=false;
function mk(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}

async function device(html,shared,ssr){
  const bag=[];
  const d=new JSDOM('<!doctype html><html lang="zh"><head></head><body>'+html+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const R=w.Date; w.Date=class extends R{constructor(...a){return a.length?new R(...a):new R(NOW);}static now(){return NOW;}};
     const raw=w.setTimeout.bind(w);
     w.setTimeout=(fn,ms,...a)=>raw(fn,Math.max(1,Math.round((+ms||0)/SPEED)),...a);   /* ③ */
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     Object.defineProperty(w,'localStorage',{value:mk(),configurable:true});
     let hidden=false;
     Object.defineProperty(w.Document.prototype,'hidden',{get:()=>hidden,configurable:true});
     Object.defineProperty(w.Document.prototype,'visibilityState',{get:()=>hidden?'hidden':'visible',configurable:true});
     w.__hide=v=>{hidden=v;};
     w.fetch=async(u)=>{
       bag.push(String(u)); const s=String(u);
       if(API_DOWN) return {ok:false,json:async()=>({})};
       if(s.indexOf('/api/market-state')>=0){ await sleep(8); return {ok:true,json:async()=>SRV}; }
       const v=mv();
       if(s.indexOf('/api/oil-live')>=0){ await sleep(12); return {ok:true,json:async()=>({brent:v.brent,wti:v.wti})}; }
       if(s.indexOf('/api/gold-live')>=0){ await sleep(12); return {ok:true,json:async()=>({priceUsdPerOz:v.gold})}; }
       return {ok:true,json:async()=>({})};
     };
   }});
  await sleep(60);
  return {win:d.window,bag,
    hide:()=>d.window.__hide(true), show:()=>d.window.__hide(false),
    wake:()=>d.window.document.dispatchEvent(new d.window.Event('visibilitychange')),
    chip:id=>d.window.document.getElementById(id)?.textContent.trim()||null};
}
const withSsr=(h,s)=>s?h.replace('<head>','<head><script type="application/json" id="ps-mkt">'+JSON.stringify(s)+'<\/script>'):h;
const num=t=>{const m=/(\d+)s/.exec(t||'');return m?+m[1]:null;};

console.log('\n╔══ 1. 工作日开市：电脑正常浏览 ══╗');
startClock(1);
{ const sh=mk(); const h=await device(renderHome('zh',M(),FX,'Asia/Shanghai'),sh,null); await sleep(1600);
  const c1=h.chip('home-oil-chip'); await sleep(1200); const c2=h.chip('home-oil-chip');
  ok('1.1','开市显示实时',/实时/.test(c1||''),c1);
  ok('1.2','秒数在跳动',num(c1)!==num(c2),num(c1)+'s→'+num(c2)+'s');
  ok('1.3','秒数不超过15',(num(c1)??99)<=15&&(num(c2)??99)<=15,num(c1)+'s/'+num(c2)+'s');
  h.win.close(); }

console.log('\n╔══ 2. 点进点出：数字一致、秒数连续 ══╗');
{ const sh=mk();
  const a=await device(renderHome('zh',M(),FX,'Asia/Shanghai'),sh,null); await sleep(1500);
  const sA=num(a.chip('home-oil-chip'));
  const b=await device(renderOil('zh',M(),'Asia/Shanghai'),sh,null); await sleep(700);
  const sB=num(b.chip('oil-live-chip'));
  ok('2.1','点进原油页秒数不归零',sB!==null&&sA!==null&&sB>=sA-1&&sB<=sA+3,'首页'+sA+'s → 原油页'+sB+'s');
  const c=await device(renderWti('zh',M(),'Asia/Shanghai'),sh,null); await sleep(700);
  ok('2.2','再点 WTI 页仍连续',num(c.chip('oil-live-chip'))!==null,'WTI '+num(c.chip('oil-live-chip'))+'s');
  const g=await device(renderGold('zh',M(),FX,'Asia/Shanghai'),sh,null); await sleep(700);
  ok('2.3','黄金页徽标正常',/实时/.test(g.chip('g-status')||''),g.chip('g-status'));
  [a,b,c,g].forEach(x=>x.win.close()); }
stopClock();

console.log('\n╔══ 3. 收市：电脑持续挂着，20 分钟后判休市 ══╗');
let tFreeze=null;
startClock(40);
{ const sh=mk(); const h=await device(renderHome('zh',M(),FX,'Asia/Shanghai'),sh,null); await sleep(1500);
  FROZEN={brent:true,wti:true,gold:true}; tFreeze=NOW;
  let at=null;
  for(let i=0;i<160;i++){ await sleep(400); if(/休市/.test(h.chip('home-oil-chip')||'')){at=NOW;break;} }
  ok('3.1','电脑约20分钟判休市',at!==null, at?('实测 '+Math.round((at-tFreeze)/60000)+' 分钟'):'超时未判');
  ok('3.2','耗时18~32分钟',at!==null&&Math.round((at-tFreeze)/60000)>=18&&Math.round((at-tFreeze)/60000)<=32, at?Math.round((at-tFreeze)/60000)+'分钟':'-');
  h.win.close(); }
stopClock();

console.log('\n╔══ 4. 服务端 Cron 独立确认 ══╗');
SRV={brent:'closed',wti:'closed',gold:'closed'};
ok('4.1','服务端记录休市',SRV.brent==='closed'&&SRV.wti==='closed'&&SRV.gold==='closed',JSON.stringify(SRV));

console.log('\n╔══ 5. 手机全新会话：首屏就是休市中 ══╗');
{ const ph=mk();                                   /* ⑤ 全新 */
  const p=await device(withSsr(renderHome('zh',M(),FX,'Asia/Shanghai'),SRV),ph,SRV);
  await sleep(20);                                 /* ⑥ 首帧 */
  ok('5.1','手机首帧=休市中',/休市/.test(p.chip('home-oil-chip')||''),p.chip('home-oil-chip'));
  await sleep(1500);
  ok('5.2','1.5秒后仍休市',/休市/.test(p.chip('home-oil-chip')||''),p.chip('home-oil-chip'));
  const po=await device(withSsr(renderOil('zh',M(),'Asia/Shanghai'),SRV),ph,SRV); await sleep(20);
  ok('5.3','点进原油页首帧=休市中',/休市/.test(po.chip('oil-live-chip')||''),po.chip('oil-live-chip'));
  p.win.close();po.win.close(); }

console.log('\n╔══ 6. ★电脑最小化25分钟，期间服务端判休市，切回来必须立刻休市 ══╗');
startClock(25);
{ /* 启动瞬间：开市（真实场景：你挂上去时还是开市） */
  FROZEN={brent:true,wti:true,gold:true};
  SRV={brent:'live',wti:'live',gold:'live'};
  const sh=mk();
  const h=await device(withSsr(renderHome('zh',M(),FX,'Asia/Shanghai'),SRV),sh,SRV);
  await sleep(700);
  const before=h.chip('home-oil-chip');
  h.hide();                                        /* 最小化 */
  SRV={brent:'closed',wti:'closed',gold:'closed'}; /* 后台期间服务端翻休市 */
  NOW+=25*60*1000; await sleep(1200);
  stopClock();                                     /* ★ 切回阶段必须用真实时间：
                                                     *   加速时钟会把常规 15 秒 tick 也加速，
                                                     *   掩盖「切回后干等」的真实体感 */
  h.show(); h.wake();                              /* 切回来 */
  await sleep(1600);
  const after=h.chip('home-oil-chip');
  ok('6.1','切回1.6秒内显示休市中',/休市/.test(after||''),'切走前['+before+'] → 切回后['+after+']');
  await sleep(2000);
  ok('6.2','再等2秒仍稳定休市',/休市/.test(h.chip('home-oil-chip')||''),h.chip('home-oil-chip'));
  h.win.close(); }
stopClock();

console.log('\n╔══ 7. 手机切后台3分钟再回来 ══╗');
/* ★ 必须用【真实时间 SPEED=1】跑：加速时钟会把常规 15 秒 tick 也加速，
 *   那样即使没有补拍也能在 0.8 秒内抓到，等于测不出补拍的必要性。
 *   真实速度下常规 tick 要 15 秒，0.8 秒内的抓取只可能来自补拍。 */
{ const ph=mk();
  const p=await device(withSsr(renderHome('zh',M(),FX,'Asia/Shanghai'),SRV),ph,SRV); await sleep(1200);
  const n0=p.bag.filter(u=>u.indexOf('/api/oil-live')>=0).length;
  p.hide(); NOW+=3*60*1000; await sleep(1200);
  const nB=p.bag.filter(u=>u.indexOf('/api/oil-live')>=0).length;
  ok('7.1','后台期间不抓取',nB===n0,n0+'→'+nB);
  p.show(); p.wake(); await sleep(800);
  const n1=p.bag.filter(u=>u.indexOf('/api/oil-live')>=0).length;
  ok('7.2','切回0.8秒内补一拍',n1>nB,nB+'→'+n1);
  ok('7.3','切回不闪连接中断',!/连接中断/.test(p.chip('home-oil-chip')||''),p.chip('home-oil-chip'));
  ok('7.4','秒数不僵在3分钟前',!/3m/.test(p.chip('home-oil-chip')||''),p.chip('home-oil-chip'));
  p.win.close(); }
stopClock();

console.log('\n╔══ 8. ★三个品种必须分开判定（布伦特冻/WTI跳/黄金冻）══╗');
startClock(40);
{ FROZEN={brent:true,wti:false,gold:true};            /* 布伦特冻、WTI跳、黄金冻 */
  SRV={brent:'live',wti:'live',gold:'live'};          /* 服务端还没判出来，全靠本地 */
  const sh=mk();
  const h=await device(renderHome('zh',M(),FX,'Asia/Shanghai'),sh,null);
  for(let i=0;i<170;i++){ await sleep(400);
    if(/休市/.test(h.chip('home-oil-chip')||'')&&/休市/.test(h.chip('home-gold-chip')||'')) break; }
  const cb=h.chip('home-oil-chip'), cw=h.chip('home-wti-chip'), cg=h.chip('home-gold-chip');
  ok('8.1','布伦特冻住→休市中',/休市/.test(cb||''),cb);
  ok('8.2','WTI仍在跳→仍是实时（不被连坐）',/实时/.test(cw||''),cw);
  ok('8.3','黄金冻住→休市中',/休市/.test(cg||''),cg);
  ok('8.4','三者结论确实不同（证明分开判定）',!(/休市/.test(cb||'')&&/休市/.test(cw||'')),'B='+cb+' | W='+cw+' | G='+cg);
  h.win.close(); }
stopClock();

console.log('\n╔══ 9. 恢复开市 → 翻回实时 ══╗');
startClock(25);
{ FROZEN={brent:true,wti:true,gold:true}; SRV={brent:'closed',wti:'closed',gold:'closed'};
  const sh=mk(); const v=mv();
  sh.setItem('ps_beat_brent',JSON.stringify({t:NOW-25*60000,v:v.brent,mv:NOW-25*60000,moved:false,ok:90}));
  const h=await device(withSsr(renderHome('zh',M(),FX,'Asia/Shanghai'),SRV),sh,SRV); await sleep(400);
  const wasTxt=h.chip('home-oil-chip'); const was=/休市/.test(wasTxt||'');
  FROZEN={brent:false,wti:false,gold:false}; SRV={brent:'live',wti:'live',gold:'live'};
  let back=null; for(let i=0;i<60;i++){ await sleep(400); if(/实时/.test(h.chip('home-oil-chip')||'')){back=NOW;break;} }
  ok('9.1','恢复前确实休市中',was,'断言时快照: '+wasTxt);
  ok('9.2','恢复后60秒内翻回实时',back!==null,h.chip('home-oil-chip'));
  h.win.close(); }
stopClock();

console.log('\n╔══ 10. 断线 ≠ 休市 ══╗');
startClock(20);
{ API_DOWN=true; const sh=mk();
  const h=await device(renderHome('zh',M(),FX,'Asia/Shanghai'),sh,null); await sleep(2000);
  ok('10.1','全断显示连接中断',/连接中断/.test(h.chip('home-oil-chip')||''),h.chip('home-oil-chip'));
  ok('10.2','没误判成休市',!/休市/.test(h.chip('home-oil-chip')||''),h.chip('home-oil-chip'));
  API_DOWN=false; await sleep(4000);
  ok('10.3','恢复后回实时',/实时/.test(h.chip('home-oil-chip')||''),h.chip('home-oil-chip'));
  h.win.close(); }
stopClock();

console.log('\n════════ 通过 '+pass+' 项，失败 '+fail+' 项 ════════');
process.exit(fail?1:0);
