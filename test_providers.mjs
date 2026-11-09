/* ★ 为什么要有这个测试：
 * 沙盒对外网全封，/probe 在沙盒里 6 个源全部失败（都是网络层的 403），
 * 那样只能证明「错误处理没问题」，证明不了「解析逻辑对不对」。
 * 所以这里用各源的真实响应格式做模拟数据，单独验解析函数：
 *   → 保证部署到 Vercel（出口干净）后不会因为解析写错而白跑一趟。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const REAL = globalThis.fetch;

/* 场景开关：让同一套 mock 能模拟"3号返回旧值""xaus 标记 stale"等状态 */
const STAGE = { site3: 'cn', xaus: 'fresh', goldData: false };

const MOCKS = {
  biquote: {
    // 买卖中值要正好等于 99.91 / 101.53，与其它源对齐便于断言
    XTIUSD: { bid: 99.89, ask: 99.93, mid: 99.91 },
    XBRUSD: { bid: 101.51, ask: 101.55, mid: 101.53 },
  },
  yahoo: {
    'CL=F': { chart: { result: [{ meta: { regularMarketPrice: 99.91 } }] } },
    'BZ=F': { chart: { result: [{ meta: { regularMarketPrice: 101.53 } }] } },
  },
  stooq: {
    'cb.f': 'Symbol,Date,Time,Open,High,Low,Close,Volume\ncb.f,2026-10-28,10:05:00,101.0,102.0,100.5,101.53,12345\n',
    'cl.f': 'Symbol,Date,Time,Open,High,Low,Close,Volume\ncl.f,2026-10-28,10:05:00,99.5,100.0,99.2,99.91,23456\n',
  },
  oilwatch: {
    brent: { price: 101.53 },
    wti: { price: 99.91 },
  },
  opademo: {
    prices: { data: { prices: [
      { code: 'BRENT_CRUDE_USD', price: 101.53 },
      { code: 'WTI_USD', price: 99.91 },
    ] } },
  },
  // 3 号后端：真实结构用中文字段名，这里同时备一份英文变体
  site3CN: { '油': { price: 101.53 }, wti: { price: 99.91 }, gold: { priceUsdPerOz: 4038.62 } },
  site3EN: { oil: { price: 101.53 }, wti: { price: 99.91 }, gold: { priceUsdPerOz: 4038.62 } },
  site3Stale: { oil: { price: 101.53 }, wti: { price: 99.91 }, stale: true, asOf: '2026-10-26T00:00:00Z' },
  gold: {
    site3live: { priceUsdPerOz: 4038.62, live: true },
    site3data: { gold: { priceUsdPerOz: 4038.62 } },
    biquote: { bid: 4038.50, ask: 4038.74 },
    xausFresh: { spot_usd_oz: 4038.62, data_state: 'fresh' },
    xausStale: { spot_usd_oz: 4038.62, data_state: 'stale' },
    goldapi: { price: 4038.62 },
    yahoo: { chart: { result: [{ meta: { regularMarketPrice: 4038.62 } }] } },
    stooq: 'Symbol,Date,Time,Open,High,Low,Close,Volume\nxauusd,2026-10-28,10:05:00,4030,4040,4025,4038.62,999\n',
  },
};

const MOCK_FETCH = async (u) => {
  const s = (u && u.url) ? u.url : String(u);
  if (s.includes('ss.wwok.eu.cc')) {
    // 3 号后端：按 URL 末尾区分端点
    let body = MOCKS.site3CN;
    if (STAGE.site3 === 'stale') body = MOCKS.site3Stale;
    if (STAGE.site3 === 'en') body = MOCKS.site3EN;
    if (s.includes('/gold/live')) body = MOCKS.gold.site3live;
    if (s.includes('/data') && STAGE.goldData) body = MOCKS.gold.site3data;
    return new Response(JSON.stringify(body), { status: 200 });
  }
  if (s.includes('biquote.io')) {
    const sym = s.split('/').pop();
    return new Response(JSON.stringify(MOCKS.biquote[sym] || MOCKS.gold.biquote), { status: 200 });
  }
  if (s.includes('xaus.com')) {
    const body = STAGE.xaus === 'stale' ? MOCKS.gold.xausStale : MOCKS.gold.xausFresh;
    return new Response(JSON.stringify(body), { status: 200 });
  }
  if (s.includes('gold-api.com')) {
    return new Response(JSON.stringify(MOCKS.gold.goldapi), { status: 200 });
  }
  if (s.includes('stooq') && s.includes('xauusd')) {
    return new Response(MOCKS.gold.stooq, { status: 200 });
  }
  if (s.includes('query2.finance.yahoo.com')) {
    const sym = s.match(/chart\/([^?]+)/)[1];
    const p = sym === 'GC=F' ? 4038.62 : (sym === 'BZ=F' ? 101.53 : 99.91);
    return new Response(JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: p } }] } }), { status: 200 });
  }
  if (s.includes('finance.yahoo.com')) {
    const sym = /chart\/([^?]+)/.exec(s)[1];
    return new Response(JSON.stringify(MOCKS.yahoo[sym] || {}), { status: 200 });
  }
  if (s.includes('stooq.com')) {
    const sym = /s=([^&]+)/.exec(s)[1];
    return new Response(MOCKS.stooq[sym] || '', { status: 200 });
  }
  if (s.includes('americasoilwatch.com')) {
    const k = s.includes('brent') ? 'brent' : 'wti';
    return new Response(JSON.stringify(MOCKS.oilwatch[k]), { status: 200 });
  }
  if (s.includes('oilpriceapi.com')) {
    return new Response(JSON.stringify(MOCKS.opademo.prices), { status: 200 });
  }
  return new Response('nope', { status: 403 });
};

globalThis.fetch = MOCK_FETCH;
const { OIL_PROVIDERS, getOilLive, probeAll: probeOil } = await import('./src/oilLive.js');
const { GOLD_PROVIDERS, getGoldLive, probeAll: probeGold } = await import('./src/goldLive.js');

let pass = 0, fail = 0;
const near = (a, b) => Math.abs(a - b) < 0.02;
const chk = (n, c, extra = '') => { if (c) { pass++; console.log('  OK  ' + n + (extra ? '  ' + extra : '')); } else { fail++; console.log('  NG  ' + n + (extra ? '  ' + extra : '')); } };

console.log('==== 逐个验解析（模拟真实响应格式）====');
const expect = { brent: 101.53, wti: 99.91 };
for (const p of OIL_PROVIDERS) {
  if (p.id === 'cpapi') { console.log('  --  cpapi 需 CP_API_KEY，跳过'); continue; }
  try {
    const r = await p.fn();
    const ok = near(r.brent, expect.brent) && near(r.wti, expect.wti);
    chk(p.id + ' 解析正确', ok, '布伦特=' + r.brent + ' WTI=' + r.wti);
  } catch (e) {
    chk(p.id + ' 解析正确', false, '抛错: ' + (e && e.message));
  }
}

console.log('');
console.log('==== 链式回退 ====');
{
  const r = await getOilLive();
  chk('默认顺序能拿到价', near(r.brent, expect.brent) && near(r.wti, expect.wti),
      'provider=' + r.provider);
}
{
  const r = await getOilLive(['yahoo']);
  chk('指定 src=yahoo 生效', r.provider === 'yahoo', 'provider=' + r.provider);
}
{
  const r = await getOilLive(['stooq', 'biquote']);
  chk('指定顺序 stooq 优先', r.provider === 'stooq', 'provider=' + r.provider);
}
{
  const r = await getOilLive(['nonexistent', 'yahoo']);
  chk('不存在的源自动跳过并回退', r.provider === 'yahoo', 'provider=' + r.provider);
}

console.log('');
console.log('==== 全源失败时的降级 ====');
{
  globalThis.fetch = async () => new Response('blocked', { status: 403 });
  const r = await getOilLive();
  chk('返回空价而不是抛异常', r.brent === 0 && r.wti === 0 && r.provider === null);
  chk('记录了每个源的失败原因', Array.isArray(r.tried) && r.tried.length === OIL_PROVIDERS.length, 'tried=' + r.tried.length);
  const pr = await probeOil();
  chk('probeAll 全失败时仍返回结构', pr.okCount === 0 && pr.results.length === OIL_PROVIDERS.length);
  globalThis.fetch = MOCK_FETCH;   /* ★ 必须还原，否则后面所有用例都被 403 污染 */
}


console.log('');
console.log('==== 三、3号后端源（本次新增）====');
{
  STAGE.site3 = 'cn';
  const r = await getOilLive(['site3']);
  chk('site3 解析中文键 油/wti', r.brent === 101.53 && r.wti === 99.91,
      'brent=' + r.brent + ' wti=' + r.wti);
  chk('site3 provider 正确', r.provider === 'site3', 'provider=' + r.provider);
}
{
  STAGE.site3 = 'en';
  const r = await getOilLive(['site3']);
  chk('site3 兼容英文键 oil/wti', r.brent === 101.53 && r.wti === 99.91,
      'brent=' + r.brent + ' wti=' + r.wti);
}
{
  STAGE.site3 = 'stale';
  const r = await getOilLive(['site3']);
  chk('site3 能识别 stale 标记', r.stale === true, 'stale=' + r.stale);
  chk('site3 带出 asOf 观测时间', String(r.asOf || '').includes('2026-10-26'), 'asOf=' + r.asOf);
  chk('stale 时 note 有提示', /旧值/.test(r.note || ''), 'note=' + r.note);
}
{
  STAGE.site3 = 'cn';
  const pr = await probeOil();
  const row = pr.results.find(x => x.id === 'site3');
  chk('probe 含 site3 行', !!row);
  chk('probe 原油源共 8 个', pr.total === 8, 'total=' + pr.total);
}

console.log('');
console.log('==== 四、黄金后端多源（本次新增）====');
{
  STAGE.goldData = false;
  const r = await getGoldLive(['site3live']);
  chk('黄金 site3live 现抓解析', r.usdOz === 4038.62, 'usdOz=' + r.usdOz);
  chk('黄金 provider 正确', r.provider === 'site3live', 'provider=' + r.provider);
}
{
  STAGE.goldData = true;
  const r = await getGoldLive(['site3data']);
  chk('黄金 site3data 读已存值', r.usdOz === 4038.62, 'usdOz=' + r.usdOz);
  STAGE.goldData = false;
}
{
  const r = await getGoldLive();
  chk('黄金默认链路能拿到价', r.usdOz > 0, 'usdOz=' + r.usdOz);
  const pr = await probeGold();
  chk('probe 黄金源共 7 个', pr.total === 7, 'total=' + pr.total);
  chk('probe 黄金含 3 号现抓', pr.results.some(x => x.id === 'site3live'));
}
{
  // xaus 标记 stale 时必须换源，不能沿用旧值
  STAGE.xaus = 'stale';
  const r = await getGoldLive(['xaus', 'goldapi']);
  chk('xaus stale 时自动换到下一个源', r.provider === 'goldapi', 'provider=' + r.provider);
  STAGE.xaus = 'fresh';
  const r2 = await getGoldLive(['xaus']);
  chk('xaus fresh 时正常采用', r2.provider === 'xaus', 'provider=' + r2.provider);
}
{
  // 前端契约：/api/gold-live 必须仍返回 priceUsdPerOz
  const goldSrc = fs.readFileSync(ROOT + '/src/index.js', 'utf8');
  chk('gold-live 保持 priceUsdPerOz 字段契约', /priceUsdPerOz:/.test(goldSrc));
  chk('gold-live 额外带 provider 便于排查', /provider: r\.provider/.test(goldSrc));
}

console.log('');
console.log('==== 五、源总数与顺序 ====');
{
  const o = await import('./src/oilLive.js');
  const g = await import('./src/goldLive.js');
  chk('原油源 8 个', o.OIL_PROVIDERS.length === 8, 'n=' + o.OIL_PROVIDERS.length);
  chk('黄金源 7 个', g.GOLD_PROVIDERS.length === 7, 'n=' + g.GOLD_PROVIDERS.length);
  chk('原油默认顺序 yahoo 紧跟 biquote',
      o.OIL_PROVIDERS[0].id === 'biquote' && o.OIL_PROVIDERS[1].id === 'yahoo');
  chk('黄金默认顺序 3号现抓优先（测稳定性）', g.GOLD_PROVIDERS[0].id === 'site3live');
}

console.log('');
console.log('================================');
console.log('  通过 ' + pass + ' 项，失败 ' + fail + ' 项');
globalThis.fetch = REAL;
process.exit(fail ? 1 : 0);
