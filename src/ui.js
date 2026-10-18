// ============================================================
// PriceScope — Layout, design system & SEO head
// ============================================================
import { LANGS, DEFAULT_LANG, SITE, t } from './i18n.js';

// ============================================================
// Google AdSense / GA4 / Search Console — IDs
// Preferred: set them as [vars] in wrangler.toml (no code edit).
// Fallback: edit the hard-coded defaults below.
// ============================================================
const HARDCODED = {
  ADSENSE_CLIENT: 'ca-pub-0000000000000000', // e.g. ca-pub-1234567890123456
  AD_SLOT_HOME:   '',  // ad unit id, e.g. 1234567890
  AD_SLOT_OIL:    '',
  AD_SLOT_GOLD:   '',
  AD_SLOT_CN:     '',
  AD_SLOT_FX:     '',
  AD_SLOT_LEGAL:  '',
  GA4_ID:         '',  // e.g. G-ABCDEF1234
  GSC_VERIFY:     '',  // google-site-verification content value
};

export const CONFIG = {
  adsenseClient: '',
  adSlots: {},
  gaId: '',
  gscVerify: '',
};

/** Called once per request from index.js with Worker env/vars. */
export function configure(env = {}) {
  const v = k => (env && env[k] && String(env[k]).trim()) || '';
  CONFIG.adsenseClient = v('ADSENSE_CLIENT') || HARDCODED.ADSENSE_CLIENT;
  CONFIG.gaId          = v('GA4_ID')         || HARDCODED.GA4_ID;
  CONFIG.gscVerify     = v('GSC_VERIFY')     || HARDCODED.GSC_VERIFY;
  CONFIG.adSlots = {
    home:  v('AD_SLOT_HOME')  || HARDCODED.AD_SLOT_HOME,
    oil:   v('AD_SLOT_OIL')   || HARDCODED.AD_SLOT_OIL,
    gold:  v('AD_SLOT_GOLD')  || HARDCODED.AD_SLOT_GOLD,
    cn:    v('AD_SLOT_CN')    || HARDCODED.AD_SLOT_CN,
    fx:    v('AD_SLOT_FX')    || HARDCODED.AD_SLOT_FX,
    legal: v('AD_SLOT_LEGAL') || HARDCODED.AD_SLOT_LEGAL,
  };
  return CONFIG;
}

export const ADSENSE_CLIENT = HARDCODED.ADSENSE_CLIENT; // legacy export

export const adOn = () =>
  !!CONFIG.adsenseClient && CONFIG.adsenseClient !== 'ca-pub-0000000000000000';

/** ads.txt publisher id: ca-pub-1234 -> pub-1234 */
export const adsTxtPublisher = () =>
  adOn() ? CONFIG.adsenseClient.replace(/^ca-/, '') : '';

/**
 * Render one AdSense ad unit (or a placeholder before approval).
 * pos: home | oil | gold | cn | fx | legal
 */
export function adSlot(pos = 'home') {
  if (!adOn()) {
    return `<div class="adslot ad-ph">Advertisement slot — enable AdSense by setting ADSENSE_CLIENT in src/ui.js</div>`;
  }
  const slot = CONFIG.adSlots[pos] || CONFIG.adSlots.home || '';
  if (!slot) {
    return `<div class="adslot ad-ph">Advertisement — set AD_SLOT_${String(pos).toUpperCase()} in wrangler.toml</div>`;
  }
  return `<div class="adslot">
  <ins class="adsbygoogle" style="display:block"
       data-ad-client="${CONFIG.adsenseClient}"
       data-ad-slot="${slot}"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>
</div>`;
}

export const CSS = `
:root{
  --bg:#070b18; --bg2:#0d1428; --card:#111a33; --card2:#16203d;
  --line:rgba(255,255,255,.08);
  --txt:#e8edf9; --muted:#9aa8c7; --dim:#6b7a9c;
  --gold:#f5b301; --gold2:#ffd766; --oil:#ff7a45; --cn:#22d3ee;
  --fx:#a78bfa; --ok:#34d399; --grad1:linear-gradient(135deg,#0b1228,#141d3d 60%,#0b1228);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--txt);
  font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans","Noto Sans CJK",Roboto,sans-serif;
  line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}

/* ---------- top bar ---------- */
.topbar{position:sticky;top:0;z-index:60;
  background:rgba(7,11,24,.82);backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line)}
.topbar .wrap{display:flex;align-items:center;gap:18px;height:64px}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.15rem;letter-spacing:-.02em;white-space:nowrap}
.logo .mark{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--gold),#ff8a3d);color:#211a00;font-weight:900;font-size:.95rem;
  box-shadow:0 6px 18px rgba(245,179,1,.32)}
.logo span{background:linear-gradient(92deg,#fff,var(--gold2));-webkit-background-clip:text;background-clip:text;color:transparent}
.nav{display:flex;gap:4px;margin-inline-start:auto;overflow-x:auto;scrollbar-width:none}
.nav::-webkit-scrollbar{display:none}
.nav a{padding:8px 13px;border-radius:9px;font-size:.9rem;color:var(--muted);white-space:nowrap;transition:.18s}
.nav a:hover{color:#fff;background:rgba(255,255,255,.07)}
.nav a.on{color:#fff;background:rgba(245,179,1,.14);box-shadow:inset 0 0 0 1px rgba(245,179,1,.35)}
.navtoggle{display:none;margin-inline-start:auto;background:none;border:1px solid var(--line);
  color:var(--txt);border-radius:10px;padding:8px 12px;font-size:1rem;cursor:pointer}

/* ---------- language switcher ---------- */
.langsel{position:relative;flex-shrink:0}
.langbtn{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.06);
  border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:7px 12px;
  font-size:.86rem;cursor:pointer;transition:.18s}
.langbtn:hover{background:rgba(255,255,255,.12)}
.langmenu{position:absolute;top:calc(100% + 8px);right:0;min-width:190px;
  background:var(--card2);border:1px solid var(--line);border-radius:14px;padding:7px;
  box-shadow:0 24px 60px rgba(0,0,0,.6);display:none;z-index:80}
.langsel.open .langmenu{display:block}
.langmenu a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;
  font-size:.88rem;color:var(--muted)}
.langmenu a:hover{background:rgba(255,255,255,.08);color:#fff}
.langmenu a.on{color:var(--gold2);font-weight:600}

/* ---------- hero ---------- */
.hero{padding:56px 0 46px;background:
  radial-gradient(900px 380px at 12% -8%,rgba(245,179,1,.16),transparent 60%),
  radial-gradient(760px 340px at 88% 0%,rgba(167,139,250,.16),transparent 62%),
  var(--grad1);border-bottom:1px solid var(--line)}
.badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;
  background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.32);
  color:#6ee7b7;font-size:.78rem;font-weight:600;letter-spacing:.02em}
.badge .dot{width:7px;height:7px;border-radius:50%;background:var(--ok);
  box-shadow:0 0 0 0 rgba(52,211,153,.7);animation:pulse 2s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 9px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
.hero h1{margin:18px 0 12px;font-size:clamp(1.9rem,4.4vw,3.05rem);line-height:1.14;
  font-weight:800;letter-spacing:-.03em;
  background:linear-gradient(96deg,#fff 12%,var(--gold2) 58%,#ff9d6c 96%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.hero p{margin:0;max-width:640px;color:var(--muted);font-size:1.02rem}
.hero .cta{display:inline-flex;margin-top:26px;padding:13px 26px;border-radius:12px;font-weight:700;
  color:#241a00;background:linear-gradient(135deg,var(--gold),#ffb03a);
  box-shadow:0 12px 30px rgba(245,179,1,.3);transition:.2s}
.hero .cta:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(245,179,1,.42)}

/* ---------- sections ---------- */
section.blk{padding:46px 0}
.h2{display:flex;align-items:center;gap:11px;font-size:1.32rem;font-weight:750;margin:0 0 6px;letter-spacing:-.01em}
.h2 .ico{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:.92rem;
  background:rgba(255,255,255,.07);border:1px solid var(--line)}
.sub{color:var(--dim);font-size:.9rem;margin:0 0 22px}

/* ---------- cards ---------- */
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(268px,1fr))}
.card{position:relative;border-radius:18px;padding:22px;overflow:hidden;
  background:linear-gradient(160deg,var(--card),var(--card2));
  border:1px solid var(--line);transition:.22s}
.card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.18)}
.card::after{content:"";position:absolute;inset:0;border-radius:18px;pointer-events:none;
  background:radial-gradient(420px 130px at 92% -12%,var(--c,rgba(255,255,255,.08)),transparent 70%)}
.card h3{margin:0 0 4px;font-size:.98rem;font-weight:650;display:flex;align-items:center;gap:9px}
.card .big{font-size:2.05rem;font-weight:800;letter-spacing:-.02em;margin:8px 0 2px;color:#fff}
.card .unit{font-size:.8rem;color:var(--dim)}
.card .meta{margin-top:12px;font-size:.76rem;color:var(--dim);
  display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding-top:10px}
.card.gold{--c:rgba(245,179,1,.2)} .card.oil{--c:rgba(255,122,69,.2)}
.card.cn{--c:rgba(34,211,238,.2)}  .card.fx{--c:rgba(167,139,250,.2)}
.swatch{width:9px;height:9px;border-radius:3px;background:var(--gold)}
.swatch.o{background:var(--oil)} .s{background:var(--cn)} .f{background:var(--fx)}

/* ---------- table ---------- */
.tblwrap{overflow-x:auto;border-radius:16px;border:1px solid var(--line);background:var(--card)}
table{width:100%;border-collapse:collapse;font-size:.9rem;min-width:560px}
th,td{padding:12px 16px;text-align:start;white-space:nowrap}
thead th{background:rgba(255,255,255,.05);font-size:.76rem;text-transform:uppercase;
  letter-spacing:.06em;color:var(--dim);font-weight:650;position:sticky;top:0}
tbody tr{border-top:1px solid var(--line)}
tbody tr:hover{background:rgba(255,255,255,.035)}
td.num{font-variant-numeric:tabular-nums;font-weight:600}
td.pv{color:#fff;font-weight:600}
.hi{color:var(--gold2)}

/* ---------- converter ---------- */
.conv{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  background:linear-gradient(160deg,var(--card),var(--card2));
  border:1px solid var(--line);border-radius:18px;padding:22px}
.fld label{display:block;font-size:.78rem;color:var(--dim);margin-bottom:7px;font-weight:600}
.fld input,.fld select{width:100%;padding:12px 14px;border-radius:11px;
  background:rgba(0,0,0,.28);border:1px solid var(--line);color:var(--txt);font-size:1rem;
  font-family:inherit;outline:none;transition:.18s}
.fld input:focus,.fld select:focus{border-color:rgba(167,139,250,.6);box-shadow:0 0 0 3px rgba(167,139,250,.14)}
.fld select option{background:#111a33}
.btn{width:100%;padding:13px;border-radius:12px;border:none;cursor:pointer;font-weight:700;
  font-size:.98rem;color:#fff;background:linear-gradient(135deg,#7c5cff,#a78bfa);
  box-shadow:0 10px 26px rgba(124,92,255,.3);transition:.2s;font-family:inherit}
.btn:hover{transform:translateY(-2px)}
.result{margin-top:18px;padding:18px;border-radius:14px;text-align:center;
  background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.28)}
.result .lbl{font-size:.76rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.result .val{font-size:1.95rem;font-weight:800;color:#fff;margin-top:4px;letter-spacing:-.02em}
.result .rate{font-size:.84rem;color:var(--muted);margin-top:6px}
.pairs{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-top:20px}
.pair{border:1px solid var(--line);border-radius:13px;padding:14px;background:var(--card)}
.pair .p{font-size:.8rem;color:var(--dim);font-weight:600}
.pair .v{font-size:1.12rem;font-weight:750;color:#fff;margin-top:3px;font-variant-numeric:tabular-nums}

/* ---------- prose (legal pages) ---------- */
.prose{max-width:820px}
.prose h2{font-size:1.16rem;margin:30px 0 10px;font-weight:700}
.prose p{color:var(--muted);margin:0 0 14px;font-size:.95rem}
.prose .lead{font-size:1.04rem;color:#c9d4ee}
.mailto{display:inline-flex;align-items:center;gap:9px;padding:13px 20px;border-radius:12px;
  background:rgba(245,179,1,.12);border:1px solid rgba(245,179,1,.34);
  color:var(--gold2);font-weight:700;margin:6px 0 4px}

/* ---------- footer ---------- */
footer{margin-top:46px;background:var(--bg2);border-top:1px solid var(--line);padding:44px 0 26px}
.fgrid{display:grid;gap:28px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
footer h4{font-size:.8rem;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);margin:0 0 12px}
footer ul{list-style:none;margin:0;padding:0}
footer li{margin-bottom:8px}
footer a{color:var(--muted);font-size:.89rem}
footer a:hover{color:var(--gold2)}
.fbot{margin-top:34px;padding-top:20px;border-top:1px solid var(--line);
  font-size:.8rem;color:var(--dim);display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between}
.disc{font-size:.78rem;color:var(--dim);margin-top:10px;line-height:1.6}

/* ---------- ad slots ---------- */
.ad{background:rgba(255,255,255,.03);border:1px dashed var(--line);border-radius:14px;
  padding:16px;text-align:center;color:var(--dim);font-size:.76rem;margin:26px 0}

/* ---------- responsive ---------- */
@media(max-width:860px){
  .nav{display:none;position:absolute;top:64px;left:0;right:0;flex-direction:column;
    background:var(--bg2);border-bottom:1px solid var(--line);padding:12px;gap:2px}
  .nav.open{display:flex}
  .nav a{padding:11px 14px}
  .navtoggle{display:block}
  .logo span{font-size:1rem}
  .hero{padding:40px 0 34px}
}
.adslot{margin:22px 0;text-align:center;min-height:90px}
.adslot ins.adsbygoogle{display:block;min-height:90px}
.ad-ph{border:1px dashed var(--line);border-radius:12px;padding:14px;
  color:var(--dim);font-size:.78rem;line-height:1.6}
`;

// ------------------------------------------------------------
// Head: canonical, hreflang, OG, JSON-LD
// ------------------------------------------------------------
export function head({ lang, title, desc, path, noindex }) {
  const L = t(lang);
  const url = `${SITE.domain}/${lang}${path}`;
  const enUrl = `${SITE.domain}/en${path}`;

  const alternates = LANGS.map(l =>
    `<link rel="alternate" hreflang="${l}" href="${SITE.domain}/${l}${path}">`).join('\n  ') +
    `\n  <link rel="alternate" hreflang="x-default" href="${enUrl}">`;

  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE.domain}/#website`, url: SITE.domain,
        name: SITE.brand, inLanguage: lang, publisher: { '@id': `${SITE.domain}/#org` } },
      { '@type': 'Organization', '@id': `${SITE.domain}/#org`, name: SITE.brand,
        url: SITE.domain, email: SITE.contactEmail },
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title,
        description: desc, isPartOf: { '@id': `${SITE.domain}/#website` }, inLanguage: lang },
    ],
  });

  return `<!DOCTYPE html>
<html lang="${L.htmlLang}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
  ${alternates}
<meta name="robots" content="${noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.brand}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${L.htmlLang.replace('-', '_')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="theme-color" content="#070b18">
${CONFIG.gscVerify ? `<meta name="google-site-verification" content="${CONFIG.gscVerify}">` : ''}
${adOn() ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CONFIG.adsenseClient}" crossorigin="anonymous"></script>` : '<!-- AdSense: set ADSENSE_CLIENT in wrangler.toml [vars] after approval -->'}
${CONFIG.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${CONFIG.gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${CONFIG.gaId}');</script>` : ''}
<style>${CSS}</style>
<script type="application/ld+json">${ld}</script>
</head>`;
}

// ------------------------------------------------------------
// Nav + hero + footer
// ------------------------------------------------------------
export function topbar(lang, active) {
  const L = t(lang);
  const items = [
    ['/', L.nav.overview], ['/oil/', L.nav.oil], ['/gold/', L.nav.gold],
    ['/china-fuel/', L.nav.cn], ['/currency/', L.nav.fx],
  ];
  const links = items.map(([p, label]) =>
    `<a href="/${lang}${p}" class="${active === p ? 'on' : ''}">${esc(label)}</a>`).join('');
  const cur = LANGS.find(l => l === lang) || DEFAULT_LANG;
  const curL = t(cur);

  return `<header class="topbar"><div class="wrap">
  <a class="logo" href="/${lang}/"><span class="mark">P</span><span>${SITE.brand}</span></a>
  <button class="navtoggle" aria-label="menu" onclick="document.getElementById('nv').classList.toggle('open')">☰</button>
  <nav class="nav" id="nv">${links}</nav>
  <div class="langsel" id="ls">
    <button class="langbtn" onclick="document.getElementById('ls').classList.toggle('open')"
      aria-haspopup="true" aria-expanded="false">${curL.flag} ${esc(curL.label)} ▾</button>
    <div class="langmenu">
      ${LANGS.map(l => `<a href="/${l}${active === '/' ? '/' : active}" class="${l === lang ? 'on' : ''}"
        hreflang="${l}">${t(l).flag} ${esc(t(l).label)}</a>`).join('')}
    </div>
  </div>
</div></header>`;
}

export function hero(lang) {
  const L = t(lang);
  return `<section class="hero"><div class="wrap">
  <span class="badge"><span class="dot"></span>${esc(L.heroBadge)}</span>
  <h1>${esc(L.heroTitle)}</h1>
  <p>${esc(L.heroSub)}</p>
  <a class="cta" href="/${lang}/oil/">${esc(L.heroCta)} →</a>
</div></section>`;
}

export function footer(lang, year) {
  const L = t(lang);
  const link = (p, label) => `<li><a href="/${lang}${p}">${esc(label)}</a></li>`;
  return `<footer><div class="wrap">
  <div class="fgrid">
    <div>
      <a class="logo" href="/${lang}/"><span class="mark">P</span><span>${SITE.brand}</span></a>
      <p class="disc">${esc(L.tagline)}</p>
    </div>
    <div><h4>${esc(L.footerQuick)}</h4><ul>
      ${link('/oil/', L.nav.oil)}${link('/gold/', L.nav.gold)}
      ${link('/china-fuel/', L.nav.cn)}${link('/currency/', L.nav.fx)}
    </ul></div>
    <div><h4>${esc(L.footerCompany)}</h4><ul>
      ${link('/about/', L.nav.about)}${link('/contact/', L.nav.contact)}
    </ul></div>
    <div><h4>${esc(L.footerLegal)}</h4><ul>
      ${link('/privacy/', L.nav.privacy)}${link('/about/', L.nav.about)}
      ${link('/contact/', L.nav.contact)}
    </ul></div>
  </div>
  <div class="fbot">
    <span>© ${year} ${SITE.brand}. ${esc(L.footerRights)}</span>
    <span>${esc(L.tagline)}</span>
  </div>
  <p class="disc">${esc(L.footerDisclaimer)}</p>
</div></footer>`;
}

// Escape helper (also used by pages)
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Assemble a full document
export function page({ lang, title, desc, path, active, body, noindex }) {
  const year = new Date().getUTCFullYear();
  return `${head({ lang, title, desc, path, noindex })}
<body>
${topbar(lang, active)}
${body}
${footer(lang, year)}
<script>
document.addEventListener('click',function(e){
  if(!e.target.closest('#ls')) document.getElementById('ls')?.classList.remove('open');
});
// Re-render every timestamp in the BROWSER's own timezone + interface locale.
// The server already rendered a correct value (via request.cf.timezone); this
// only refines it when the visitor's real zone differs (VPN, travel, wrong geo).
(function(){
  var MAP={en:'en-US',zh:'zh-CN',ja:'ja-JP',es:'es-ES',fr:'fr-FR',de:'de-DE',pt:'pt-BR'};
  // html lang is "zh-CN" / "pt-BR" etc — match on the first 2 chars only,
  // otherwise the lookup misses and silently falls back to en-US.
  var raw=document.documentElement.lang||'en';
  var loc=MAP[raw.slice(0,2).toLowerCase()]||'en-US';
  // Ask the browser for its real zone instead of relying on defaults.
  var tz=null;
  try{ tz=Intl.DateTimeFormat().resolvedOptions().timeZone||null; }catch(e){}
  function run(){
    var els=document.querySelectorAll('time[data-ts]');
    for(var i=0;i<els.length;i++){
      var el=els[i],d=new Date(el.getAttribute('data-ts'));
      if(isNaN(d))continue;
      try{
        var opt={year:'numeric',month:'2-digit',day:'2-digit',
          hour:'2-digit',minute:'2-digit',hour12:false,timeZoneName:'short'};
        if(tz)opt.timeZone=tz;
        el.textContent=new Intl.DateTimeFormat(loc,opt).format(d);
      }catch(e){/* keep the server-rendered value */}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
  else run();
})();
</script>
</body></html>`;
}
