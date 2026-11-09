/* ★ 并发写入实测：访问量一大，2号会不会把 KV 写爆？
 *
 * 场景A：真实模型 —— CF 同时只有【有限个实例】(如 3 个)，
 *        大量并发请求被分摊到这几个实例上。
 *        → 验证单飞闸门（同一实例内并发共享一次抓取）
 *
 * 场景B：极端模型 —— 每个并发都是独立实例（最坏情况）
 *        → 验证写入前二次确认闸门（跨实例撞车也只落盘一次）
 *
 * 修复前实测（已归档记录）：50 并发 = 50 次 KV 写入 → 访问量大必爆额度。
 */
import worker from './src/index.js';

const FX = { base:'USD', rates:{CNY:6.68,EUR:0.89,JPY:157.4}, date:'2026-10-28' };
const UP = {
  '油': { price:101.53, updatedLocal:'x' }, wti:{ price:99.91, updatedLocal:'x' },
  '金子': { priceUsdPerOz:4046.6, updatedAt:new Date().toISOString() },
  cn_oil:{ list:[{'省':'北京',p92:8.66,p95:9.22,p98:10.10,p0:8.30}],updatedAt:new Date().toISOString() },
};
let SRC_CALLS = 0;
globalThis.fetch = async (u) => {
  const s = (u && u.url) ? u.url : String(u);
  if (s.includes('ss.wwok.eu.cc')) return new Response(JSON.stringify(UP), {status:200,headers:{'content-type':'application/json'}});
  if (s.includes('er-api')||s.includes('frankfurter')) return new Response(JSON.stringify({...FX,result:'success',rates:FX.rates}),{status:200,headers:{'content-type':'application/json'}});
  if (s.includes('biquote.io')) {
    SRC_CALLS++;
    await new Promise(r=>setTimeout(r,300));   /* 模拟真实网络耗时 —— 这就是并发撞车窗口 */
    return new Response(JSON.stringify({bid:110.77,ask:110.79}),{status:200,headers:{'content-type':'application/json'}});
  }
  return new Response('{}',{status:200,headers:{'content-type':'application/json'}});
};

function makeKV(counter){
  const store=new Map();
  return { async get(k,o){ const r=store.get(k); if(!r)return null;
      if(r.exp&&Date.now()>r.exp){store.delete(k);return null;} return JSON.parse(r.v); },
    async put(k,v,o){ counter.puts++; store.set(k,{v,exp:o&&o.expirationTtl?Date.now()+o.expirationTtl*1000:0}); } };
}
const call = (mod, kv) => mod.default.fetch(new Request('https://you.piccalc.com/zh/'),
  { PRICESCOPE_CACHE: kv }, { waitUntil(){}, passThroughOnException(){} }).then(r=>r.text());

let bad = 0;

/* ---------- 场景A：有限实例 + 高并发（真实模型）---------- */
console.log('==== 场景A：3 个实例，N 个并发请求（真实模型）====');
console.log('  （同一实例内的并发应共享一次抓取）\n');
{
  const INST = 3;
  const mods = [];
  for (let i=0;i<INST;i++) mods.push(await import('./src/index.js?real='+i));
  for (const n of [3, 30, 100]) {
    const counter = { puts:0 }; const kv = makeKV(counter);
    SRC_CALLS = 0;
    await Promise.all(Array.from({length:n}, (_,i) => call(mods[i % INST], kv)));
    const ok1 = counter.puts <= INST;
    if (!ok1) bad++;
    console.log(`  ${String(n).padStart(3)} 个请求 → KV 写入 ${String(counter.puts).padStart(2)} 次，外部源 ${String(SRC_CALLS).padStart(3)} 次 ${ok1?'':'✗'}`);
  }
  console.log('  期望：写入次数 ≤ 实例数，外部源调用 ≈ 实例数（不再随请求数线性增长）');
}

/* ---------- 场景B：每并发一个实例（最坏情况）---------- */
console.log('\n==== 场景B：每并发一个独立实例（最坏情况）====');
console.log('  （跨实例撞车，靠"写入前二次确认"压到 1 次）\n');
for (const n of [1, 20, 50]) {
  const mods = [];
  for (let i=0;i<n;i++) mods.push(await import('./src/index.js?burst='+n+'_'+i));
  const counter = { puts:0 }; const kv = makeKV(counter);
  SRC_CALLS = 0;
  await Promise.all(mods.map(m => call(m, kv)));
  const ok1 = counter.puts === 1;
  if (!ok1) bad++;
  console.log(`  ${String(n).padStart(2)} 个实例 → KV 写入 ${String(counter.puts).padStart(2)} 次 ${ok1?'':'✗ 多写了！'}`);
}
console.log('  期望：无论多少实例，KV 只落盘 1 次（这才是额度安全的）');

console.log(bad ? '\n  ✗ 有 '+bad+' 项不达标' : '\n  ✓ 全部达标：写入次数与访问量解耦');
process.exit(bad?1:0);
