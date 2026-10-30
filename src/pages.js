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

const BEAT_CORE = `
  /* ================================================================
   * ★★★ 行情节拍核心（三个页面共用，唯一真相来源）
   * ---------------------------------------------------------------
   * 这是【整个实时刷新的全部逻辑】。之前版本叠了六套互相打架的机制
   * （排程判断 / 实测判断 / 锚点 / 节拍 / 多源多轮探测 / 漏拍保护），
   * 它们共用同一个 state 与 lastOk 但语义各不相同 —— 这是所有混乱的根源。
   * 现在只剩【一套】：节拍 + 三态判定。
   *
   * 快照 ps_beat_{key} = {t, v, mv, ok}
   *   t  上次【成功拿到数据】的时刻（心跳，决定秒数与"连接中断"）
   *   v  上次价格
   *   mv 上次【价格变化】的时刻（决定"休市中"）
   *   ok 连续成功次数（价格一直不动时累积）
   *
   * 状态只有三个，全部由 bState() 纯函数算出 —— 无异步、无额外请求：
   *   ① now-t > 1.5 拍                      → 连接中断（这一拍没拿到数据）
   *   ② 价格冻结 ≥20 分钟 且 连续成功 ≥80 次 → 休市中（链路通，市场真没动）
   *   ③ 其他                                → 实时
   *
   * ★ 多源在哪？在【后端】：/api/oil-live 已按序试 8 个源，拿到就返回。
   *   前端不再自己探测一遍 —— 那正是复杂度和 bug 的温床。
   * ================================================================ */
  var BEAT=15000;        /* 15 秒一拍 */
  var DEAD=22500;        /* 1.5 拍没拿到数据 = 漏拍 */
  var CLOSED_MS=1200000; /* 价格冻结 20 分钟 */
  var CLOSED_OK=80;      /* 且连续成功 80 次（80 × 15s = 20 分钟，必须与 CLOSED_MS 同步）*/
  var WAKE=8000;         /* 后台切回来的宽限窗口（8 秒） */
  /* ★ 页面被最小化 / 切到后台时 tick() 不抓取，快照会变旧。
   *   切回来的瞬间若直接按"超过 22.5 秒"判 lost，就会闪一下"连接中断"——
   *   那是【页面睡了一觉】，不是 API 断线，属于误报。
   *   bWakeAll() 在切回前台时给"已经变旧"的快照打上唤醒标记 w，
   *   bState() 在宽限窗口内不报断线：服务端已确认休市就立刻显示休市，
   *   否则保持上一帧不动，等这一拍（≤1 秒）回来再更新。 */
  /* ★ 切回前台要【立刻补一拍】，不能干等定时器。
   *   浏览器把后台标签页的 setTimeout 节流到分钟级（甚至更久），
   *   只打标记不补拍的话，秒数会僵在切走前那个值（实测僵了 40 多秒）
   *   —— 用户看到的就是"卡住了"。各页面把自己的取数函数注册进来。 */
  var WAKE_CB=[];
  function bOnWake(fn){ if(typeof fn==='function') WAKE_CB.push(fn); }
  function bWakeAll(){
    var now=Date.now();
    try{
      for(var i=0;i<sessionStorage.length;i++){
        var k=sessionStorage.key(i);
        if(!k||k.indexOf('ps_beat_')!==0) continue;
        var o=JSON.parse(sessionStorage.getItem(k)||'null');
        /* 只给【已经变旧】的快照打标记；切出去两秒就回来不算 */
        if(o&&typeof o.t==='number'&&o.t&&(now-o.t)>DEAD){ o.w=now; sessionStorage.setItem(k,JSON.stringify(o)); }
      }
    }catch(e){}
    for(var j=0;j<WAKE_CB.length;j++){ try{ WAKE_CB[j](); }catch(e2){} }
  }
  try{ document.addEventListener('visibilitychange',function(){ if(!document.hidden) bWakeAll(); }); }catch(e){}

  function bKey(k){ return 'ps_beat_'+k; }
  function bGet(k){
    try{ var o=JSON.parse(sessionStorage.getItem(bKey(k))||'null');
         return (o&&typeof o.t==='number')?o:null; }catch(e){ return null; }
  }
  function bSet(k,o){ try{ sessionStorage.setItem(bKey(k),JSON.stringify(o)); }catch(e){} }
  /* 距下次该拉还有多久（>0 就沿用快照，不请求） */
  function bDelay(k){ var o=bGet(k); if(!o||!o.t) return 0;
                      var d=o.t+BEAT-Date.now(); return d>0?d:0; }
  /* 记录一次【失败】取数。
   * f = 首次失败的时刻（只记一次）。
   * 用途：页面【一次都没成功过】时（新访客、无痕、清缓存、API 全挂），
   *       快照里没有 t，bState 原本会直接判 live —— 页面显示 SSR 的旧数字
   *       却标着"实时"，严重误导。有了 f 就能如实报断线。 */
  function bFail(k){
    var now=Date.now(), o=bGet(k)||{t:0,v:null,mv:0,ok:0,moved:false};
    if(!o.f) o.f=now;
    bSet(k,o);
  }
  /* 记录一次【成功】取数。取数失败【不要】调它 —— t 不动，秒数才会涨。 */
  function bNote(k,v){
    if(v==null) return;
    var now=Date.now(), o=bGet(k)||{v:null,mv:0,ok:0,moved:false};
    var changed=(o.v!=null&&Math.abs(v-o.v)>1e-9);
    /* ★ moved：是否【真的观察到过】价格变动。
     *   首次打开时 changed=false（因为 o.v 为空），不能算"市场在动"。 */
    bSet(k,{t:now,v:v,mv:changed?now:(o.mv||now),
            moved:changed?true:(o.moved||false),
            ok:changed?1:(o.ok||0)+1});
  }
  /* 纯函数：由快照算出状态。s = live | lost | closed */
  /* ★ 服务端 Cron 判定的休市状态（每 10 分钟更新一次，不依赖用户打开页面）。
   *   周末用户一打开就能立刻显示休市中，不必自己从零等满 15 分钟。 */
  var SRV={brent:null,wti:null,gold:null};
  /* ★ 首屏零闪烁：直接读 SSR 写进 HTML 的状态，不等异步 fetch */
  (function(){ try{
    var e=document.getElementById('ps-mkt');
    if(e){ var j=JSON.parse(e.textContent)||{};
      SRV.brent=j.brent||null; SRV.wti=j.wti||null; SRV.gold=j.gold||null; }
  }catch(err){} })();
  function srvClosed(k){ return SRV[k]==='closed'; }
  function srvLoad(){
    fetch('/api/market-state',{cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(!j) return;
        SRV.brent=j.brent||null; SRV.wti=j.wti||null; SRV.gold=j.gold||null;
      }).catch(function(){});   /* 读不到就当没有，本地兜底照常工作 */
  }

  function bState(k){
    var o=bGet(k), now=Date.now();
    if(!o||!o.t){
      /* 从未成功过：已失败够久就如实报断线，不能拿 SSR 旧数字假装实时 */
      var f=(o&&o.f)||0;
      if(f && (now-f)>DEAD) return {s:'lost',ago:Math.floor((now-f)/1000),t:f};
      /* ★ 全新会话（手机首次打开）本来会一律显示"实时"，服务端已确认的休市
       *   就被无视了 —— 这正是"电脑休市、手机却显示实时"的根因。 */
      if(srvClosed(k)) return {s:'closed',ago:0,t:now};
      return {s:'live',ago:0,t:now};
    }
    var ago=Math.floor((now-o.t)/1000);
    /* ★ 刚从后台切回来：睡了一觉而已，不是断线 —— 先不报 lost */
    var _wk=o.w||0;
    if(_wk&&(now-_wk)<WAKE){
      if(srvClosed(k)) return {s:'closed',ago:ago,t:o.t};
      if(!o.moved&&(now-(o.mv||o.t))>CLOSED_MS&&(o.ok||0)>=CLOSED_OK) return {s:'closed',ago:ago,t:o.t};
      return {s:'hold',ago:ago,t:o.t};
    }
    if(now-o.t>DEAD) return {s:'lost',ago:ago,t:o.t};
    /* ① 本地近期【真的】看到价格动过 → 一定开市（优先于服务端标记，
     *    因为服务端 Cron 最多有 10 分钟延迟，而开市必须是即时的） */
    if(o.moved && (now-(o.mv||o.t))<CLOSED_MS) return {s:'live',ago:ago,t:o.t};
    /* ② 服务端 Cron 早已确认休市 → 立刻显示，不用本地等满 15 分钟 */
    if(srvClosed(k)) return {s:'closed',ago:ago,t:o.t};
    /* ③ 本地兜底：服务端不可用（没绑 KV / Cron 没跑）时自己累计 15 分钟 */
    if((now-(o.mv||o.t))>CLOSED_MS && (o.ok||0)>=CLOSED_OK) return {s:'closed',ago:ago,t:o.t};
    return {s:'live',ago:ago,t:o.t};
  }
`;

const GOLD_LIVE_JS = `
(function(){${BEAT_CORE}
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
  var lastOk=0, booted=false, first=true;

  function money(v){
    try{ return new Intl.NumberFormat(loc,{style:'currency',currency:cur,minimumFractionDigits:2,maximumFractionDigits:2}).format(v); }
    catch(e){ return (Math.round(v*100)/100)+' '+cur; }
  }
  function num(v){
    try{ return new Intl.NumberFormat(loc,{minimumFractionDigits:2,maximumFractionDigits:2}).format(v); }
    catch(e){ return (Math.round(v*100)/100).toFixed(2); }
  }
  /* 汇率行固定美元兑人民币（不跟币种下拉变，否则会显示 1 USD = 1.00 USD） */
  function fxdp(v){ var a=Math.abs(Number(v)); if(!isFinite(a)) return 4; return a>=100?2:4; }
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
    elRate.textContent='1 USD = '+(isNaN(cnyVal)?'\u2014':fxnum(cnyVal))+' '+cnyCode
      +' \u00b7 1 '+uo+' = 31.1034768 '+ug;
  }
  function agoTxt(){
    if(!lastOk) return '';
    var s=Math.round((Date.now()-lastOk)/1000);
    return s<60 ? (s+'s') : (s<3600 ? Math.round(s/60)+'m' : Math.round(s/3600)+'h');
  }
  var _A=(T.ago||'{n}').split('{n}');
  var AGOPRE=_A[0]||'', AGOTAIL=_A[1]||'';
  /* 秒数单独 span + notranslate：避免 4s→14s 顶宽抖动，也免得翻译插件反复改写 */
  function setAgo(el,ago){
    var sp=el.querySelector('.ago');
    if(!sp||!el.querySelector('.live-txt')){
      el.textContent='';
      var box=document.createElement('span'); box.className='live-txt';
      box.appendChild(document.createTextNode(T.live+' \u00b7 '+AGOPRE));
      sp=document.createElement('span');
      sp.className='ago notranslate'; sp.setAttribute('translate','no');
      box.appendChild(sp);
      if(AGOTAIL) box.appendChild(document.createTextNode(AGOTAIL));
      el.appendChild(box);
    }
    if(sp.textContent!==ago) sp.textContent=ago;
  }

  /* ===== 状态渲染：三个状态全由 bState() 纯函数算出，没有第二套逻辑 ===== */
  function markLive(){
    card1.classList.remove('is-stale'); card2.classList.remove('is-stale');
    elStatus.classList.remove('is-lost');
    setAgo(elStatus,agoTxt());
    if(elNote) elNote.hidden=true;
  }
  function markLost(){
    card1.classList.add('is-stale'); card2.classList.add('is-stale');
    elStatus.classList.add('is-lost');
    elStatus.textContent=T.lost;
  }
  function markClosed(){
    card1.classList.remove('is-stale'); card2.classList.remove('is-stale');
    elStatus.classList.add('is-lost');
    elStatus.textContent=T.closed;
    if(elNote) elNote.hidden=false;
  }
  function render(){
    /* 后台不重绘：否则最小化期间会被一直画成断线，切回来第一眼就是它 */
    if(document.hidden) return;
    var st=bState('gold');
    lastOk=st.t||0;
    /* 首次抓取还没回来：先显示 SSR 那个数，状态按实时（不吓人） */
    if(!booted){ if(st.s==='closed') markClosed(); else markLive(); return; }
    if(st.s==='hold') return;            /* 刚切回前台，保持上一帧，不闪断线 */
    if(st.s==='lost') markLost();
    else if(st.s==='closed') markClosed();
    else markLive();
  }
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

  /* ★★ 前端源粘滞（与后端 stickyProvider 同一套思路）
   * ------------------------------------------------------------------
   * 问题：原来每次都从 i=0 从头按序尝试，一旦 biquote 偶发慢/超时就落到
   *   xaus 或 gold-api —— 三个源口径略有差异，于是用户看到
   *   「首页一个价、点进去又一个价」「刷新一下数字就跳」。
   *
   * 修法：记住上次成功的源，下次【优先复用】它；只有它失败才往后试。
   *   ★ 用 sessionStorage 而不是普通变量：这样【跨页面导航】也保持一致 ——
   *     首页用了 biquote，点进黄金详情页也从 biquote 开始，两端数值同源。
   */
  var GKEY='ps_gold_src';
  function gsGet(){ try{ var v=sessionStorage.getItem(GKEY); return v==null?0:(+v||0); }catch(e){ return 0; } }
  function gsSet(i){ try{ sessionStorage.setItem(GKEY,String(i)); }catch(e){} }
  /* 把上次成功的源排到最前面（其余顺序不变） */
  function goldOrder(arr){
    var st=gsGet();
    if(!st||st>=arr.length) return arr.slice();
    return [arr[st]].concat(arr.filter(function(_,i){ return i!==st; }));
  }
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
  /* 让 2 号 Worker 请 3 号【现在】抓一个新价（与 SSR 同一份缓存） */
  function askBackend(cb){
    fetch('/api/gold-live',{cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j&&j.priceUsdPerOz){ usdOz=j.priceUsdPerOz; paint(); if(cb) cb(true); return; }
        if(cb) cb(false);
      }).catch(function(){ if(cb) cb(false); });
  }
  /* 直连外部源（兜底）：粘滞顺序，拿到就停 */
  function passDirect(cb){
    var list=goldOrder(SOURCES), i=0;
    (function step(){
      if(i>=list.length){ cb(false); return; }
      var srcIdx=SOURCES.indexOf(list[i]);
      one(list[i]).then(function(v){
        gsSet(srcIdx); usdOz=v; paint(); cb(true);
      },function(){ i++; step(); });
    })();
  }
  function fetchOnce(cb){
    askBackend(function(ok){ if(ok) cb(true); else passDirect(cb); });
  }

  /* ★ 一拍：没到节拍就沿用快照（不请求），到点了才真抓 */
  function tick(){
    if(document.hidden) return;
    if(bDelay('gold')>0){
      var o=bGet('gold'); if(o&&o.v!=null) usdOz=o.v;
      paint(); render(); return;
    }
    fetchOnce(function(ok){
      booted=true;
      /* ★ 只有【成功】才 bNote：失败时 t 不动 → 秒数照涨 → 到 1.5 拍就显示连接中断 */
      if(ok) bNote('gold',usdOz); else bFail('gold');
      render();
    });
  }
  /* 递归对齐：每次都按"上次成功时刻 + 15 秒"排下一次，不做固定 setInterval
   *   成功 → 正好 15 秒后再来；失败 → 退避一整拍，不会疯狂重试；
   *   跨页面导航 → 剩余多久就等多久，节拍天然对齐，数字必然一致。 */
  function schedule(){
    var d=first?0:bDelay('gold');
    if(!first&&d<=0) d=BEAT;
    first=false;
    setTimeout(function(){ tick(); schedule(); }, d);
  }

  elCur.addEventListener('change',function(){
    cur=elCur.value;
    try{ localStorage.setItem('ps_gold_cur',cur); }catch(e){}
    paint();
  });

  /* 首屏：优先用已有快照（与首页同一个数），没有才用 SSR 值 */
  var o0=bGet('gold');
  if(o0&&o0.v!=null) usdOz=o0.v;
  srvLoad();          /* 读服务端 Cron 判定的休市状态 */
  paint(); render();
  bOnWake(tick);      /* 切回前台立刻补一拍 */
  schedule();
  /* 秒数 1 秒一跳：纯前端计时，不发请求 */
  setInterval(render,1000);
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
      <h3><span class="hd"><span class="swatch o"></span><span class="ttl">${esc(L.secOil)}</span></span><span id="home-oil-chip" class="live-dot" hidden></span></h3>
      <div class="big" id="home-oil-price">${oilPrice != null ? '$' + fmt(oilPrice) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span class="go">${esc(L.viewAll)} →</span></div>
    </a>
    <a class="card oil" href="/${lang}/wti/">
      <h3><span class="hd"><span class="swatch w"></span><span class="ttl">${esc(L.nav.wti)}</span></span><span id="home-wti-chip" class="live-dot" hidden></span></h3>
      <div class="big" id="home-wti-price">${wtiPrice != null ? '$' + fmt(wtiPrice) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span class="go">${esc(L.viewAll)} →</span></div>
    </a>
    <a class="card gold" href="/${lang}/gold/">
      <h3><span class="hd"><span class="swatch"></span><span class="ttl">${esc(L.secGold)}</span></span><span id="home-gold-chip" class="live-dot" hidden></span></h3>
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
(function(){${BEAT_CORE}
  var OZ=31.1034768;
  var T={live:'Live',lost:'Connection lost',closed:'Market closed',ago:'Updated {n} ago'};
  var tEl=document.getElementById('ps-live-t');
  if(tEl){ try{ T=JSON.parse(tEl.textContent)||T; }catch(e){} }

  /* ================================================================
   * 首页三卡：只用【节拍核心】那套逻辑，没有任何第二套判断。
   *   到节拍 → 真抓一次；没到 → 沿用快照（不请求）。
   *   状态（实时 / 连接中断 / 休市中）全由 bState() 纯函数算出。
   * ================================================================ */
  var items=[];
  function mk(chipId,elId,gramId,k){
    var el=document.getElementById(elId);
    if(!el) return null;
    var it={el:el,chip:document.getElementById(chipId),
            gram:gramId?document.getElementById(gramId):null,k:k,v:null};
    items.push(it); return it;
  }
  var oil=mk('home-oil-chip','home-oil-price',null,'brent');
  var wti=mk('home-wti-chip','home-wti-price',null,'wti');
  var gold=mk('home-gold-chip','home-gold-price','home-gold-gram','gold');
  if(!items.length) return;

  function fm(v){ try{ return '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }catch(e){ return '$'+v; } }
  function agoTxt(ms){
    var s=Math.round((Date.now()-ms)/1000);
    return s<60?(s+'s'):(s<3600?Math.round(s/60)+'m':Math.round(s/3600)+'h');
  }
  var _A=(T.ago||'{n}').split('{n}');
  var AGOPRE=_A[0]||'', AGOTAIL=_A[1]||'';
  function setAgo(el,ago){
    var sp=el.querySelector('.ago');
    if(!sp||!el.querySelector('.live-txt')){
      el.textContent='';
      var box=document.createElement('span'); box.className='live-txt';
      box.appendChild(document.createTextNode(T.live+' \u00b7 '+AGOPRE));
      sp=document.createElement('span');
      sp.className='ago notranslate'; sp.setAttribute('translate','no');
      box.appendChild(sp);
      if(AGOTAIL) box.appendChild(document.createTextNode(AGOTAIL));
      el.appendChild(box);
    }
    if(sp.textContent!==ago) sp.textContent=ago;
  }
  function showVal(it,v){
    if(!it||v==null) return;
    it.v=v; it.el.textContent=fm(v);
    if(it.gram){
      var ug=it.gram.getAttribute('data-ug')||'gram';
      it.gram.textContent=fm(v/OZ)+' / '+ug;
    }
  }
  /* 渲染：只看 bState()，三张卡各自独立，互不干扰 */
  function paint(it){
    if(!it||!it.chip) return;
    if(document.hidden) return;   /* 同上：后台不重绘 */
    it.chip.hidden=false;
    var st=bState(it.k);
    if(st.s==='hold'){ /* 切回前台：保持上一帧 */ }
    else if(st.s==='lost'){ it.chip.classList.add('is-lost');
      if(it.chip.textContent!==T.lost) it.chip.textContent=T.lost; return; }
    if(st.s==='closed'){ it.chip.classList.add('is-lost');
      if(it.chip.textContent!==T.closed) it.chip.textContent=T.closed; return; }
    it.chip.classList.remove('is-lost');
    setAgo(it.chip,agoTxt(st.t));
  }
  function renderAll(){ items.forEach(paint); }

  /* 一次请求同时拿布伦特 + WTI（后端已按序试 8 个源） */
  function pullOil(cb){
    fetch('/api/oil-live',{cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        var b=+j.brent||0, w=+j.wti||0, ok=false;
        if(b&&oil){ showVal(oil,b); bNote('brent',b); ok=true; } else bFail('brent');
        if(w&&wti){ showVal(wti,w); bNote('wti',w); ok=true; } else bFail('wti');
        cb(ok);
      }).catch(function(){ bFail('brent'); bFail('wti'); cb(false); });
  }
  function pullGold(cb){
    fetch('/api/gold-live',{cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        var v=+j.priceUsdPerOz||0;
        if(v&&gold){ showVal(gold,v); bNote('gold',v); cb(true); return; }
        bFail('gold'); cb(false);
      }).catch(function(){ bFail('gold'); cb(false); });
  }
  /* 没到节拍 → 沿用快照，一个请求都不发 */
  function tickOil(){
    if(document.hidden) return;
    if(bDelay('brent')>0){
      var a=bGet('brent'), c=bGet('wti');
      if(a&&a.v!=null&&oil) showVal(oil,a.v);
      if(c&&c.v!=null&&wti) showVal(wti,c.v);
      return;
    }
    pullOil(function(){ renderAll(); });
  }
  function tickGold(){
    if(document.hidden) return;
    if(bDelay('gold')>0){
      var a=bGet('gold');
      if(a&&a.v!=null&&gold) showVal(gold,a.v);
      return;
    }
    pullGold(function(){ renderAll(); });
  }
  var firstOil=true, firstGold=true;
  function schedOil(){
    var d=firstOil?0:bDelay('brent');
    if(!firstOil&&d<=0) d=BEAT;      /* 取数失败 → 退避一整拍，不疯狂重试 */
    firstOil=false;
    setTimeout(function(){ tickOil(); schedOil(); }, d);
  }
  function schedGold(){
    var d=firstGold?0:bDelay('gold');
    if(!firstGold&&d<=0) d=BEAT;
    firstGold=false;
    setTimeout(function(){ tickGold(); schedGold(); }, d);
  }

  /* 首屏：优先用已有快照（与详情页同一个数），没有就留 SSR 渲染的值 */
  items.forEach(function(it){
    var o=bGet(it.k);
    if(o&&o.v!=null) showVal(it,o.v);
  });
  renderAll();
  srvLoad();          /* 读服务端 Cron 判定的休市状态 */
  bOnWake(tickOil); bOnWake(tickGold);   /* 切回前台立刻补一拍 */
  schedOil(); schedGold();
  /* 秒数 1 秒一跳：纯前端计时，不发请求 */
  setInterval(renderAll,1000);
})();`;

/* 实时徽标的多语言文案：直接复用黄金页那套，七语言齐全 */
function liveT(lang){
  const L = t(lang);
  return '<script type="application/json" id="ps-live-t">'
    + JSON.stringify({live:L.goldLiveTag, lost:L.goldConnLost,
                      closed:L.goldClosedTag || 'Market closed', ago:L.goldUpdatedAgo,
                      /* 休市说明：黄金与原油各一套（文案里点明了品种） */
                      closedNote:L.goldClosedNote || '', oilClosedNote:L.oilClosedNote || ''})
        .replace(/</g, '\\u003c')
    + '</script>';
}

/* ★ Vercel 测试版：原油 / WTI 实时刷新脚本
 * 逻辑与黄金 GOLD_LIVE_JS 同构：页面先渲染服务端值（保证首屏有数），
 * 再由浏览器定时拉 /api/oil-live 覆盖成实时价。
 * kind = 'wti' 时取 WTI 字段，否则取布伦特。 */
function oilLiveJs(kind) {
  return `
(function(){${BEAT_CORE}
  var el=document.getElementById('oil-live-price');
  var chip=document.getElementById('oil-live-chip');
  if(!el) return;
  var KIND='${kind}';
  var KEY=(KIND==='wti')?'wti':'brent';
  var T={live:'Live',lost:'Connection lost',closed:'Market closed',ago:'Updated {n} ago'};
  var tEl=document.getElementById('ps-live-t');
  if(tEl){ try{ T=JSON.parse(tEl.textContent)||T; }catch(e){} }
  var lastOk=0, booted=false, first=true;

  function fm(v){ try{ return '$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }catch(e){ return '$'+v; } }
  function agoTxt(){
    var s=Math.round((Date.now()-lastOk)/1000);
    return s<60?(s+'s'):(s<3600?Math.round(s/60)+'m':Math.round(s/3600)+'h');
  }
  var _A=(T.ago||'{n}').split('{n}');
  var AGOPRE=_A[0]||'', AGOTAIL=_A[1]||'';
  function setAgo(el,ago){
    var sp=el.querySelector('.ago');
    if(!sp||!el.querySelector('.live-txt')){
      el.textContent='';
      var box=document.createElement('span'); box.className='live-txt';
      box.appendChild(document.createTextNode(T.live+' \u00b7 '+AGOPRE));
      sp=document.createElement('span');
      sp.className='ago notranslate'; sp.setAttribute('translate','no');
      box.appendChild(sp);
      if(AGOTAIL) box.appendChild(document.createTextNode(AGOTAIL));
      el.appendChild(box);
    }
    if(sp.textContent!==ago) sp.textContent=ago;
  }
  /* 状态全由 bState() 纯函数算出，没有第二套判断 */
  function paint(){
    if(!chip) return;
    if(document.hidden) return;   /* 同上：后台不重绘 */
    var st=bState(KEY);
    lastOk=st.t||0;
    chip.hidden=false;
    if(!booted){ if(st.s==='closed'){ chip.classList.add('is-lost'); if(chip.textContent!==T.closed) chip.textContent=T.closed; return; } chip.classList.remove('is-lost'); setAgo(chip,agoTxt(lastOk)); return; }
    if(st.s==='hold'){ /* 切回前台：保持上一帧 */ }
    else if(st.s==='lost'){ chip.classList.add('is-lost');
      if(chip.textContent!==T.lost) chip.textContent=T.lost; return; }
    if(st.s==='closed'){ chip.classList.add('is-lost');
      if(chip.textContent!==T.closed) chip.textContent=T.closed; return; }
    chip.classList.remove('is-lost');
    setAgo(chip,agoTxt(lastOk));
  }
  function tick(){
    if(document.hidden) return;
    if(bDelay(KEY)>0){                       /* 没到节拍：沿用快照，不发请求 */
      var o=bGet(KEY); if(o&&o.v!=null) el.textContent=fm(o.v);
      paint(); return;
    }
    fetch('/api/oil-live',{cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        var v=(KIND==='wti')?(+j.wti||0):(+j.brent||0);
        booted=true;
        /* 只有拿到值才 bNote：失败时 t 不动 → 秒数照涨 → 到 1.5 拍显示连接中断 */
        if(v){ el.textContent=fm(v); bNote(KEY,v); } else bFail(KEY);
        paint();
      }).catch(function(){ bFail(KEY); booted=true; paint(); });
  }
  function schedule(){
    var d=first?0:bDelay(KEY);
    if(!first&&d<=0) d=BEAT;                 /* 取数失败 → 退避一整拍 */
    first=false;
    setTimeout(function(){ tick(); schedule(); }, d);
  }
  /* 首屏：优先用已有快照（与首页同一个数），没有就留 SSR 渲染的值 */
  var o0=bGet(KEY);
  if(o0&&o0.v!=null) el.textContent=fm(o0.v);
  srvLoad();          /* 读服务端 Cron 判定的休市状态 */
  paint(); bOnWake(tick);   /* 切回前台立刻补一拍 */
  schedule();
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
  <p class="src-note" id="oil-closed-note" hidden></p>
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
  <p class="src-note" id="oil-closed-note" hidden></p>
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
