/* Sticky Provider 测试：验证"首页 / 详情页 / 连续刷新"拿到同一个源的值 */
import fs from 'fs';
let pass=0, fail=0;
const ok=(n,c)=>{ c?pass++:(fail++,console.log('  NG  ✗ '+n)); };

const oil = fs.readFileSync('./src/oilLive.js','utf8');
const gold = fs.readFileSync('./src/goldLive.js','utf8');

console.log('==== Sticky Provider（源粘滞）====');
ok('原油已加 stickyProvider 变量', /let stickyProvider = null;/.test(oil));
ok('原油：成功时记住 provider', /stickyProvider = p\.id;/.test(oil));
ok('原油：下次优先复用上次成功的源',
   /ids = \[stickyProvider, \.\.\.ids\.filter\(x => x !== stickyProvider\)\];/.test(oil));
ok('黄金已加 stickyProvider 变量', /let stickyProvider = null;/.test(gold));
ok('黄金：成功时记住 provider', /stickyProvider = p\.id;/.test(gold));
ok('黄金：下次优先复用上次成功的源',
   /ids = \[stickyProvider, \.\.\.ids\.filter\(x => x !== stickyProvider\)\];/.test(gold));

/* 真实执行：模拟"第一次 biquote 成功 → 后续即使 biquote 偶发失败也先试它" */
{
  const src = oil;
  const i = src.indexOf('export async function getOilLive');
  let depth=0, j=src.indexOf('{', i), k=j;
  for(; k<src.length; k++){ if(src[k]==='{')depth++; else if(src[k]==='}'){depth--; if(depth===0)break;} }
  let body = src.slice(i, k+1);
  body = body.replace('export async function getOilLive','async function getOilLive');

  const mkProv = (behaviour) => {
    const fn = new Function('OIL_PROVIDERS','stickyProvider','return ' + body +
      '; return function(){ stickyProvider = arguments[1]; return getOilLive(arguments[0]); }');
    const g = fn(behaviour, null);
    let cur = null;
    return async (o) => { const r = await g(o, cur); if (r.provider) cur = r.provider; return r; };
  };
  // 源：biquote 成功一次后"变慢但仍成功"；yahoo 总是成功但价不同
  let biquoteFail = false;
  const provs = [
    { id:'biquote', label:'b', fn: async()=>{ if(biquoteFail) throw new Error('超时');
        return {brent:110.78, wti:102.03}; } },
    { id:'yahoo', label:'y', fn: async()=> ({brent:110.85, wti:102.02}) },
  ];
  const get = mkProv(provs);

  const r1 = await get();
  ok('★ 首次取到 biquote（110.78）', Math.abs(r1.brent-110.78)<1e-9 && r1.provider==='biquote');
  const r2 = await get();
  ok('★ 连续第二次仍取 biquote（值不变，不再漂移）', Math.abs(r2.brent-110.78)<1e-9 && r2.provider==='biquote');
  // biquote 挂了 → 自动切 yahoo
  biquoteFail = true;
  const r3 = await get();
  ok('★ biquote 失败时自动切换到 yahoo', r3.provider==='yahoo');
  // biquote 恢复 → 因为 sticky 现在是 yahoo，继续用 yahoo（稳定优先）
  biquoteFail = false;
  const r4 = await get();
  ok('★ 恢复后继续用当前源 yahoo（不来回跳，保持稳定）', r4.provider==='yahoo');
  const r5 = await get();
  ok('★ 连续两次值完全一致（首页/详情页不会再出现 102.03 vs 102.02）',
     r4.brent===r5.brent && r4.wti===r5.wti);
}

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');
process.exit(fail?1:0);
