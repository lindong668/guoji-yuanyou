// End-to-end: cookie ps_tz must drive the SERVER-rendered time,
// with no JS and no refresh needed.
const SAMPLE = {
  "油": { "价格":109.95, "updatedAt":"2026-10-18T08:15:40Z" },
  "金子": { "priceUsdPerOz":4165.27, "priceCnyPerGram":895.65, "updatedAt":"2026-10-18T08:15:40.548Z" },
  "cn_oil": { "list":[{ "province":"山东","p92":"8.57","p95":"9.20","p98":"10.20","p0":"8.21" }], "updatedAt":"2026-10-18T08:15:44.911Z" }
};
globalThis.fetch = async (u) => {
  const url = String(u);
  if (url.includes('ss.wwok.eu.cc')) return new Response(JSON.stringify(SAMPLE), { headers:{'content-type':'application/json'} });
  if (url.includes('frankfurter')) return new Response(JSON.stringify({ date:'2026-10-16', rates:{ USD:1, EUR:0.8887, CNY:7.12 } }), { headers:{'content-type':'application/json'} });
  return new Response('{}', { headers:{'content-type':'application/json'} });
};
const worker = (await import('./src/index.js')).default;

async function get(path, cookie) {
  const h = new Headers(); if (cookie) h.set('Cookie', cookie);
  const res = await worker.fetch(new Request('https://you.piccalc.com' + path, { headers: h }), {}, {});
  return { res, html: await res.text() };
}
const times = h => [...h.matchAll(/<time[^>]*data-ts[^>]*>([^<]*)<\/time>/g)].map(x => x[1]);

let { res: r1, html } = await get('/zh/', 'ps_tz=America%2FNew_York');
console.log('cookie=New_York ->', times(html));
console.log('   cache-control:', r1.headers.get('cache-control'));
console.log('   set-cookie header not needed (script writes it):', r1.headers.get('set-cookie'));

({ html } = await get('/zh/', 'ps_tz=Asia%2FShanghai'));
console.log('cookie=Shanghai ->', times(html));

({ html } = await get('/zh/', null));
console.log('no cookie (falls back to UTC) ->', times(html));

({ html } = await get('/zh/', 'ps_tz=Not/AZone'));
console.log('bogus cookie ->', times(html), '(must not crash)');

const r = await worker.fetch(new Request('https://you.piccalc.com/ads.txt'), {}, {});
console.log('ads.txt ->', JSON.stringify(await r.text()));
