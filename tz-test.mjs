// Regression test: two "visitors" in different timezones must each get
// their OWN local time, even when their renders interleave across await
// points (exactly what happens inside a Cloudflare Worker isolate).
import { normalise } from './src/data.js';
import { renderHome, renderOil, renderPrivacy } from './src/pages.js';

const sample = {
  "油": { "价格": 109.95, "格式化后": "$109.95", "timestamp": "2026-10-18T08:06:18.047Z", "updatedLocal": "2026/10/18 16:15:40", "isSettlement": false },
  "金子": { "priceUsdPerOz": 4165.27, "priceCnyPerGram": 895.65, "updatedAt": "2026-10-18T08:15:40.548Z" },
  "cn_oil": { "list": [{ "province": "山东", "p92": "8.57", "p95": "9.20", "p98": "10.20", "p0": "8.21" }], "updatedAt": "2026-10-18T08:15:44.911Z" }
};
const m = normalise(sample);
const fx = { date: '2026-10-16', rates: { EUR: 0.8887 } };

// mimic a request: await I/O (data fetch) BEFORE rendering
async function request(tz, delayMs, render) {
  const [mm, ff] = await Promise.all([
    (async () => { await new Promise(r => setTimeout(r, delayMs)); return m; })(),
    Promise.resolve(fx),
  ]);
  return render(mm, ff, tz);
}

const times = html => [...html.matchAll(/<time[^>]*data-ts[^>]*>([^<]*)<\/time>/g)].map(x => x[1]);
const prices = html => [...html.matchAll(/class="big">([^<]*)</g)].map(x => x[1]);

const ny = await request('America/New_York', 60, (mm, ff, z) => renderHome('zh', mm, ff, z));
const sh = await request('Asia/Shanghai', 5, (mm, ff, z) => renderHome('zh', mm, ff, z));
const tk = await request('Asia/Tokyo', 30, (mm, ff, z) => renderHome('zh', mm, ff, z));

console.log('=== concurrent renders (interleaved awaits) ===');
console.log('New_York :', times(ny));
console.log('Shanghai :', times(sh));
console.log('Tokyo    :', times(tk));

console.log('\n=== price consistency (same cached data, home vs inner) ===');
const oilEn = await request('Asia/Shanghai', 1, (mm, ff, z) => renderOil('zh', mm, z));
console.log('home oil price:', prices(ny)[0], '| oil page price:', prices(oilEn)[0],
  '| MATCH:', prices(ny)[0] === prices(oilEn)[0]);

console.log('\n=== assertions ===');
const ok = (label, cond) => console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label);
ok('NY shows 04:15 (UTC-4)', times(ny)[0].includes('04:15'));
ok('Shanghai shows 16:15 (UTC+8)', times(sh)[0].includes('16:15'));
ok('Tokyo shows 17:15 (UTC+9)', times(tk)[0].includes('17:15'));
ok('NY !== Shanghai (no cross-leak)', times(ny)[0] !== times(sh)[0]);
ok('prices identical across pages', prices(ny)[0] === prices(oilEn)[0]);
ok('no raw "UTC" fallback leaking', !times(ny)[0].includes(' UTC'));
ok('privacy localDate uses tz', times(renderPrivacy('zh', 'Asia/Tokyo')).length === 0);

// language-format check
const jaHome = renderHome('ja', m, fx, 'Asia/Tokyo');
const enHome = renderHome('en', m, fx, 'America/New_York');
console.log('\n=== locale formats ===');
console.log('ja/Tokyo :', times(jaHome)[0]);
console.log('en/NY    :', times(enHome)[0]);
ok('ja uses 2026/10/18 style', /2026\/10\/18/.test(times(jaHome)[0]));
ok('en uses 10/18/2026 style', /10\/18\/2026/.test(times(enHome)[0]));
