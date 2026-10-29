// ============================================================
// oilLive.js — 布伦特 / WTI 实时价：可插拔多源
// ------------------------------------------------------------
// 背景：线上 2 号目前靠 3 号后端（ss.wwok.eu.cc）定时抓，
//       原油一天只抓几十次，数字不跳；黄金走 biquote 才会跳。
//       本模块给原油补一条「实时」链路。
//
// 设计原则：
//   1. 每个源一个独立函数，返回统一结构 { brent, wti, ts, note }
//   2. 主源失败自动换下一个（链式回退），不阻塞页面
//   3. 全部带超时，任何一个源卡住都不拖垮整页
//   4. probeAll() 供 /probe 页面逐个实测，用哪个由实测结果决定
// ============================================================

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/* ------------------------------------------------------------------
 * 3 号后端（ss.wwok.eu.cc）—— 用户自己已在 Cloudflare 上跑着的数据后端
 *   既是兜底源，也是本次要【实测其稳定性】的对象。
 *   密钥优先读环境变量 SITE3_KEY，没配才用内置默认值。
 *   ⚠️ 仓库若公开，请务必在平台侧配 SITE3_KEY，不要把密钥提交进 Git。
 * ---------------------------------------------------------------- */
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

/* ------------------------------------------------------------------
 * 宽松取值：3 号返回可能是 { oil:{price}, wti:{price} } 或
 * { 油:{...}, wti:{...} } 等变体，逐层找第一个有效数字。
 * ---------------------------------------------------------------- */
function pickNum(obj, keys) {
  if (!obj || typeof obj !== 'object') return 0;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && isFinite(v) && v > 0) return v;
    if (typeof v === 'string') { const n = Number(v); if (isFinite(n) && n > 0) return n; }
  }
  // 嵌套一层：oil.price / oil.value / oil.last
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') {
      const n = pickNum(v, keys);
      if (n) return n;
    }
  }
  return 0;
}

/* ------------------------------------------------------------------
 * 源 A：3 号后端 /data —— 用户自有基础设施（★ 本次新增）
 *   走服务端带 X-Access-Key，密钥不会出现在浏览器里。
 *   若返回体带 stale/asOf，一并带出，便于在 /probe 判断数据新旧。
 * ---------------------------------------------------------------- */
async function srcSite3() {
  const j = await getJson(SITE3_BASE + '/data', 4000, {
    'X-Access-Key': SITE3_KEY,
    'User-Agent': 'PriceScope/1.0 (+test)',
  });
  const oilRaw = j && (j['油'] || j.oil) || {};
  const wtiRaw = j && (j.wti || j['WTI']) || {};
  const brent = pickNum(oilRaw, ['price', 'value', 'last', 'close', 'usdPerBarrel']);
  const wti   = pickNum(wtiRaw, ['price', 'value', 'last', 'close', 'usdPerBarrel']);
  if (!brent && !wti) throw new Error('3号 /data 未解析出布伦特/WTI');
  const stale = j && (j.stale === true || j.stale === 'true');
  const asOf = (j && (j.asOf || j.as_of)) || (oilRaw && (oilRaw.updatedAt || oilRaw.updated)) || '';
  return {
    brent, wti,
    stale, asOf: String(asOf || ''),
    note: stale ? '3号后端（★ 标记为沿用旧值）' : '3号后端（自有 CF 数据源）',
  };
}

/* ------------------------------------------------------------------
 * 源 1：biquote —— 券商 MT5 链路
 *   黄金现在用的就是这个（XAUUSD），实测偏差 < 0.04%
 *   原油符号：XTIUSD = WTI，XBRUSD = 布伦特
 *   返回形如 { bid, ask, mid }，取买卖中值
 * ---------------------------------------------------------------- */
async function srcBiquote() {
  const [w, b] = await Promise.all([
    getJson('https://biquote.io/api/XTIUSD'),
    getJson('https://biquote.io/api/XBRUSD'),
  ]);
  const mid = (j) => {
    const bid = Number(j && j.bid), ask = Number(j && j.ask);
    if (bid && ask) return (bid + ask) / 2;
    return Number(j && j.mid) || 0;
  };
  const wti = mid(w), brent = mid(b);
  if (!wti && !brent) throw new Error('biquote 两个符号都没返回价');
  return { brent, wti, note: '券商 MT5 链路，秒级' };
}

/* ------------------------------------------------------------------
 * 源 2：Yahoo Finance chart
 *   BZ=F 布伦特期货，CL=F WTI 期货
 *   取 meta.regularMarketPrice
 * ---------------------------------------------------------------- */
async function srcYahoo() {
  const one = async (sym) => {
    const j = await getJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`, 3500);
    const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
    const p = Number(meta && (meta.regularMarketPrice || meta.previousClose));
    if (!p) throw new Error('Yahoo ' + sym + ' 无价');
    return p;
  };
  const [wti, brent] = await Promise.all([one('CL=F'), one('BZ=F')]);
  return { brent, wti, note: 'Yahoo 期货，盘中实时' };
}

/* ------------------------------------------------------------------
 * 源 2b：Yahoo Finance —— query2 备用域名（★ 本次新增）
 *   与源 2 是同一数据、不同接入点。query1 抽风时 query2 往往正常。
 * ---------------------------------------------------------------- */
async function srcYahoo2() {
  const one = async (sym) => {
    const j = await getJson(
      `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`, 3500);
    const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
    const p = Number(meta && (meta.regularMarketPrice || meta.previousClose));
    if (!p) throw new Error('Yahoo2 ' + sym + ' 无价');
    return p;
  };
  const [wti, brent] = await Promise.all([one('CL=F'), one('BZ=F')]);
  return { brent, wti, note: 'Yahoo 备用域名 query2' };
}

/* ------------------------------------------------------------------
 * 源 3：Stooq CSV（免费、无需 key）
 *   cb.f = 布伦特，cl.f = WTI
 *   返回 CSV：Symbol,Date,Time,Open,High,Low,Close,Volume
 * ---------------------------------------------------------------- */
async function srcStooq() {
  const one = async (s) => {
    const txt = await getText(`https://stooq.com/q/l/?s=${s}&f=sd2t2ohlcv&h&e=csv`, 3500);
    const lines = txt.trim().split('\n');
    if (lines.length < 2) throw new Error('Stooq ' + s + ' 无数据行');
    const cols = lines[0].split(',');
    const vals = lines[1].split(',');
    const i = cols.indexOf('Close');
    const p = Number(i >= 0 ? vals[i] : vals[vals.length - 2]);
    if (!p) throw new Error('Stooq ' + s + ' 解析不出价');
    return p;
  };
  const [brent, wti] = await Promise.all([one('cb.f'), one('cl.f')]);
  return { brent, wti, note: 'Stooq 免费 CSV' };
}

/* ------------------------------------------------------------------
 * 源 4：AmericasOilWatch（免费、无 key、CORS 开放）
 *   注意：它每天 06:00 UTC 更新一次、CDN 缓存 5 分钟
 *   → 严格说不算"实时"，只能算"较新"
 * ---------------------------------------------------------------- */
async function srcOilWatch() {
  const [b, w] = await Promise.all([
    getJson('https://americasoilwatch.com/api/v1/brent'),
    getJson('https://americasoilwatch.com/api/v1/wti'),
  ]);
  const num = (j) => Number(j && (j.price ?? j.value ?? j.close)) || 0;
  const brent = num(b), wti = num(w);
  if (!brent && !wti) throw new Error('OilWatch 两个端点都没返回价');
  return { brent, wti, note: '每天更新 + 5 分钟缓存，非严格实时' };
}

/* ------------------------------------------------------------------
 * 源 5：OilPriceAPI 免 key 演示端点
 *   官方：无需 API key，但限制 20 次/小时
 *   → 只适合探针阶段验证，不适合生产
 * ---------------------------------------------------------------- */
async function srcOilPriceApiDemo() {
  const j = await getJson('https://api.oilpriceapi.com/v1/demo/prices', 4000);
  const arr = (j && (j.data && (j.data.prices || j.data))) || j;
  const list = Array.isArray(arr) ? arr : (arr && Array.isArray(arr.prices) ? arr.prices : []);
  const pick = (code) => {
    const hit = list.find(x => x && String(x.code || '').toUpperCase().includes(code));
    return hit ? Number(hit.price) : 0;
  };
  const brent = pick('BRENT'), wti = pick('WTI');
  if (!brent && !wti) throw new Error('demo 端点未返回布伦特/WTI');
  return { brent, wti, note: '免 key 演示端点，20 次/小时（仅供测试）' };
}

/* ------------------------------------------------------------------
 * 源 6：CommodityPriceAPI（需 key）
 *   官方宣称每秒刷新、带买卖价、现货与期货都有
 *   key 通过环境变量 CP_API_KEY 注入，没配就跳过
 * ---------------------------------------------------------------- */
async function srcCommodityPriceApi() {
  const key = (typeof process !== 'undefined' && process.env && process.env.CP_API_KEY) || '';
  if (!key) throw new Error('未配置 CP_API_KEY，跳过');
  const one = async (sym) => {
    const j = await getJson(
      `https://api.commoditypriceapi.com/v3/rates/latest/${sym}`, 3500,
      { 'x-api-key': key });
    const d = j && j.data;
    const p = Number(d && (d.rate ?? d.price));
    if (!p) throw new Error('CP ' + sym + ' 无价');
    return p;
  };
  const [wti, brent] = await Promise.all([one('WTIOIL-FUT'), one('BRENTOIL-FUT')]);
  return { brent, wti, note: '官方宣称每秒刷新（需付费 key）' };
}

export const OIL_PROVIDERS = [
  { id: 'biquote',  label: 'biquote 券商链路（与黄金同源，无需 key）', fn: srcBiquote },
  { id: 'yahoo',    label: 'Yahoo Finance 期货（无需 key）',           fn: srcYahoo },
  { id: 'yahoo2',   label: 'Yahoo 备用域名 query2（无需 key）',         fn: srcYahoo2 },
  { id: 'site3',    label: '3号后端 ss.wwok.eu.cc（自有 CF 源，带密钥）', fn: srcSite3 },
  { id: 'stooq',    label: 'Stooq 免费 CSV（无需 key）',               fn: srcStooq },
  { id: 'oilwatch', label: 'AmericasOilWatch（无需 key，5 分钟缓存）',  fn: srcOilWatch },
  { id: 'opademo',  label: 'OilPriceAPI 演示端点（20次/小时，仅测试）', fn: srcOilPriceApiDemo },
  { id: 'cpapi',    label: 'CommodityPriceAPI（需 CP_API_KEY）',       fn: srcCommodityPriceApi },
];

/* ------------------------------------------------------------------
 * getOilLive() —— 生产链路：按序尝试，拿到就停
 * ---------------------------------------------------------------- */
/* ------------------------------------------------------------------
 * ★★ Sticky Provider（源粘滞）—— 解决"首页 102.03、点进去 102.02"
 * --------------------------------------------------------------------
 * 问题：原来每次请求都从头按序尝试，一旦 biquote 偶尔慢/超时，
 *   这次就落到 yahoo，下次又回到 biquote —— 两个源口径略有差异，
 *   于是用户看到"点进去价格跳一下、点出来又跳一下"。
 *
 * 修法：记住上次成功的源，下次【优先复用】它；只有它失败了才换下一个。
 *   这样同一时间窗口内，首页 / 详情页 / 连续刷新 拿到的都是同一个源的值。
 *
 * 说明：CF Worker 同一 isolate 内可复用该变量（与 liveCache 同理）。
 *   不同 isolate 各自维护，冷启动第一次会重新选源，属于可接受范围。
 * ---------------------------------------------------------------- */
let stickyProvider = null;

export async function getOilLive(order) {
  let ids = (order && order.length ? order : OIL_PROVIDERS.map(p => p.id));
  /* 粘滞：把上次成功的源提到最前面（不改变整体顺序，只是优先尝试） */
  if (stickyProvider && !order) {
    ids = [stickyProvider, ...ids.filter(x => x !== stickyProvider)];
  }
  const tried = [];
  for (const id of ids) {
    const p = OIL_PROVIDERS.find(x => x.id === id);
    if (!p) continue;
    try {
      const r = await p.fn();
      if (r && (r.brent || r.wti)) {
        stickyProvider = p.id;      /* ★ 记住这次成功的源，下次优先复用 */
        return { ...r, provider: p.id, providerLabel: p.label, tried };
      }
      tried.push({ id: p.id, ok: false, error: '返回为空' });
    } catch (e) {
      tried.push({ id: p.id, ok: false, error: String(e && e.message || e) });
    }
  }
  return { brent: 0, wti: 0, provider: null, providerLabel: '全部源均失败', tried };
}

/* ------------------------------------------------------------------
 * probeAll() —— 探针：逐个实测，全部跑完，不中断
 * 返回每个源的 可用/失败、耗时、样例价、错误原因
 * ---------------------------------------------------------------- */
export async function probeAll() {
  const out = await Promise.all(OIL_PROVIDERS.map(async (p) => {
    const t0 = Date.now();
    try {
      const r = await p.fn();
      return {
        id: p.id, label: p.label, ok: true,
        ms: Date.now() - t0,
        brent: r && r.brent || 0, wti: r && r.wti || 0,
        note: r && r.note || '',
        stale: !!(r && r.stale),
        asOf: (r && r.asOf) || '',
      };
    } catch (e) {
      return {
        id: p.id, label: p.label, ok: false,
        ms: Date.now() - t0,
        error: String(e && e.message || e),
      };
    }
  }));
  return {
    at: new Date().toISOString(),
    results: out,
    okCount: out.filter(x => x.ok).length,
    total: out.length,
  };
}
