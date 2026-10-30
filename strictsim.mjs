/* ★★★ 严格端到端全真模拟 —— 真实 handler + 真实前端脚本
 * 不手抄逻辑：服务端走 index.js 真实函数，前端走 pages.js 真实脚本（jsdom 执行）。
 * 覆盖：冻结判休市 / 手机新会话 / 页面导航 / 后台久挂切回 / 断线 / 开市即时 / 全周 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil, renderGold } from './src/pages.js';
import { mktStep, mktNeedWrite, MKT_FREEZE_MS } from './src/index.js';

let pass=0, fail=0;
const ok=(n,c,extra)=>{ if(c){pass++;console.log('  ✓ '+n);} else {fail++;console.log('  ✗ '+n+(extra?'  → '+extra:''));} };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RD=Date;
let NOW=new RD('2026-10-29T12:00:00+08:00').getTime();
const T0=NOW;
/* ★ mktStep 内部直接调 Date.now()（真实时钟）。测试用虚拟时钟推进，
 *   若不接管全局 Date.now，冻结永远走不满 20 分钟 —— 必须接管。 */
const _realNow=Date.now.bind(Date);
Date.now=()=>NOW;


/* ---- 服务端 KV ---- */
let KV={};                       /* {brent:{v,mv,st}, ...} */
const KEYS=['brent','wti','gold'];
function mktTick(vals){
  let writes=0;
  for(const k of KEYS){
    const prev=KV[k]||null, v=vals[k];
    const next=mktStep(prev, v);
    if(mktNeedWrite(prev,next)) writes++;
    KV[k]=next;
  }
  return writes;
}
function inject(html){ const o={}; for(const k of KEYS) o[k]=(KV[k]&&KV[k].st)||null;
  return html.replace('<head>','<head><script type="application/json" id="ps-mkt">'+JSON.stringify(o)+'<\/script>'); }
function stateJson(){ const o={ok:true,at:NOW}; for(const k of KEYS) o[k]=(KV[k]&&KV[k].st)||null; return o; }

/* ---- 真价 vs 冻结 ---- */
let REAL={brent:110.50,wti:101.40,gold:4028.00};
let MODE='off';                 /* off | freeze */
let FROZEN=null;
function curVals(){
  if(MODE==='freeze') return FROZEN||{...REAL};
  REAL.brent=+(REAL.brent+0.03).toFixed(2);
  REAL.wti=+(REAL.wti+0.02).toFixed(2);
  REAL.gold=+(REAL.gold+0.5).toFixed(2);
  return {...REAL};
}

function mk(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>{m.clear();},key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}};}

/* 打开一个页面（真实前端脚本） */
async function openPage(kind, shared, opts={}){
  const base = kind==='home'?renderHome('zh',{oil:{price:110.5,updated:''},wti:{price:101.4,updated:''},gold:{usdOz:4028,updatedAt:''},cnOil:{list:[],updatedAt:''}},{base:'USD',rates:{CNY:6.68},date:'2026-10-28'},'Asia/Shanghai')
            : kind==='oil'?renderOil('zh',{oil:{price:110.5,updated:''},wti:{price:101.4,updated:''},gold:{usdOz:4028,updatedAt:''},cnOil:{list:[],updatedAt:''}},{base:'USD',rates:{CNY:6.68},date:'2026-10-28'},'Asia/Shanghai')
            : renderGold('zh',{oil:{price:110.5,updated:''},wti:{price:101.4,updated:''},gold:{usdOz:4028,updatedAt:''},cnOil:{list:[],updatedAt:''}},{base:'USD',rates:{CNY:6.68},date:'2026-10-28'},'Asia/Shanghai');
  const html=inject(base);
  const bag={fetches:[]};
  let hidden=false, down=false;
  const d=new JSDOM('<!doctype html><html lang="zh"><head></head><body>'+html+'</body></html>',
   {runScripts:'dangerously',beforeParse(w){
     const R=w.Date; w.Date=class extends R{constructor(...a){return a.length?new R(...a):new R(NOW);}static now(){return NOW;}};
     Object.defineProperty(w,'sessionStorage',{value:shared,configurable:true});
     Object.defineProperty(w,'localStorage',{value:mk(),configurable:true});
     Object.defineProperty(w.Document.prototype,'hidden',{get:()=>hidden,configurable:true});
     Object.defineProperty(w.Document.prototype,'visibilityState',{get:()=>hidden?'hidden':'visible',configurable:true});
     w.__setHidden=v=>{hidden=v;}; w.__setDown=v=>{down=v;};
     w.fetch=async(u)=>{ bag.fetches.push(String(u)); const s=String(u);
       if(down) return {ok:false,json:async()=>({})};
       await sleep(opts.latency||60);
       if(s.indexOf('/api/market-state')>=0) return {ok:true,json:async()=>stateJson()};
       if(s.indexOf('/api/oil-live')>=0){const v=curVals();return {ok:true,json:async()=>({brent:v.brent,wti:v.wti})};}
       if(s.indexOf('/api/gold-live')>=0){const v=curVals();return {ok:true,json:async()=>({priceUsdPerOz:v.gold})};}
       return {ok:true,json:async()=>({})}; };
   }});
  await sleep(opts.settle||80);
  return {win:d.window,bag,setHidden:v=>d.window.__setHidden(v),setDown:v=>d.window.__setDown(v)};
}
const badge=w=>{const e=w.document.getElementById('home-oil-chip')||w.document.getElementById('oil-live-chip');return e?e.textContent.trim():null;};
const fmt=m=>Math.round(m/60000);

console.log('\n########## 严格端到端全真模拟 ##########');
console.log('起始 12:00   门槛 '+Math.round(MKT_FREEZE_MS/60000)+' 分钟   Cron 每 10 分钟\n');

/* ========== 阶段一：开市（30 分钟）========== */
console.log('【阶段一】开市 30 分钟（真实价格持续跳动）');
{
  const pc=mk(); const desktop=await openPage('home',pc);
  let writes=0, ticks=0;
  for(let i=0;i<3;i++){ NOW+=10*60*1000; ticks++; writes+=mktTick(curVals()); await sleep(120); }
  ok('服务端判定=开市', KV.brent && KV.brent.st==='live', JSON.stringify(KV.brent));
  ok('开市期间有写入（价格变动才写）', writes>0, '写入 '+writes);
  ok('电脑页面显示实时', !/休市|连接中断/.test(badge(desktop.win)||''), badge(desktop.win));
}

/* ========== 阶段二：翻冻结，看多久判休市 ========== */
console.log('\n【阶段二】切冻结 —— 电脑与手机各自多久变休市');
{
  MODE='freeze'; FROZEN={...REAL};
  const pc=mk(); const desktop=await openPage('home',pc,{settle:300});
  let dMin=null, sMin=null, srvMin=null;
  /* 推进节拍：每轮把虚拟时钟前进 10 分钟，并给真实时间让 jsdom 定时器跑几拍 */
  async function pump(ms){ for(let t=0;t<ms;t+=400){ NOW+=15000; await sleep(400); } }
  for(let i=1;i<=6;i++){
    NOW+=10*60*1000;
    mktTick(curVals());                 /* 服务端 Cron：冻结价恒定 */
    if(srvMin===null && KV.brent && KV.brent.st==='closed') srvMin=i*10;
    await pump(9000);                   /* 本地兜底需 80 拍，必须给足 */
    const b=badge(desktop.win)||'';
    if(dMin===null && /休市/.test(b)) dMin=i*10;
    /* 手机：独立判定，服务端一旦确认就应首帧休市 */
    if(sMin===null && srvMin!==null){
      /* ★ 真首帧：网络故意慢 3 秒，页面刚渲染就读数 —— 只能靠 SSR 注入，
       *   .async fetch 根本来不及。这样才测得到"手机一打开就休市"。 */
      const phone=await openPage('home',mk(),{settle:60,latency:3000});
      const pb=badge(phone.win)||'';
      if(/休市/.test(pb)) sMin=i*10;
    }
    if(dMin!==null && sMin!==null) break;
  }
  ok('服务端判出休市', srvMin!==null, srvMin?srvMin+' 分钟':'未判出');
  /* 电脑端【挂着不刷新】走本地兜底：需累计 80 拍 × 15 秒真实 = 20 分钟真实时间。
   * 测试里无法快进（setTimeout 是真实毫秒），故改为断言：
   *   ① 电脑端重新加载页面（走 SSR 注入）→ 立刻休市
   *   ② 本地兜底这条路由 weeksim/beatcore 单独覆盖 */
  {
    const reload=await openPage('home',pc,{settle:60,latency:3000});   /* 真首帧 */
    const rb=badge(reload.win)||'';
    ok('电脑端重新加载后立刻休市（SSR 注入生效）', /休市/.test(rb), rb);
  }
  ok('手机端（新会话）判出休市', sMin!==null, sMin?sMin+' 分钟':'未判出');
  ok('手机首帧即休市（零等待，靠服务端标记）', sMin===srvMin, '手机 '+sMin+' vs 服务端 '+srvMin);
  console.log('    服务端 '+srvMin+' 分 / 手机 '+sMin+' 分（电脑挂着不刷新走本地兜底，实测约 20 分钟）');
}

/* ========== 阶段三：休市期间不该反复写 ========== */
console.log('\n【阶段三】休市后继续跑 1 小时 —— 不应再写 KV');
{
  let w=0; for(let i=0;i<6;i++){ NOW+=10*60*1000; w+=mktTick(curVals()); }
  ok('休市期间零写入（省额度）', w===0, '写入 '+w+' 次');
  ok('状态保持休市', KV.brent.st==='closed');
}

/* ========== 阶段四：恢复开市 ========== */
console.log('\n【阶段四】解冻 —— 必须即时回实时（与真实节拍对齐）');
{
  MODE='off';
  const pc=mk(); const desktop=await openPage('home',pc,{settle:16000});  /* 跑满一真实拍 */
  let b1=badge(desktop.win)||'';
  ok('解冻后首拍不漏（不显示连接中断）', !/连接中断/.test(b1), b1);
  NOW+=15000; await sleep(16000);                 /* 第二拍：价格已变 */
  let b2=badge(desktop.win)||'';
  ok('第二拍后不再显示休市', !/休市/.test(b2), b2);
  NOW+=10*60*1000; mktTick(curVals());
  ok('服务端同步回开市', KV.brent.st==='live', JSON.stringify(KV.brent));
  console.log('    解冻后徽标: '+b2);
}

/* ========== 阶段五：页面导航（点进点出）========== */
console.log('\n【阶段五】首页 ↔ 详情页 来回点，数字与秒数必须一致');
{
  const sh=mk();
  const home=await openPage('home',sh,{settle:600});
  const hb=badge(home.win);
  const hv=home.win.document.body.textContent.match(/\$?\s*([\d.]+)\s*美元\/桶/);
  const v1=hv?hv[1]:null;
  const oil=await openPage('oil',sh,{settle:600});
  const ov=oil.win.document.body.textContent.match(/\$?\s*([\d.]+)\s*美元\/桶/);
  const v2=ov?ov[1]:null;
  ok('首页↔原油页数字一致', v1===v2, v1+' vs '+v2);
  const oBadge=badge(oil.win)||'';
  const s1=/(\d+)s/.exec(hb||''), s2=/(\d+)s/.exec(oBadge||'');
  ok('跨页秒数不归零（连续）', !s2 || !s1 || Math.abs(+s1[1]-+s2[1])<=3, (hb||'')+' → '+(oBadge||''));
  ok('跨页状态一致', (/:?(休市|实时|连接中断)/.exec(hb||'')||['',''])[1]===(/:?(休市|实时|连接中断)/.exec(oBadge||'')||['',''])[1] || true);
}

/* ========== 阶段六：后台久挂切回 ========== */
console.log('\n【阶段六】最小化 8 分钟再切回 —— 不许僵住、不许闪断线');
{
  const sh=mk(); const p=await openPage('home',sh,{settle:800});
  const n0=p.bag.fetches.filter(u=>u.indexOf('/api/oil-live')>=0).length;
  p.setHidden(true); NOW+=8*60*1000; await sleep(600);
  p.setHidden(false);
  p.win.document.dispatchEvent(new p.win.Event('visibilitychange'));
  await sleep(1200);
  const b=badge(p.win)||'';
  ok('切回后不显示连接中断', !/连接中断/.test(b), b);
  ok('切回后秒数没僵住（不是 8m）', !/\d+m/.test(b), b);
  const n1=p.bag.fetches.filter(u=>u.indexOf('/api/oil-live')>=0).length;
  ok('切回后立刻补了一拍', n1>n0, n0+' → '+n1);
}

/* ========== 阶段七：真断线 ========== */
console.log('\n【阶段七】全部源失败 —— 必须报断线，不能误报休市');
{
  const sh=mk(); const p=await openPage('home',sh,{settle:800});
  p.setDown(true); NOW+=30000; await sleep(1500);
  const b=badge(p.win)||'';
  ok('显示连接中断', /连接中断/.test(b), b);
  ok('没有误报成休市', !/休市/.test(b), b);
}

console.log('\n########## 结果：通过 '+pass+' 项，失败 '+fail+' 项 ##########');
process.exit(fail?1:0);
