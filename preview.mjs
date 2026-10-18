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
import { writeFileSync } from 'fs';
const worker = (await import('./src/index.js')).default;
async function save(path, cookie, out) {
  const h = new Headers(); if (cookie) h.set('Cookie', cookie);
  const res = await worker.fetch(new Request('https://you.piccalc.com'+path, { headers:h }), {}, {});
  writeFileSync(out, await res.text());
  console.log('wrote', out);
}
await save('/en/', 'ps_tz=America%2FNew_York', '/data/workspace/PriceScope预览_英文首页_纽约.html');
await save('/zh/', 'ps_tz=Asia%2FShanghai', '/data/workspace/PriceScope预览_中文首页_上海.html');
await save('/zh/oil/', 'ps_tz=Asia%2FShanghai', '/data/workspace/PriceScope预览_中文油价页.html');
