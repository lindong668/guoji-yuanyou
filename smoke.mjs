import { normalise } from './src/data.js';
import { renderHome, renderOil, renderGold, renderCn, renderFx,
         renderPrivacy, renderAbout, renderContact, sitemap } from './src/pages.js';
const sample = {
  "油": { "价格":109.95, "格式化后":"$109.95", "timestamp":"2026-10-18T08:06:18.047Z", "updatedLocal":"2026/10/18 16:15:40", "isSettlement":false },
  "金子": { "priceUsdPerOz":4165.27, "priceCnyPerGram":895.65, "updatedAt":"2026-10-18T08:15:40.548Z" },
  "cn_oil": { "list":[{ "province":"山东","p92":"8.57","p95":"9.20","p98":"10.20","p0":"8.21" }], "updatedAt":"2026-10-18T08:15:44.911Z" }
};
const m = normalise(sample);
const fx = { date:'2026-10-16', rates:{ EUR:0.8887, USD:1, CNY:7.12 } };
const LANGS = ['en','zh','ja','es','fr','de','pt'];
const TZS = ['America/New_York','Asia/Shanghai','Asia/Tokyo','Europe/Berlin','America/Sao_Paulo'];
let n=0, bad=0;
for (const l of LANGS) {
  for (const tz of TZS) {
    const jobs = [
      ['home', ()=>renderHome(l,m,fx,tz)],
      ['oil', ()=>renderOil(l,m,tz)],
      ['gold', ()=>renderGold(l,m,tz)],
      ['cn', ()=>renderCn(l,m,tz)],
      ['fx', ()=>renderFx(l,fx)],
      ['privacy', ()=>renderPrivacy(l,tz)],
      ['about', ()=>renderAbout(l)],
      ['contact', ()=>renderContact(l)],
    ];
    for (const [name, fn] of jobs) {
      try { const h = fn(); if(!h || !h.includes('</html>')) throw new Error('no html'); n++; }
      catch(e){ bad++; console.log('FAIL', l, tz, name, e.message); }
    }
  }
}
console.log(`rendered ${n} pages, ${bad} failures`);
const s = sitemap();
console.log('sitemap urls:', (s.match(/<loc>/g)||[]).length, '| hreflang:', (s.match(/hreflang=/g)||[]).length);
