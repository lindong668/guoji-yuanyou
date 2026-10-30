/* oilsim.mjs —— 原油链路【多轮真实仿真】
 *
 * 目的：不再靠肉眼看代码猜，而是用模拟网络跑满几十拍，
 *       统计"布伦特/WTI 到底几拍才更新一次"，复现用户看到的现象。
 *
 * 全程调用【真代码】：getOilLive / applyStaleKeep / fillFromFallback
 * 只有网络（fetch）和 3 号兜底（oilFallback）是模拟的。
 */
import { getOilLive, applyStaleKeep, fillFromFallback, STALE_KEEP_MS } from './src/oilLive.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- 模拟网络 ---------- */
function installNet({ perSrc, brentFail, wtiFail = 0 }) {
  let tick = 0;
  const st = { tick: 0 };
  globalThis.fetch = async (u) => {
    const url = String(u);
    const ok = (o) => ({ ok: true, status: 200, json: async () => o, text: async () => '' });
    const bad = { ok: false, status: 502, json: async () => ({}), text: async () => '' };
    const t = st.tick;
    const brentReal = +(111.90 + Math.sin(t / 3) * 0.35 + t * 0.004).toFixed(2);
    const wtiReal = +(103.05 + Math.cos(t / 2) * 0.25 + t * 0.003).toFixed(2);
    const isB = /XBRUSD|BZ=F|cb\.f|brent|BRENT/i.test(url);
    const isW = /XTIUSD|CL=F|cl\.f|wti|WTI/i.test(url);
    await sleep(perSrc + (isB ? 300 : 0));
    if (isB && Math.random() < brentFail) return bad;
    if (isW && Math.random() < wtiFail) return bad;
    if (url.includes('biquote.io'))
      return ok({ bid: (isB ? brentReal : wtiReal) - 0.02, ask: (isB ? brentReal : wtiReal) + 0.02 });
    if (url.includes('finance.yahoo'))
      return ok({ chart: { result: [{ meta: { regularMarketPrice: isB ? brentReal : wtiReal } }] } });
    if (url.includes('stooq'))
      return { ok: true, status: 200, json: async () => ({}), text: async () => 'Symbol,Date,Time,Open,High,Low,Close,Volume\ncb.f,2026-01-01,00:00:00,1,1,1,' + (isB ? brentReal : wtiReal) + ',0\n' };
    return bad;
  };
  return st;
}

/* ---------- 一拍 = 前端每 15 秒问一次 ---------- */
async function oneTick(cache, budget, oilFallback) {
  const t0 = Date.now();
  const own = await Promise.race([
    getOilLive(),
    sleep(budget).then(() => null),
  ]) || { brent: 0, wti: 0 };
  const ms = Date.now() - t0;

  let oilVal = (own.brent || own.wti) ? own : cache.oil;
  if (!oilVal || (!oilVal.brent && !oilVal.wti)) oilVal = { brent: 0, wti: 0 };
  oilVal = applyStaleKeep(oilVal, cache.oil);                 // 真代码
  if (oilVal && (!oilVal.brent || !oilVal.wti)) {             // 真代码
    oilVal = fillFromFallback(oilVal, oilFallback ? await oilFallback() : null);
  }
  cache.oil = oilVal;
  return { oilVal, ms, over: ms >= budget - 60, provider: own.provider };
}

let pass = 0, fail = 0;
const chk = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };

/* ============ 场景 1：慢网 + 布伦特偶发抽风 ============ */
console.log('\n【场景1】跨境慢网 2500ms/源，布伦特端点 50% 抽风，预算 8000ms —— 跑 20 拍');
{
  const st = installNet({ perSrc: 2500, brentFail: 0.5 });
  const cache = { oil: null };
  let prevB = null, prevW = null, bChg = 0, wChg = 0, over = 0, zeroB = 0, maxMs = 0;
  for (st.tick = 1; st.tick <= 20; st.tick++) {
    const { oilVal, ms, over: ov } = await oneTick(cache, 8000, null);
    const b = oilVal.brent, w = oilVal.wti;
    if (!b) zeroB++;
    if (ov) over++;
    if (ms > maxMs) maxMs = ms;
    if (prevB != null && Math.abs(b - prevB) > 1e-9) bChg++;
    if (prevW != null && Math.abs(w - prevW) > 1e-9) wChg++;
    prevB = b; prevW = w;
    await sleep(60);
  }
  console.log(`  结果：超预算 ${over}/20，布伦特取不到 ${zeroB}/20，最慢 ${maxMs}ms`);
  console.log(`        布伦特变化 ${bChg}/19 拍，WTI 变化 ${wChg}/19 拍`);
  chk(over === 0, `并发后不再撞预算（串行时耗时是累加的，慢网必超）`);
  chk(zeroB <= 2, `布伦特几乎每拍都能拿到（取不到 ${zeroB} 拍）`);
  chk(bChg >= 15, `布伦特 20 拍里至少 15 拍在变（实际 ${bChg}）`);
  chk(wChg >= 17, `WTI 至少 17 拍在变（实际 ${wChg}）`);
}

/* ============ 场景 2：布伦特全挂 —— 不得锁死 ============ */
console.log('\n【场景2a】布伦特全挂，且【没有】3 号兜底 —— 旧值必须过期作废');
{
  const st = installNet({ perSrc: 200, brentFail: 1.0 });
  const cache = { oil: { brent: 111.97, wti: 103.10, bAt: Date.now(), wAt: Date.now() } };
  const seq = [];
  for (st.tick = 1; st.tick <= 6; st.tick++) {
    const { oilVal } = await oneTick(cache, 8000, null);   // 无兜底
    seq.push(oilVal.brent);
    if (st.tick === 3) cache.oil.bAt = Date.now() - 130000;   // 时间流逝 130 秒（> 2 分钟时效）
    await sleep(50);
  }
  console.log(`  布伦特序列：${seq.join(' → ')}`);
  chk(seq[0] === 111.97, '2 分钟内沿用旧值，页面不闪断');
  chk(seq[5] === 0, '超过 2 分钟 → 旧值作废（这是"不再锁死"的关键）');
}

console.log('\n【场景2b】布伦特全挂，有 3 号兜底 —— 作废后应由 3 号接上');
{
  const st = installNet({ perSrc: 200, brentFail: 1.0 });
  const cache = { oil: { brent: 111.97, wti: 103.10, bAt: Date.now(), wAt: Date.now() } };
  const fb = async () => ({ brent: 112.60, wti: 103.40 });
  const seq = [];
  for (st.tick = 1; st.tick <= 6; st.tick++) {
    const { oilVal } = await oneTick(cache, 8000, fb);
    seq.push(oilVal.brent);
    if (st.tick === 3) cache.oil.bAt = Date.now() - 130000;
    await sleep(50);
  }
  console.log(`  布伦特序列：${seq.join(' → ')}`);
  chk(seq[0] === 111.97, '2 分钟内沿用旧值');
  chk(seq[5] === 112.60, '作废后由 3 号兜底接上，不显示 0/中断');
}

/* ============ 场景 3：粘滞稳定 —— 同价不跳 ============ */
console.log('\n【场景3】源都正常时，连续拍应取同一口径，价格不能来回跳');
{
  const st = installNet({ perSrc: 300, brentFail: 0 });
  const cache = { oil: null };
  const seen = [];
  for (st.tick = 1; st.tick <= 5; st.tick++) {
    const { oilVal, provider } = await oneTick(cache, 8000, null);
    seen.push(provider);
    await sleep(40);
  }
  console.log(`  各拍 provider：${seen.join(' | ')}`);
  chk(new Set(seen.slice(1)).size === 1, '第二拍起稳定复用同一个源（粘滞生效）');
}

console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);
