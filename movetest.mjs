/* 开休市判定（最终三规则）真实环境测试
   规则：1 价格在动→实时  2 冻结≥10分钟且排程休市→休市  3 其余→实时 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome } from './src/pages.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };
const RealDate = Date;

/* 可推进的时钟 */
let NOW = 0;
const setNow = (iso) => { NOW = new RealDate(iso).getTime(); };

const m={oil:{price:110.78,updated:'x'},wti:{price:103.04,updated:'x'}};

const build=(valFn)=>{
  let ticks=[],slow=[];
  const d=new JSDOM('<!doctype html><html><body>'+renderHome('zh',m,{rates:{}},'Asia/Shanghai')+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{
       constructor(...a){ return a.length?new RD(...a):new RD(NOW); }
       static now(){ return NOW; }
     };
     w.fetch=async(u)=>String(u).includes('oil-live')
       ? {ok:true,status:200,headers:{get:()=>'application/json'},
          json:async()=>({ok:true,brent:valFn(),wti:103.04,provider:'biquote'})}
       : {ok:true,status:200,headers:{get:()=>'application/json'},json:async()=>({spot_usd_oz:4000,data_state:'fresh'})};
     w.setInterval=(fn,ms)=>{ (ms&&ms<5000?ticks:slow).push(fn); return 1; };
     w.setTimeout=(fn)=>1;
   }});
  return {d,ticks,slow};
};
const chipOf=(h)=>h.d.window.document.getElementById('home-oil-chip').textContent;
const poll=async(h,n=1,stepMs=60000)=>{
  for(let i=0;i<n;i++){ NOW+=stepMs; h.slow.forEach(f=>{try{f()}catch(e){}}); await new Promise(r=>setTimeout(r,15)); }
};

/* ---------- 场景1：排程休市（伦敦00:30），但价格一直在动 ---------- */
console.log('场景1  排程休市 但价格在动');
setNow('2026-10-29T08:30:00+08:00');   // 伦敦 00:30 → 排程休市
{
  let i=0, p=[110.78,110.80,110.83,110.79,110.85];
  const h=build(()=>p[i++ % p.length]);
  await new Promise(r=>setTimeout(r,350));
  await poll(h,3,60000);   // 推进 3 分钟，每次价都不同
  console.log('       布伦特 '+h.d.window.document.getElementById('home-oil-price').textContent+'  徽标 ['+chipOf(h)+']');
  ok('价格在动 → 显示实时（不误判休市）', chipOf(h).indexOf('实时')>=0);
}

/* ---------- 场景2：排程休市 + 价格冻结超过10分钟 ---------- */
console.log('场景2  排程休市 + 价格冻结 >10 分钟');
setNow('2026-10-29T08:30:00+08:00');
{
  const h=build(()=>110.78);
  await new Promise(r=>setTimeout(r,350));
  await poll(h,12,60000);  // 冻结 12 分钟
  console.log('       布伦特 '+h.d.window.document.getElementById('home-oil-price').textContent+'  徽标 ['+chipOf(h)+']');
  ok('冻结够久且排程休市 → 显示休市中', chipOf(h).indexOf('休市')>=0);
}

/* ---------- 场景3：排程【开市】+ 价格冻结超10分钟（清淡，不能算休市）---------- */
console.log('场景3  排程开市 + 价格冻结 >10 分钟');
setNow('2026-10-29T20:00:00+08:00');   // 伦敦 12:00 → 排程开市
{
  const h=build(()=>110.78);
  await new Promise(r=>setTimeout(r,350));
  await poll(h,12,60000);
  console.log('       布伦特 '+h.d.window.document.getElementById('home-oil-price').textContent+'  徽标 ['+chipOf(h)+']');
  ok('★ 排程开市时即使价格不动也显示实时（不误判休市）', chipOf(h).indexOf('实时')>=0);
}

/* ---------- 场景4：抗抖动 —— 动一下又冻结5分钟，不能翻成休市 ---------- */
console.log('场景4  动过之后冻结 5 分钟（抗抖动）');
setNow('2026-10-29T08:30:00+08:00');   // 排程休市
{
  let seq=[110.78,110.80,110.80,110.80,110.80,110.80];
  let i=0;
  const h=build(()=>seq[Math.min(i++,seq.length-1)]);
  await new Promise(r=>setTimeout(r,350));
  await poll(h,5,60000);   // 第1分钟动了一下，之后冻结共5分钟
  console.log('       布伦特 '+h.d.window.document.getElementById('home-oil-price').textContent+'  徽标 ['+chipOf(h)+']');
  ok('★ 冻结未满10分钟不翻休市（不再抖动）', chipOf(h).indexOf('实时')>=0);
}

globalThis.Date=RealDate;
console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
