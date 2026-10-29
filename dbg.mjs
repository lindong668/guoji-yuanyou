import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderGold } from './src/pages.js';
const RealDate=Date; let NOW=new RealDate('2026-10-29T12:00:00+08:00').getTime();
const adv=ms=>{NOW+=ms;};
const M={oil:{price:110.78,updated:'x'},wti:{price:102.03,updated:'x'},
         gold:{usdOz:4030.00,updatedAt:new Date().toISOString()},
         cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()}};
const FX={base:'USD',rates:{CNY:6.68,EUR:0.89,JPY:157.4},date:'2026-10-28'};
function mkstore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}
async function boot(html,shared,goldVal){
  let bag={ints:[],fetches:[]};
  const d=new JSDOM('<!doctype html><html><body>'+html+'</body></html>',{runScripts:'dangerously',beforeParse(w){
    const RD=w.Date;
    w.Date=class extends RD{constructor(...a){return a.length?new RD(...a):new RD(NOW);}static now(){return NOW;}};
    Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
    w.fetch=async(u)=>{const s=String(u); bag.fetches.push(s);
      if(s.includes('/api/gold-live')) return {ok:true,status:200,headers:{get:()=>'application/json'},json:async()=>({priceUsdPerOz:goldVal,live:true})};
      if(s.includes('/api/oil-live')) return {ok:true,status:200,headers:{get:()=>'application/json'},json:async()=>({ok:true,brent:110.78,wti:102.03,provider:'biquote'})};
      return {ok:true,status:200,headers:{get:()=>'application/json'},json:async()=>({bid:goldVal-0.01,ask:goldVal+0.01,price:goldVal,spot_usd_oz:goldVal,data_state:'fresh'})};
    };
    w.setInterval=(fn,ms)=>{bag.ints.push({ms,fn});return 1;};
    w.setTimeout=(fn,ms)=>1;
  }});
  await new Promise(r=>setTimeout(r,500));
  return {d,bag};
}
const sh=mkstore();
const h=await boot(renderHome('zh',M,FX,'Asia/Shanghai'),sh,4030.00);
console.log('首页 fetch:',h.bag.fetches);
console.log('ps_tick_gold =',sh.getItem('ps_tick_gold'));
adv(10000);
console.log('adv 10s 后 NOW=',NOW,' 快照 t=',JSON.parse(sh.getItem('ps_tick_gold')||'{}').t,
            ' 差值=',(NOW-JSON.parse(sh.getItem('ps_tick_gold')||'{}').t)/1000+'s');
const g=await boot(renderGold('zh',M,FX,'Asia/Shanghai'),sh,4030.00);
console.log('详情 fetch:',g.bag.fetches);
console.log('详情 g-status =',g.d.window.document.getElementById('g-status')?.textContent);
console.log('详情 ps_tick_gold =',sh.getItem('ps_tick_gold'));
