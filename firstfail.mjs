/* 验证 bug：一次都没成功过（新访客/无痕/API全挂）时，不能假装"实时" */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome } from './src/pages.js';
const RD=Date; let NOW=new RD('2026-10-29T10:00:00+08:00').getTime(); Date.now=()=>NOW;
const M={oil:{price:110.5,updated:'x'},wti:{price:101.2,updated:'x'},gold:{usdOz:4030,updatedAt:'x'},
         cnOil:{list:[{省:'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:'x'}};
const FX={base:'USD',rates:{CNY:6.68},date:'2026-10-28'};
let ok=0,bad=0;
const T=(n,c)=>{ if(c){ok++;console.log('  ✓ '+n);} else {bad++;console.log('  ✗ '+n);} };
function mk(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v))},removeItem:k=>{m.delete(k)},clear:()=>{m.clear()},key:()=>null,get length(){return m.size}}}
async function boot(mode){
  const bag={timers:[],intervals:[]};
  const d=new JSDOM('<!doctype html><html><body>'+renderHome('zh',M,FX,'Asia/Shanghai')+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const R=w.Date; w.Date=class extends R{constructor(...a){return a.length?new R(...a):new R(NOW)}static now(){return NOW}};
     Object.defineProperty(w,'sessionStorage',{value:mk(),configurable:true});
     Object.defineProperty(w,'localStorage',{value:mk(),configurable:true});
     Object.defineProperty(w.Document.prototype,'hidden',{get:()=>false,configurable:true});
     Object.defineProperty(w.Document.prototype,'visibilityState',{get:()=>'visible',configurable:true});
     w.fetch=async(u)=>{const s=String(u);
       if(s.includes('/api/market-state')) return{ok:true,status:200,headers:{get:()=>'application/json'},json:async()=>({ok:true,brent:null,wti:null,gold:null,hasKV:false})};
       if(mode==='block'){ await new Promise(r=>setTimeout(r,0)); throw new Error('blocked'); }
       return{ok:true,status:200,headers:{get:()=>'application/json'},json:async()=>({ok:true,brent:110.50,wti:101.20,priceUsdPerOz:4030})};
     };
     w.setTimeout=(fn,ms)=>{bag.timers.push({fn,at:NOW+(ms||0)});return 1};
     w.setInterval=(fn,ms)=>{bag.intervals.push({fn,ms:ms||1000,next:NOW+(ms||1000)});return 1};
     w.clearTimeout=()=>{};w.clearInterval=()=>{};
   }});
  for(let i=0;i<15;i++){run(bag);await new Promise(r=>setTimeout(r,3));}
  return {d,bag};
}
function run(bag){
  for(const iv of bag.intervals){ let n=0; while(iv.next<=NOW&&n++<300){ iv.next+=iv.ms; try{ iv.fn(); }catch(e){} } }
  let g=0;
  while(g++<800){
    const due=bag.timers.filter(t=>!t.done&&t.at<=NOW).sort((a,b)=>a.at-b.at);
    if(!due.length) break;
    const t=due[0]; t.done=true; bag.timers.splice(bag.timers.indexOf(t),1);
    try{ t.fn(); }catch(e){}
  }
}
async function adv(bag,sec){ for(let i=0;i<sec;i++){ NOW+=1000; run(bag); await new Promise(r=>setTimeout(r,0)); } run(bag); await new Promise(r=>setTimeout(r,5)); run(bag); }
function chip(d){const e=d.window.document.getElementById('home-oil-chip');return e?e.textContent.trim():'?'}

console.log('\n[1] 一次都没成功过（API 全阻断）');
{
  const h=await boot('block');
  await adv(h.bag,5);
  T('5 秒内仍在尝试 → 实时（宽限，不该一上来就报断线）', chip(h.d).includes('实时'));
  await adv(h.bag,5);
  T('10 秒（还没到 1.5 拍）→ 仍实时，给宽限', chip(h.d).includes('实时'));
  await adv(h.bag,20);
  T('30 秒后 → 必须显示连接中断，不能假装实时', chip(h.d).includes('连接中断'));
  await adv(h.bag,600);
  T('10 分钟后仍是连接中断（不会误判休市）', chip(h.d).includes('连接中断') && !chip(h.d).includes('休市'));
}
console.log('\n[2] 正常连通时不受影响');
{
  const h=await boot('ok');
  await adv(h.bag,30);
  T('正常 → 实时', chip(h.d).includes('实时'));
}
console.log('\n[3] 先成功后阻断 → 连接中断（原有行为不能变）');
{
  const h=await boot('ok');
  await adv(h.bag,60);
  /* 切阻断 */
  h.d.window.fetch=async()=>{ throw new Error('blocked'); };
  await adv(h.bag,180);
  T('阻断 3 分钟后 → 连接中断', chip(h.d).includes('连接中断'));
}
console.log('\n通过 '+ok+' 项，失败 '+bad+' 项');
process.exit(bad?1:0);
