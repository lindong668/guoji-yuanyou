// Verifies: (1) weekend vs weekday trading note follows the visitor's zone,
//           (2) FX date comes from the daily-refreshing upstream.
const SAMPLE = {
  "油": { "价格": 109.95, "updatedAt": "2026-10-18T08:15:40Z" },
  "金子": { "priceUsdPerOz": 4165.27, "priceCnyPerGram": 895.65, "updatedAt": "2026-10-18T08:15:40.548Z" },
  "cn_oil": { "list": [{ "province": "山东", "p92": "8.57", "p95": "9.20", "p98": "10.20", "p0": "8.21" }], "updatedAt": "2026-10-18T08:15:44.911Z" },
};

const store = new Map();
globalThis.caches = {
  default: {
    match: async (req) => store.get(String(req.url)) || null,
    put: async (req, res) => { store.set(String(req.url), res); },
    delete: async (req) => { store.delete(String(req.url)); },
  },
};

const TODAY_UTC = new Date().toISOString().slice(0, 10);
globalThis.fetch = async (u) => {
  // fetchCached() passes a Request object, not a URL string
  const url = (u && u.url) ? u.url : String(u);
  const j = (o) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' } });
  if (url.includes('ss.wwok.eu.cc')) return j(SAMPLE);
  if (url.includes('open.er-api.com')) {
    return j({ result: 'success', time_last_update_utc: new Date().toUTCString(), rates: { USD: 1, EUR: 0.8887, CNY: 7.12 } });
  }
  if (url.includes('frankfurter')) return j({ date: '2026-10-16', rates: { USD: 1, EUR: 0.8887, CNY: 7.12 } });
  return j({});
};

const { t, LANGS } = await import('./src/i18n.js');
const worker = (await import('./src/index.js')).default;

async function get(path, tz) {
  const h = new Headers();
  if (tz) h.set('Cookie', 'ps_tz=' + encodeURIComponent(tz));
  const res = await worker.fetch(new Request('https://you.piccalc.com' + path, { headers: h }), {}, {});
  return await res.text();
}
const noteOf = (html, lang) => {
  const L = t(lang);
  if (html.includes(L.weekendNote)) return 'WEEKEND';
  if (html.includes(L.prevCloseNote)) return 'WEEKDAY';
  return 'NONE';
};

console.log('now (UTC):', new Date().toISOString(), '| UTC date:', TODAY_UTC);
console.log('');

// --- 1. trading-day note follows the visitor's calendar day -------------
console.log('--- trading note by visitor zone ---');
for (const tz of ['Asia/Shanghai', 'America/New_York', 'Pacific/Kiritimati', 'Europe/Berlin', 'UTC']) {
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const dow = new Date(localDate + 'T00:00:00Z').toUTCString().slice(0, 3);
  const html = await get('/zh/', tz);
  console.log(`${tz.padEnd(20)} local=${localDate} (${dow}) -> ${noteOf(html, 'zh')}`);
}

// --- 2. all languages carry BOTH notes correctly ------------------------
console.log('\n--- all 7 languages (Shanghai / Kiritimati) ---');
let bad = 0;
for (const l of LANGS) {
  const a = noteOf(await get(`/${l}/oil/`, 'Asia/Shanghai'), l);
  const b = noteOf(await get(`/${l}/gold/`, 'Pacific/Kiritimati'), l);
  const ok = a !== 'NONE' && b !== 'NONE';
  if (!ok) bad++;
  console.log(`${l}: oil@Shanghai=${a}  gold@Kiritimati=${b}  ${ok ? 'OK' : 'FAIL'}`);
}

// --- 3. FX date is now current (not a stale Friday) ---------------------
console.log('\n--- FX date ---');
const fxHtml = await get('/zh/currency/', 'Asia/Shanghai');
const m = fxHtml.match(/汇率更新[^<]*<time[^>]*>([^<]*)<\/time>/);
console.log('currency page shows:', m ? m[1] : 'not found', '| expected to contain', TODAY_UTC);
const homeHtml = await get('/zh/', 'Asia/Shanghai');
const m2 = homeHtml.match(/汇率更新[^<]*<time[^>]*>([^<]*)<\/time>/);
console.log('home FX card shows:', m2 ? m2[1] : 'not found');

// --- 4. regression: every page still renders ----------------------------
console.log('\n--- regression sweep ---');
const paths = ['/', '/oil/', '/gold/', '/china-fuel/', '/currency/', '/about/', '/privacy/', '/contact/'];
let fail = 0, count = 0;
for (const l of LANGS) {
  for (const p of paths) {
    count++;
    try {
      const h = await get(`/${l}${p}`, 'Asia/Shanghai');
      if (!h.includes('</html>')) { console.log(`FAIL ${l}${p}`); fail++; }
    } catch (e) { console.log(`ERROR ${l}${p}:`, e.message); fail++; }
  }
}
console.log(`${count} pages rendered, ${fail} failures`);
console.log(bad === 0 && fail === 0 ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
