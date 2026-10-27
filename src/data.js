// ============================================================
// PriceScope — Data layer
// Reads market data from your existing Worker endpoint (/data)
// and exchange rates from a free public source.
// ============================================================

export const SOURCE_WORKER = 'https://ss.wwok.eu.cc/data';

/* 源站 /data 只读 KV —— 不触发真实抓取、不消耗任何 API 配额。
 * 真正消耗配额的是 3 号的 /update（cron 定时 + 手动），与这里无关。
 * 所以前端缓存时间可以放心压短：手刷 /update 之后，
 * 前端最多等 SOURCE_CACHE_TTL 秒就能看到新值，而不必等到次日 04:30。 */
const SOURCE_CACHE_TTL = 10;    // ★ 秒。手刷 /update 后前端最多等这么久就能看到新值

/* ⚠️ 注意这里有【两层】缓存，必须同时改小才有效：
 *
 *   第一层：CF fetch 边缘缓存（下面 fetchSource 里的 cf.cacheTtl）
 *           —— 即使模块级缓存过期了，这一层也会把旧响应再 hold 住，
 *              之前固定写 60 秒，是"改了 TTL 却不见效"的隐形元凶。
 *   第二层：模块级 blockOG / blockCN（本文件的 isFresh 判断）
 *           —— per-isolate 内存缓存，部署或冷启动即清空。
 *
 * 两层现在统一用 SOURCE_CACHE_TTL。想更快就把它调成 5，
 * 代价只是 CF Worker 请求数略增（见下方说明），不动任何 API 配额。 */

/* 3 号（oil-data-worker）已开启私有后端访问控制，
 * 访问 /data 必须携带此密钥，否则返回 403。
 * ⚠️ 必须与 3 号 wrangler.toml 里的 ACCESS_KEY 完全一致，
 *    否则 2 号站取不到任何行情数据（页面空白）。 */
const SOURCE_ACCESS_KEY = 'lfwczh8pa4atakrpj7uwhybo2vexc76u';
// Primary FX source: the keyless ExchangeRate-API open endpoint. It refreshes
// every 24h at ~00:00 UTC — INCLUDING weekends — so the date on the page stays
// current. The ECB/Frankfurter feed publishes on business days only, which was
// why the site kept showing a stale Friday date throughout the weekend.
export const FX_ENDPOINT = 'https://open.er-api.com/v6/latest/USD';
export const FX_FALLBACK = 'https://api.frankfurter.dev/v1/latest?base=USD';

// ============================================================
// Daily refresh schedule (Asia/Shanghai = UTC+8)
// Your source Worker updates:
//   - intl oil + gold ...... 04:00 (UTC+8)
//   - China fuel prices .... after 08:00 (UTC+8)
// Each block is refreshed INDEPENDENTLY, right after its own source update:
//   - oil + gold ....... pull at 04:30 (UTC+8)   <- 30 min after 04:00
//   - China fuel ....... pull at 08:30 (UTC+8)   <- after 08:00
//   - FX ............... pull at 09:30 (UTC+8)   <- after the ~00:00 UTC refresh
// One stale block never delays the other.
// ============================================================
export const TZ_OFFSET_HOURS = 8;
export const REFRESH_SCHEDULE = {
  oilGold: { h: 4, m: 30 },  // 04:30 Asia/Shanghai — intl oil + gold
  cnOil: { h: 8, m: 30 },    // 08:30 Asia/Shanghai — China fuel prices
  fx: { h: 9, m: 30 },       // 09:30 Asia/Shanghai — FX (upstream ~00:00 UTC = 08:00 UTC+8)
};

// ============================================================
// Timestamp normalisation
// Your source Worker emits THREE different time formats:
//   - "2026-10-18T08:15:40.548Z"   ISO with Z      -> real UTC, use as-is
//   - "2026/10/18 16:15:40"        Asia/Shanghai   -> wall clock, NO zone marker
//   - "2026-10-18 08:15:44"        ambiguous
// Rule: anything carrying Z or a +/-offset is trusted; anything without a
// zone marker is treated as Asia/Shanghai wall clock and shifted to UTC.
// Without this, "16:15" (Beijing) was printed as "16:15 UTC" — 8h wrong.
// ============================================================
const SRC_TZ_MINUTES = TZ_OFFSET_HOURS * 60;

export function toUtcIso(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    const n = new Date(v);
    return isNaN(n) ? null : n.toISOString();
  }
  const s = String(v).trim();
  if (!s) return null;

  // 1) already carries an explicit zone (Z or +08:00 / -0500)
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d.toISOString();
  }

  // 2) naive string -> parse the components ourselves.
  //    Do NOT use new Date(s): it interprets the string in the RUNTIME's
  //    local zone (UTC on Workers, but Asia/Shanghai in some sandboxes),
  //    which would silently shift the result by hours.
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;

  const utcMs = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  return new Date(utcMs - SRC_TZ_MINUTES * 60000).toISOString();
}

// Seconds until the next daily refresh moment.
// Guarantees the cache always expires exactly AFTER the source has refreshed.
export function secondsUntilDailyRefresh(h, m) {
  const nowMs = Date.now();
  const local = new Date(nowMs + TZ_OFFSET_HOURS * 3600 * 1000);
  const target = new Date(local);
  target.setUTCHours(h, m, 0, 0);
  let targetMs = target.getTime() - TZ_OFFSET_HOURS * 3600 * 1000;
  if (targetMs <= nowMs) targetMs += 24 * 3600 * 1000; // already passed -> tomorrow
  return Math.floor((targetMs - nowMs) / 1000);
}

// Major currencies shown in the converter
export const CURRENCIES = [
  { c: 'USD', n: 'US Dollar' },
  { c: 'EUR', n: 'Euro' },
  { c: 'CNY', n: 'Chinese Yuan' },
  { c: 'JPY', n: 'Japanese Yen' },
  { c: 'GBP', n: 'British Pound' },
  { c: 'AUD', n: 'Australian Dollar' },
  { c: 'CAD', n: 'Canadian Dollar' },
  { c: 'CHF', n: 'Swiss Franc' },
  { c: 'HKD', n: 'Hong Kong Dollar' },
  { c: 'SGD', n: 'Singapore Dollar' },
  { c: 'KRW', n: 'South Korean Won' },
  { c: 'INR', n: 'Indian Rupee' },
  { c: 'BRL', n: 'Brazilian Real' },
  { c: 'RUB', n: 'Russian Ruble' },
  { c: 'MXN', n: 'Mexican Peso' },
  { c: 'IDR', n: 'Indonesian Rupiah' },
  { c: 'THB', n: 'Thai Baht' },
  { c: 'VND', n: 'Vietnamese Dong' },
  { c: 'MYR', n: 'Malaysian Ringgit' },
  { c: 'PHP', n: 'Philippine Peso' },
  { c: 'TRY', n: 'Turkish Lira' },
  { c: 'ZAR', n: 'South African Rand' },
  { c: 'AED', n: 'UAE Dirham' },
  { c: 'SAR', n: 'Saudi Riyal' },
  { c: 'NZD', n: 'New Zealand Dollar' },
  { c: 'SEK', n: 'Swedish Krona' },
  { c: 'NOK', n: 'Norwegian Krone' },
  { c: 'PLN', n: 'Polish Zloty' },
  { c: 'TWD', n: 'New Taiwan Dollar' },
  { c: 'NGN', n: 'Nigerian Naira' },
];

// Popular pairs rendered server-side (great for SEO: real numbers in HTML)
export const POPULAR_PAIRS = [
  ['USD', 'CNY'], ['USD', 'EUR'], ['USD', 'JPY'], ['EUR', 'USD'],
  ['GBP', 'USD'], ['USD', 'GBP'], ['CNY', 'USD'], ['USD', 'KRW'],
];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
async function fetchCached(url, ttlSeconds) {
  const req = new Request(url, {
    headers: {
      'User-Agent': 'PriceScope/1.0 (+https://you.piccalc.com)',
      'Accept': 'application/json',
    },
  });
  const cache = caches.default;

  // 1) Serve from cache ONLY while it is still fresh (we track age ourselves,
  //    so a daily schedule is honoured exactly, not "cached forever").
  try {
    const hit = await cache.match(req);
    if (hit) {
      const payload = await hit.json();
      const age = (Date.now() - (payload.__ps_ts || 0)) / 1000;
      if (payload && payload.__ps_data && age < (payload.__ps_ttl || 0)) {
        return payload.__ps_data;
      }
      try { await cache.delete(req); } catch (_) {} // stale -> drop, re-fetch
    }
  } catch (_) { /* cache miss */ }

  // 2) Re-fetch from origin
  const res = await fetch(req, {
    cf: { cacheTtl: Math.max(ttlSeconds, 60), cacheEverything: true },
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const data = await res.json();

  // 3) Store with our own freshness stamp
  const payload = { __ps_ts: Date.now(), __ps_ttl: ttlSeconds, __ps_data: data };
  try {
    await cache.put(req, new Response(JSON.stringify(payload), {
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=${ttlSeconds}`,
      },
    }));
  } catch (_) {}
  return data;
}

// last known good values, kept per-isolate so a blip never blanks the site
let lastMarket = null;
let lastFx = null;

// ---- independent refresh blocks -----------------------------
// oil+gold and China fuel each keep their own timestamp, so they
// expire and re-fetch on their OWN daily schedule.
let blockOG = null;   // { ts, ttl, data: { oil, gold } }
let blockCN = null;   // { ts, ttl, data: { cnOil } }
let inflightSource = null; // de-dupes concurrent fetches of /data

function isFresh(block) {
  return !!block && (Date.now() - block.ts) / 1000 < block.ttl;
}

// One real fetch of your source Worker, shared by concurrent callers.
async function fetchSource() {
  if (inflightSource) return inflightSource;
  inflightSource = (async () => {
    try {
      const res = await fetch(SOURCE_WORKER, {
        headers: {
          'User-Agent': 'PriceScope/1.0 (+https://you.piccalc.com)',
          'Accept': 'application/json',
          // 3 号已开启私有后端访问控制，需携带同一密钥
          'X-Access-Key': SOURCE_ACCESS_KEY,
        },
        // ★ 第一层缓存：与模块级统一，否则改了 TTL 也不生效
        cf: { cacheTtl: SOURCE_CACHE_TTL, cacheEverything: true },
      });
      if (!res.ok) throw new Error(`Upstream ${res.status}`);
      return normalise(await res.json());
    } finally {
      inflightSource = null;
    }
  })();
  return inflightSource;
}

// Refresh only the block that is due; leave the other one untouched.
async function ensureBlock(which) {
  const sched = REFRESH_SCHEDULE[which];
  if (which === 'oilGold' && isFresh(blockOG)) return;
  if (which === 'cnOil' && isFresh(blockCN)) return;
  const n = await fetchSource();
  if (!n) return;
  const ttl = Math.min(secondsUntilDailyRefresh(sched.h, sched.m), SOURCE_CACHE_TTL);
  if (which === 'oilGold') {
    // WTI rides along with the oil block — it comes from the same upstream
    // request, so it refreshes on the identical schedule at zero extra cost.
    blockOG = { ts: Date.now(), ttl, data: { oil: n.oil, gold: n.gold, wti: n.wti } };
  } else {
    blockCN = { ts: Date.now(), ttl, data: { cnOil: n.cnOil } };
  }
}

// ------------------------------------------------------------
// Normalise your existing Worker payload
// Handles mixed keys: 省 / 省份 / province
// ------------------------------------------------------------
export function normalise(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const oilRaw = raw['油'] || raw.oil || {};
  const goldRaw = raw['金子'] || raw.gold || {};
  const cnRaw = raw.cn_oil || raw['cn_oil'] || {};
  const wtiRaw = raw.wti || raw['wti'] || {};

  const listSrc = Array.isArray(cnRaw.list) ? cnRaw.list
    : Array.isArray(cnRaw['列表']) ? cnRaw['列表']
    : [];

  const list = listSrc.map(p => ({
    prov: p['省'] || p['省份'] || p.province || '',
    p92: p.p92 ?? p['92'] ?? null,
    p95: p.p95 ?? p['95'] ?? null,
    p98: p.p98 ?? p['98'] ?? null,
    p0: p.p0 ?? p['0'] ?? null,
  })).filter(x => x.prov);

  return {
    oil: {
      price: oilRaw.price ?? oilRaw['价格'] ?? null,
      formatted: oilRaw['格式化后'] ?? oilRaw.formatted ?? null,
      updated: toUtcIso(oilRaw.updatedLocal || oilRaw['更新时间'])
            || toUtcIso(oilRaw.timestamp || oilRaw['时间戳'])
            || null,
      isSettlement: oilRaw.isSettlement ?? oilRaw['isSettlement'] ?? false,
    },
    gold: {
      usdOz: goldRaw.priceUsdPerOz ?? null,
      cnyGram: goldRaw.priceCnyPerGram ?? null,
      updated: toUtcIso(goldRaw.updatedAt || goldRaw.updated) || null,
    },
    cnOil: {
      list,
      updated: toUtcIso(cnRaw.updatedAt || cnRaw.updated) || null,
      note: cnRaw.note || '',
      source: cnRaw.source || '',
    },
    // WTI — same upstream request as Brent (by_code=BRENT_CRUDE_USD,WTI_USD),
    // so it costs no extra API quota. Absent on older upstream builds.
    wti: {
      price: wtiRaw.price ?? null,
      formatted: wtiRaw.formatted ?? null,
      updated: toUtcIso(wtiRaw.updatedLocal || wtiRaw.timestamp) || null,
      isSettlement: wtiRaw.isSettlement ?? false,
    },
    fetchedAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// Public getters
// ------------------------------------------------------------
const EMPTY_OIL = { price: null, formatted: null, updated: null, isSettlement: false };
const EMPTY_GOLD = { usdOz: null, cnyGram: null, updated: null };
const EMPTY_CN = { list: [], updated: null, note: '', source: '' };
const EMPTY_WTI = { price: null, formatted: null, updated: null, isSettlement: false };

export async function getMarket() {
  try {
    // both blocks checked in parallel; fetchSource() de-dupes so a cold
    // start costs exactly ONE upstream request
    await Promise.all([ensureBlock('oilGold'), ensureBlock('cnOil')]);
    const og = (blockOG && blockOG.data) || {};
    const cn = (blockCN && blockCN.data) || {};
    const n = {
      oil: og.oil || EMPTY_OIL,
      gold: og.gold || EMPTY_GOLD,
      cnOil: cn.cnOil || EMPTY_CN,
      wti: og.wti || EMPTY_WTI,
      fetchedAt: new Date().toISOString(),
    };
    if (n.oil.price || n.gold.usdOz || n.cnOil.list.length) {
      lastMarket = n;
      return n;
    }
  } catch (e) {
    /* fall through to last good */
  }
  return lastMarket;
}

// Accepts either upstream shape:
//   er-api      -> { result, time_last_update_utc, rates }
//   frankfurter -> { date, rates }
// Both are normalised to { base: 'USD', date: 'YYYY-MM-DD', rates }.
function parseFx(raw) {
  if (!raw || !raw.rates) return null;
  const rates = { USD: 1, ...raw.rates };
  if (Object.keys(rates).length < 3) return null;
  let date = null;
  if (raw.date) {
    date = String(raw.date).slice(0, 10);
  } else if (raw.time_last_update_utc) {
    const d = new Date(raw.time_last_update_utc);
    if (!isNaN(d)) date = d.toISOString().slice(0, 10);
  }
  if (!date) date = new Date().toISOString().slice(0, 10);
  return { base: 'USD', date, rates };
}

export async function getFx() {
  const ttl = secondsUntilDailyRefresh(REFRESH_SCHEDULE.fx.h, REFRESH_SCHEDULE.fx.m);
  // once per day, at 09:30 Asia/Shanghai (right after the ~00:00 UTC refresh)
  try {
    const p = parseFx(await fetchCached(FX_ENDPOINT, ttl));
    if (p) { lastFx = p; return lastFx; }
  } catch (e) { /* try fallback */ }
  try {
    const p = parseFx(await fetchCached(FX_FALLBACK, ttl));
    if (p) { lastFx = p; return lastFx; }
  } catch (e) { /* keep last good value */ }
  return lastFx;
}

// Convert using USD-based rate table
export function convert(amount, from, to, fx) {
  if (!fx || !fx.rates) return null;
  const f = fx.rates[from];
  const tt = fx.rates[to];
  if (f == null || tt == null) return null;
  return (amount / f) * tt;
}

export function rateOf(from, to, fx) {
  if (!fx || !fx.rates) return null;
  const f = fx.rates[from];
  const tt = fx.rates[to];
  if (f == null || tt == null) return null;
  return tt / f;
}

export function fmt(n, dp = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// ============================================================
// ★ A22：黄金现抓代理（/api/gold-live）
// ------------------------------------------------------------
// 前端那条实时链路（直连 biquote）全部失败时的最后一条路：
// 让 3 号【现在】去源站抓一个新价，而不是把 KV 里的旧值给它。
//
// ⚠️ 为什么要走 2 号 Worker 转发，而不是前端直接调 3 号：
//    3 号是私有后端，调用要带 ACCESS_KEY。
//    密钥一旦写进前端 JS，就等于公开在页面源码里 —— 绝对不行。
//    所以由 2 号服务端带密钥去问，前端只调自己域名的 /api/gold-live。
//    附带好处：同源请求，没有 CORS 问题。
// ============================================================
export const GOLD_LIVE_UPSTREAM = 'https://ss.wwok.eu.cc/gold/live';

export async function fetchGoldLive() {
  try {
    const res = await fetch(GOLD_LIVE_UPSTREAM, {
      headers: {
        'User-Agent': 'PriceScope/1.0 (+https://you.piccalc.com)',
        'Accept': 'application/json',
        'X-Access-Key': SOURCE_ACCESS_KEY,
      },
      cf: { cacheTtl: 0 },        // 现抓就是要新，一层缓存都不能有
    });
    if (!res.ok) return { ok: false, error: `Upstream ${res.status}` };
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
