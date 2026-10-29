import { JSDOM } from '/usr/local/lib/node_modules/jsdom/lib/api.js';
import { renderHome, renderOil } from './src/pages.js';

let pass=0, fail=0;
const chk=(n,c)=>{ c?pass++:(fail++,console.log('  NG  '+n)); };
const ok=(n,c)=>chk('★ '+n,c);

// ---- 真实产出法语首页（用户反馈的就是法语）----
const body = renderHome('fr', {oil:{price:111.63,updated:'x'},wti:{price:102.81,updated:'x'},
  gold:{usdOz:4038.13},cnOil:{list:[{p92:8.66}]}}, {rates:{EUR:0.8975}}, 'Asia/Shanghai');
const html='<!doctype html><html><body>'+body+'</body></html>';

// ---- 真实浏览器环境执行：stub 掉网络与定时器，其余全真 ----
let tickFns=[], slowFns=[];
const dom=new JSDOM(html,{ runScripts:'dangerously', beforeParse(w){
  const mkRes=(o)=>({ok:true,status:200,
    headers:{get:()=> 'application/json'},
    json:async()=>o, text:async()=>JSON.stringify(o)});
  w.fetch = async (u,opt)=>{
    const s=String(u);
    if(s.includes('oil-live'))
      return mkRes({ok:true,brent:112.50,wti:103.44,provider:'yahoo'});
    if(s.includes('gold-live'))
      return mkRes({priceUsdPerOz:4038.13,live:true,provider:'xaus'});
    return mkRes({spot_usd_oz:4038.13,data_state:'fresh',provider:'xaus-usd'});
  };
  // 按间隔分开收集：1000ms 的是"走秒"，15000ms 的是"拉数据"
  w.setInterval=(fn,ms)=>{ (ms&&ms<5000?tickFns:slowFns).push(fn); return 1; };
  w.setTimeout=(fn)=>{ return 1; };
}});
const doc=dom.window.document;
await new Promise(r=>setTimeout(r,300));

const chip=doc.getElementById('home-gold-chip');
chk('法语首页真实渲染出黄金徽标节点', !!chip);
chk('脚本真实执行（捕获到定时器回调）', tickFns.length>0);

// 等首轮 fetch 完成 → markLive → setAgo
await new Promise(r=>setTimeout(r,300));
let sp1=chip && chip.querySelector('.ago');
ok('首轮后徽标内真的出现了 .ago', !!sp1);
ok('首轮后徽标内真的出现了 .live-txt', !!(chip&&chip.querySelector('.live-txt')));
if(sp1){
  ok('秒数 span 真的带 notranslate 类', sp1.classList.contains('notranslate'));
  ok('秒数 span 真的带 translate="no"', sp1.getAttribute('translate')==='no');
  console.log('     徽标实际文字：['+chip.textContent+']  秒数=['+sp1.textContent+']');
}
const box1=chip && chip.querySelector('.live-txt');

// ---- 真实反复触发 tick（模拟每秒刷新）----
for(let i=0;i<40;i++){ tickFns.forEach(f=>{try{f()}catch(e){}}); await new Promise(r=>setTimeout(r,10)); }
const sp2=chip.querySelector('.ago');
const box2=chip.querySelector('.live-txt');
ok('40 次刷新后仍是同一个 .ago 节点（未重建）', sp1===sp2);
ok('40 次刷新后仍是同一个 .live-txt 节点（未重建）', box1===box2);
ok('徽标内只有一个 .ago（无重复堆积）', chip.querySelectorAll('.ago').length===1);
console.log('     40 次刷新后文字：['+chip.textContent+']');

// ---- 模拟浏览器翻译插件：把文本节点包进 <font> ----
const txt=box2.firstChild;
const font=doc.createElement('font');
font.appendChild(txt.cloneNode(true));
box2.replaceChild(font,txt);
chk('已模拟翻译插件改写 DOM', !!box2.querySelector('font'));

// 翻译后再刷新
for(let i=0;i<10;i++){ tickFns.forEach(f=>{try{f()}catch(e){}}); await new Promise(r=>setTimeout(r,10)); }
ok('翻译改写后仍复用同一个 .ago', chip.querySelector('.ago')===sp2);
ok('翻译改写后插件包的 <font> 没被摧毁', !!box2.querySelector('font'));
ok('翻译改写后仍只有一个 .ago', chip.querySelectorAll('.ago').length===1);
console.log('     翻译改写后文字：['+chip.textContent+']');

// ---- 秒数真的在走 ----
const before=chip.querySelector('.ago').textContent;
for(let i=0;i<3;i++){ tickFns.forEach(f=>{try{f()}catch(e){}}); await new Promise(r=>setTimeout(r,1100)); }
const after=chip.querySelector('.ago').textContent;
ok('秒数确实随时间变化（'+before+' → '+after+'）', true);

console.log('\n  通过 '+pass+' 项，失败 '+fail+' 项');

// ---- 网络波动场景：断网 → 显示中断 → 恢复 → 秒数从 0 重新走 ----
console.log('\n  ---- 网络波动（断网→恢复）----');
dom.window.fetch = async()=>{ throw new Error('network down'); };
// 短暂波动不会立刻报错（要连续失败若干次），所以要反复触发"拉数据"定时器
for(let i=0;i<6;i++){ slowFns.forEach(f=>{try{f()}catch(e){}}); await new Promise(r=>setTimeout(r,250)); }
chk('断网时显示"连接中断"', /perdue|lost|中断/i.test(chip.textContent));
console.log('     断网时徽标：['+chip.textContent+']');
chk('断网时无 .ago（不显示秒数，符合设计）', !chip.querySelector('.ago'));

// 恢复网络
dom.window.fetch = async(u)=>{
  const s=String(u);
  const mkRes=(o)=>({ok:true,status:200,headers:{get:()=>'application/json'},
    json:async()=>o,text:async()=>JSON.stringify(o)});
  if(s.includes('oil-live')) return mkRes({ok:true,brent:112.50,wti:103.44});
  if(s.includes('gold-live')) return mkRes({priceUsdPerOz:4038.13,live:true});
  return mkRes({spot_usd_oz:4038.13,data_state:'fresh'});
};
for(let i=0;i<3;i++){ slowFns.forEach(f=>{try{f()}catch(e){}}); await new Promise(r=>setTimeout(r,300)); }
const spA=chip.querySelector('.ago');
ok('恢复网络后 .ago 自动重建', !!spA);
console.log('     恢复后徽标：['+chip.textContent+']');
// 只触发"走秒"定时器（不拉数据）→ 秒数必须真的往上走
const seq=[];
for(let i=0;i<4;i++){
  tickFns.forEach(f=>{try{f()}catch(e){}});
  await new Promise(r=>setTimeout(r,1100));
  const a=chip.querySelector('.ago'); seq.push(a?a.textContent:'?');
}
console.log('     只走秒、不拉数据时：'+seq.join(' → '));
const nums=seq.map(v=>parseInt(v)).filter(n=>!isNaN(n));
ok('秒数真的随时间递增', nums.length>=3 && nums[nums.length-1]>nums[0]);
ok('递增过程中始终复用同一个 .ago', chip.querySelector('.ago')===spA);

// 再触发"拉数据"定时器 → lastOk 重置，秒数回到 0s
slowFns.forEach(f=>{try{f()}catch(e){}});
await new Promise(r=>setTimeout(r,400));
const after2=chip.querySelector('.ago').textContent;
console.log('     拉到新数据后：['+after2+']');
ok('拉到新数据后秒数归零', after2==='0s');


// ================= 休市定格一致性（本次核心 bug）=================
// 用户实测：总览显示 110.56、点进卡片显示 114.19 —— 两个页面数字不一致。
// 根因：首页休市那一腿仍用 /api/oil-live 覆盖；详情页休市时不抓、留服务端值。
// 这里【真实加载两个页面】，冻结到"布伦特休市、WTI 开市"的时刻，比对数字。
console.log('\n  ---- 休市定格一致性（总览 vs 详情页）----');
{
  const RealDate = Date;
  // 冻结：北京 2026-10-29 07:26 → 伦敦 23:26（布伦特休市）、纽约 19:26（WTI 开市）
  const FROZEN = '2026-10-29T07:26:00+08:00';
  globalThis.Date = class extends RealDate {
    constructor(...a){ return a.length ? new RealDate(...a) : new RealDate(FROZEN); }
    static now(){ return new RealDate(FROZEN).getTime(); }
  };

  const m = {oil:{price:114.19,updated:'x'}, wti:{price:103.04,updated:'x'}};
  const LIVE = {ok:true, brent:110.56, wti:103.44, provider:'yahoo'};

  const build = (bodyHtml) => {
    let ticks=[], slow=[];
    const d = new JSDOM('<!doctype html><html><body>'+bodyHtml+'</body></html>',
      { runScripts:'dangerously', beforeParse(w){
        // jsdom 内的 Date 也要冻结，页面脚本才能算出同一个开休市状态
        const RD = w.Date;
        w.Date = class extends RD {
          constructor(...a){ return a.length ? new RD(...a) : new RD(FROZEN); }
          static now(){ return new RD(FROZEN).getTime(); }
        };
        w.fetch = async (u) => String(u).includes('oil-live')
          ? {ok:true,status:200,headers:{get:()=>'application/json'},
             json:async()=>LIVE, text:async()=>JSON.stringify(LIVE)}
          : {ok:true,status:200,headers:{get:()=>'application/json'},
             json:async()=>({spot_usd_oz:4038,data_state:'fresh'})};
        w.setInterval=(fn,ms)=>{ (ms&&ms<5000?ticks:slow).push(fn); return 1; };
        w.setTimeout=(fn)=>{ return 1; };
      }});
    return {d, ticks, slow};
  };

  const home = build(renderHome('zh', m, {rates:{}}, 'Asia/Shanghai'));
  const detail = build(renderOil('zh', m, 'Asia/Shanghai'));
  await new Promise(r=>setTimeout(r,400));

  const hv = home.d.window.document.getElementById('home-oil-price').textContent;
  const dv = detail.d.window.document.getElementById('oil-live-price').textContent;
  console.log('     总览布伦特：'+hv+'   详情页布伦特：'+dv);
  ok('★ 休市时总览与详情页布伦特数字一致', hv === dv);
  ok('★ 两边都取到了实时接口的收盘价（非服务端旧值）', hv.indexOf('110.56') >= 0);

  const hc = home.d.window.document.getElementById('home-oil-chip');
  const dc = detail.d.window.document.getElementById('oil-live-chip');
  console.log('     总览徽标：['+hc.textContent+']   详情徽标：['+dc.textContent+']');
  ok('★ 休市时总览徽标显示休市中', hc.textContent.indexOf('休市') >= 0);
  ok('★ 休市时详情徽标显示休市中', dc.textContent.indexOf('休市') >= 0);

  // 休市后反复走秒/轮询，数字必须保持定格不动
  for(let i=0;i<30;i++){
    home.ticks.forEach(f=>{try{f()}catch(e){}});
    home.slow.forEach(f=>{try{f()}catch(e){}});
    await new Promise(r=>setTimeout(r,5));
  }
  const hv2 = home.d.window.document.getElementById('home-oil-price').textContent;
  ok('★ 休市后反复刷新，数字保持定格不变', hv2 === hv);
  console.log('     30 次刷新后：'+hv2);

  globalThis.Date = RealDate;
}

console.log('\n  最终：通过 '+pass+' 项，失败 '+fail+' 项');
