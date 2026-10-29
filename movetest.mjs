/* 实测覆盖层测试：排程休市但价格在动 → 必须显示"实时"，不能显示"休市中" */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome } from './src/pages.js';

let pass=0, fail=0;
const chk=(n,c)=>{ c?pass++:(fail++,console.log('  NG  '+n)); };
const ok=(n,c)=>chk('★ '+n,c);

const RealDate = Date;
// 冻结到：伦敦 00:30（ICE 布伦特排程【休市】）、纽约 20:30（WTI 开市）
const FROZEN='2026-10-29T08:30:00+08:00';
const freeze=(iso)=>{ globalThis.Date = class extends RealDate{
  constructor(...a){ return a.length?new RealDate(...a):new RealDate(iso); }
  static now(){ return new RealDate(iso).getTime(); } }; };

const m={oil:{price:110.78,updated:'x'},wti:{price:103.04,updated:'x'}};

// 场景1：每次返回的价都在变（券商 CFD 全天报价）
let n=0, prices=[110.78,110.80,110.83,110.79,110.85];
const build=(valFn)=>{
  let ticks=[],slow=[];
  const d=new JSDOM('<!doctype html><html><body>'+renderHome('zh',m,{rates:{}},'Asia/Shanghai')+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const RD=w.Date;
     w.Date=class extends RD{ constructor(...a){return a.length?new RD(...a):new RD(FROZEN);} static now(){return new RD(FROZEN).getTime();} };
     w.fetch=async(u)=>String(u).includes('oil-live')
       ? {ok:true,status:200,headers:{get:()=>'application/json'},
          json:async()=>({ok:true,brent:valFn(),wti:103.04,provider:'biquote'})}
       : {ok:true,status:200,headers:{get:()=>'application/json'},json:async()=>({spot_usd_oz:4000,data_state:'fresh'})};
     w.setInterval=(fn,ms)=>{ (ms&&ms<5000?ticks:slow).push(fn); return 1; };
     w.setTimeout=(fn)=>1;
   }});
  return {d,ticks,slow};
};

console.log('---- 场景1：排程休市，但价格持续在变 ----');
{
  let i=0;
  const h=build(()=>prices[i++ % prices.length]);
  await new Promise(r=>setTimeout(r,400));
  /* 触发若干次 15s 轮询，让脚本观察到"价格在变" */
  for(let k=0;k<4;k++){ h.slow.forEach(f=>{try{f()}catch(e){}}); await new Promise(r=>setTimeout(r,120)); }
  const chip=h.d.window.document.getElementById('home-oil-chip');
  const val=h.d.window.document.getElementById('home-oil-price').textContent;
  console.log('     布伦特：'+val+'  徽标：['+chip.textContent+']');
  ok('★ 价格在动时不显示「休市中」', chip.textContent.indexOf('休市')<0);
  ok('★ 价格在动时显示实时', chip.textContent.indexOf('实时')>=0);
}

console.log('---- 场景2：排程休市，价格完全不动 ----');
{
  const h=build(()=>110.78);   // 每次都是同一个值
  await new Promise(r=>setTimeout(r,400));
  for(let k=0;k<4;k++){ h.slow.forEach(f=>{try{f()}catch(e){}}); await new Promise(r=>setTimeout(r,120)); }
  const chip=h.d.window.document.getElementById('home-oil-chip');
  console.log('     布伦特：'+h.d.window.document.getElementById('home-oil-price').textContent+'  徽标：['+chip.textContent+']');
  ok('★ 价格不动时显示「休市中」', chip.textContent.indexOf('休市')>=0);
}

globalThis.Date=RealDate;
console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
