const SAMPLE={"油":{"价格":109.95,"updatedAt":"2026-10-18T08:15:40Z"},"金子":{"priceUsdPerOz":4165.27,"priceCnyPerGram":895.65,"updatedAt":"2026-10-18T08:15:40.548Z"},"cn_oil":{"list":[{"province":"山东","p92":"8.57"}],"updatedAt":"2026-10-18T08:15:44.911Z"}};
const store=new Map();
globalThis.caches={default:{match:async r=>store.get(String(r.url))||null,put:async(r,res)=>{store.set(String(r.url),res)},delete:async r=>{store.delete(String(r.url))}}};
globalThis.fetch=async u=>{const url=(u&&u.url)?u.url:String(u);const j=o=>new Response(JSON.stringify(o),{headers:{'content-type':'application/json'}});
if(url.includes('ss.wwok'))return j(SAMPLE);
if(url.includes('er-api'))return j({result:'success',time_last_update_utc:new Date().toUTCString(),rates:{USD:1,EUR:0.8887,CNY:7.12}});
return j({date:'2026-10-16',rates:{USD:1,EUR:0.8887,CNY:7.12}});};
const { t, LANGS } = await import('./src/i18n.js');
const worker=(await import('./src/index.js')).default;
async function get(p,tz){const h=new Headers();if(tz)h.set('Cookie','ps_tz='+encodeURIComponent(tz));const r=await worker.fetch(new Request('https://you.piccalc.com'+p,{headers:h}),{},{});return await r.text();}
for(const tz of ['Asia/Shanghai','Pacific/Kiritimati']){
  const tag = tz==='Asia/Shanghai' ? '(Sunday local)' : '(Monday local)';
  for(const l of LANGS){
    const h=await get(`/${l}/currency/`,tz);
    const L=t(l);
    const hasWk = h.includes(L.fxWeekendNote);
    console.log(`${l} @ ${tz} ${tag}: fxWeekendNote=${hasWk}`);
  }
  console.log('');
}
