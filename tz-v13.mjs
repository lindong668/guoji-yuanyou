// v13 regression suite:
//  1) server renders: concurrent visitors keep their own zone
//  2) the SHIPPED inline script is executed against a fake DOM — verifies the
//     ps_tz cookie now re-syncs when the browser zone changes (the bug that
//     made a timezone change impossible to undo)
//  3) date-only elements must not slide a day
import { normalise } from './src/data.js';
import { renderHome, renderOil, renderGold, renderCn, renderFx, renderPrivacy } from './src/pages.js';
import { page } from './src/ui.js';

const sample = {
  "油": { "价格": 109.95, "格式化后": "$109.95", "timestamp": "2026-10-18T08:06:18.047Z", "updatedLocal": "2026/10/18 16:15:40", "isSettlement": false },
  "金子": { "priceUsdPerOz": 4165.27, "priceCnyPerGram": 895.65, "updatedAt": "2026-10-18T08:15:40.548Z" },
  "cn_oil": { "list": [{ "province": "山东", "p92": "8.57", "p95": "9.20", "p98": "10.20", "p0": "8.21" }], "updatedAt": "2026-10-18T08:15:44.911Z" }
};
const m = normalise(sample);
const fx = { date: '2026-10-16', rates: { EUR: 0.8887 } };

let pass = 0, fail = 0;
const ok = (l, c) => { c ? pass++ : fail++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + l); };

async function req(tz, delay) {
  await new Promise(r => setTimeout(r, delay));
  return tz;
}

console.log('=== 1. concurrent server renders ===');
const [nyTz, shTz, tkTz] = await Promise.all([req('America/New_York', 60), req('Asia/Shanghai', 5), req('Asia/Tokyo', 30)]);
const ny = renderHome('zh', m, fx, nyTz);
const sh = renderHome('zh', m, fx, shTz);
const tk = renderHome('zh', m, fx, tkTz);
const t = h => [...h.matchAll(/<time[^>]*data-ts[^>]*>([^<]*)<\/time>/g)].map(x => x[1]);
console.log(' NY:', t(ny)[0], '| SH:', t(sh)[0], '| TK:', t(tk)[0]);
ok('NY 04:15', t(ny)[0].includes('04:15'));
ok('Shanghai 16:15', t(sh)[0].includes('16:15'));
ok('Tokyo 17:15', t(tk)[0].includes('17:15'));
ok('no cross-leak', t(ny)[0] !== t(sh)[0] && t(sh)[0] !== t(tk)[0]);

console.log('\n=== 2. shipped inline script (real child processes) ===');
import { execFileSync } from 'node:child_process';
function sim(browserTz, cookie) {
  const out = execFileSync('node', ['tz-child.mjs', browserTz, cookie, 'zh'], { encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}
let r = sim('Asia/Shanghai', '');
ok('cookie written on first visit', /ps_tz=Asia%2FShanghai/.test(r.cookie));
ok('Shanghai shows 16:15', r.times.some(x => x.includes('16:15')));

r = sim('America/New_York', 'ps_tz=Asia%2FShanghai');
ok('cookie RE-SYNCS to New York (was the bug)', /ps_tz=America%2FNew_York/.test(r.cookie));
ok('page shows 04:15 after switching', r.times.some(x => x.includes('04:15')));

r = sim('Asia/Shanghai', 'ps_tz=America%2FNew_York');
ok('cookie switches BACK to Shanghai', /ps_tz=Asia%2FShanghai/.test(r.cookie));
ok('page shows 16:15 again', r.times.some(x => x.includes('16:15')));

r = sim('America/Los_Angeles', '');
ok('Los_Angeles shows 01:15', r.times.some(x => x.includes('01:15')));

console.log('\n=== 3. date-only must not slide a day ===');
const fxHtml = renderFx('zh', fx, 'America/New_York');
const fxEl = /<time[^>]*data-date-only="1"[^>]*>([^<]*)<\/time>/.exec(fxHtml);
ok('fx date marked date-only', !!fxEl);
console.log(' fx date (NY visitor):', fxEl?.[1]);
ok('fx date stays on the 16th, not the 15th', /16/.test(fxEl?.[1] || '') && !/15/.test(fxEl?.[1] || ''));
ok('client keeps fx date at UTC across zones', ['America/New_York','Asia/Tokyo','Pacific/Kiritimati'].every(z => sim(z, '').times.some(x => /2026\/10\/16/.test(x))));

console.log('\n=== 4. all pages × all languages still render ===');
const LANGS = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'pt'];
let n = 0;
for (const L of LANGS) {
  for (const [name, fn] of [['home', () => renderHome(L, m, fx, 'Asia/Shanghai')], ['oil', () => renderOil(L, m, 'Asia/Shanghai')],
    ['gold', () => renderGold(L, m, 'Asia/Shanghai')], ['cn', () => renderCn(L, m, 'Asia/Shanghai')],
    ['fx', () => renderFx(L, fx, 'Asia/Shanghai')], ['privacy', () => renderPrivacy(L, 'Asia/Shanghai')]]) {
    try { const h = fn(); if (!h || h.length < 50) throw new Error('empty'); n++; }
    catch (e) { fail++; console.log('FAIL — ' + L + '/' + name + ': ' + e.message); }
  }
}
ok('42 page renders OK', n === 42);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
