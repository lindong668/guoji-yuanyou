// ============================================================
// PriceScope — Page renderers (SSR, so crawlers read real numbers)
// ============================================================
import { t, provName, LANGS, SITE } from './i18n.js';
import { page, hero, esc, adSlot } from './ui.js';
import { CURRENCIES, POPULAR_PAIRS, convert, rateOf, fmt } from './data.js';
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
         ago:elStatus.getAttribute('data-ago')||'Updated {n} ago'};

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
  function paint(){
    if(usdOz==null) return;
    elUsd.textContent='$'+num(usdOz);
    elConv.textContent=money(usdOz/OZ*rate(cur));
    elRate.textContent='1 USD = '+num(rate(cur))+' '+cur+' \u00b7 1 oz = 31.1034768 g';
  }
  function agoTxt(){
    if(!lastOk) return '';
    var s=Math.round((Date.now()-lastOk)/1000);
    var t = s<60 ? (s+'s') : (s<3600 ? Math.round(s/60)+'m' : Math.round(s/3600)+'h');
    return T.ago.replace('{n}',t);
  }
  function markLive(){
    dead=false; fails=0; lastOk=Date.now();
    card1.classList.remove('is-stale'); card2.classList.remove('is-stale');
    elStatus.classList.remove('is-lost');
    elStatus.textContent=T.live+' \u00b7 '+agoTxt();
  }
  function markLost(){
    dead=true;
    card1.classList.add('is-stale'); card2.classList.add('is-stale');
    elStatus.classList.add('is-lost');
    elStatus.textContent=T.lost;
  }

  /* 三个源按序尝试。biquote 是券商 MT5 链路（实时、独立），
     xaus 与 gold-api 是指示性现货价 —— 实测三者偏差 < 0.04%。 */
  var SOURCES=[
    {n:'biquote',u:'https://biquote.io/api/XAUUSD',
     p:function(j){var b=+j.bid,a=+j.ask;return (b&&a)?(b+a)/2:(+j.mid||0);}},
    {n:'xaus',u:'https://xaus.com/api/v1/spot?currency=CNY&unit=gram&compact=1',
     p:function(j){return +j.spot_usd_oz||0;}},
    {n:'gold-api',u:'https://api.gold-api.com/price/XAU',
     p:function(j){return +j.price||0;}}
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
      one(SOURCES[i]).then(function(v){ usdOz=v; paint(); cb(true); },
                           function(){ i++; step(); });
    })();
  }
  /* 连续两轮全灭才认定断开 —— 抖动常在半秒内自愈，别急着吓用户。 */
  function cycle(){
    pass(function(ok){
      if(ok){ markLive(); return; }
      setTimeout(function(){
        pass(function(ok2){
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

  setInterval(function(){ if(!dead&&lastOk) elStatus.textContent=T.live+' \u00b7 '+agoTxt(); },5000);
  setInterval(function(){ if(!document.hidden) cycle(); },10000);

  paint();
  if(usdOz!=null) markLive();
  cycle();
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
function sourceBlock(lang) {
  const C = commonFor(lang);
  return `<section class="blk alt"><div class="wrap prose">
  <h2 class="h2"><span class="ico">🔎</span>${esc(C.dataSources)}</h2>
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
      <h3><span class="swatch o"></span>${esc(L.secOil)}</h3>
      <div class="big">${oilPrice != null ? '$' + fmt(oilPrice) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span>${updatedLine(lang, m?.oil?.updated, tz)}</span>
        <span class="go">${esc(L.viewAll)} →</span></div>
    </a>
    <a class="card oil" href="/${lang}/wti/">
      <h3><span class="swatch w"></span>${esc(L.nav.wti)}</h3>
      <div class="big">${wtiPrice != null ? '$' + fmt(wtiPrice) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span>${updatedLine(lang, m?.wti?.updated, tz)}</span>
        <span class="go">${esc(L.viewAll)} →</span></div>
    </a>
    <a class="card gold" href="/${lang}/gold/">
      <h3><span class="swatch"></span>${esc(L.secGold)}</h3>
      <div class="big">${goldUsd != null ? '$' + fmt(goldUsd) : '—'}</div>
      <div class="unit">${esc(L.goldUsd)}</div>
      <div class="meta"><span>${goldCny != null ? '¥' + fmt(goldCny) + ' / g' : ''}</span>
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
      <div class="big">${fx ? fmt(rateOf('USD', 'EUR', fx) ?? 0, 4) : '—'}</div>
      <div class="unit">1 USD = ${fx ? fmt(rateOf('USD', 'EUR', fx), 4) : '—'} EUR</div>
      <div class="meta"><span>${fxUpdatedBlock(lang, fx, tz)}</span>
        <span class="go">${esc(L.viewAll)} →</span></div>
    </a>
  </div>
  ${adSlot('home')}
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
export function renderOil(lang, m, tz) {
  const L = t(lang);
  const p = m?.oil?.price;
  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">🛢</span>${esc(L.oilTitle)}</h2>
  <p class="sub">${esc(marketNote(lang, tz))}</p>
  <div class="grid">
    <div class="card oil">
      <h3><span class="swatch o"></span>${esc(L.price)}</h3>
      <div class="big">${p != null ? '$' + fmt(p) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span>${updatedLine(lang, m?.oil?.updated, tz)}</span></div>
    </div>
  </div>
  <p class="sub" style="margin-top:22px">${esc(m?.oil?.isSettlement ? 'Settlement price' : L.dataSource)}: ${esc(L.tagline)}</p>
  ${adSlot('oil')}
</div></section>
${explainer(lang, 'oil')}
${faqBlock(lang, 'oil')}
${relatedBlock(lang, 'oil')}
${sourceBlock(lang)}`;
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
      <div class="big">${p != null ? '$' + fmt(p) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span>${updatedLine(lang, m?.wti?.updated, tz)}</span></div>
    </div>
    ${spread != null ? `<div class="card oil">
      <h3><span class="swatch o"></span>${esc(L.wtiSpread)}</h3>
      <div class="big">${spread >= 0 ? '+' : ''}${fmt(spread)}</div>
      <div class="unit">${esc(L.wtiSpreadUnit)}</div>
      <div class="meta"><span>${esc(L.wtiSpreadHint)}</span></div>
    </div>` : ''}
  </div>
  <p class="sub" style="margin-top:22px">${esc(L.dataSource)}: ${esc(L.tagline)}</p>
  ${adSlot('wti')}
</div></section>
${explainer(lang, 'wti')}
${faqBlock(lang, 'wti')}
${relatedBlock(lang, 'wti')}
${sourceBlock(lang)}`;
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

  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">🥇</span>${esc(L.goldTitle)}</h2>
  <p class="sub">${esc(marketNote(lang, tz))}</p>
  <div class="grid">
    <div class="card gold" id="g-intl">
      <h3><span class="swatch"></span>${esc(L.goldUsd)}</h3>
      <div class="big" id="g-usd">${initUsd != null ? '$' + fmt(initUsd) : '—'}</div>
      <div class="unit">USD / troy oz</div>
      <div class="meta"><span id="g-status" class="live-dot"
        data-live="${esc(L.goldLiveTag)}" data-lost="${esc(L.goldConnLost)}"
        data-ago="${esc(L.goldUpdatedAgo)}">${esc(L.goldLiveTag)}</span></div>
    </div>
    <div class="card gold" id="g-local">
      <h3><span class="swatch"></span>${esc(L.goldLocalTitle)}</h3>
      <div class="big" id="g-conv">${initGram != null ? '$' + fmt(initGram) : '—'}</div>
      <div class="unit"><select id="g-cur" aria-label="${esc(L.goldLocalTitle)}"></select> / gram</div>
      <div class="meta"><span id="g-rate">${rates ? esc('1 USD = ' + (rates.CNH || rates.CNY || '—') + ' CNH · 1 oz = 31.1034768 g' + (fxDate ? ' · FX ' + fxDate : '')) : ''}</span></div>
    </div>
  </div>
  <p class="src-note"><strong>${esc(L.goldNotAdvice)}</strong></p>
  ${adSlot('gold')}
</div></section>
${explainer(lang, 'gold')}
${faqBlock(lang, 'gold')}
${relatedBlock(lang, 'gold')}
<section class="blk alt"><div class="wrap prose">
  <h2 class="h2"><span class="ico">🔎</span>${esc(L.goldSrcNote ? '数据来源' : '数据来源')}</h2>
  <p class="prose-p">${esc(L.goldSrcNote || '')}</p>
</div></section>
${sourceBlock(lang)}
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
  <p class="sub" style="margin-top:14px">${esc(list.length)} ${esc(L.provincesCount)} · ${esc(L.dataSource)}: showapi</p>
  ${adSlot('cn')}
</div></section>
${explainer(lang, 'cn')}
${faqBlock(lang, 'cn')}
${relatedBlock(lang, 'cn')}
${sourceBlock(lang)}`;
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
      <div class="v">${r != null ? fmt(r, 4) : '—'}</div>
    </div>`;
  }).join('');

  const ratesJson = fx ? JSON.stringify(fx.rates) : '{}';
  const curJson = JSON.stringify(CURRENCIES.map(c => c.c));

  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">💱</span>${esc(L.fxTitle)}</h2>
  <p class="sub">${esc(L.fxNote)}${fx?.date ? ' · ' + fxUpdatedBlock(lang, fx, tz) : ''}</p>

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
function doConvert(){
  const a = parseFloat(A.value);
  if(isNaN(a)){ O.textContent='—'; return; }
  const f = RATES[F.value], t2 = RATES[T.value];
  if(f==null||t2==null){ O.textContent='—'; return; }
  const v = (a/f)*t2;
  O.textContent = v.toLocaleString(UILOCALE,{maximumFractionDigits:4}) + ' ' + (NAMES[T.value]||T.value);
  RT.textContent = '1 ' + (NAMES[F.value]||F.value) + ' (' + F.value + ') = ' + (t2/f).toLocaleString(UILOCALE,{maximumFractionDigits:6}) + ' ' + (NAMES[T.value]||T.value) + ' (' + T.value + ')';
}
[F,T,A].forEach(el=>el.addEventListener('input',doConvert));
doConvert();
</script>
${explainer(lang, 'fx')}
${faqBlock(lang, 'fx')}
${relatedBlock(lang, 'fx')}
${sourceBlock(lang)}`;
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
      const alts = LANGS.map(x =>
        `<xhtml:link rel="alternate" hreflang="${x}" href="${D}/${x}${p}"/>`).join('');
      urls.push(`<url><loc>${loc}</loc><lastmod>${today}</lastmod>
    <changefreq>${p === '/' ? 'hourly' : 'daily'}</changefreq>
    <priority>${p === '/' ? '1.0' : '0.8'}</priority>${alts}</url>`);
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
