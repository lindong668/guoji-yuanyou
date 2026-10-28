// ============================================================
// PriceScope — Page renderers (SSR, so crawlers read real numbers)
// ============================================================
import { t, provName, LANGS, SITE, DEFAULT_LANG } from './i18n.js';
import { page, hero, esc, adSlot } from './ui.js';
import { CURRENCIES, POPULAR_PAIRS, convert, rateOf, fmt, fmtFx, fxDp, cnyRateOf } from './data.js';
import { curName } from './i18n.js';
import { CONTENT } from './content.js';
import { ARTICLES, articlesFor, relatedFor, blogStr } from './articles.js';

// ============================================================
// ★ A22 黄金实时客户端脚本
// ------------------------------------------------------------
// 这一整段跑在【用户浏览器】里，不是跑在 Cloudflare 上。
// 这正是黄金能实时刷新、而后端只能一分钟一次的原因：
//   · 后端 cron  → Cloudflare 的闹钟，最快一分钟响一次，改不了
//   · 浏览器 JS  → 页面开着就一直醒着，可以反复去问价
//
// 容错分五层，一层层往下掉，任何一层都保证页面有真实数字：
//   ① 直连 biquote（实时）        → 数字一直跳
//   ② 依次退到 xaus / gold-api    → 换源继续跳
//   ③ 歇 1 秒再跑一轮（从主源重来）→ 抖动往往这时已经恢复
//   ④ 都不行 → 问 2 号 Worker，让它请 3 号【现抓】一个新价
//   ⑤ 连 3 号也失败 → 冻住最后看到的那个数，灰显 + 标注，绝不编数字
// ============================================================
const TROY_OZ = 31.1034768;   // 1 金衡盎司 = 31.1034768 克（国际精确定义，非近似值）

const GOLD_LIVE_JS = `
(function(){
  var OZ=31.1034768;
  var elUsd=document.getElementById('g-usd');
  if(!elUsd) return;
  var elConv=document.getElementById('g-conv');
  var elCur=document.getElementById('g-cur');
  var elStatus=document.getElementById('g-status');
  var elRate=document.getElementById('g-rate');
  var card1=document.getElementById('g-intl');
  var card2=document.getElementById('g-local');

  var T={live:elStatus.getAttribute('data-live')||'Live',
         lost:elStatus.getAttribute('data-lost')||'Connection lost',
         closed:elStatus.getAttribute('data-closed')||'Market closed',
         ago:elStatus.getAttribute('data-ago')||'Updated {n} ago'};
  var elNote=document.getElementById('g-closed-note');

  var RATES={};
  try{ RATES=JSON.parse(document.getElementById('ps-fx').textContent)||{}; }catch(e){ RATES={}; }
  var INIT={};
  try{ INIT=JSON.parse(document.getElementById('ps-gold-init').textContent)||{}; }catch(e){ INIT={}; }

  var lang=(document.documentElement.lang||'en').slice(0,2).toLowerCase();
  var LOCS={en:'en-US',zh:'zh-CN',ja:'ja-JP',es:'es-ES',fr:'fr-FR',de:'de-DE',pt:'pt-BR'};
  var loc=LOCS[lang]||'en-US';

  /* 默认 USD；用户选过就记住（存在浏览器本地，下次进来还是他那个） */
  var cur='USD';
  try{ var sv=localStorage.getItem('ps_gold_cur'); if(sv&&RATES[sv]) cur=sv; }catch(e){}

  /* 汇率口径：人民币用 CNY（在岸，国内真正成交的价），
     其他币种走 er-api 的离岸/对应报价 —— 两个都在同一份表里。 */
  function rate(c){
    if(c==='USD') return 1;
    if(c==='CNY'&&RATES.CNY) return RATES.CNY;
    return RATES[c]||0;
  }

  var codes=Object.keys(RATES).sort();
  var dn=null;
  try{ dn=new Intl.DisplayNames([loc],{type:'currency'}); }catch(e){}
  for(var i=0;i<codes.length;i++){
    var o=document.createElement('option');
    o.value=codes[i];
    var nm='';
    try{ if(dn) nm=dn.of(codes[i])||''; }catch(e){}
    o.textContent=codes[i]+(nm?' \u2014 '+nm:'');
    if(codes[i]===cur) o.selected=true;
    elCur.appendChild(o);
  }

  var usdOz=INIT.usdOz;
  var lastOk=0, fails=0, dead=false;

  function money(v){
    try{ return new Intl.NumberFormat(loc,{style:'currency',currency:cur,minimumFractionDigits:2,maximumFractionDigits:2}).format(v); }
    catch(e){ return (Math.round(v*100)/100)+' '+cur; }
  }
  function num(v){
    try{ return new Intl.NumberFormat(loc,{minimumFractionDigits:2,maximumFractionDigits:2}).format(v); }
    catch(e){ return (Math.round(v*100)/100).toFixed(2); }
  }
  /* ★ A22p：汇率行固定显示美元兑【人民币】，不再跟着上面的币种下拉变。
   * 改之前这行跟着 cur 走，页面默认是 USD，于是显示成
   * 「1 USD = 1.00 USD」—— 首屏还是 6.6810 CNY，JS 一跑就跳成 1.00 USD，
   * 既难看又让访客以为数据错了。现在与汇率页口径一致，固定人民币。 */
  function fxdp(v){
    var a=Math.abs(Number(v));
    if(!isFinite(a)) return 4;
    return a>=100?2:4;
  }
  function fxnum(v){
    var d=fxdp(v);
    try{ return Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}); }
    catch(e){ return String(v); }
  }
  function paint(){
    if(usdOz==null) return;
    elUsd.textContent='$'+num(usdOz);
    elConv.textContent=money(usdOz/OZ*rate(cur));
    var uo=elRate.getAttribute('data-uo')||'troy oz';
    var ug=elRate.getAttribute('data-ug')||'gram';
    var cnyCode=elRate.getAttribute('data-cny-code')||'CNY';
    var cnyVal=parseFloat(elRate.getAttribute('data-cny-rate'));
    elRate.textContent='1 USD = '+(isNaN(cnyVal)?'\u2014':fxnum(cnyVal))+' '+cnyCode+' \u00b7 1 '+uo+' = 31.1034768 '+ug;
  }
  /* ★ 只返回时段值（"0s" / "5m" / "2h"），不带"前更新"后缀。
   *   后缀由 setAgo 统一补 —— 否则会叠加成「0s前更新前更新」。 */
  function agoTxt(){
    if(!lastOk) return '';
    var s=Math.round((Date.now()-lastOk)/1000);
    return s<60 ? (s+'s') : (s<3600 ? Math.round(s/60)+'m' : Math.round(s/3600)+'h');
  }
  /* ★ 秒数单独 span + 等宽：避免 4s→14s 时卡片被顶宽抖动。
   *   各语言 {n} 位置不同：中文「{n}前更新」在前，英文「Updated {n} ago」在中间。
   *   统一按 {n} 拆成前后两段，秒数只占中间那个 span —— 既贴紧又不撑宽。 */
  var _A=(T.ago||'{n}').split('{n}');
  var AGOPRE=_A[0]||'', AGOTAIL=_A[1]||'';
  /* ★ 整段文字必须包进一个 .live-txt：
   *   .live-dot 是 flex 容器且设了 gap:5px，而 flex 会把【每个文本节点】
   *   都当成独立 item —— 拆成三段就会插两段 5px 空隙，
   *   「实时 · 」「4s」「前更新」被拉得很开（黄金页原来是一整段，所以贴得紧）。
   *   包成整体后，gap 只作用在圆点与文字之间，文字内部按正常 inline 流紧贴。 */
  /* ★ 幂等更新：秒数每秒都要重画一次。若每次都 textContent='' 把整棵子树推倒重建，
   *   浏览器翻译插件（它把文本节点包进自己的元素，并监听变化重新翻译）就会被反复打断，
   *   表现为徽标「一下子大、一下子小」地闪。
   *   现在：结构只建一次，之后只改那一个秒数 span 的文字，且值没变就不写。
   *   ★ 秒数 span 标 notranslate —— 数字本就无需翻译，交给插件反而会抖。 */
  function setAgo(el,ago){
    var sp=el.querySelector('.ago');
    if(!sp||!el.querySelector('.live-txt')){
      el.textContent='';
      var box=document.createElement('span'); box.className='live-txt';
      box.appendChild(document.createTextNode(T.live+' · '+AGOPRE));
      sp=document.createElement('span');
      sp.className='ago notranslate'; sp.setAttribute('translate','no');
      box.appendChild(sp);
      if(AGOTAIL) box.appendChild(document.createTextNode(AGOTAIL));
      el.appendChild(box);
    }
    if(sp.textContent!==ago) sp.textContent=ago;
  }
  function markLive(){
    dead=false; fails=0; lastOk=Date.now();
    card1.classList.remove('is-stale'); card2.classList.remove('is-stale');
    elStatus.classList.remove('is-lost');
    setAgo(elStatus,agoTxt());
    if(elNote) elNote.hidden=true;
  }
  function markLost(){
    dead=true;
    card1.classList.add('is-stale'); card2.classList.add('is-stale');
    elStatus.classList.add('is-lost');
    elStatus.textContent=T.lost;
  }

  /* 黄金休市判断 —— 与 3 号后台同一套规则，纽约时间为准。
     周日 18:00 开盘，周五 17:00 周收盘，每天 17:00-18:00 结算休市，周六周日全天休市。
     用 Intl 标准时区名，冬令时自动跟随，不需要改代码。 */
  function nyParts(){
    try{
      var f=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',hour12:false});
      var o={};
      f.formatToParts(new Date()).forEach(function(p){ o[p.type]=p.value; });
      var wd=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(o.weekday);
      var hh=parseInt(o.hour,10);
      if(wd>=0&&!isNaN(hh)) return {wd:wd,hour:hh};
    }catch(e){}
    return null;
  }
  function goldState(){
    var p=nyParts();
    if(!p) return 'open';
    if(p.wd===6) return 'weekend';
    if(p.wd===0) return p.hour>=18?'open':'weekend';
    if(p.wd===5) return p.hour<17?'open':'weekend';
    if(p.hour===17) return 'settlement';
    return 'open';
  }
  /* 休市：数字照常显示（是休市前最后一次真实成交价），
     但状态栏写「休市中」，并且不再去轮询 —— 休市时抓到的只是沿用值。 */
  function markClosed(){
    dead=false;
    card1.classList.remove('is-stale'); card2.classList.remove('is-stale');
    elStatus.classList.add('is-lost');
    elStatus.textContent=T.closed;
    if(elNote) elNote.hidden=false;
  }

  /* 三个源按序尝试。biquote 是券商 MT5 链路（实时、独立），
     xaus 与 gold-api 是指示性现货价 —— 实测三者偏差 < 0.04%。 */
  var SOURCES=[
    {n:'biquote',u:'https://biquote.io/api/XAUUSD',
     p:function(j){var b=+j.bid,a=+j.ask;return (b&&a)?(b+a)/2:(+j.mid||0);}},
    {n:'xaus',u:'https://xaus.com/api/v1/spot?currency=CNY&unit=gram&compact=1',
     p:function(j){
       /* xaus 自带 data_state：stale/unavailable 表示它给的是【上一次观测值】
          而不是此刻真实价。直接采用就会出现"数字在跳、底下却是旧值"，
          所以这类返回一律当作不可用，交给后面的源。 */
       var st=j&&j.data_state;
       if(st&&st!=='fresh') throw new Error('xaus:'+st);
       return +j.spot_usd_oz||0;}},
    {n:'gold-api',u:'https://api.gold-api.com/price/XAU',
     p:function(j){return +j.price||0;}},
    {n:'xaus-usd',u:'https://xaus.com/api/v1/spot?currency=USD&unit=oz&compact=1',
     p:function(j){
       var st=j&&j.data_state;
       if(st&&st!=='fresh') throw new Error('xaus-usd:'+st);
       return +(j.spot_usd_oz||j.price||j.spot)||0;}}
  ];
  var TIMEOUT=2500;   // 前端时间金贵，每个源最多等 2.5 秒，不让用户干等

  function one(s){
    return new Promise(function(res,rej){
      var done=false;
      var t=setTimeout(function(){ if(!done){done=true;rej(new Error('timeout'));} },TIMEOUT);
      fetch(s.u,{cache:'no-store',headers:{Accept:'application/json'}})
        .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(function(j){
          var v=s.p(j);
          if(!v) throw new Error('bad');
          if(!done){done=true;clearTimeout(t);res(v);}
        })
        .catch(function(e){ if(!done){done=true;clearTimeout(t);rej(e);} });
    });
  }
  /* 一轮：主 → 备 → 兜底。拿到就停。 */
  function pass(cb){
    var i=0;
    (function step(){
      if(i>=SOURCES.length){ cb(false); return; }
      one(SOURCES[i]).then(function(v){ busy=false; usdOz=v; paint(); cb(true); },
                           function(){ i++; step(); });
    })();
  }
  /* 连续两轮全灭才认定断开 —— 抖动常在半秒内自愈，别急着吓用户。 */
  var busy=false;
  function cycle(){
    if(busy) return;
    if(goldState()!=='open'){ markClosed(); return; }          /* 上一轮还没跑完（慢网络下可能超过 10 秒），不叠加 */
    busy=true;
    pass(function(ok){
      if(ok){ markLive(); return; }
      setTimeout(function(){
        pass(function(ok2){
          busy=false;
          if(ok2){ markLive(); return; }
          fails++;
          markLost();
          if(fails>=2) askBackend();
        });
      },1000);
    });
  }
  /* 最后一条路：让 2 号 Worker 请 3 号【现在】去抓一个新价。
     注意要的是"现抓"，不是 3 号仓库里的旧货。 */
  function askBackend(){
    fetch('/api/gold-live',{cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j&&j.priceUsdPerOz){
          usdOz=j.priceUsdPerOz; paint();
          if(j.live===true) markLive(); else markLost();
        }
      }).catch(function(){});
  }

  elCur.addEventListener('change',function(){
    cur=elCur.value;
    try{ localStorage.setItem('ps_gold_cur',cur); }catch(e){}
    paint();
  });

  /* ★ 秒数 1 秒一跳：纯前端计时（用 lastOk 时间戳算差值），不产生任何网络请求 */
  setInterval(function(){ if(!dead&&lastOk) setAgo(elStatus,agoTxt()); },1000);
  setInterval(function(){ if(!document.hidden) cycle(); },30000);   /* 30 秒一轮，别太频繁 */

  paint();
  if(usdOz!=null){
    if(goldState()==='open') markLive(); else markClosed();
  }
  cycle();
  /* 每分钟核对一次开休市状态：休市结束（或进入结算）能自动切换显示 */
  setInterval(function(){
    var st=goldState();
    if(st!=='open'){ markClosed(); }
    else if(!dead&&lastOk){ markLive(); }
  },60000);
})();
`;



// ------------------------------------------------------------
// Editorial content helpers
// Every market page now ships with an original explainer + FAQ, and a
// data-source / disclaimer block. This is what turns a bare number card
// into a page with genuine informational value.
// ------------------------------------------------------------
function contentFor(lang, key) {
  return (CONTENT[lang] && CONTENT[lang][key]) || (CONTENT.en && CONTENT.en[key]) || null;
}
function commonFor(lang) {
  return (CONTENT[lang] && CONTENT[lang].common) || CONTENT.en.common;
}

/** Explainer sections rendered as <h2> + <p> blocks. */
function explainer(lang, key) {
  const c = contentFor(lang, key);
  if (!c) return '';
  const secs = c.sections.map(s =>
    `<h2 class="h3">${esc(s.h)}</h2><p class="prose-p">${esc(s.p)}</p>`).join('');
  return `<section class="blk alt"><div class="wrap prose">
  <h2 class="h2"><span class="ico">📖</span>${esc(commonFor(lang).aboutThisData)}</h2>
  <p class="lead">${esc(c.intro)}</p>
  ${secs}
</div></section>`;
}

/** Page-specific FAQ. */
function faqBlock(lang, key) {
  const c = contentFor(lang, key);
  if (!c || !c.faq) return '';
  const items = c.faq.map(f =>
    `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  return `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">❓</span>${esc(commonFor(lang).faqHeading)}</h2>
  <div class="faq-list">${items}</div>
</div></section>`;
}

/** Data sources + disclaimer — required on every page that shows figures. */
function sourceBlock(lang, kind) {
  const C = commonFor(lang);
  const L = t(lang);
  /* ★ A22.1：每个页面在最底部明确写出【本页这个数据】来自谁。
   * 以前只有一段全站通用的 sourcesBody，读者点进原油页或黄金页，
   * 看到的仍是笼统一句，无法确认眼前这个数字出自哪里。
   * 现在按品种补一条专属行，放在通用说明之前。 */
  const line = kind ? (L['src' + kind] || '') : '';
  const own = line
    ? `<p class="prose-p src-own"><strong>${esc(L.dataSource)}：</strong>${esc(line)}</p>`
    : '';
  return `<section class="blk alt"><div class="wrap prose">
  <h2 class="h2"><span class="ico">🔎</span>${esc(C.dataSources)}</h2>
  ${own}
  <p class="prose-p">${esc(C.sourcesBody)}</p>
  <h2 class="h3">${esc(C.disclaimerTitle)}</h2>
  <p class="prose-p disc">${esc(C.disclaimerBody)}</p>
</div></section>`;
}

// ------------------------------------------------------------
// ARTICLES / BLOG
// Long-form pieces live on their own URLs so each can be indexed
// and ranked independently. Only languages that actually have a
// translation are ever rendered — a missing one falls back to the
// article index rather than serving machine-translated text.
// ------------------------------------------------------------
function catLabel(lang, cat) {
  const S = blogStr(lang);
  return { oil: S.catOil, gold: S.catGold, cn: S.catCn, fx: S.catFx, wti: S.catWti }[cat] || cat;
}

function readLabel(lang, n) {
  return blogStr(lang).read.replace('{n}', String(n));
}

/** Article index — /blog/ */
export function renderBlogList(lang) {
  const S = blogStr(lang);
  // A language with no translation yet falls back to the English set with a
  // visible note. Better than an empty page, and the articles are never
  // silently machine-translated.
  let list = articlesFor(lang);
  let artLang = lang;
  let note = '';
  if (!list.length) {
    list = articlesFor('en');
    artLang = 'en';
    note = `<p class="fbnote">${esc(blogStr(lang).fallbackNote)}</p>`;
  }
  const cards = list.map(a => {
    const A = a.i18n[artLang];
    return `<a class="card art" href="/${artLang}/blog/${a.slug}/">
      <span class="artcat">${esc(catLabel(lang, a.cat))}</span>
      <h3>${esc(A.title)}</h3>
      <p class="artdesc">${esc(A.desc)}</p>
      <div class="artmeta">
        <span>${esc(S.published)} ${esc(a.date)}</span>
        <span>·</span>
        <span>${esc(readLabel(artLang, a.readMin))}</span>
      </div>
      <span class="go">→</span>
    </a>`;
  }).join('');

  const body = `<section class="blk"><div class="wrap prose">
  <h2 class="h2"><span class="ico">📚</span>${esc(S.title)}</h2>
  <p class="lead">${esc(S.lead)}</p>
  ${note}
</div></section>

<section class="blk"><div class="wrap">
  <div class="artgrid">${cards}</div>
</div></section>
${adSlot('blog')}
${sourceBlock(lang)}`;

  return page({
    lang, title: S.metaTitle, desc: S.metaDesc,
    path: '/blog/', active: '/blog/', body,
  });
}

/** Single article — /blog/{slug}/ */
export function renderArticle(lang, slug) {
  const a = ARTICLES.find(x => x.slug === slug);
  // Unknown slug, or no translation in this language -> index page (404 would
  // be more correct for the slug, but sending the reader to the list is the
  // friendlier outcome and keeps crawlers off a dead end).
  if (!a || !a.i18n[lang]) return null;
  const A = a.i18n[lang];
  const S = blogStr(lang);

  const secs = A.body.map(s =>
    `<h2 class="h3">${esc(s.h)}</h2><p class="prose-p">${esc(s.p)}</p>`).join('');

  const more = relatedFor(lang, a.cat, 3)
    .filter(x => x.slug !== slug)
    .slice(0, 2)
    .map(x => `<a class="card art" href="/${lang}/blog/${x.slug}/">
      <span class="artcat">${esc(catLabel(lang, x.cat))}</span>
      <h3>${esc(x.i18n[lang].title)}</h3>
      <p class="artdesc">${esc(x.i18n[lang].desc)}</p>
    </a>`).join('');

  const back = `<a class="backlink" href="/${lang}/blog/">${esc(S.backToList)}</a>`;

  const body = `<section class="blk"><div class="wrap prose">
  <h2 class="h2"><span class="ico">📖</span>${esc(A.title)}</h2>
  <p class="sub">${esc(S.published)} ${esc(a.date)} · ${esc(readLabel(lang, a.readMin))} · ${esc(catLabel(lang, a.cat))}</p>
  <p class="lead">${esc(A.desc)}</p>
  ${secs}
  <p class="artback">${back}</p>
</div></section>
${adSlot('article')}
${more ? `<section class="blk alt"><div class="wrap">
  <h2 class="h2"><span class="ico">🔗</span>${esc(S.related)}</h2>
  <div class="artgrid">${more}</div>
</div></section>` : ''}
${sourceBlock(lang)}`;

  return page({
    lang, title: `${A.title} — PriceScope`, desc: A.desc,
    path: `/blog/${slug}/`, active: '/blog/', body,
  });
}

/** "Related reading" block appended to market pages (internal linking). */
export function relatedBlock(lang, cat) {
  const S = blogStr(lang);
  const items = relatedFor(lang, cat, 2);
  if (!items.length) return '';
  const cards = items.map(a => `<a class="card art" href="/${lang}/blog/${a.slug}/">
      <span class="artcat">${esc(catLabel(lang, a.cat))}</span>
      <h3>${esc(a.i18n[lang].title)}</h3>
      <p class="artdesc">${esc(a.i18n[lang].desc)}</p>
      <div class="artmeta"><span>${esc(readLabel(lang, a.readMin))}</span></div>
    </a>`).join('');
  return `<section class="blk alt"><div class="wrap">
  <h2 class="h2"><span class="ico">📚</span>${esc(S.related)}</h2>
  <div class="artgrid">${cards}</div>
  <p class="artmore"><a class="backlink" href="/${lang}/blog/">${esc(S.title)} →</a></p>
</div></section>`;
}

// ------------------------------------------------------------
// Localised, timezone-aware timestamps
// Server renders in the visitor's zone (request.cf.timezone) so crawlers
// and first paint are correct; a tiny inline script then re-renders using
// the BROWSER's real zone + the interface language (fixes VPN / wrong CF
// geo data, and formats dates per locale: 2026/10/18 vs 18/10/2026 ...)
// ------------------------------------------------------------
export const LOCALE_MAP = {
  en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', es: 'es-ES',
  fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR',
};

// IMPORTANT: the timezone is now threaded through as an explicit argument.
// It used to live in module-level state (setRenderTz) which is unsafe on
// Cloudflare Workers: isolates interleave requests at every `await`, so one
// visitor's timezone could overwrite another's mid-render — that produced the
// "home shows UTC, inner page shows GMT+8, refresh flips it again" symptom.
// Kept as no-op exports so older entry files still import cleanly.
export function setRenderTz(_tz) { /* deprecated: pass tz explicitly */ }
export function getRenderTz() { return 'UTC'; }

function fmtStamp(iso, lang, tz) {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const loc = LOCALE_MAP[lang] || 'en-US';
  const opt = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZoneName: 'short',
  };
  try {
    return new Intl.DateTimeFormat(loc, { ...opt, timeZone: tz || 'UTC' }).format(d);
  } catch {
    // Bad/geo-missing zone: retry as UTC rather than printing a raw ISO
    // string, which used to look like "16:15 UTC" and read as a wrong time.
    try {
      return new Intl.DateTimeFormat(loc, { ...opt, timeZone: 'UTC' }).format(d);
    } catch {
      return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    }
  }
}

function updatedLine(lang, iso, tz) {
  const L = t(lang);
  if (!iso) return '';
  const s = fmtStamp(iso, lang, tz);
  if (!s) return '';
  // data-ts lets the inline script re-render in the browser's own zone
  return `${esc(L.updatedAt)}: <time datetime="${esc(iso)}" data-ts="${esc(iso)}">${esc(s)}</time>`;
}

// Today's date, formatted for the current interface language
function localDate(lang, tz) {
  try {
    return new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz || 'UTC',
    }).format(new Date());
  } catch { return new Date().toISOString().slice(0, 10); }
}

// FX rates are a plain date (YYYY-MM-DD) — localise the format only
function fxDateLine(lang, dateStr) {
  const L = t(lang);
  if (!dateStr) return '';
  const d = new Date(dateStr.length <= 10 ? dateStr + 'T00:00:00Z' : dateStr);
  if (isNaN(d)) return esc(L.fxUpdated) + ': ' + esc(dateStr);
  let s;
  try {
    s = new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC',
    }).format(d);
  } catch { s = dateStr; }
  // data-date-only tells the inline script to localise the FORMAT only and
  // keep the instant at UTC, so the fixing day never slides to the day before.
  return `${esc(L.fxUpdated)}: <time datetime="${esc(dateStr)}" data-ts="${esc(d.toISOString())}" data-date-only="1">${esc(s)}</time>`;
}

// ------------------------------------------------------------
// Trading-day note: weekends vs weekdays
// The site refreshes once a day, so on a weekday the number on screen is
// the PREVIOUS session's close (Mon-Fri), and on Sat/Sun it is the last
// trading day's figure. Copying "markets closed" onto a Tuesday looked
// wrong, so the line now follows the visitor's own calendar day.
// Weekday is resolved in the VISITOR's zone, so a user in Auckland and a
// user in New York each get the note that matches their local day.
// ------------------------------------------------------------
function localDow(date, tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const get = (type) => {
      const p = parts.find(x => x.type === type);
      return p ? Number(p.value) : NaN;
    };
    const y = get('year'), m = get('month'), d = get('day');
    if (!y || !m || !d) return new Date().getUTCDay();
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  } catch {
    return new Date().getUTCDay();
  }
}

function marketNote(lang, tz) {
  const L = t(lang);
  const dow = localDow(new Date(), tz); // 0 = Sunday, 6 = Saturday
  const weekend = (dow === 0 || dow === 6);
  return weekend ? (L.weekendNote || '') : (L.prevCloseNote || L.weekendNote || '');
}

function isWeekendInTz(tz) {
  const dow = localDow(new Date(), tz);
  return dow === 0 || dow === 6;
}

// FX date, plus an honest note at weekends: no new fixing is published while
// the interbank market is shut, so the date legitimately stays on the last
// business day. Weekdays show the current day's rate with no extra note.
function fxUpdatedBlock(lang, fx, tz) {
  if (!fx || !fx.date) return '';
  const L = t(lang);
  const s = fxDateLine(lang, fx.date);
  return isWeekendInTz(tz) ? `${s} · ${esc(L.fxWeekendNote)}` : s;
}

// ------------------------------------------------------------
// HOME / OVERVIEW
// ------------------------------------------------------------
export function renderHome(lang, m, fx, tz) {
  const L = t(lang);
  const oilPrice = m?.oil?.price;
  const wtiPrice = m?.wti?.price;
  const goldUsd = m?.gold?.usdOz;
  const goldCny = m?.gold?.cnyGram;

  // national average from province list
  const list = m?.cnOil?.list || [];
  const avg = k => {
    const v = list.map(x => parseFloat(x[k])).filter(n => !isNaN(n));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const a92 = avg('p92');

  const cards = `
<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">📊</span>${esc(L.secOverview)}</h2>
  <p class="sub">${esc(marketNote(lang, tz))}</p>
  <div class="grid">
    <a class="card oil" href="/${lang}/oil/">
      <h3><span class="swatch o"></span>${esc(L.secOil)}<span id="home-oil-chip" class="live-dot" hidden></span></h3>
      <div class="big" id="home-oil-price">${oilPrice != null ? '$' + fmt(oilPrice) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span>${updatedLine(lang, m?.oil?.updated, tz)}</span>
        <span class="go">${esc(L.viewAll)} →</span></div>
    </a>
    <a class="card oil" href="/${lang}/wti/">
      <h3><span class="swatch w"></span>${esc(L.nav.wti)}<span id="home-wti-chip" class="live-dot" hidden></span></h3>
      <div class="big" id="home-wti-price">${wtiPrice != null ? '$' + fmt(wtiPrice) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span>${updatedLine(lang, m?.wti?.updated, tz)}</span>
        <span class="go">${esc(L.viewAll)} →</span></div>
    </a>
    <a class="card gold" href="/${lang}/gold/">
      <h3><span class="swatch"></span>${esc(L.secGold)}<span id="home-gold-chip" class="live-dot" hidden></span></h3>
      <div class="big" id="home-gold-price">${goldUsd != null ? '$' + fmt(goldUsd) : '—'}</div>
      <div class="unit">${esc(L.goldUsd)}</div>
      <div class="meta"><span id="home-gold-gram" data-ug="${esc(L.goldUnitGram || 'gram')}"${goldUsd != null ? ' data-usdoz="' + goldUsd + '"' : ''}>${goldUsd != null ? '$' + fmt(goldUsd / TROY_OZ) + ' / ' + esc(L.goldUnitGram || 'gram') : ''}</span>
        <span class="go">${esc(L.viewAll)} →</span></div>
    </a>
    <a class="card cn" href="/${lang}/china-fuel/">
      <h3><span class="swatch s"></span>${esc(L.secCn)}</h3>
      <div class="big">${a92 != null ? '¥' + fmt(a92) : '—'}</div>
      <div class="unit">92# ${esc(L.thProvince)} ${list.length ? '· ' + list.length + ' ' + esc(L.provincesCount) : ''}</div>
      <div class="meta"><span>${updatedLine(lang, m?.cnOil?.updated, tz)}</span>
        <span class="go">${esc(L.viewAll)} →</span></div>
    </a>
    <a class="card fx" href="/${lang}/currency/">
      <h3><span class="swatch f"></span>${esc(L.secFx)}</h3>
      <div class="big">${fx ? fmtFx(rateOf('USD', 'EUR', fx) ?? 0) : '—'}</div>
      <div class="unit">1 USD = ${fx ? fmtFx(rateOf('USD', 'EUR', fx)) : '—'} EUR</div>
      <div class="meta"><span>${fxUpdatedBlock(lang, fx, tz)}</span>
        <span class="go">${esc(L.viewAll)} →</span></div>
    </a>
  </div>
  <p class="src-note"><strong>${esc(L.dataSource)}：</strong>${esc(L.srcOverview || L.goldSrcShort || '')}</p>
  ${L.netHint ? `<p class="src-note soft">${esc(L.netHint)}</p>` : ''}
  ${L.srcDisclaimer ? `<p class="src-note soft">${esc(L.srcDisclaimer)}</p>` : ''}
  ${adSlot('home')}
<script type="application/json" id="ps-home-fx">${JSON.stringify((fx && fx.rates) || {}).replace(/</g, '\\u003c')}</script>
${liveT(lang)}
<script>${HOME_LIVE_JS}</script>
</div></section>`;

  const fp = contentFor(lang, 'faqPage');
  const homeFaq = (fp?.items || []).slice(0, 5).map(f =>
    `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  const body = hero(lang) + cards
    + `<section class="blk alt"><div class="wrap prose">
  <h2 class="h2"><span class="ico">📖</span>${esc(commonFor(lang).aboutThisData)}</h2>
  <p class="lead">${esc(fp?.lead || '')}</p>
</div></section>`
    + `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">❓</span>${esc(commonFor(lang).faqHeading)}</h2>
  <div class="faq-list">${homeFaq}</div>
</div></section>`
    + sourceBlock(lang);
  return page({ lang, title: L.homeTitle, desc: L.homeDesc, path: '/', active: '/', body });
}

// ------------------------------------------------------------
// CRUDE OIL
// ------------------------------------------------------------
/* ★ 首页三卡实时脚本
 * 与黄金页同构：首屏用服务端值（爬虫能读到真数），浏览器再定时刷新覆盖成实时价。
 *   · 原油 → /api/oil-live（一次同时拿布伦特 + WTI）
 *   · 黄金 → 浏览器直连三个源（与黄金页同一套，已验证在用户侧可用）
 * 徽标统一显示「实时 · Ns 前」，每 5 秒走一次秒数；休市显示「休市中」。 */
const HOME_LIVE_JS = `
(function(){
  var OZ=31.1034768;
  var T={live:'Live',lost:'Connection lost',closed:'Market closed',ago:'Updated {n} ago'};
  var tEl=document.getElementById('ps-live-t');
  if(tEl){ try{ T=JSON.parse(tEl.textContent)||T; }catch(e){} }

  var items=[];
  function mk(chipId,elId,gramId){
    var el=document.getElementById(elId);
    if(!el) return null;
    var it={el:el,chip:document.getElementById(chipId),
            gram:gramId?document.getElementById(gramId):null,
            lastOk:0,state:'init'};
    items.push(it); return it;
  }
  var oil=mk('home-oil-chip','home-oil-price');
  var wti=mk('home-wti-chip','home-wti-price');
  var gold=mk('home-gold-chip','home-gold-price','home-gold-gram');
  if(!items.length) return;

  function fm(v){ try{ return '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }catch(e){ return '$'+v; } }
  function agoTxt(ms){
    var s=Math.round((Date.now()-ms)/1000);
    return s<60?(s+'s'):(s<3600?Math.round(s/60)+'m':Math.round(s/3600)+'h');
  }
  /* ★ 秒数单独 span + 等宽：避免 4s→14s 时卡片被顶宽抖动。
   *   各语言 {n} 位置不同：中文「{n}前更新」在前，英文「Updated {n} ago」在中间。
   *   统一按 {n} 拆成前后两段，秒数只占中间那个 span —— 既贴紧又不撑宽。 */
  var _A=(T.ago||'{n}').split('{n}');
  var AGOPRE=_A[0]||'', AGOTAIL=_A[1]||'';
  /* ★ 整段文字必须包进一个 .live-txt：
   *   .live-dot 是 flex 容器且设了 gap:5px，而 flex 会把【每个文本节点】
   *   都当成独立 item —— 拆成三段就会插两段 5px 空隙，
   *   「实时 · 」「4s」「前更新」被拉得很开（黄金页原来是一整段，所以贴得紧）。
   *   包成整体后，gap 只作用在圆点与文字之间，文字内部按正常 inline 流紧贴。 */
  /* ★ 幂等更新：秒数每秒都要重画一次。若每次都 textContent='' 把整棵子树推倒重建，
   *   浏览器翻译插件（它把文本节点包进自己的元素，并监听变化重新翻译）就会被反复打断，
   *   表现为徽标「一下子大、一下子小」地闪。
   *   现在：结构只建一次，之后只改那一个秒数 span 的文字，且值没变就不写。
   *   ★ 秒数 span 标 notranslate —— 数字本就无需翻译，交给插件反而会抖。 */
  function setAgo(el,ago){
    var sp=el.querySelector('.ago');
    if(!sp||!el.querySelector('.live-txt')){
      el.textContent='';
      var box=document.createElement('span'); box.className='live-txt';
      box.appendChild(document.createTextNode(T.live+' · '+AGOPRE));
      sp=document.createElement('span');
      sp.className='ago notranslate'; sp.setAttribute('translate','no');
      box.appendChild(sp);
      if(AGOTAIL) box.appendChild(document.createTextNode(AGOTAIL));
      el.appendChild(box);
    }
    if(sp.textContent!==ago) sp.textContent=ago;
  }
  function paint(it){
    if(!it||!it.chip) return;
    it.chip.hidden=false;
    if(it.state==='lost'){ it.chip.classList.add('is-lost'); it.chip.textContent=T.lost; return; }
    if(it.state==='closed'){ it.chip.classList.add('is-lost'); it.chip.textContent=T.closed; return; }
    it.chip.classList.remove('is-lost');
    if(it.lastOk) setAgo(it.chip,agoTxt(it.lastOk));
    else it.chip.textContent=T.live;
  }

  function pullOil(){
    fetch('/api/oil-live',{cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(j){
        var now=Date.now();
        var b=+j.brent||0, w=+j.wti||0;
        if(b&&oil){ oil.el.textContent=fm(b); oil.lastOk=now; oil.state='live'; paint(oil); }
        if(w&&wti){ wti.el.textContent=fm(w); wti.lastOk=now; wti.state='live'; paint(wti); }
      })
      .catch(function(){
        if(oil){ oil.state='lost'; paint(oil); }
        if(wti){ wti.state='lost'; paint(wti); }
      });
  }

  var GSRC=[
    {u:'https://biquote.io/api/XAUUSD',p:function(j){var b=+j.bid,a=+j.ask;return (b&&a)?(b+a)/2:(+j.mid||0);}},
    {u:'https://xaus.com/api/v1/spot?currency=CNY&unit=gram&compact=1',
     p:function(j){var st=j&&j.data_state; if(st&&st!=='fresh') throw new Error('xaus:'+st);
                   return +j.spot_usd_oz||0;}},
    {u:'https://api.gold-api.com/price/XAU',p:function(j){return +j.price||0;}},
    {u:'https://xaus.com/api/v1/spot?currency=USD&unit=oz&compact=1',
     p:function(j){var st=j&&j.data_state; if(st&&st!=='fresh') throw new Error('xaus-usd:'+st);
                   return +(j.spot_usd_oz||j.price||j.spot)||0;}}
  ];
  function one(s){
    return new Promise(function(res,rej){
      var done=false;
      var t=setTimeout(function(){ if(!done){done=true;rej(new Error('timeout'));} },2500);
      fetch(s.u,{cache:'no-store',headers:{Accept:'application/json'}})
        .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(function(j){ var v=s.p(j); if(!v) throw new Error('bad'); if(!done){done=true;clearTimeout(t);res(v);} })
        .catch(function(e){ if(!done){done=true;clearTimeout(t);rej(e);} });
    });
  }
  function pullGold(){
    if(!gold) return;
    var i=0;
    (function step(){
      if(i>=GSRC.length){ gold.state='lost'; paint(gold); return; }
      one(GSRC[i]).then(function(v){
        gold.el.textContent=fm(v);
        if(gold.gram){
          var ug=gold.gram.getAttribute('data-ug')||'gram';
          gold.gram.textContent=fm(v/OZ)+' / '+ug;
        }
        gold.lastOk=Date.now(); gold.state='live'; paint(gold);
      },function(){ i++; step(); });
    })();
  }

  /* 黄金休市判断（纽约时间），与黄金页同一套规则 */
  function goldState(){
    try{
      var f=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',hour12:false});
      var o={}; f.formatToParts(new Date()).forEach(function(p){ o[p.type]=p.value; });
      var wd=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(o.weekday);
      var hh=parseInt(o.hour,10);
      if(wd===6) return 'closed';
      if(wd===0) return hh>=18?'open':'closed';
      if(wd===5) return hh<17?'open':'closed';
      if(hh===17) return 'closed';
      return 'open';
    }catch(e){ return 'open'; }
  }

  function cycle(){
    pullOil();
    if(gold){
      if(goldState()==='open') pullGold();
      else { gold.state='closed'; paint(gold); }
    }
  }
  cycle();
  setInterval(cycle,15000);
  /* ★ 秒数 1 秒一跳：纯前端计时，不发请求 */
  setInterval(function(){ items.forEach(paint); },1000);
})();`;

/* 实时徽标的多语言文案：直接复用黄金页那套，七语言齐全 */
function liveT(lang){
  const L = t(lang);
  return '<script type="application/json" id="ps-live-t">'
    + JSON.stringify({live:L.goldLiveTag, lost:L.goldConnLost,
                      closed:L.goldClosedTag || 'Market closed', ago:L.goldUpdatedAgo})
        .replace(/</g, '\\u003c')
    + '</script>';
}

/* ★ Vercel 测试版：原油 / WTI 实时刷新脚本
 * 逻辑与黄金 GOLD_LIVE_JS 同构：页面先渲染服务端值（保证首屏有数），
 * 再由浏览器定时拉 /api/oil-live 覆盖成实时价。
 * kind = 'wti' 时取 WTI 字段，否则取布伦特。 */
function oilLiveJs(kind) {
  return `
(function(){
  var el=document.getElementById('oil-live-price');
  var chip=document.getElementById('oil-live-chip');
  if(!el) return;
  var KIND='${kind}';
  var T={live:'Live',lost:'Connection lost',ago:'Updated {n} ago'};
  var tEl=document.getElementById('ps-live-t');
  if(tEl){ try{ T=JSON.parse(tEl.textContent)||T; }catch(e){} }
  var lastOk=0,state='init';
  function fm(v){ try{ return '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }catch(e){ return '$'+v; } }
  function agoTxt(){
    var s=Math.round((Date.now()-lastOk)/1000);
    return s<60?(s+'s'):(s<3600?Math.round(s/60)+'m':Math.round(s/3600)+'h');
  }
  /* ★ 秒数单独 span + 等宽：避免 4s→14s 时卡片被顶宽抖动。
   *   各语言 {n} 位置不同：中文「{n}前更新」在前，英文「Updated {n} ago」在中间。
   *   统一按 {n} 拆成前后两段，秒数只占中间那个 span —— 既贴紧又不撑宽。 */
  var _A=(T.ago||'{n}').split('{n}');
  var AGOPRE=_A[0]||'', AGOTAIL=_A[1]||'';
  /* ★ 整段文字必须包进一个 .live-txt：
   *   .live-dot 是 flex 容器且设了 gap:5px，而 flex 会把【每个文本节点】
   *   都当成独立 item —— 拆成三段就会插两段 5px 空隙，
   *   「实时 · 」「4s」「前更新」被拉得很开（黄金页原来是一整段，所以贴得紧）。
   *   包成整体后，gap 只作用在圆点与文字之间，文字内部按正常 inline 流紧贴。 */
  /* ★ 幂等更新：秒数每秒都要重画一次。若每次都 textContent='' 把整棵子树推倒重建，
   *   浏览器翻译插件（它把文本节点包进自己的元素，并监听变化重新翻译）就会被反复打断，
   *   表现为徽标「一下子大、一下子小」地闪。
   *   现在：结构只建一次，之后只改那一个秒数 span 的文字，且值没变就不写。
   *   ★ 秒数 span 标 notranslate —— 数字本就无需翻译，交给插件反而会抖。 */
  function setAgo(el,ago){
    var sp=el.querySelector('.ago');
    if(!sp||!el.querySelector('.live-txt')){
      el.textContent='';
      var box=document.createElement('span'); box.className='live-txt';
      box.appendChild(document.createTextNode(T.live+' · '+AGOPRE));
      sp=document.createElement('span');
      sp.className='ago notranslate'; sp.setAttribute('translate','no');
      box.appendChild(sp);
      if(AGOTAIL) box.appendChild(document.createTextNode(AGOTAIL));
      el.appendChild(box);
    }
    if(sp.textContent!==ago) sp.textContent=ago;
  }
  function paint(){
    if(!chip) return;
    chip.hidden=false;
    if(state==='lost'){ chip.classList.add('is-lost'); chip.textContent=T.lost; return; }
    chip.classList.remove('is-lost');
    if(lastOk) setAgo(chip,agoTxt());
    else chip.textContent=T.live;
  }
  function pull(){
    return fetch('/api/oil-live',{cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(j){
        var v=(KIND==='wti')?(j.wti||0):(j.brent||0);
        if(!v) return;
        el.textContent=fm(v);
        lastOk=Date.now(); state='live';
        /* 源名称不再占徽标（徽标统一显示「实时 · Ns 前」），改为悬停可见 */
        if(chip&&j.providerLabel) chip.title=j.providerLabel;
        paint();
      })
      .catch(function(){ state='lost'; paint(); });
  }
  pull(); setInterval(pull,15000);
  /* ★ 秒数 1 秒一跳：纯前端计时，不发请求 */
  setInterval(paint,1000);
})();`;
}

export function renderOil(lang, m, tz) {
  const L = t(lang);
  const p = m?.oil?.price;
  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">🛢</span>${esc(L.oilTitle)}</h2>
  <p class="sub">${esc(marketNote(lang, tz))}</p>
  <div class="grid">
    <div class="card oil">
      <h3><span class="swatch o"></span>${esc(L.price)}</h3>
      <div class="big" id="oil-live-price">${p != null ? '$' + fmt(p) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span id="oil-live-chip" class="live-dot" hidden></span></div>
    </div>
  </div>
  <p class="src-note"><strong>${esc(L.dataSource)}：</strong>${esc(L.srcOil || '')}</p>
  ${L.netHint ? `<p class="src-note soft">${esc(L.netHint)}</p>` : ''}
  ${L.srcDisclaimer ? `<p class="src-note soft">${esc(L.srcDisclaimer)}</p>` : ''}
  ${adSlot('oil')}
</div></section>
${explainer(lang, 'oil')}
${faqBlock(lang, 'oil')}
${relatedBlock(lang, 'oil')}
${sourceBlock(lang, 'Oil')}
${liveT(lang)}
<script>${oilLiveJs('brent')}</script>`;
  return page({ lang, title: L.oilMetaTitle, desc: L.oilMetaDesc, path: '/oil/', active: '/oil/', body });
}

// ------------------------------------------------------------
// WTI CRUDE (second global benchmark — pairs with Brent)
// ------------------------------------------------------------
// WTI arrives in the same upstream request as Brent, so it costs no extra
// API quota. If the upstream Worker has not been upgraded yet, price is
// null and the card shows a dash — the page still renders fully.
export function renderWti(lang, m, tz) {
  const L = t(lang);
  const p = m?.wti?.price;
  const b = m?.oil?.price;
  // Only show the spread when both legs are present and non-zero.
  const spread = (p != null && b != null) ? b - p : null;
  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">🛢</span>${esc(L.wtiTitle)}</h2>
  <p class="sub">${esc(marketNote(lang, tz))}</p>
  <div class="grid">
    <div class="card oil">
      <h3><span class="swatch w"></span>${esc(L.price)}</h3>
      <div class="big" id="oil-live-price">${p != null ? '$' + fmt(p) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span id="oil-live-chip" class="live-dot" hidden></span></div>
    </div>
    ${spread != null ? `<div class="card oil">
      <h3><span class="swatch o"></span>${esc(L.wtiSpread)}</h3>
      <div class="big">${spread >= 0 ? '+' : ''}${fmt(spread)}</div>
      <div class="unit">${esc(L.wtiSpreadUnit)}</div>
      <div class="meta"><span>${esc(L.wtiSpreadHint)}</span></div>
    </div>` : ''}
  </div>
  <p class="src-note"><strong>${esc(L.dataSource)}：</strong>${esc(L.srcWti || '')}</p>
  ${L.netHint ? `<p class="src-note soft">${esc(L.netHint)}</p>` : ''}
  ${L.srcDisclaimer ? `<p class="src-note soft">${esc(L.srcDisclaimer)}</p>` : ''}
  ${adSlot('wti')}
</div></section>
${explainer(lang, 'wti')}
${faqBlock(lang, 'wti')}
${relatedBlock(lang, 'wti')}
${sourceBlock(lang, 'Wti')}
${liveT(lang)}
<script>${oilLiveJs('wti')}</script>`;
  return page({ lang, title: L.wtiMetaTitle, desc: L.wtiMetaDesc, path: '/wti/', active: '/wti/', body });
}

// ------------------------------------------------------------
// GOLD
// ------------------------------------------------------------
export function renderGold(lang, m, fx, tz) {
  const L = t(lang);
  const u = m?.gold?.usdOz, c = m?.gold?.cnyGram;
  const rates = (fx && fx.rates) ? fx.rates : null;
  const fxDate = (fx && fx.date) ? fx.date : '';

  /* 首屏（SSR）必须自己带数字 —— 不能等 JS，否则打开是一片空白。
   * 默认币种 USD（页面默认英文）；用户选过之后由 localStorage 记住，
   * JS 加载后会立刻切到他上次选的那一个。 */
  const initUsd = u;
  const initGram = (u != null) ? u / TROY_OZ : null;   // 默认 USD / 克

  const initJson = JSON.stringify({ usdOz: u ?? null, asOf: m?.gold?.updated ?? null })
    .replace(/</g, '\\u003c');
  const ratesJson = JSON.stringify(rates || {}).replace(/</g, '\\u003c');

  /* 单位跟随界面语言：切到中文显示「金衡盎司 / 克」，日文显示「トロイオンス / グラム」。 */
  const UOZ = L.goldUnitOz || 'troy oz';
  const UG  = L.goldUnitGram || 'gram';

  /* ★ A22p：人民币汇率统一走 CNY（与汇率页口径一致）。
   * 改之前这里优先取 CNH（离岸），而汇率页取 CNY（在岸），
   * 同一个站两个数字对不上。现在全站统一在岸。
   * 源里若没有 CNY 才退回 CNH，且标签跟着实际取值走。 */
  const CNY = cnyRateOf(rates);
  const cnyTxt = (CNY.value != null) ? fmtFx(CNY.value) : '—';

  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">🥇</span>${esc(L.goldTitle)}</h2>
  <p class="sub">${esc(marketNote(lang, tz))}</p>
  <div class="grid">
    <div class="card gold" id="g-intl">
      <h3><span class="swatch"></span>${esc(L.goldUsd)}</h3>
      <div class="big" id="g-usd">${initUsd != null ? '$' + fmt(initUsd) : '—'}</div>
      <div class="unit">USD / ${esc(UOZ)}</div>
      <div class="meta"><span id="g-status" class="live-dot"
        data-live="${esc(L.goldLiveTag)}" data-lost="${esc(L.goldConnLost)}"
        data-closed="${esc(L.goldClosedTag || 'Market closed')}"
        data-ago="${esc(L.goldUpdatedAgo)}">${esc(L.goldLiveTag)}</span></div>
      <p class="src-note" id="g-closed-note" hidden>${esc(L.goldClosedNote || '')}</p>
    </div>
    <div class="card gold" id="g-local">
      <h3><span class="swatch"></span>${esc(L.goldLocalTitle)}</h3>
      <div class="big" id="g-conv">${initGram != null ? '$' + fmt(initGram) : '—'}</div>
      <div class="unit"><select id="g-cur" aria-label="${esc(L.goldLocalTitle)}"></select> / ${esc(UG)}</div>
      <div class="meta"><span id="g-rate" data-uo="${esc(UOZ)}" data-ug="${esc(UG)}" data-cny-code="${esc(CNY.code)}" data-cny-rate="${CNY.value != null ? esc(String(CNY.value)) : ''}">${rates ? esc('1 USD = ' + cnyTxt + ' ' + CNY.code + ' · 1 ' + UOZ + ' = 31.1034768 ' + UG + (fxDate ? ' · FX ' + fxDate : '')) : ''}</span></div>
    </div>
  </div>
  <p class="src-note"><strong>${esc(L.dataSource)}：</strong>${esc(L.goldSrcShort || '')}<br><strong>${esc(L.goldNotAdvice)}</strong></p>
  ${adSlot('gold')}
</div></section>
${explainer(lang, 'gold')}
${faqBlock(lang, 'gold')}
${relatedBlock(lang, 'gold')}
<section class="blk alt"><div class="wrap prose">
  <h2 class="h2"><span class="ico">🔎</span>${esc(L.dataSource)}</h2>
  <p class="prose-p">${esc(L.goldSrcNote || '')}</p>
</div></section>
${sourceBlock(lang, 'Gold')}
<script type="application/json" id="ps-gold-init">${initJson}</script>
<script type="application/json" id="ps-fx">${ratesJson}</script>
<script>${GOLD_LIVE_JS}</script>`;
  return page({ lang, title: L.goldMetaTitle, desc: L.goldMetaDesc, path: '/gold/', active: '/gold/', body });
}

// ------------------------------------------------------------
// CHINA FUEL (full province table — strong SEO content)
// ------------------------------------------------------------
export function renderCn(lang, m, tz) {
  const L = t(lang);
  const list = m?.cnOil?.list || [];
  const rows = list.map(x => `<tr>
    <td class="pv">${esc(provName(x.prov, lang))}</td>
    <td class="num">${x.p92 != null ? fmt(x.p92) : '—'}</td>
    <td class="num">${x.p95 != null ? fmt(x.p95) : '—'}</td>
    <td class="num hi">${x.p98 != null ? fmt(x.p98) : '—'}</td>
    <td class="num">${x.p0 != null ? fmt(x.p0) : '—'}</td>
  </tr>`).join('');

  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">⛽</span>${esc(L.cnTitle)}</h2>
  <p class="sub">${esc(L.cnNote)} ${updatedLine(lang, m?.cnOil?.updated, tz)}</p>
  <div class="tblwrap"><table>
    <thead><tr>
      <th>${esc(L.thProvince)}</th><th>${esc(L.th92)}</th><th>${esc(L.th95)}</th>
      <th>${esc(L.th98)}</th><th>${esc(L.th0)}</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="5">—</td></tr>`}</tbody>
  </table></div>
  <p class="src-note">${esc(list.length)} ${esc(L.provincesCount)} · <strong>${esc(L.dataSource)}：</strong>${esc(L.srcCn || '')}</p>
  ${adSlot('cn')}
</div></section>
${explainer(lang, 'cn')}
${faqBlock(lang, 'cn')}
${relatedBlock(lang, 'cn')}
${sourceBlock(lang, 'Cn')}`;
  return page({ lang, title: L.cnMetaTitle, desc: L.cnMetaDesc, path: '/china-fuel/', active: '/china-fuel/', body });
}

// ------------------------------------------------------------
// CURRENCY CONVERTER
// ------------------------------------------------------------
export function renderFx(lang, fx, tz) {
  const L = t(lang);
  const cn = (code) => esc(curName(lang, code));
  const opts = CURRENCIES.map(c =>
    `<option value="${c.c}">${cn(c.c)} (${c.c})</option>`).join('');
  const opts2 = CURRENCIES.map(c =>
    `<option value="${c.c}"${c.c === 'CNY' ? ' selected' : ''}>${cn(c.c)} (${c.c})</option>`).join('');

  const pairs = POPULAR_PAIRS.map(([a, b]) => {
    const r = rateOf(a, b, fx);
    return `<div class="pair">
      <div class="p">${esc(curName(lang, a))} (${a}) → ${esc(curName(lang, b))} (${b})</div>
      <div class="v">${r != null ? fmtFx(r) : '—'}</div>
    </div>`;
  }).join('');

  const ratesJson = fx ? JSON.stringify(fx.rates) : '{}';
  const curJson = JSON.stringify(CURRENCIES.map(c => c.c));

  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">💱</span>${esc(L.fxTitle)}</h2>
  <p class="sub">${esc(L.fxNote)}${fx?.date ? ' · ' + fxUpdatedBlock(lang, fx, tz) : ''}</p>
  <p class="src-note"><strong>${esc(L.dataSource)}：</strong>${esc(L.srcFx || '')}</p>

  <div class="conv">
    <div class="fld"><label>${esc(L.fxAmount)}</label>
      <input id="amt" type="number" value="100" min="0" step="any" inputmode="decimal"></div>
    <div class="fld"><label>${esc(L.fxFrom)}</label>
      <select id="from">${opts}</select></div>
    <div class="fld"><label>${esc(L.fxTo)}</label>
      <select id="to">${opts2}</select></div>
    <div class="fld"><label>&nbsp;</label>
      <button class="btn" onclick="doConvert()">${esc(L.fxBtn)}</button></div>
  </div>

  <div class="result">
    <div class="lbl">${esc(L.fxResult)}</div>
    <div class="val" id="out">—</div>
    <div class="rate" id="rt">—</div>
  </div>

  <h2 class="h2" style="margin-top:38px"><span class="ico">🌍</span>${esc(L.fxPopular)}</h2>
  <div class="pairs">${pairs}</div>
  ${adSlot('fx')}
</div></section>

<script>
const RATES = ${ratesJson};
const UILOCALE = ${JSON.stringify(LOCALE_MAP[lang] || 'en-US')};
const CURS = ${curJson};
const NAMES = ${JSON.stringify(Object.fromEntries(CURRENCIES.map(c => [c.c, curName(lang, c.c)])))};
const F = document.getElementById('from'), T = document.getElementById('to'),
      A = document.getElementById('amt'), O = document.getElementById('out'),
      RT = document.getElementById('rt');
/* ★ A22p：小数位按银行牌价惯例 —— 面值大的货币 2 位，主要货币对 4 位。
   原来这里写死 6 位，会输出 6.681042 这种，看着像程序原始值，不像牌价。 */
function fxdp(v){
  const a = Math.abs(Number(v));
  if(!isFinite(a)) return 4;
  return a >= 100 ? 2 : 4;
}
function fxnum(v){
  const d = fxdp(v);
  return Number(v).toLocaleString(UILOCALE,{minimumFractionDigits:d,maximumFractionDigits:d});
}
function doConvert(){
  const a = parseFloat(A.value);
  if(isNaN(a)){ O.textContent='—'; return; }
  const f = RATES[F.value], t2 = RATES[T.value];
  if(f==null||t2==null){ O.textContent='—'; return; }
  const v = (a/f)*t2;
  O.textContent = fxnum(v) + ' ' + (NAMES[T.value]||T.value);
  RT.textContent = '1 ' + (NAMES[F.value]||F.value) + ' (' + F.value + ') = ' + fxnum(t2/f) + ' ' + (NAMES[T.value]||T.value) + ' (' + T.value + ')';
}
[F,T,A].forEach(el=>el.addEventListener('input',doConvert));
doConvert();
</script>
${explainer(lang, 'fx')}
${faqBlock(lang, 'fx')}
${relatedBlock(lang, 'fx')}
${sourceBlock(lang, 'Fx')}`;
  return page({ lang, title: L.fxMetaTitle, desc: L.fxMetaDesc, path: '/currency/', active: '/currency/', body });
}

// ------------------------------------------------------------
// SITE-WIDE FAQ
// ------------------------------------------------------------
export function renderFaq(lang) {
  const C = commonFor(lang);
  const L_FALLBACK = t(lang);
  const fp = contentFor(lang, 'faqPage');
  const items = (fp?.items || []).map(f =>
    `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  const body = `<section class="blk"><div class="wrap prose">
  <h2 class="h2"><span class="ico">❓</span>${esc(C.faqHeading)}</h2>
  <p class="lead">${esc(fp?.lead || '')}</p>
  <div class="faq-list">${items}</div>
  <h2>${esc(L_FALLBACK.contactEmailLabel)}</h2>
  <a class="mailto" href="mailto:${SITE.contactEmail}">\u2709\ufe0f ${SITE.contactEmail}</a>
</div></section>
${sourceBlock(lang)}`;
  const title = `${C.faqHeading} — PriceScope`;
  const desc = fp?.lead || C.faqHeading;
  return page({ lang, title, desc, path: '/faq/', active: '/faq/', body });
}

// ------------------------------------------------------------
// PRIVACY
// ------------------------------------------------------------
/* ★ 隐私政策正文里的外链占位符
 * 形式：[[KEY|显示文本]]，KEY ∈ {GAS, DAA, EDAA}
 * 为什么用占位符而不是直接写 <a>：
 *   privacySections 的 p 字段会先过 esc() 转义，直接内嵌 HTML 会被
 *   原样显示成源码文本（用户看到的就是一串标签，点不了）。
 *   所以先 esc 保证安全，再把占位符换成真正的 <a>，两者顺序不能颠倒。
 */
const PRIVACY_LINKS = {
  GAS: 'https://www.google.com/settings/ads',
  DAA: 'https://www.aboutads.info/choices/',
  EDAA: 'https://www.youronlinechoices.eu/',
};

function linkifyPrivacy(escaped) {
  return escaped.replace(
    /\[\[(GAS|DAA|EDAA)\|([^\]]+)\]\]/g,
    (_m, key, text) =>
      `<a href="${PRIVACY_LINKS[key]}" class="pl" target="_blank" rel="noopener">${text}</a>`
  );
}

export function renderPrivacy(lang, tz) {
  const L = t(lang);
  const secs = L.privacySections.map(s =>
    `<h2>${esc(s.h)}</h2><p>${linkifyPrivacy(esc(s.p))}</p>`).join('');
  const body = `<section class="blk"><div class="wrap prose">
  <h2 class="h2"><span class="ico">🔒</span>${esc(L.privacyTitle)}</h2>
  <p class="sub">${esc(L.privacyUpdated)}: <time data-ts="${esc(new Date().toISOString())}" data-date-only="1">${esc(localDate(lang, tz))}</time></p>
  <p class="lead">${esc(L.privacyIntro)}</p>
  ${secs}
</div></section>`;
  return page({ lang, title: `${L.privacyTitle} — ${L.brand}`, desc: L.privacyMetaDesc,
    path: '/privacy/', active: '/privacy/', body });
}

// ------------------------------------------------------------
// ABOUT
// ------------------------------------------------------------
export function renderAbout(lang) {
  const L = t(lang);
  const secs = L.aboutSections.map(s =>
    `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('');
  const body = `<section class="blk"><div class="wrap prose">
  <h2 class="h2"><span class="ico">ℹ️</span>${esc(L.aboutTitle)}</h2>
  <p class="lead">${esc(L.aboutIntro)}</p>
  <p class="operator">${esc(L.aboutOperator)}</p>
  ${secs}
  <h2>${esc(L.contactEmailLabel)}</h2>
  <a class="mailto" href="mailto:${SITE.contactEmail}">\u2709\ufe0f ${SITE.contactEmail}</a>
</div></section>`;
  return page({ lang, title: `${L.aboutTitle} — ${L.brand}`, desc: L.aboutMetaDesc,
    path: '/about/', active: '/about/', body });
}

// ------------------------------------------------------------
// CONTACT
// ------------------------------------------------------------
export function renderContact(lang) {
  const L = t(lang);
  const contactEmail = SITE.contactEmail;
  const body = `<section class="blk"><div class="wrap prose">
  <h2 class="h2"><span class="ico">✉️</span>${esc(L.contactTitle)}</h2>
  <p class="lead">${esc(L.contactIntro)}</p>
  <h2>${esc(L.contactEmailLabel)}</h2>
  <a class="mailto" href="mailto:${contactEmail}">✉️ ${contactEmail}</a>
  <p>${esc(L.contactNote)}</p>
  <h2>${esc(L.nav.about)}</h2>
  <p>${esc(L.contactTopics)}</p>
</div></section>`;
  return page({ lang, title: `${L.contactTitle} — ${L.brand}`, desc: L.contactMetaDesc,
    path: '/contact/', active: '/contact/', body });
}

// ------------------------------------------------------------
// SITEMAP (multilingual, hreflang)
// ------------------------------------------------------------
export function sitemap() {
  /* ★ v2 修正：
   *  1) 原先用硬编码字符串拼 URL，域名一旦变更就会整份 sitemap 变成
   *     死链，Google 会批量报「已提交但无法抓取」。改为统一走
   *     SITE.domain（src/i18n.js），域名的任何改动一处生效、全局同步。
   *  2) 下方「Article index」那段同样改走 SITE.domain。
   *     注意：/blog/ 列表页本来就有一份（按有译文的语言生成），
   *     所以这里不再重复加进 paths，避免同一 URL 在 sitemap 里出现两次。 */
  const D = SITE.domain;
  const paths = ['/', '/oil/', '/wti/', '/gold/', '/china-fuel/', '/currency/', '/faq/', '/about/', '/privacy/', '/contact/'];
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  for (const p of paths) {
    for (const l of LANGS) {
      const loc = `${D}/${l}${p}`;
      // English is the primary language, so its URLs carry the higher
      // priority and own the x-default fallback.
      const isEn = (l === DEFAULT_LANG);
      const alts = LANGS.map(x =>
        `<xhtml:link rel="alternate" hreflang="${x}" href="${D}/${x}${p}"/>`).join('')
        + `<xhtml:link rel="alternate" hreflang="x-default" href="${D}/en${p}"/>`;
      const pr = p === '/' ? (isEn ? '1.0' : '0.8') : (isEn ? '0.8' : '0.6');
      urls.push(`<url><loc>${loc}</loc><lastmod>${today}</lastmod>
    <changefreq>${p === '/' ? 'hourly' : 'daily'}</changefreq>
    <priority>${pr}</priority>${alts}</url>`);
    }
  }
  // ------------------------------------------------------------
  // Articles — only languages that actually carry a translation are
  // emitted, so hreflang never points at an untranslated page and the
  // sitemap stays honest about what exists.
  // ------------------------------------------------------------
  for (const a of ARTICLES) {
    const artLangs = LANGS.filter(l => a.i18n[l]);
    if (!artLangs.length) continue;
    for (const l of artLangs) {
      const path = `/blog/${a.slug}/`;
      const loc = `${D}/${l}${path}`;
      const alts = artLangs.map(x =>
        `<xhtml:link rel="alternate" hreflang="${x}" href="${D}/${x}${path}"/>`).join('');
      urls.push(`<url><loc>${loc}</loc><lastmod>${a.date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${alts}</url>`);
    }
  }
  // Article index — same language set as the articles themselves.
  const blogLangs = LANGS.filter(l => articlesFor(l).length);
  for (const l of blogLangs) {
    const loc = `${D}/${l}/blog/`;
    const alts = blogLangs.map(x =>
      `<xhtml:link rel="alternate" hreflang="${x}" href="${D}/${x}/blog/"/>`).join('');
    urls.push(`<url><loc>${loc}</loc><lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>${alts}</url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
}
