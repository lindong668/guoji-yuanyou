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

/* ★ 密钥分两层：
 *   ① 运行时值 —— 由 index.js 在每次请求开头 setSite3Key(env) 注入，
 *      来源是 CF 后台配置的 Secret（加密存储，不进代码、不进 Git）。
 *   ② 内置兜底 —— 只有平台侧【没配】时才用，保证不停服。
 *
 * ⚠️ 为什么不能写 process.env.SITE3_KEY：
 *    Cloudflare Workers 运行时根本没有 process / process.env，
 *    所以原来那行代码恒为 false，导致「在后台配了变量也读不到」，
 *    密钥实际上一直走内置值。必须走下面这条 env 注入链路。
 */
const SITE3_KEY_BUILTIN = ''; // 已清空：密钥改由平台侧 Secret 注入（SITE3_KEY），不再进 Git
let SITE3_KEY_RT = '';

/** 在每个请求开头调用一次，把平台侧 Secret 注入本模块。 */
let CP_API_KEY_RT = '';
export function setSite3Key(env) {
  const v = env && (env.SITE3_KEY || env.SOURCE_ACCESS_KEY);
  if (v) SITE3_KEY_RT = String(v);
  /* 同一个坑：CommodityPriceAPI 的 key 原来也用 process.env 读，
   * 在 CF 上恒为空 → 该源永远跳过。改用同一条注入链路。 */
  const c = env && env.CP_API_KEY;
  if (c) CP_API_KEY_RT = String(c);
}
/** 取当前生效的密钥：优先运行时注入值，没配才回退内置。 */
export function site3Key() {
  return SITE3_KEY_RT || SITE3_KEY_BUILTIN;
}

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
 * 源 S：新浪外盘期货 hf_OIL / hf_CL（★ 本次新增，实测依据）
 * --------------------------------------------------------------------
 * 实测（CF HKG 节点，探针 P5「测候选源」）：
 *   新浪 hf_OIL  113.008 → 112.975 → 113.02  3 秒 3 个不同值，均 16ms
 *                源自带时间戳，价龄 0s
 *   新浪 hf_CL   103.877 → 103.868 → 103.904 3 秒 3 个不同值，均 9ms
 *                源自带时间戳，价龄 2s
 *   Yahoo 参照   BZ=F 113.07 / CL=F 103.95，差值 0.05（0.0%）
 *
 * 对照：Yahoo 免费源实测价龄 615~624s（约 10 分钟），
 *       是 CME/ICE 授权导致的延迟行情，换字段改不出来。
 *       新浪这条是【真·实时】，且无需 key、无限流。
 *
 * 报文（GBK，但数字与时间都是 ASCII，按 UTF-8 读不影响取值）：
 *   var hq_str_hf_OIL="113.008,2.32,113.28,...,20:52:56,...,2026-10-30,布伦特原油";
 *   第 0 段当前价 / 第 6 段 HH:MM:SS / 第 12 段 YYYY-MM-DD（北京时间）
 *
 * ★ 两个符号用【一次】请求取回（list=hf_OIL,hf_CL），
 *   只花 1 个子请求，不是 2 个。
 * ---------------------------------------------------------------- */
export function parseHfMap(text) {
  const out = {};
  /* 新浪：var hq_str_hf_OIL="..."   腾讯：v_hf_OIL="..." */
  const re = /(?:var\s+hq_str_|v_)([A-Za-z0-9_]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(String(text || '')))) out[m[1]] = m[2];
  return out;
}

/* 从一条 hf_ 记录里取出【价 + 自带时间戳】。
 * range 必须传：这是防止字段错位的最后一道闸
 * （例如把日期段 2026 当成价格取走）。 */
export function hfPick(map, sym, range) {
  const raw = map && map[sym];
  if (!raw) return null;
  const p = String(raw).split(',');
  const v = Number(p[0]);
  if (!Number.isFinite(v) || v < range[0] || v > range[1]) return null;
  const t = String(p[6] || '').trim();
  const d = String(p[12] || '').trim();
  let ts = 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d) && /^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
    /* 新浪/腾讯给的是北京时间 */
    const ms = Date.parse(d + 'T' + t + '+08:00');
    if (Number.isFinite(ms)) ts = ms;
  }
  return { v, ts };
}

const HF_RANGE = [10, 400];   /* 布伦特 / WTI 合理区间，美元/桶 */

async function srcSinaHf() {
  const txt = await getText('https://hq.sinajs.cn/list=hf_OIL,hf_CL', 2500, {
    Referer: 'https://finance.sina.com.cn',
  });
  const map = parseHfMap(txt);
  const b = hfPick(map, 'hf_OIL', HF_RANGE);
  const w = hfPick(map, 'hf_CL', HF_RANGE);
  if (!b && !w) throw new Error('新浪 hf 两个符号都没价');
  return {
    brent: b ? b.v : 0,
    wti: w ? w.v : 0,
    /* 取两个里更新的那个作为数据时间 */
    asOf: new Date(Math.max(b ? b.ts : 0, w ? w.ts : 0) || Date.now()).toISOString(),
    note: '新浪外盘期货（秒级实时）',
  };
}

/* ------------------------------------------------------------------
 * 源 T：腾讯外盘行情 qt.gtimg.cn（★ 本次新增）
 * --------------------------------------------------------------------
 * 实测价龄 44~46s，同样远新于 Yahoo 的 615s。
 *
 * ⚠️ 探针曾把它误判成"与 Yahoo 同为慢速源"：
 *    判据是"连打 3 次（跨 3 秒）值有没有变"，腾讯恰好这 3 秒没跳。
 *    但看【自带时间戳】就知道它价龄只有 44s —— 那是真·实时，
 *    只是刷新节奏比新浪慢一点，不是 10 分钟延迟。
 *    所以这里照常启用，只是排在新浪后面。
 *
 * 报文同样是逗号分隔（早期我按 ~ 解析，一直报"解析不到价格"，已修）：
 *   v_hf_OIL="113.37,2.32,113.28,113.29,114.07,111.03,20:52:56,...,2026-10-30,布伦特原油";
 * ---------------------------------------------------------------- */
async function srcTencentHf() {
  const txt = await getText('https://qt.gtimg.cn/q=hf_OIL,hf_CL', 2500);
  const map = parseHfMap(txt);
  const b = hfPick(map, 'hf_OIL', HF_RANGE);
  const w = hfPick(map, 'hf_CL', HF_RANGE);
  if (!b && !w) throw new Error('腾讯 hf 两个符号都没价');
  return {
    brent: b ? b.v : 0,
    wti: w ? w.v : 0,
    asOf: new Date(Math.max(b ? b.ts : 0, w ? w.ts : 0) || Date.now()).toISOString(),
    note: '腾讯外盘行情（秒级）',
  };
}

/* ------------------------------------------------------------------
 * 源 S2：新浪 http 通道（★ 本次新增，实测依据）
 * --------------------------------------------------------------------
 * 与源 S 是【同一域名、不同协议】。探针 P11 实测：
 *   新浪 http通道  104.198（价龄 1s，真·实时 ✓，均 13ms）
 *
 * 价值：https 那条路若被中间设备干扰 / 证书异常 / TLS 握手失败，
 *       http 通道仍可能通。属于"同厂商的半独立备份"。
 * ---------------------------------------------------------------- */
async function srcSinaHfHttp() {
  const txt = await getText('http://hq.sinajs.cn/list=hf_OIL,hf_CL', 2500, {
    Referer: 'https://finance.sina.com.cn',
  });
  const map = parseHfMap(txt);
  const b = hfPick(map, 'hf_OIL', HF_RANGE);
  const w = hfPick(map, 'hf_CL', HF_RANGE);
  if (!b && !w) throw new Error('新浪 http 通道两个符号都没价');
  return {
    brent: b ? b.v : 0,
    wti: w ? w.v : 0,
    asOf: new Date(Math.max(b ? b.ts : 0, w ? w.ts : 0) || Date.now()).toISOString(),
    note: '新浪外盘期货 http 通道（秒级实时）',
  };
}

/* ------------------------------------------------------------------
 * 源 T2：腾讯备用域名 sqt.gtimg.cn（★ 本次新增，实测依据）
 * --------------------------------------------------------------------
 * 探针 P11 实测：113.63（价龄 22s，真·实时 ✓，均 440ms）
 *
 * 与源 T（qt.gtimg.cn）是【同一数据、不同域名】，独立性比 http 通道更高：
 *   qt 域名挂了，sqt 往往还活着。
 *
 * ★ 排除的三个腾讯域名（P11 实测全死，别再试）：
 *   proxy.finance.gtimg.cn  HTTP 404
 *   data.gtimg.cn           HTTP 404（根本不是行情接口）
 *   ifzq.gtimg.cn           bad params（kline 接口参数不对）
 *   web.ifzq.gtimg.cn       URL illeagal
 *
 * ⚠️ 裸访问 sqt.gtimg.cn 会看到 "bad request" —— 那是没带 ?q= 参数，
 *    带上参数就是好的，别被裸访问的返回误导。
 * ---------------------------------------------------------------- */
async function srcTencentSqt() {
  const txt = await getText('https://sqt.gtimg.cn/q=hf_OIL,hf_CL', 3000);
  const map = parseHfMap(txt);
  const b = hfPick(map, 'hf_OIL', HF_RANGE);
  const w = hfPick(map, 'hf_CL', HF_RANGE);
  if (!b && !w) throw new Error('腾讯 sqt 两个符号都没价');
  return {
    brent: b ? b.v : 0,
    wti: w ? w.v : 0,
    asOf: new Date(Math.max(b ? b.ts : 0, w ? w.ts : 0) || Date.now()).toISOString(),
    note: '腾讯备用域名 sqt.gtimg.cn（秒级）',
  };
}

/* ------------------------------------------------------------------
 * 源 X：straits.live —— ★ 唯一的非新浪/腾讯独立源（最终兜底）
 * --------------------------------------------------------------------
 * 用户指定：排在所有源之后，只有每一个源都拿不到才轮到它。
 *
 * 实测（P11）：
 *   brent 117.32（价龄 546s）  Yahoo 参照 113.12 → 差 4.20（3.7%）
 *   wti   103.64（价龄 549s）  Yahoo 参照 103.70 → 差 0.06（0.1%）
 *   ⚠️ WTI 很准，但布伦特系统性偏高约 3.7%，所以只能当兜底。
 *
 * 为什么还留它：底层虽也是 Yahoo 系（约 10 分钟），
 *   但它是【完全独立的服务与域名】 —— 新浪 + 腾讯同时抽风时的第三条路。
 *
 * 返回两种形态都兼容：{ points:[{iso,brent,wti}] } 或 { brent,wti,asOf }
 * ---------------------------------------------------------------- */
async function srcStraits() {
  const j = await getJson('https://straits.live/api/v1/oil?limit=1', 4000);
  const pickOne = (o, key) => {
    const v = Number(o && o[key]);
    return Number.isFinite(v) && v >= HF_RANGE[0] && v <= HF_RANGE[1] ? v : 0;
  };
  let brent = 0, wti = 0, asOf = '';
  const ps = j && Array.isArray(j.points) ? j.points : null;
  if (ps && ps.length) {
    const last = ps[ps.length - 1];
    brent = pickOne(last, 'brent');
    wti = pickOne(last, 'wti');
    asOf = String((last && last.iso) || '');
  }
  if (!brent) brent = pickOne(j, 'brent');
  if (!wti) wti = pickOne(j, 'wti');
  if (!asOf) asOf = String((j && j.asOf) || '');
  if (!brent && !wti) throw new Error('straits.live 未解析出布伦特/WTI');
  return { brent, wti, asOf, note: 'straits.live 独立源（约 10 分钟，最终兜底）' };
}

/* ------------------------------------------------------------------
 * 源 A：3 号后端 /data —— 用户自有基础设施（★ 本次新增）
 *   走服务端带 X-Access-Key，密钥不会出现在浏览器里。
 *   若返回体带 stale/asOf，一并带出，便于在 /probe 判断数据新旧。
 * ---------------------------------------------------------------- */
async function srcSite3() {
  const j = await getJson(SITE3_BASE + '/data', 4000, {
    'X-Access-Key': site3Key(),
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
/* ------------------------------------------------------------------
 * ★★ Yahoo 取值：优先【最后一根 1 分钟 K 线的 close】，而不是
 *     meta.regularMarketPrice
 * --------------------------------------------------------------------
 * 实测证据（CF HKG 节点，两次探针相隔 4 分钟）：
 *   chart  BZ=F   111.85 → 111.85   ← meta 里的价 4 分钟纹丝不动
 *   spark  BZ=F   111.85 → 111.77   ← 同期真实成交价已经变了
 *   chart  CL=F   102.77 → 102.85   ← WTI 的 meta 倒是跟着动
 *
 * 结论：meta.regularMarketPrice 是 Yahoo 侧的【缓存快照】，
 *       对 BZ=F 这类合约更新极慢。这就是"布伦特好几轮不动、
 *       WTI 一直在跳"的根因 —— 不是源挂了，是取的字段不对。
 *
 * 修法：range=1d&interval=1m 的响应里带着当天每一分钟的 K 线，
 *       取最后一根非空 close = 最新成交价。取不到才回退 meta。
 * ---------------------------------------------------------------- */
export function yahooFresh(j) {
  const r = j && j.chart && j.chart.result && j.chart.result[0];
  if (r) {
    const q = r.indicators && r.indicators.quote && r.indicators.quote[0];
    const arr = q && q.close;
    if (Array.isArray(arr)) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const v = Number(arr[i]);
        if (Number.isFinite(v) && v > 0) return v;   /* 跳过尾部 null */
      }
    }
  }
  const m = r && r.meta;
  const v = Number(m && (m.regularMarketPrice || m.previousClose));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

async function srcBiquote() {
  /* ★ 两个符号分开容错：以前用 Promise.all，只要布伦特那一路挂了，
   *   连已经拿到的 WTI 也一起丢掉（整源判失败）。
   *   现在各带 catch，能拿到几个算几个，缺的那个由后面的源补上。 */
  const [w, b] = await Promise.all([
    getJson('https://biquote.io/api/XTIUSD').catch(() => null),
    getJson('https://biquote.io/api/XBRUSD').catch(() => null),
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
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`, 2500);
    const p = yahooFresh(j);
    if (!p) throw new Error('Yahoo ' + sym + ' 无价');
    return p;
  };
  /* ★ 同上：BZ=F 偶发抽风时，别把已经拿到的 CL=F 一起丢掉 */
  const [wti, brent] = await Promise.all([
    one('CL=F').catch(() => 0),
    one('BZ=F').catch(() => 0),
  ]);
  if (!wti && !brent) throw new Error('Yahoo 两个合约都没价');
  return { brent, wti, note: 'Yahoo 期货，盘中实时' };
}

/* ------------------------------------------------------------------
 * 源 2b：Yahoo Finance —— query2 备用域名（★ 本次新增）
 *   与源 2 是同一数据、不同接入点。query1 抽风时 query2 往往正常。
 * ---------------------------------------------------------------- */
async function srcYahoo2() {
  const one = async (sym) => {
    const j = await getJson(
      `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`, 2500);
    const p = yahooFresh(j);
    if (!p) throw new Error('Yahoo2 ' + sym + ' 无价');
    return p;
  };
  /* ★ 同上：两个合约分开容错 */
  const [wti, brent] = await Promise.all([
    one('CL=F').catch(() => 0),
    one('BZ=F').catch(() => 0),
  ]);
  if (!wti && !brent) throw new Error('Yahoo2 两个合约都没价');
  return { brent, wti, note: 'Yahoo 备用域名 query2' };
}

/* ------------------------------------------------------------------
 * 源 2c：Yahoo spark —— 轻量接口（★ 本次新增，实测依据）
 *   探针实测：52~130ms 通；且【BZ=F 的值确实会变】
 *   （chart 的 meta 是缓存快照不爱动，spark 的 meta 是新鲜的）。
 *   与 chart 互为备份：一个口径出问题，另一个仍能顶上。
 * ---------------------------------------------------------------- */
async function srcYahooSpark() {
  const one = async (sym) => {
    const j = await getJson(
      `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${sym}&range=1d&interval=1m`, 2500);
    const r = j && j.spark && j.spark.result && j.spark.result[0];
    const m = r && r.response && r.response[0] && r.response[0].meta;
    const p = Number(m && (m.regularMarketPrice || m.previousClose));
    if (!p) throw new Error('spark ' + sym + ' 无价');
    return p;
  };
  const [wti, brent] = await Promise.all([
    one('CL%3DF').catch(() => 0),
    one('BZ%3DF').catch(() => 0),
  ]);
  if (!wti && !brent) throw new Error('Yahoo spark 两个合约都没价');
  return { brent, wti, note: 'Yahoo spark 轻量接口' };
}

/* ------------------------------------------------------------------
 * 源 3：Stooq CSV（免费、无需 key）
 *   cb.f = 布伦特，cl.f = WTI
 *   返回 CSV：Symbol,Date,Time,Open,High,Low,Close,Volume
 * ---------------------------------------------------------------- */
async function srcStooq() {
  const one = async (s) => {
    const txt = await getText(`https://stooq.com/q/l/?s=${s}&f=sd2t2ohlcv&h&e=csv`, 2500);
    const lines = txt.trim().split('\n');
    if (lines.length < 2) throw new Error('Stooq ' + s + ' 无数据行');
    const cols = lines[0].split(',');
    const vals = lines[1].split(',');
    const i = cols.indexOf('Close');
    const p = Number(i >= 0 ? vals[i] : vals[vals.length - 2]);
    if (!p) throw new Error('Stooq ' + s + ' 解析不出价');
    return p;
  };
  /* ★ 两个符号分开容错：cb.f（布伦特）常比 cl.f 更容易抽风，
   *   用裸 Promise.all 会连已经拿到的 WTI 一起丢掉。 */
  const [brent, wti] = await Promise.all([
    one('cb.f').catch(() => 0),
    one('cl.f').catch(() => 0),
  ]);
  if (!brent && !wti) throw new Error('Stooq 两个符号都没价');
  return { brent, wti, note: 'Stooq 免费 CSV' };
}

/* ------------------------------------------------------------------
 * 源 4：AmericasOilWatch（免费、无 key、CORS 开放）
 *   注意：它每天 06:00 UTC 更新一次、CDN 缓存 5 分钟
 *   → 严格说不算"实时"，只能算"较新"
 * ---------------------------------------------------------------- */
async function srcOilWatch() {
  /* ★ 同上：两个端点分开容错 */
  const [b, w] = await Promise.all([
    getJson('https://americasoilwatch.com/api/v1/brent').catch(() => null),
    getJson('https://americasoilwatch.com/api/v1/wti').catch(() => null),
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
  const key = CP_API_KEY_RT || '';
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

/* ★ 顺序原则与黄金一致：【自己的源】全部排前面，3号排在最后兜底。
 *
 * 原来 site3 排在第 4 位，意味着 biquote / yahoo / yahoo2 三个自有源
 * 一旦同时卡住（网络抖动时很常见），原油就会转去问 3 号。
 * 虽然 3 号 /data 是只读 KV（不现抓、不消耗配额），但把外部依赖放在
 * 自有源前面，等于让自己站点的实时性受制于另一个站点的可用性。
 *
 * 现在：5 个自有源跑完都没结果，才会轮到 3 号。 */
export const OIL_PROVIDERS = [
  /* ★ 新浪 / 腾讯的四条通道排最前：实测价龄 1~66s，是真·实时；
   *   Yahoo 是 615s 的延迟行情，降级为兜底。
   *
   * 四条通道的分工（独立性从低到高）：
   *   sinahf     https://hq.sinajs.cn   价龄 1~8s  ← 最快，主源
   *   sinahfhttp http://hq.sinajs.cn    价龄 1~2s  ← 同域名不同协议
   *   txsqt      https://sqt.gtimg.cn   价龄 22s   ← 腾讯，与 qt 不同域名
   *   txhf       https://qt.gtimg.cn    价龄 23s   ← 腾讯主域名
   */
  { id: 'sinahf',     label: '新浪外盘期货 hf_OIL/hf_CL（秒级，无需 key）', fn: srcSinaHf },
  { id: 'sinahfhttp', label: '新浪外盘期货 http 通道（同域名不同协议）',     fn: srcSinaHfHttp },
  { id: 'txsqt',      label: '腾讯备用域名 sqt.gtimg.cn（秒级，无需 key）',  fn: srcTencentSqt },
  { id: 'txhf',       label: '腾讯外盘行情 qt.gtimg.cn（秒级，无需 key）',   fn: srcTencentHf },
  { id: 'biquote',  label: 'biquote 券商链路（与黄金同源，无需 key）', fn: srcBiquote },
  { id: 'yahoo',    label: 'Yahoo Finance 期货（无需 key，约 10 分钟延迟）', fn: srcYahoo },
  { id: 'yahoo2',   label: 'Yahoo 备用域名 query2（无需 key）',         fn: srcYahoo2 },
  { id: 'spark',    label: 'Yahoo spark 轻量接口（无需 key）',         fn: srcYahooSpark },
  { id: 'straits',  label: 'straits.live 独立源（约 10 分钟，最终兜底）', fn: srcStraits },
  { id: 'stooq',    label: 'Stooq 免费 CSV（无需 key）',               fn: srcStooq },
  { id: 'oilwatch', label: 'AmericasOilWatch（无需 key，5 分钟缓存）',  fn: srcOilWatch },
  { id: 'site3',    label: '3号后端 ss.wwok.eu.cc（读已存值，兜底）',   fn: srcSite3 },
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

/* 单品种旧值最多沿用多久（毫秒）。brent / wti 各自独立计时。
 * ★ 上一版没有时效，形成自我循环：brent 拿不到 → 用上次的值 →
 *   这个值又被写回缓存 → 下次还是拿它 → 数字永久锁死不动。
 *   实测复现过：连续 6 轮 brent 恒为 111.97，而 wti 一直在变。 */
export const STALE_KEEP_MS = 120000;

/* 缺的那一半用上一次的值顶上，但只顶 STALE_KEEP_MS 这么久。
 * 抽成独立导出函数，是为了能被测试直接调用真代码（而不是测复制品）。 */
export function applyStaleKeep(oilVal, prev) {
  if (!oilVal) return oilVal;
  const now = Date.now();
  const nb = +oilVal.brent || 0, nw = +oilVal.wti || 0;
  const keep = (cur, pv, pat) =>
    cur                                                     ? { v: cur, at: now }
    : (pv && pat && (now - pat) < STALE_KEEP_MS)            ? { v: +pv, at: pat }
    : { v: 0, at: 0 };
  const B = keep(nb, prev && prev.brent, prev && prev.bAt);
  const W = keep(nw, prev && prev.wti,   prev && prev.wAt);
  return { ...oilVal, brent: B.v, wti: W.v, bAt: B.at, wAt: W.at };
}

/* 用 3 号的值补上仍然缺失的那一半。同样抽成导出函数以便测试真代码。
 * ★ 只在【自有源拿不到 + 缓存旧值已过期作废】之后才调用，不是优先项。 */
export function fillFromFallback(oilVal, fb) {
  if (!oilVal || !fb) return oilVal;
  return {
    ...oilVal,
    brent: oilVal.brent || +fb.brent || 0,
    wti:   oilVal.wti   || +fb.wti   || 0,
  };
}

/* 可并发的自有源：稳定、无限流、无需 key。
 * ★ 并发的意义：原来【串行】一个个问，WTI 通常第一个源就给了，
 *   而布伦特要等问到第 2、3、4 个源才补得上，耗时是累加的
 *   （实测 1.3s / 2.6s / 3.9s 递增），很容易撞上 8 秒预算，
 *   于是布伦特还没补到就被迫返回 → 沿用旧值 → 看起来"好几轮不动"。
 *   并发后耗时 = 最慢那一个源，不再累加。 */
/* 串行兜底的自有源：opademo 限流 20 次/小时、cpapi 需付费 key，
 * 不适合每次都并发去打，只在前面全没结果时才试。 */

/* ★★ 取数节奏 —— 重做后的统一规则（不再是层层打补丁）
 *
 *   第 0 步  粘滞源单发：上次成功的源单独问一次，两个品种都齐就收工。
 *            子请求 = 2，绝大多数请求走完这步就结束了，最快。
 *   第 1 步  不齐 → 并发 5 个自有源补缺口（按优先级合流，oilwatch 垫底）。
 *            ★ 这里试过"只并发 2 个、其余串行"的保守方案，实测反而更差：
 *              每源 2.5 秒时串行累加会撞满 8 秒预算（超预算 4/20 拍，
 *              WTI 更新次数从 18 掉到 14）。并发时总耗时 = 最慢那一批。
 *   第 3 步  还是缺 → 返回已有的一半，由上层【短期沿用旧值 / 3号兜底】接上。
 *
 *   ★ 为什么不做"5 个源全并发"：那样一次要同时发 10 个子请求，
 *     在 CF 上会排队、总耗时反而上升，还可能撞并发上限。
 *     现在是"小步快跑 + 按需补齐"，峰值只有 4 个子请求。 */
/*
 * ★★ 快批重排 —— 依据探针实测，只留【真的能拿到价】的源
 * ------------------------------------------------------------------
 * 移出的三个，都是实测必失败、只会白白拖慢的：
 *   biquote  原油两个符号都 HTTP 404（该站实际只有 XAUUSD 黄金），
 *            每次白等 ~250ms 才失败。
 *   stooq    HKG 节点 100% 超时（探针给 8000ms 都没回来），
 *            ★ 它是最大的拖累：并发批耗时 = 最慢那个，
 *              等于每一轮都白等满 2.5 秒超时。
 *   oilwatch 返回 200 但解析不出 price/value/close，等于没有。
 *
 * 留下的三个都是实测 50~130ms 就能拿到值的：yahoo / yahoo2 / spark。
 * 效果：并发批耗时从 2500ms 降到 ~130ms。
 */
/* 第 1 批（真·实时）：新浪 2 条 + 腾讯 2 条，实测 6~440ms、价龄 1~66s。
 * 四条一起并发 = 4 个子请求，任一成功即可，失败才进下一批。
 * ★ 子请求从 2 涨到 4，但总耗时 = 最慢那一个（并发不累加），
 *   实测最慢的 sqt 约 440ms，仍在预算内。 */
const BATCH_FAST = ['sinahf', 'sinahfhttp', 'txsqt', 'txhf'];
/* 第 2 批（延迟兜底）：Yahoo 三兄弟，实测价龄约 620s，
 * 但通断最稳（57~250ms），新浪/腾讯同时抽风时靠它们兜住。 */
const BATCH_SLOW = ['yahoo', 'yahoo2', 'spark'];
/* ★ 并发 5 个源，但【合流严格按优先级】：biquote 给了布伦特就用 biquote 的，
 *   只有排在它前面的源都没给，才会采用 oilwatch 的值。
 *   （oilwatch 每天 06:00 UTC 更新一次 + CDN 缓存 5 分钟，非严格实时，
 *     所以让它"永远排在最后被采用"，而不是禁用 —— 禁用会在慢网下
 *     多一轮串行往返，实测反而撞满 8 秒预算、连 WTI 都被拖慢。） */
/* 串行补缺口：straits.live 是唯一非新浪/腾讯的独立源，
 * 用户指定它做【最终兜底】—— 前面 7 条（新浪4 + Yahoo3）全拿不到才试它。
 * 之所以串行且放这里：它布伦特系统性偏高约 3.7%，不该被高频采用。 */
const BATCH_MORE = ['straits'];

export async function getOilLive(order) {
  const tried = [];
  let merged = null;
  const byId = (id) => OIL_PROVIDERS.find(x => x.id === id);
  const complete = () => !!(merged && merged.brent && merged.wti);

  /* 合流缓冲：某个源只给了一半（例如只有 WTI、布伦特没给）时，
   * 不是当场返回（那会把 brent=0 写进缓存），而是存起来继续补另一个。 */
  const push = (r, p) => {
    const b = Number(r && r.brent) || 0, w = Number(r && r.wti) || 0;
    if (!b && !w) return false;
    const prev = merged;
    merged = {
      brent: (prev && prev.brent) || b,
      wti:   (prev && prev.wti)   || w,
      note:  (prev && prev.note) || (r && r.note) || '',
      asOf:  (prev && prev.asOf) || (r && r.asOf) || '',
      /* ★ 原来写成 (prev&&prev.stale) && (r&&r.stale)：
       *   首次合流时 prev 为 null，整个表达式恒为 false，
       *   于是 3 号返回的 stale:true（"我这是旧值"）被静默吞掉，
       *   上层永远不知道自己在用旧价。改成 || 才会真正往上冒。 */
      stale: !!(r && r.stale) || !!(prev && prev.stale),
      providers: [...((prev && prev.providers) || []), p.id],
    };
    return true;
  };

  const finish = (label) => (merged ? {
    ...merged,
    provider: merged.providers.join('+'),
    providerLabel: label || (byId(merged.providers[merged.providers.length - 1]) || {}).label || '',
    partial: !complete(),
    tried,
  } : null);

  /* 记住成功的源：取优先级最高的那个，避免并发返回顺序抖动导致价格跳 */
  const setSticky = () => {
    const rank = OIL_PROVIDERS.map(x => x.id);
    stickyProvider = merged.providers.slice()
      .sort((a, b) => rank.indexOf(a) - rank.indexOf(b))[0];
  };

  /* 跑一批源（并发）；★ 合并严格按【优先级顺序】而不是返回顺序 */
  const fanout = async (ids) => {
    const ps = ids.map(byId).filter(Boolean);
    if (!ps.length) return;
    const settled = await Promise.all(ps.map(p =>
      p.fn().then(r => ({ p, r }))
           .catch(e => { tried.push({ id: p.id, ok: false, error: String(e && e.message || e) }); return null; })
    ));
    for (const p of ps) {
      const hit = settled.find(x => x && x.p.id === p.id);
      if (!hit) continue;
      if (push(hit.r, hit.p)) {
        tried.push({ id: p.id, ok: true, error: complete() ? '' : '只有一半' });
        if (complete()) break;
      } else {
        tried.push({ id: p.id, ok: false, error: '返回为空' });
      }
    }
  };

  if (order && order.length) { await fanout(order); return finish() || { brent: 0, wti: 0, tried }; }

  /* 第 0 步：粘滞源单发 */
  if (stickyProvider) {
    await fanout([stickyProvider]);
    if (complete()) { setSticky(); return finish(); }
  }

  /* 第 1 步：并发两个最稳的源 */
  await fanout(BATCH_FAST.filter(x => x !== stickyProvider));
  if (complete()) { setSticky(); return finish(); }

  /* 第 2 步：新浪/腾讯都没给齐 → 并发 Yahoo 三兄弟补缺口
   * （它们通断最稳，虽然价龄约 620s，但总比没有强） */
  await fanout(BATCH_SLOW.filter(x => x !== stickyProvider));
  if (complete()) { setSticky(); return finish(); }

  /* 第 3 步：串行补缺口（保留原扩展点，当前为空） */
  for (const id of BATCH_MORE) {
    if (merged && merged.providers.includes(id)) continue;
    await fanout([id]);
    if (complete()) { setSticky(); return finish(); }
  }
  if (merged) { setSticky(); return finish(); }

  /* 第 3 步：自有源一个都没给 → 才轮到 3 号 */
  const s3 = byId('site3');
  if (s3) {
    await fanout(['site3']);
    if (merged) return finish(s3.label);
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
