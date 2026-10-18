// ============================================================
// PriceScope — Data layer
// Reads market data from your existing Worker endpoint (/data)
// and exchange rates from a free public source.
// ============================================================

export const SOURCE_WORKER = 'https://ss.wwok.eu.cc/data';
export const FX_ENDPOINT = 'https://api.frankfurter.app/latest?base=USD';

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
  try {
    const hit = await cache.match(req);
    if (hit) return await hit.json();
  } catch (_) { /* cache miss */ }

  const res = await fetch(req, { cf: { cacheTtl: ttlSeconds, cacheEverything: true } });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const data = await res.json();
  try { await cache.put(req, new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })); } catch (_) {}
  return data;
}

// last known good values, kept per-isolate so a blip never blanks the site
let lastMarket = null;
let lastFx = null;

// ------------------------------------------------------------
// Normalise your existing Worker payload
// Handles mixed keys: 省 / 省份 / province
// ------------------------------------------------------------
export function normalise(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const oilRaw = raw['油'] || raw.oil || {};
  const goldRaw = raw['金子'] || raw.gold || {};
  const cnRaw = raw.cn_oil || raw['cn_oil'] || {};

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
      updated: oilRaw.updatedLocal || oilRaw.timestamp || null,
      isSettlement: oilRaw.isSettlement ?? oilRaw['isSettlement'] ?? false,
    },
    gold: {
      usdOz: goldRaw.priceUsdPerOz ?? null,
      cnyGram: goldRaw.priceCnyPerGram ?? null,
      updated: goldRaw.updatedAt || null,
    },
    cnOil: {
      list,
      updated: cnRaw.updatedAt || null,
      note: cnRaw.note || '',
      source: cnRaw.source || '',
    },
    fetchedAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// Public getters
// ------------------------------------------------------------
export async function getMarket() {
  try {
    const raw = await fetchCached(SOURCE_WORKER, 300); // 5 minutes
    const n = normalise(raw);
    if (n && (n.oil.price || n.gold.usdOz || n.cnOil.list.length)) {
      lastMarket = n;
      return n;
    }
  } catch (e) {
    /* fall through to last good */
  }
  return lastMarket;
}

export async function getFx() {
  try {
    const raw = await fetchCached(FX_ENDPOINT, 3600); // 1 hour
    if (raw && raw.rates) {
      const rates = { USD: 1, ...raw.rates };
      lastFx = { base: 'USD', date: raw.date, rates };
      return lastFx;
    }
  } catch (e) {
    /* fall through */
  }
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
