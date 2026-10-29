/* ★★ 来回导航一致性测试：首页 ⇄ 详情页 反复进出，价格必须一致
 *
 * 用户场景：点布伦特进去→退出来→点WTI进去→退出来→点黄金进去→退出来
 *   来回往返时价格会跳，而且【不是刷新时刻】也跳。
 *
 * 根因：黄金前端一直【直连外部源】，完全不受 15 秒缓存约束 ——
 *   每次导航 = 新页面加载 = 前端直连现抓一次，市场在动 → 值每次都不同。
 *
 * 本测试让【外部源持续跳动】（每次调用返回不同值），以此区分：
 *   走缓存（已修） → 所有页面同一值        → 绿
 *   直连现抓（修复前）→ 每个页面不同值      → 红
 */
import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome } from './src/pages.js';
import { renderGold } from './src/pages.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };

/* 模拟"市场在动"：外部源每次被调用都返回不同值 */
let TICK = 0;
const MARKET = () => { TICK++; return 4030.00 + TICK * 0.01; };  /* 4030.01, .02, .03 ... */
/* 后端缓存值（15 秒内固定不变） */
const CACHED = 4030.00;

const M = {
  oil:{price:110.78,updated:'x'}, wti:{price:102.03,updated:'x'},
  gold:{usdOz:CACHED, updatedAt:new Date().toISOString()},
  cnOil:{list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString()},
};
const FX = { base:'USD', rates:{CNY:6.68,EUR:0.89,JPY:157.4}, date:'2026-10-28' };

/* 加载一个页面，返回其"价格文本" */
async function load(html, priceId){
  const d = new JSDOM('<!doctype html><html><body>'+html+'</body></html>',
   { runScripts:'dangerously', beforeParse(w){
     w.fetch = async (u) => {
       const s = String(u);
       /* 后端接口 → 返回缓存值（模拟 liveOverlay 15 秒缓存） */
       if (s.includes('/api/gold-live'))
         return { ok:true, status:200, headers:{get:()=>'application/json'},
                  json: async()=>({ priceUsdPerOz:CACHED, live:true, provider:'biquote' }) };
       if (s.includes('/api/oil-live'))
         return { ok:true, status:200, headers:{get:()=>'application/json'},
                  json: async()=>({ ok:true, brent:110.78, wti:102.03, provider:'biquote' }) };
       /* 外部源 → 每次不同（模拟市场跳动） */
       return { ok:true, status:200, headers:{get:()=>'application/json'},
                json: async()=>({ bid:MARKET()-0.01, ask:MARKET()+0.01, price:MARKET(),
                                  spot_usd_oz:MARKET(), data_state:'fresh' }) };
     };
     w.setInterval = ()=>1;   /* 不跑轮询，只看"页面加载后第一次取到的值" */
     w.setTimeout = ()=>1;
   }});
  await new Promise(r=>setTimeout(r,300));
  const el = d.window.document.getElementById(priceId);
  return el ? el.textContent.trim() : null;
}

console.log('==== 来回导航：首页 ⇄ 黄金详情页 ====');
console.log('   外部源持续跳动（4030.01/02/03...），后端缓存固定 4030.00\n');

/* 模拟用户往返：首页 → 详情页 → 首页 → 详情页 */
const v1 = await load(renderHome('zh', M, FX, 'Asia/Shanghai'), 'home-gold-price');
console.log('   第1次 首页黄金    :', v1);
const v2 = await load(renderGold('zh', M, FX, 'Asia/Shanghai'), 'g-usd');
console.log('   第2次 黄金详情页  :', v2);
const v3 = await load(renderHome('zh', M, FX, 'Asia/Shanghai'), 'home-gold-price');
console.log('   第3次 回到首页    :', v3);
const v4 = await load(renderGold('zh', M, FX, 'Asia/Shanghai'), 'g-usd');
console.log('   第4次 再进详情页  :', v4);

/* 断言：四次导航拿到的必须是同一个值 */
const all = [v1,v2,v3,v4].filter(Boolean);
ok('★★ 四次导航黄金价格完全一致（不再来回跳）',
   all.length===4 && new Set(all).size===1);
ok('★★ 取的是缓存值 4030.00，而非现抓的跳动值',
   all.every(v => v.indexOf('4,030.00')>=0 || v.indexOf('4030.00')>=0));
console.log('\n   外部源被调用 '+TICK+' 次（走缓存则前端不应直连）');

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
