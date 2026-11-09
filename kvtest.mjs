/* ★ 共享缓存（KV）测试
 * 目标：模拟 CF 多实例并行 —— 两个"实例"各自首次请求，
 *       必须拿到【同一个值】，而不是各自抓一次得到不同值。
 *
 * 为什么必须测：模块级缓存每个实例一份，A 实例抓到 110.78、
 *   B 实例抓到 110.85（市场在动），用户来回导航就会看到跳价。
 *   KV 让所有实例读同一份 → 彻底消除。
 */
import worker from './src/index.js';

let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };

const FX = { base:'USD', rates:{CNY:6.68,EUR:0.89,JPY:157.4}, date:'2026-10-28' };
const UP = {
  '油': { price:101.53, updatedLocal:'2026-10-28 08:30' },
  wti:  { price:99.91,  updatedLocal:'2026-10-28 08:30' },
  '金子': { priceUsdPerOz:4046.6, updatedAt:new Date().toISOString() },
  cn_oil:{ list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString() },
};
/* ★ 市场持续跳动：每次抓取价都不同 */
let TICK = 0, FETCHES = 0;
globalThis.fetch = async (u) => {
  const s = (u && u.url) ? u.url : String(u);
  if (s.includes('ss.wwok.eu.cc')) return new Response(JSON.stringify(UP),
    { status:200, headers:{'content-type':'application/json'} });
  if (s.includes('er-api') || s.includes('frankfurter'))
    return new Response(JSON.stringify({...FX, result:'success', rates:FX.rates}),
      { status:200, headers:{'content-type':'application/json'} });
  if (s.includes('biquote.io')) {
    FETCHES++; TICK++;
    const b = 110.78 + TICK*0.01;
    return new Response(JSON.stringify({ bid:b-0.01, ask:b+0.01 }),
      { status:200, headers:{'content-type':'application/json'} });
  }
  return new Response('{}', { status:200, headers:{'content-type':'application/json'} });
};

/* 简易 KV 模拟（内存版，模拟所有实例共享） */
function makeKV(){
  const store = new Map();
  return {
    async get(k, o){
      const rec = store.get(k);
      if (!rec) return null;
      if (rec.exp && Date.now() > rec.exp) { store.delete(k); return null; }
      return JSON.parse(rec.v);
    },
    async put(k, v, o){ store.set(k, { v, exp: o && o.expirationTtl ? Date.now() + o.expirationTtl*1000 : 0 }); },
  };
}

const call = async (p, env) => {
  const res = await worker.fetch(new Request('https://you.piccalc.com'+p), env || {},
    { waitUntil(){}, passThroughOnException(){} });
  return { status:res.status, body: await res.text() };
};
const homeBrent = (html) => {
  const m = html.match(/id="home-oil-price">\s*\$([\d.,]+)/);
  return m ? m[1].replace(/,/g,'') : null;
};

/* ---------- 场景A：没有 KV（降级），两个实例各自抓 ---------- */
console.log('==== 场景A：未启用 KV（降级为模块级缓存）====');
{
  /* 直接 import 的模块只有一个实例，用两次不同 env 无法模拟多实例。
     这里改为验证"降级不报错"——即不传 KV 时功能完全正常。 */
  const r = await call('/api/oil-live');
  const j = JSON.parse(r.body);
  console.log('   接口返回 brent='+j.brent+'  provider='+j.provider);
  ok('★ 未绑定 KV 时接口正常工作（优雅降级）', !!j.brent && j.provider === 'biquote');
  const h = await call('/zh/');
  console.log('   首页 SSR brent='+homeBrent(h.body));
  ok('★ 未绑定 KV 时 SSR 正常工作', homeBrent(h.body) != null);
}

/* ---------- 场景B：启用 KV —— 所有实例共享同一份 ---------- */
console.log('\n==== 场景B：启用 KV（共享缓存）====');
{
  /* 重新 import 拿到全新模块状态，模拟"另一个 Worker 实例" */
  const kv = makeKV();
  const mod1 = await import('./src/index.js?v=1');
  const mod2 = await import('./src/index.js?v=2');
  const doCall = async (mod, p) => {
    const res = await mod.default.fetch(new Request('https://you.piccalc.com'+p),
      { PRICESCOPE_CACHE: kv }, { waitUntil(){}, passThroughOnException(){} });
    return await res.text();
  };
  TICK = 0; FETCHES = 0;
  const a1 = await doCall(mod1, '/zh/');
  const v1 = homeBrent(a1);
  const f1 = FETCHES;
  /* 立刻让"实例2"请求 —— 若共享生效，它应复用实例1的缓存，不再抓 */
  const a2 = await doCall(mod2, '/zh/');
  const v2 = homeBrent(a2);
  console.log('   实例1 brent='+v1+'   实例2 brent='+v2);
  console.log('   外部源被调用 '+FETCHES+' 次（共享生效则第二次应为 0 次新增）');
  ok('★★★ 两个"实例"拿到完全相同的布伦特值（来回导航不跳价）', v1 === v2);
  ok('★★ 第二个实例复用了共享缓存，未重复抓取', FETCHES === f1);
}

/* ---------- 场景C：额度账（写入频率必须可控）---------- */
console.log('\n==== 场景C：KV 写入额度账 ====');
{
  const src = (await import('fs')).readFileSync('./src/index.js','utf8');
  const m = src.match(/const KV_SHARE_TTL = (\d+);/);
  const ttl = m ? +m[1] : 15000;
  const perDay = Math.round(86400*1000/ttl);
  console.log('   共享周期 '+(ttl/1000)+' 秒 → '+perDay+' 次写入/天');
  console.log('   免费额度 1,000 次/天（按账号算，与 3 号共用）');
  ok('★ 2 号写入次数控制在额度内（< 1000/天）', perDay < 1000);
  ok('★ 已不再用 15 秒写 KV（那会是 5760 次/天，必爆）', ttl > 15000);
}

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
