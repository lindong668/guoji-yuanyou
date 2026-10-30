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

/* 同 oilLive.js：CF Workers 没有 process.env，密钥必须靠 env 注入。 */
const SITE3_KEY_BUILTIN = ''; // 已清空：密钥改由平台侧 Secret 注入（SITE3_KEY），不再进 Git
let SITE3_KEY_RT = '';

export function setSite3Key(env) {
  const v = env && (env.SITE3_KEY || env.SOURCE_ACCESS_KEY);
  if (v) SITE3_KEY_RT = String(v);
}
export function site3Key() {
  return SITE3_KEY_RT || SITE3_KEY_BUILTIN;
}

import { parseHfMap, hfPick } from './oilLive.js';

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

/* 黄金合理区间（美元/盎司）。★ 必须传，这是防止字段错位的最后一道闸：
 * 例如把 2026（年份）或 15:04:02 里的数字当成金价取走。 */
const GOLD_RANGE = [500, 20000];

/* ------------------------------------------------------------------
 * 源 S：新浪 hf_GC —— 纽约黄金【期货】（★ 本次新增，实测最优）
 * --------------------------------------------------------------------
 * 探针 P11 实测：3906.39（价龄 2s，真·实时 ✓，均 9ms）
 *                Yahoo GC=F 参照 3912.90，差 6.51（0.2%）
 *
 * 是这轮所有黄金源里【价龄最小、速度最快】的一条，排第一。
 * 报文与原油同源：p[0]=现价 p[6]=HH:MM:SS p[12]=YYYY-MM-DD（北京时间）
 * ---------------------------------------------------------------- */
async function srcSinaGold() {
  const txt = await getText('https://hq.sinajs.cn/list=hf_GC', 2500, {
    Referer: 'https://finance.sina.com.cn',
  });
  const r = hfPick(parseHfMap(txt), 'hf_GC', GOLD_RANGE);
  if (!r) throw new Error('新浪 hf_GC 无价');
  return {
    usdOz: r.v,
    asOf: new Date(r.ts || Date.now()).toISOString(),
    note: '新浪纽约黄金期货 hf_GC（秒级）',
  };
}

/* ------------------------------------------------------------------
 * 源 T：腾讯 hf_GC（★ 本次新增）
 *   探针实测 3912（价龄 21s），与新浪互为厂商级备份
 * ---------------------------------------------------------------- */
async function srcTxGold() {
  const txt = await getText('https://qt.gtimg.cn/q=hf_GC', 2500);
  const r = hfPick(parseHfMap(txt), 'hf_GC', GOLD_RANGE);
  if (!r) throw new Error('腾讯 hf_GC 无价');
  return {
    usdOz: r.v,
    asOf: new Date(r.ts || Date.now()).toISOString(),
    note: '腾讯纽约黄金期货 hf_GC（秒级）',
  };
}

/* ------------------------------------------------------------------
 * 源 S2：新浪 hf_XAU —— 伦敦金【现货】（★ 本次新增）
 *   探针实测 3897.55（价龄 24s）。与期货金 hf_GC 天然差约 8 美元
 *   （基差，正常现象），互为口径备份。
 * ---------------------------------------------------------------- */
async function srcSinaXau() {
  const txt = await getText('https://hq.sinajs.cn/list=hf_XAU', 2500, {
    Referer: 'https://finance.sina.com.cn',
  });
  const r = hfPick(parseHfMap(txt), 'hf_XAU', GOLD_RANGE);
  if (!r) throw new Error('新浪 hf_XAU 无价');
  return {
    usdOz: r.v,
    asOf: new Date(r.ts || Date.now()).toISOString(),
    note: '新浪伦敦金现货 hf_XAU（秒级）',
  };
}

/* ------------------------------------------------------------------
 * 源 K：Kraken PAXGUSD —— ★ 交易所直连，完全独立于新浪/腾讯
 * --------------------------------------------------------------------
 * 探针 P11 实测：3905.75 → 3906.44（有变化，24ms）
 *
 * PAXG = Paxos Gold，1 枚 ≈ 1 金衡盎司伦敦 LBMA 金库实物金，
 * 受纽约州金融服务局监管、每月 KPMG 审计 —— 不是"空气币"。
 *
 * ⚠️ 对名修正：Kraken 上【没有 XAUUSD】，正确对名是 XAUTUSD / PAXGUSD。
 *    P10 用 XAUUSD 报 "EQuery:Unknown asset pair"，P11 改对名后即通。
 *
 * ⚠️ 定位：只做备份，不做主源。代币金价相对现货通常【折价 0.25%~0.4%】，
 *    且伦敦休市（周末）无套利者做市时会一直飘、要到周一才修正。
 *    但作为"新浪+腾讯同时挂"的第三条路，它 7×24 不停，价值很大。
 *
 * 返回：{ error:[], result:{ PAXGUSD:{ c:["3906.44","0.5"] } } }  c[0]=最新成交
 * ---------------------------------------------------------------- */
async function srcKraken() {
  const j = await getJson('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD', 3000);
  const res = j && j.result;
  const key = res && Object.keys(res)[0];
  const v = Number(res && key && res[key] && res[key].c && res[key].c[0]);
  if (!Number.isFinite(v) || v < GOLD_RANGE[0] || v > GOLD_RANGE[1]) {
    throw new Error('Kraken PAXGUSD 无价');
  }
  return { usdOz: v, note: 'Kraken 交易所 PAXGUSD（7×24，独立源）' };
}

/* ------------------------------------------------------------------
 * 源 B：Bitfinex XAUT:USD —— ★ 交易所直连，独立源（★ 本次补 parser）
 * --------------------------------------------------------------------
 * P11 报"解析不到价格"，其实是【我没写 parser】，数据是好的：
 *   [3899, 83.6, 3903.8, 38.2, -123.7, -0.03, 3902.4, 334.0, 4030.6, 3898.6]
 *    ↑bid  ↑bid_size ↑ask ↑ask_size ↑chg ↑chg_rel ↑【最新成交】↑vol ↑high ↑low
 *   → 取 index 6 = 3902.4
 *
 * XAUT = Tether Gold，1 枚 ≈ 1 金衡盎司瑞士金库实物金。
 * 同样只做备份（代币金价有折价），但 7×24、完全独立。
 * ---------------------------------------------------------------- */
async function srcBitfinex() {
  const j = await getJson('https://api-pub.bitfinex.com/v2/ticker/tXAUT:USD', 3000);
  const arr = Array.isArray(j) ? j : null;
  const v = Number(arr && arr[6]);
  if (!Number.isFinite(v) || v < GOLD_RANGE[0] || v > GOLD_RANGE[1]) {
    throw new Error('Bitfinex XAUT 无价');
  }
  return { usdOz: v, note: 'Bitfinex 交易所 XAUT:USD（7×24，独立源）' };
}

/* ------------------------------------------------------------------
 * 源 C：Coinbase PAXG-USD —— ★ 交易所直连，独立源（★ 本次补 parser）
 * --------------------------------------------------------------------
 * P11 同样是"我没写 parser"，数据其实是好的：
 *   {"data":{"amount":"3911.6","base":"PAXG","currency":"USD"}}
 * ---------------------------------------------------------------- */
async function srcCoinbase() {
  const j = await getJson('https://api.coinbase.com/v2/prices/PAXG-USD/spot', 3000);
  const v = Number(j && j.data && j.data.amount);
  if (!Number.isFinite(v) || v < GOLD_RANGE[0] || v > GOLD_RANGE[1]) {
    throw new Error('Coinbase PAXG 无价');
  }
  return { usdOz: v, note: 'Coinbase 交易所 PAXG-USD（7×24，独立源）' };
}

/* ------------------------------------------------------------------
 * 源 Q：Swissquote XAU/USD —— 券商报价（现有源，此前未纳入生产）
 *   探针实测 3897.901 → 3897.869（有变化，443ms）
 *   结构不固定，先按字段名找，找不到再按区间深扫。
 * ---------------------------------------------------------------- */
async function srcSwissquote() {
  const j = await getJson(
    'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD', 4000);
  let v = pickNum(j, ['price', 'bid', 'ask', 'mid', 'last', 'value']);
  if (!v) {
    /* 兜底：递归找第一个落在金价区间内的数 */
    const scan = (o) => {
      if (!o || typeof o !== 'object') return 0;
      for (const k of Object.keys(o)) {
        const x = o[k];
        if (typeof x === 'number' && x >= GOLD_RANGE[0] && x <= GOLD_RANGE[1]) return x;
        if (typeof x === 'string') {
          const n = Number(x);
          if (Number.isFinite(n) && n >= GOLD_RANGE[0] && n <= GOLD_RANGE[1]) return n;
        }
      }
      for (const k of Object.keys(o)) {
        const hit = scan(o[k]);
        if (hit) return hit;
      }
      return 0;
    };
    v = scan(j);
  }
  if (!v) throw new Error('Swissquote 无价');
  return { usdOz: v, note: 'Swissquote 券商 XAU/USD' };
}

/* ------------------------------------------------------------------
 * 源 A：3 号后端 /gold/live —— 现抓，不是读 KV 旧值（★ 用户自有源）
 * ---------------------------------------------------------------- */
async function srcSite3Live() {
  const j = await getJson(SITE3_BASE + '/gold/live', 4000, {
    'X-Access-Key': site3Key(),
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
    'X-Access-Key': site3Key(),
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

/* ★★ 源顺序重排 —— 实时链路不再首选 3 号
 *
 * 原顺序把 site3live（3号 /gold/live 现抓）排在第一位，
 * 于是 2 号每 15 秒一次的实时请求，都会触发 3 号【当场真抓三个源 + 写一次 KV】。
 * 页面开着几小时就是上千次写入 → 免费版 1,000 次/天的额度当天见底，
 * 之后所有 KV 写入 429 失败，3 号被拖慢到超时，金价反而拿不到。
 *
 * 职责划分（重要）：
 *   3 号 —— 只负责【定时抓取 + 存历史】，产出报表/走势用的历史数据。
 *           它的 /gold/live 是"现抓"端点，成本极高，不该被实时链路高频调用。
 *   2 号 —— 实时跳动走【自己服务端直连】的外部源（CF 海外节点出网，稳定）。
 *
 * 新顺序：先用自己的源，全挂了才碰 3 号；
 *   且 3 号内部已有 60 秒缓存 + 每日真抓上限两层节流，不会再放大。
 */
export const GOLD_PROVIDERS = [
  /* ★ 第一梯队：新浪 / 腾讯，实测价龄 2~24s、9~30ms，真·实时。
   *   hf_GC 是纽约期货金（价龄最小，排第一），hf_XAU 是伦敦现货金。 */
  { id: 'sinagold',  label: '新浪纽约黄金期货 hf_GC（秒级，免 key）', fn: srcSinaGold },
  { id: 'txgold',    label: '腾讯纽约黄金期货 hf_GC（秒级，免 key）', fn: srcTxGold },
  { id: 'sinaxau',   label: '新浪伦敦金现货 hf_XAU（秒级，免 key）',  fn: srcSinaXau },
  /* ★ 第二梯队：券商 / 现货，免 key，实测与上面差 0.2% 以内 */
  { id: 'biquote',   label: 'biquote XAUUSD（券商 MT5，免 key）',     fn: srcBiquote },
  { id: 'swissquote', label: 'Swissquote XAU/USD（券商报价）',        fn: srcSwissquote },
  { id: 'xaus',      label: 'xaus.com 现货（免 key，带新鲜度标记）',   fn: srcXaus },
  { id: 'goldapi',   label: 'gold-api.com（免 key）',                 fn: srcGoldApi },
  /* ★ 第三梯队：加密交易所直连 —— 完全独立于新浪/腾讯，7×24 不停。
   *   只做备份：代币金价相对现货有 0.25%~0.4% 折价，伦敦休市时会飘。 */
  { id: 'kraken',    label: 'Kraken 交易所 PAXGUSD（7×24，独立源）',  fn: srcKraken },
  { id: 'bitfinex',  label: 'Bitfinex 交易所 XAUT:USD（独立源）',     fn: srcBitfinex },
  { id: 'coinbase',  label: 'Coinbase 交易所 PAXG-USD（独立源）',     fn: srcCoinbase },
  /* ★ 第四梯队：延迟兜底（Yahoo 约 10 分钟） */
  { id: 'yahoogold', label: 'Yahoo 黄金期货 GC=F（备用）',            fn: srcYahooGold },
  { id: 'stooqgold', label: 'Stooq XAUUSD（备用）',                   fn: srcStooqGold },
  /* ↓ 以下两个是 3 号兜底，只在上面全部失败时才走到 */
  { id: 'site3data', label: '3号后端 /data（读已存值，只读不写）',     fn: srcSite3Data },
  { id: 'site3live', label: '3号后端 /gold/live（现抓，最后兜底）',    fn: srcSite3Live },
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
