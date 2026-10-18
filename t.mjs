import { normalise } from './src/data.js';
import { setRenderTz, renderHome, renderOil, renderGold } from './src/pages.js';
setRenderTz('America/New_York');
const sample = {
  "油": { "价格":109.95, "格式化后":"$109.95", "timestamp":"2026-10-18T08:06:18.047Z", "updatedLocal":"2026/10/18 16:15:40", "isSettlement":false },
  "金子": { "priceUsdPerOz":4165.27, "priceCnyPerGram":895.65, "updatedAt":"2026-10-18T08:15:40.548Z" },
  "cn_oil": { "list":[{"province":"山东","p92":"8.57","p95":"9.20","p98":"10.20","p0":"8.21"}], "updatedAt":"2026-10-18T08:15:44.911Z" }
};
const m = normalise(sample);
console.log('oil.updated =', m.oil.updated, '| cnOil.updated =', m.cnOil.updated, '| gold.updated =', m.gold.updated);
const home = renderHome('zh', m, {date:'2026-10-16', rates:{EUR:0.8887}});
const g = renderGold('zh', m);
const strip = s => s.replace(/<[^>]+>/g,'|').replace(/\|+/g,'|');
console.log('HOME:', strip(home).match(/更新时间[^|]*\|[^|]*/g));
console.log('GOLD:', strip(g).match(/更新时间[^|]*\|[^|]*/g));
