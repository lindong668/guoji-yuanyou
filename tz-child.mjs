// Runs the SHIPPED inline script in a fake DOM, with the "browser timezone"
// supplied by the real TZ env var (so Intl genuinely reports that zone).
// Usage: node tz-child.mjs <browserTz> <initialCookie> <lang>
import { normalise } from './src/data.js';
import { renderHome } from './src/pages.js';
import { page } from './src/ui.js';

const [browserTz, cookie, lang] = process.argv.slice(2);
process.env.TZ = browserTz;

const sample = {
  "油": { "价格": 109.95, "格式化后": "$109.95", "timestamp": "2026-10-18T08:06:18.047Z", "updatedLocal": "2026/10/18 16:15:40", "isSettlement": false },
  "金子": { "priceUsdPerOz": 4165.27, "priceCnyPerGram": 895.65, "updatedAt": "2026-10-18T08:15:40.548Z" },
  "cn_oil": { "list": [{ "province": "山东", "p92": "8.57", "p95": "9.20", "p98": "10.20", "p0": "8.21" }], "updatedAt": "2026-10-18T08:15:44.911Z" }
};
const m = normalise(sample);
const fx = { date: '2026-10-16', rates: { EUR: 0.8887 } };

// server renders with the OLD cookie's zone (that's the whole scenario)
const serverTz = cookie ? decodeURIComponent(/ps_tz=([^;]*)/.exec(cookie)?.[1] || 'UTC') : 'UTC';
const html = page({ lang, title: 'x', desc: 'y', path: '/' + lang + '/', active: '/', body: renderHome(lang, m, fx, serverTz) });
const script = /<script>([\s\S]*?)<\/script>\s*<\/body>/.exec(html)?.[1];

const timeEls = [...html.matchAll(/<time([^>]*)>([^<]*)<\/time>/g)].map(([, attrs, text]) => {
  const get = n => new RegExp(n + '="([^"]*)"').exec(attrs)?.[1] ?? null;
  return { getAttribute: get, textContent: text };
});
const doc = {
  documentElement: { lang: lang === 'zh' ? 'zh-CN' : 'en-US', setAttribute() {} },
  cookie, readyState: 'complete', visibilityState: 'visible',
  querySelectorAll: () => timeEls, addEventListener() {},
};
globalThis.document = doc;
globalThis.window = { addEventListener() {} };
try { new Function(script)(); } finally { delete globalThis.document; delete globalThis.window; }

console.log(JSON.stringify({
  resolvedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  cookie: doc.cookie,
  times: timeEls.map(e => e.textContent),
}));
