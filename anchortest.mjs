/* ★★ 锚定测试：不启用 KV，用户来回导航时价格是否还跳
 *
 * 场景：市场【持续跳动】（每次 fetch 返回不同值）。
 *   用户点进详情页只用 1~2 秒 —— 若锚定生效，详情页沿用首页刚抓到的值，
 *   【不发请求】，因此不会拿到另一个实例的新价。
 *
 *   有锚定：首页 110.78 → 详情 110.78   ← 不动  ✓
 *   无锚定：首页 110.78 → 详情 110.79   ← 跳    ✗
 *
 * 关键：mock 必须让价持续变化，否则"不抓"和"抓了"返回同一个数，
 *       测试会假阳性通过。
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil, renderGold } from './src/pages.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };

/* 市场持续跳动 */
let TICK=0, FETCHES=0;
const nextPrice=(base)=>{ TICK++; return base + TICK*0.01; };

const M = {
  oil:{price:110.78,updated:'x'}, wti:{price:102.03,updated:'x'},
  gold:{usdOz:4030.00, updatedAt:new Date().toISOString()},
  cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()},
};
const FX = { base:'USD', rates:{CNY:6.68,EUR:0.89,JPY:157.4}, date:'2026-10-28' };

/* 共享的 sessionStorage —— 模拟同一个浏览器标签里跨页面导航 */
function makeStorage(){
  const m = new Map();
  return {
    getItem:(k)=> m.has(k)?m.get(k):null,
    setItem:(k,v)=>{ m.set(k,String(v)); },
    removeItem:(k)=>{ m.delete(k); },
    clear:()=>{ m.clear(); },
    key:(i)=> Array.from(m.keys())[i] ?? null,
    get length(){ return m.size; },
  };
}

async function load(html, priceId, shared){
  const d = new JSDOM('<!doctype html><html><body>'+html+'</body></html>',
    { runScripts:'dangerously', beforeParse(w){
      Object.defineProperty(w,'sessionStorage',{ value:shared, configurable:true });
      w.fetch = async (u) => {
        const s=String(u); FETCHES++;
        if (s.includes('/api/oil-live'))
          return { ok:true, status:200, headers:{get:()=>'application/json'},
                   json: async()=>({ ok:true, brent:nextPrice(110.78), wti:nextPrice(102.03), provider:'biquote' }) };
        if (s.includes('/api/gold-live'))
          return { ok:true, status:200, headers:{get:()=>'application/json'},
                   json: async()=>({ priceUsdPerOz:nextPrice(4030.00), live:true }) };
        return { ok:true, status:200, headers:{get:()=>'application/json'},
                 json: async()=>({ bid:nextPrice(4030.00)-0.01, ask:nextPrice(4030.00)+0.01,
                                  price:nextPrice(4030.00), spot_usd_oz:nextPrice(4030.00), data_state:'fresh' }) };
      };
      w.setInterval = ()=>1;
    }});
  await new Promise(r=>setTimeout(r,400));
  const el = d.window.document.getElementById(priceId);
  return el ? el.textContent.trim() : null;
}

const shared = makeStorage();

console.log('==== 场景1：首页 → 布伦特详情页（间隔约 1 秒）====\n');
const h1 = await load(renderHome('zh',M,FX,'Asia/Shanghai'), 'home-oil-price', shared);
console.log('   首页布伦特      :', h1);
const fAfterHome = FETCHES;
await new Promise(r=>setTimeout(r,1000));   /* 用户看一眼再点，约 1 秒 */
const d1 = await load(renderOil('zh',M,'Asia/Shanghai') , 'oil-live-price', shared);
console.log('   布伦特详情页    :', d1, '（本次新增请求 '+(FETCHES-fAfterHome)+' 次）');
ok('★★ 首页→详情页 布伦特价格一致（不再跳）', h1 === d1 && h1 != null);
ok('★★ 详情页命中锚点，未发新请求', FETCHES === fAfterHome);

console.log('\n==== 场景2：详情页 → 回到首页（再往返一次）====\n');
const f2 = FETCHES;
const h2 = await load(renderHome('zh',M,FX,'Asia/Shanghai'), 'home-oil-price', shared);
console.log('   回到首页        :', h2, '（本次新增请求 '+(FETCHES-f2)+' 次）');
ok('★★ 往返两次后价格仍然一致', h2 === h1);

console.log('\n==== 场景3：黄金 首页 → 黄金详情页 ====\n');
const g1 = await load(renderHome('zh',M,FX,'Asia/Shanghai'), 'home-gold-price', shared);
const f3 = FETCHES;
const g2 = await load(renderGold('zh',M,FX,'Asia/Shanghai'), 'g-usd', shared);
console.log('   首页黄金        :', g1);
console.log('   黄金详情页      :', g2, '（本次新增请求 '+(FETCHES-f3)+' 次）');
ok('★★ 黄金 首页→详情页 一致', g1 === g2 && g1 != null);

console.log('\n==== 场景4：锚点过期后应正常抓新值（不能把数据变旧）====\n');
shared.removeItem('ps_anchor_brent');
const f4 = FETCHES;
const d3 = await load(renderOil('zh',M,'Asia/Shanghai'), 'oil-live-price', shared);
console.log('   清掉锚点后      :', d3, '（本次新增请求 '+(FETCHES-f4)+' 次）');
ok('★★ 锚点失效时会重新抓取（不会一直显示旧值）', FETCHES > f4);
ok('★★ 重新抓到的值与之前不同（说明市场在动，mock 有效）', d3 !== h1);

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
