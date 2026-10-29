// ============================================================
// goldLive.js — 国际黄金实时价：后端多源（★ 本次新增）
// ------------------------------------------------------------
// 为什么要有这个文件：
//   前端那段 JS 已经能直连 biquote / xaus / gold-api 三个免 key 源，
//   但【3 号后端带密钥，绝不能写进前端】—— 只能由服务端代问。
//   一旦前端三个源同时抽风，第 ④ 层就会问 /api/gold-live，
//   以前那里只连 3 号一个点；现在改成多条链路，逐个试。
//
// 与 oilLive.js 同样的设计原则：
//   1. 每个源独立函数，统一返回 { usdOz, ts, stale, note }
//   2. 链式回退，拿到就停；全部带超时
//   3. probeAll() 供 /probe 实测
// ============================================================

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const SITE3_BASE = 'https://ss.wwok.eu.cc';
const SITE3_KEY =
  (typeof process !== 'undefined' && process.env && process.env.SITE3_KEY) ||
  'lfwczh8pa4atakrpj7uwhybo2vexc76u';

async function getJson(u, ms = 3000, headers = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(u, {
      signal: ac.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': UA, ...headers },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function getText(u, ms = 3000, headers = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(u, {
      signal: ac.signal,
      cache: 'no-store',
      headers: { 'User-Agent': UA, ...headers },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

// 宽松取数字：不同源字段名五花八门，逐层找第一个有效正数
function pickNum(obj, keys) {
  if (!obj || typeof obj !== 'object') return 0;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && isFinite(v) && v > 0) return v;
    if (typeof v === 'string') { const n = Number(v); if (isFinite(n) && n > 0) return n; }
  }
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') { const n = pickNum(v, keys); if (n) return n; }
  }
  return 0;
}

/* ------------------------------------------------------------------
 * 源 A：3 号后端 /gold/live —— 现抓，不是读 KV 旧值（★ 用户自有源）
 * ---------------------------------------------------------------- */
async function srcSite3Live() {
  const j = await getJson(SITE3_BASE + '/gold/live', 4000, {
    'X-Access-Key': SITE3_KEY,
    'User-Agent': 'PriceScope/1.0 (+test)',
  });
  const p = pickNum(j && (j.gold || j['金子'] || j.data || j),
    ['priceUsdPerOz', 'usdOz', 'price', 'usdPerOz', 'bid', 'mid', 'value']);
  if (!p) throw new Error('3号 /gold/live 未解析出金价');
  return { usdOz: p, note: '3号后端现抓', stale: j && j.stale === true };
}

/* ------------------------------------------------------------------
 * 源 B：3 号后端 /data —— 读它已存的金价（比 /gold/live 快，可能略旧）
 * ---------------------------------------------------------------- */
async function srcSite3Data() {
  const j = await getJson(SITE3_BASE + '/data', 4000, {
    'X-Access-Key': SITE3_KEY,
    'User-Agent': 'PriceScope/1.0 (+test)',
  });
  const g = j && (j.gold || j['金子']) || {};
  const p = pickNum(g, ['priceUsdPerOz', 'usdOz', 'price', 'usdPerOz']);
  if (!p) throw new Error('3号 /data 未解析出金价');
  return { usdOz: p, note: '3号后端已存值', stale: j && j.stale === true };
}

/* ------------------------------------------------------------------
 * 源 C：biquote XAUUSD —— 券商 MT5 链路，与前端主源同一条
 *   （前端失败往往是个别网络问题，服务端再问一次有时就通了）
 * ---------------------------------------------------------------- */
async function srcBiquote() {
  const j = await getJson('https://biquote.io/api/XAUUSD', 3000);
  const b = Number(j && j.bid), a = Number(j && j.ask);
  const p = (b && a) ? (b + a) / 2 : Number(j && j.mid) || 0;
  if (!p) throw new Error('biquote 无价');
  return { usdOz: p, note: 'biquote 券商链路' };
}

/* ------------------------------------------------------------------
 * 源 D：xaus.com —— 免 key，且自带 data_state（fresh / stale / unavailable）
 *   ★ 它明确承诺"不编造数据"，stale 时会告知真实观测时间。
 *     stale 视为不可用，换下一个源 —— 这正是之前 101.53 那种
 *     "数字是活的、底下却没更新"的老毛病要防的。
 * ---------------------------------------------------------------- */
async function srcXaus() {
  const j = await getJson('https://xaus.com/api/v1/spot?currency=USD&unit=oz&compact=1', 3000);
  const st = String((j && j.data_state) || '');
  const p = Number(j && (j.spot_usd_oz ?? j.price ?? j.spot)) || 0;
  if (!p) throw new Error('xaus 无价');
  if (st === 'stale' || st === 'unavailable') {
    throw new Error('xaus 标记为 ' + st + '（沿用旧值，换源）');
  }
  return { usdOz: p, note: 'xaus 现货（data_state=' + (st || '未知') + '）' };
}

/* ------------------------------------------------------------------
 * 源 E：gold-api.com —— 免 key，结构最简单（{ price }）
 * ---------------------------------------------------------------- */
async function srcGoldApi() {
  const j = await getJson('https://api.gold-api.com/price/XAU', 3000);
  const p = Number(j && j.price) || 0;
  if (!p) throw new Error('gold-api 无价');
  return { usdOz: p, note: 'gold-api 现货' };
}

/* ------------------------------------------------------------------
 * 源 F：Yahoo 黄金期货 GC=F（备用，与现货有基差但方向一致）
 * ---------------------------------------------------------------- */
async function srcYahooGold() {
  const j = await getJson(
    'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d', 3500);
  const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
  const p = Number(meta && (meta.regularMarketPrice || meta.previousClose));
  if (!p) throw new Error('Yahoo GC=F 无价');
  return { usdOz: p, note: 'Yahoo 黄金期货 GC=F（含基差）' };
}

/* ------------------------------------------------------------------
 * 源 G：Stooq XAUUSD CSV（免 key）
 * ---------------------------------------------------------------- */
async function srcStooqGold() {
  const txt = await getText('https://stooq.com/q/l/?s=xauusd&f=sd2t2ohlcv&h&e=csv', 3500);
  const lines = txt.trim().split('\n');
  if (lines.length < 2) throw new Error('Stooq xauusd 无数据行');
  const cols = lines[0].split(',');
  const vals = lines[1].split(',');
  const i = cols.indexOf('Close');
  const p = Number(i >= 0 ? vals[i] : vals[vals.length - 2]);
  if (!p) throw new Error('Stooq xauusd 解析不出价');
  return { usdOz: p, note: 'Stooq XAUUSD' };
}

export const GOLD_PROVIDERS = [
  { id: 'site3live', label: '3号后端 /gold/live（现抓，自有 CF 源）', fn: srcSite3Live },
  { id: 'biquote',   label: 'biquote XAUUSD（券商 MT5，免 key）',     fn: srcBiquote },
  { id: 'xaus',      label: 'xaus.com 现货（免 key，带新鲜度标记）',   fn: srcXaus },
  { id: 'goldapi',   label: 'gold-api.com（免 key）',                 fn: srcGoldApi },
  { id: 'site3data', label: '3号后端 /data（读已存值）',              fn: srcSite3Data },
  { id: 'yahoogold', label: 'Yahoo 黄金期货 GC=F（备用）',            fn: srcYahooGold },
  { id: 'stooqgold', label: 'Stooq XAUUSD（备用）',                   fn: srcStooqGold },
];

/* ------------------------------------------------------------------
 * getGoldLive() —— 生产链路：按序尝试，拿到就停
 * ---------------------------------------------------------------- */
/* ★★ Sticky Provider（与原油同一套）：记住上次成功的源并优先复用，
 * 避免"首页一个价、详情页又一个价"的源漂移问题。 */
let stickyProvider = null;

export async function getGoldLive(order) {
  let ids = (order && order.length ? order : GOLD_PROVIDERS.map(p => p.id));
  /* 粘滞：把上次成功的源提到最前面（不改变整体顺序，只是优先尝试） */
  if (stickyProvider && !order) {
    ids = [stickyProvider, ...ids.filter(x => x !== stickyProvider)];
  }
  const tried = [];
  for (const id of ids) {
    const p = GOLD_PROVIDERS.find(x => x.id === id);
    if (!p) continue;
    try {
      const r = await p.fn();
      if (r && r.usdOz) {
        stickyProvider = p.id;      /* ★ 记住这次成功的源，下次优先复用 */
        return { ...r, provider: p.id, providerLabel: p.label, tried };
      }
      tried.push({ id: p.id, ok: false, error: '返回为空' });
    } catch (e) {
      tried.push({ id: p.id, ok: false, error: String(e && e.message || e) });
    }
  }
  return { usdOz: 0, provider: null, providerLabel: '全部源均失败', tried };
}

/* ------------------------------------------------------------------
 * probeAll() —— 探针：逐个实测，全部跑完，不中断
 * ---------------------------------------------------------------- */
export async function probeAll() {
  const out = await Promise.all(GOLD_PROVIDERS.map(async (p) => {
    const t0 = Date.now();
    try {
      const r = await p.fn();
      const ms = Date.now() - t0;
      if (!r || !r.usdOz) throw new Error('返回为空');
      return { id: p.id, label: p.label, ok: true, ms, usdOz: r.usdOz, note: r.note || '', stale: !!r.stale };
    } catch (e) {
      return { id: p.id, label: p.label, ok: false, ms: Date.now() - t0, error: String(e && e.message || e) };
    }
  }));
  const okCount = out.filter(r => r.ok).length;
  return { at: new Date().toISOString(), results: out, okCount, total: out.length };
}
