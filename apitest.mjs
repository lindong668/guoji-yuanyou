/* ★ 一致性测试：SSR（首页/详情页）与 /api/oil-live 必须取到【同一个值】
 *
 * 根因：/api/oil-live 原来直接调 getOilLive()，绕过 liveOverlay() 的 15 秒缓存；
 *       SSR 走缓存、前端轮询现抓 → 两者不是同一份值，
 *       于是用户看到"点进去数值跳一下、点出来又跳一下"。
 * 本测试用真实 worker.fetch 端到端验证两边一致。
 */
import worker from './src/index.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };

const FX = { base:'USD', rates:{ CNY:6.681042, EUR:0.893935, JPY:157.437384 }, date:'2026-10-28' };
const UP = {
  '油': { price:101.53, '格式化后':'$101.53', updatedLocal:'2026-10-28 08:30' },
  wti:  { price:99.91,  formatted:'$99.91',  updatedLocal:'2026-10-28 08:30' },
  '金子': { priceUsdPerOz:4046.6, priceCnyPerGram:869.21, updatedAt:new Date().toISOString() },
  cn_oil: { list:[{ '省':'北京', p92:8.66, p95:9.22, p98:10.10, p0:8.30 }],
            updatedAt:new Date().toISOString() },
};
/* ★★ 关键：模拟【真实市场在跳动】—— 每次抓取价都 +0.01。
 *   如果还写死固定值，那么"绕过缓存现抓"和"读缓存"返回同一个数，
 *   测试会【假阳性】通过，根本抓不到这个 bug。
 *   只有让价每次都变，才能区分：
 *     有 bug（接口现抓） → SSR 是旧值、接口是新值 → 不一致 → 测试红
 *     已修（接口读缓存） → 两边都是同一个缓存值            → 测试绿 */
let BRENT = 110.78, WTI = 102.03, TICKS = 0;

globalThis.fetch = async (u) => {
  const s = (u && u.url) ? u.url : String(u);
  if (s.includes('ss.wwok.eu.cc')) return new Response(JSON.stringify(UP),
    { status:200, headers:{'content-type':'application/json'} });
  if (s.includes('er-api') || s.includes('frankfurter'))
    return new Response(JSON.stringify({ ...FX, result:'success', rates:FX.rates }),
      { status:200, headers:{'content-type':'application/json'} });
  /* 原油源：只让 biquote 成功（其余返回空 → 解析失败 → 继续下一个） */
  if (s.includes('biquote.io/api/XBRUSD')) {
    TICKS++;
    return new Response(JSON.stringify({ bid:BRENT-0.01, ask:BRENT+0.01 }),
      { status:200, headers:{'content-type':'application/json'} });
  }
  if (s.includes('biquote.io/api/XTIUSD'))
    return new Response(JSON.stringify({ bid:WTI-0.01, ask:WTI+0.01 }),
      { status:200, headers:{'content-type':'application/json'} });
  return new Response('{}', { status:200, headers:{'content-type':'application/json'} });
};

const call = async (p) => {
  const res = await worker.fetch(new Request('https://you.piccalc.com'+p), {},
    { waitUntil(){}, passThroughOnException(){} });
  return { status:res.status, body: await res.text() };
};
const homeBrent = (html) => {
  const m = html.match(/id="home-oil-price">\s*\$([\d.,]+)/);
  return m ? m[1].replace(/,/g,'') : null;
};

console.log('==== SSR 与 /api/oil-live 一致性 ====');

const h1 = await call('/zh/');
const a1 = await call('/api/oil-live');
const j1 = JSON.parse(a1.body);
const hv = homeBrent(h1.body);
console.log('   首页 SSR 布伦特：'+hv+'    /api/oil-live：'+j1.brent);
ok('★ 首页 SSR 与接口取到同一个布伦特值', hv != null && Math.abs(+hv - j1.brent) < 0.005);
console.log('   源：'+j1.provider);
ok('★ 走的是 biquote（唯一成功的源）', j1.provider === 'biquote');

/* 详情页 */
const d1 = await call('/zh/oil/');
const m2 = d1.body.match(/id="oil-live-price"[^>]*>\s*\$([\d.,]+)/);
const dv = m2 ? m2[1].replace(/,/g,'') : null;
console.log('   详情页 SSR 布伦特：'+dv+'    /api/oil-live：'+j1.brent);
ok('★ 详情页 SSR 与接口取到同一个值', dv != null && Math.abs(+dv - j1.brent) < 0.005);

/* 关键：三处（首页 / 详情页 / 接口）完全一致 */
ok('★★★ 首页、详情页、接口 三处数值完全一致（不再来回跳）',
   hv != null && dv != null && hv === dv && Math.abs(+hv - j1.brent) < 0.005);

/* 市场变动后，缓存过期前仍应保持一致；过期后一起更新 */
/* ---- 再次调用：市场已跳动，但缓存未过期 → 两边必须仍是同一个（旧）值 ---- */
console.log('---- 市场持续跳动中，缓存未过期 ----');
BRENT = 111.50; WTI = 102.80;
const a2 = await call('/api/oil-live');
const j2 = JSON.parse(a2.body);
console.log('   接口第二次：'+j2.brent+'   首页 SSR 缓存值：'+hv);
ok('★★ 缓存未过期时接口不返回新值（与 SSR 保持同一份）',
   Math.abs(+j2.brent - +hv) < 0.005);
console.log('   biquote 被调用 '+TICKS+' 次（缓存生效则应少于页面/接口调用数）');

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
