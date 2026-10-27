// ============================================================
// PriceScope — Layout, design system & SEO head
// ============================================================
import { LANGS, DEFAULT_LANG, SITE, t } from './i18n.js';
import { CONTENT } from './content.js';
import { blogStr } from './articles.js';

/** Localised "FAQ" label for nav/footer (sourced from the content module). */
export function faqLabel(lang) {
  return (CONTENT[lang]?.common?.faqHeading) || CONTENT.en.common.faqHeading;
}

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
  AD_SLOT_WTI:    '',
  AD_SLOT_LEGAL:  '',
  AD_SLOT_BLOG:    '',
  AD_SLOT_ARTICLE: '',
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
    wti:   v('AD_SLOT_WTI')   || HARDCODED.AD_SLOT_WTI,
    legal: v('AD_SLOT_LEGAL') || HARDCODED.AD_SLOT_LEGAL,
    blog:    v('AD_SLOT_BLOG')    || HARDCODED.AD_SLOT_BLOG,
    article: v('AD_SLOT_ARTICLE') || HARDCODED.AD_SLOT_ARTICLE,
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
 * Render one AdSense ad unit.
 * pos: home | oil | gold | cn | fx | legal | blog | article
 *
 * ★ v2 修正：审核期间「完全不渲染广告位」。
 *
 * 原逻辑在 adOn() 为 false 时输出一个带英文技术说明的占位 div：
 *   "Advertisement slot — enable AdSense by setting ADSENSE_CLIENT in src/ui.js"
 * 该文案会：
 *   1) 出现在中文站点的公网页面上，显得站点未完成；
 *   2) 把内部变量名（src/ui.js / ADSENSE_CLIENT）暴露给公网。
 *
 * AdSense 政策要求：账号获批前不得展示广告位，也不应出现空白广告框。
 * 因此这里在获批前直接返回空字符串 —— 不留占位、不留空白框、不留任何痕迹。
 *
 * 获批后操作：在 wrangler.toml [vars] 填入真实的
 *   ADSENSE_CLIENT = "ca-pub-8915931557404979"
 *   AD_SLOT_HOME / AD_SLOT_OIL / … = 各自的广告位 ID
 * 广告位会自动出现，无需再改本文件。
 *
 * ⚠️ 填入的 ADSENSE_CLIENT 必须与 /ads.txt 里的 pub-8915931557404979 一致，
 *    否则 AdSense 会判「ads.txt 与页面不匹配」。
 */
export function adSlot(pos = 'home') {
  if (!adOn()) {
    return ''; // pre-approval: render nothing at all
  }
  const slot = CONFIG.adSlots[pos] || CONFIG.adSlots.home || '';
  if (!slot) {
    return ''; // no slot ID configured for this position yet
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
/* Kill the 300ms tap delay iOS adds while it waits to see if a tap
   becomes a double-tap-to-zoom. Without this, taps feel ignored. */
a,button,summary,label,input,select,textarea{touch-action:manipulation}
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
.logo .mark{width:30px;height:30px;border-radius:9px;display:block;flex-shrink:0;object-fit:cover;
  box-shadow:0 6px 18px rgba(245,179,1,.32)}
.logo span{color:#fff;background:linear-gradient(92deg,#fff,var(--gold2));-webkit-background-clip:text;background-clip:text}
@supports (-webkit-background-clip:text) or (background-clip:text){.logo span{color:transparent}}
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
  font-weight:800;letter-spacing:-.03em;color:#fff;
  background:linear-gradient(96deg,#fff 12%,var(--gold2) 58%,#ff9d6c 96%);
  -webkit-background-clip:text;background-clip:text}
@supports (-webkit-background-clip:text) or (background-clip:text){.hero h1{color:transparent}}
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
a.card{display:block;color:inherit;text-decoration:none;cursor:pointer;
  /* Was 'transparent' - iOS/Android then give ZERO visual feedback on tap,
     which reads as "the link is dead". A faint gold flash confirms the hit. */
  -webkit-tap-highlight-color:rgba(245,179,1,.2);touch-action:manipulation;position:relative}
a.card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.18)}
a.card:focus-visible{outline:2px solid var(--gold2);outline-offset:3px}
.card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.18)}
.card::after{content:"";position:absolute;inset:0;border-radius:18px;pointer-events:none;
  background:radial-gradient(420px 130px at 92% -12%,var(--c,rgba(255,255,255,.08)),transparent 70%)}
.card>*{position:relative;z-index:1}
.card h3{margin:0 0 4px;font-size:.98rem;font-weight:650;display:flex;align-items:center;gap:9px}
.card .big{font-size:2.05rem;font-weight:800;letter-spacing:-.02em;margin:8px 0 2px;color:#fff}
.card .unit{font-size:.8rem;color:var(--dim)}
.card .meta{margin-top:12px;font-size:.76rem;color:var(--dim);
  display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding-top:10px}
.card .go{display:inline-block;color:var(--gold2);white-space:nowrap;transition:.22s}
.card:hover .go{transform:translateX(3px)}
.card.gold{--c:rgba(245,179,1,.2)} .card.oil{--c:rgba(255,122,69,.2)}
.card.cn{--c:rgba(34,211,238,.2)}  .card.fx{--c:rgba(167,139,250,.2)}

/* ---------- ★ A22 黄金实时页 ---------- */
/* 断线时：数字变灰 + 降透明度。不隐藏、不编造 —— 用户一眼看得出"这不是最新的"。 */
.card.is-stale .big{opacity:.42;filter:grayscale(1)}
.card.is-stale{border-color:rgba(255,255,255,.05)}
.live-dot{display:inline-flex;align-items:center;gap:6px;color:var(--ok);font-weight:600}
.live-dot::before{content:"";width:7px;height:7px;border-radius:50%;
  background:var(--ok);animation:psPulse 2s ease-in-out infinite}
.live-dot.is-lost{color:var(--dim);font-weight:500}
.live-dot.is-lost::before{background:var(--dim);animation:none}
@keyframes psPulse{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.live-dot::before{animation:none}}
#g-cur{background:var(--card2);color:var(--txt);border:1px solid var(--line);
  border-radius:8px;padding:4px 7px;font:inherit;font-size:.8rem;
  max-width:150px;vertical-align:middle}
#g-cur:focus-visible{outline:2px solid var(--gold2);outline-offset:2px}
/* 首页黄金卡片上的「实时」小角标：让人一眼看出点进去是活的 */
.live-chip{display:inline-flex;align-items:center;gap:5px;margin-inline-start:8px;
  padding:2px 8px;border-radius:999px;font-size:.68rem;font-weight:700;
  color:var(--ok);background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.35);
  vertical-align:middle;letter-spacing:.02em}
.live-chip::before{content:"";width:6px;height:6px;border-radius:50%;
  background:var(--ok);animation:psPulse 2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.live-chip::before{animation:none}}
.src-note{margin:16px 0 0;font-size:.82rem;color:var(--dim);line-height:1.75;
  border-left:2px solid var(--gold);padding-left:12px}
.src-note strong{color:var(--muted);font-weight:600}
.prose-p.src-own{color:var(--txt);border-left:2px solid var(--gold);padding-left:12px}
/* ---- article cards & blog chrome ---- */
.artgrid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.card.art{--c:rgba(255,255,255,.07);display:flex;flex-direction:column;gap:2px}
.card.art h3{font-size:1.02rem;line-height:1.45;margin:10px 0 6px;font-weight:650}
.artcat{display:inline-block;align-self:flex-start;font-size:.72rem;font-weight:650;
  padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.09);color:var(--gold2)}
.artdesc{color:var(--muted);font-size:.88rem;line-height:1.68;margin:0 0 12px}
.artmeta{display:flex;gap:8px;align-items:center;margin-top:auto;padding-top:10px;font-size:.76rem;color:var(--dim)}
.card.art .go{margin-top:12px;font-weight:650}
.backlink{color:var(--gold2);text-decoration:none;font-weight:600}
.backlink:hover{text-decoration:underline}
.artback{margin-top:32px;padding-top:8px}
.artmore{margin-top:18px;text-align:right}
.fbnote{margin-top:14px;font-size:.85rem;color:var(--dim);padding:10px 14px;border-left:3px solid var(--gold2);background:rgba(255,255,255,.04);border-radius:0 8px 8px 0}
@media(max-width:640px){.artgrid{grid-template-columns:1fr}}

.swatch{width:9px;height:9px;border-radius:3px;background:var(--gold)}
.swatch.o{background:var(--oil)} .s{background:var(--cn)} .f{background:var(--fx)}
.swatch.w{background:linear-gradient(135deg,var(--oil),#ffd166)}

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
/* 隐私政策正文外链（Google 广告设置 / aboutads.info / youronlinechoices.eu） */
.pl{color:var(--gold2);text-decoration:underline;text-underline-offset:2px;
  text-decoration-color:rgba(255,215,102,.45)}
.pl:hover{text-decoration-color:var(--gold2)}
.mailto{display:inline-flex;align-items:center;gap:9px;padding:13px 20px;border-radius:12px;
  background:rgba(245,179,1,.12);border:1px solid rgba(245,179,1,.34);
  color:var(--gold2);font-weight:700;margin:6px 0 4px}

/* ---------- editorial content blocks ---------- */
.blk.alt{background:var(--bg2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.prose .h3,.h3{font-size:1.02rem;margin:22px 0 8px;font-weight:700;color:#e8eefc}
.prose-p{color:var(--muted);margin:0 0 14px;font-size:.95rem;line-height:1.75}
.prose .prose-p{color:var(--muted);margin:0 0 14px;font-size:.95rem;line-height:1.75}
.prose-p.disc{padding:14px 16px;border-radius:10px;border-left:3px solid rgba(245,179,1,.5);
  background:rgba(245,179,1,.06);font-size:.9rem}

/* ---------- FAQ accordion ---------- */
.faq-list{display:flex;flex-direction:column;gap:10px;margin-top:6px}
details.faq{background:var(--bg2);border:1px solid var(--line);border-radius:12px;
  padding:0;overflow:hidden;transition:border-color .15s}
details.faq:hover{border-color:rgba(245,179,1,.4)}
details.faq summary{cursor:pointer;padding:15px 18px;font-weight:650;font-size:.97rem;
  color:#e8eefc;list-style:none;display:flex;align-items:center;gap:10px}
details.faq summary::-webkit-details-marker{display:none}
details.faq summary::before{content:'＋';color:var(--gold2);font-weight:700;flex:none}
details.faq[open] summary::before{content:'−'}
details.faq[open] summary{border-bottom:1px solid var(--line)}
details.faq p{padding:14px 18px 17px;margin:0;color:var(--muted);font-size:.93rem;line-height:1.75}

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
/* ★ v3 新增：页脚广告披露（FTC / 欧盟合规建议项） */
.ad-note{font-size:.8rem;color:var(--dim);margin-top:12px;padding:9px 12px;
  border:1px dashed var(--line);border-radius:9px;line-height:1.6}

/* ---------- ad slots ---------- */
.ad{background:rgba(255,255,255,.03);border:1px dashed var(--line);border-radius:14px;
  padding:16px;text-align:center;color:var(--dim);font-size:.76rem;margin:26px 0}

/* ---------- responsive ---------- */
@media(max-width:860px){
  /* Gradient-clipped text renders as a solid block on some Android
     browsers: colour goes transparent but the clip does not apply.
     Fall back to plain white text on small screens — always readable. */
  .hero h1,.logo span{background:none;-webkit-background-clip:border-box;
    background-clip:border-box;color:#fff}
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
<!-- ★ v2 新增：AdSense 站点归属验证标签。
     AdSense 后台「网站」审核用它把站点与账号绑定；
     这是纯 meta 声明、不含广告代码，审核期间放置完全合规。 -->
<meta name="google-adsense-account" content="ca-pub-8915931557404979">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
  ${alternates}
<meta name="robots" content="${noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png">
<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.brand}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${L.htmlLang.replace('-', '_')}">
<meta property="og:image" content="${SITE.domain}/og-v2.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(SITE.brand)} — ${esc(L.metaTitle || SITE.brand)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE.domain}/og-v2.png">
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
    ['/', L.nav.overview], ['/oil/', L.nav.oil], ['/wti/', L.nav.wti], ['/gold/', L.nav.gold],
    ['/china-fuel/', L.nav.cn], ['/currency/', L.nav.fx],
    ['/blog/', blogStr(lang).nav],
  ];
  const links = items.map(([p, label]) =>
    `<a href="/${lang}${p}" class="${active === p ? 'on' : ''}">${esc(label)}</a>`).join('');
  const cur = LANGS.find(l => l === lang) || DEFAULT_LANG;
  const curL = t(cur);

  return `<header class="topbar"><div class="wrap">
  <a class="logo" href="/${lang}/"><img class="mark" src="/icon-128.png" alt="${SITE.brand}" width="30" height="30"><span>${SITE.brand}</span></a>
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
      <a class="logo" href="/${lang}/"><img class="mark" src="/icon-128.png" alt="${SITE.brand}" width="30" height="30"><span>${SITE.brand}</span></a>
      <p class="disc">${esc(L.tagline)}</p>
    </div>
    <div><h4>${esc(L.footerQuick)}</h4><ul>
      ${link('/oil/', L.nav.oil)}${link('/wti/', L.nav.wti)}
      ${link('/gold/', L.nav.gold)}${link('/china-fuel/', L.nav.cn)}${link('/currency/', L.nav.fx)}
    </ul></div>
    <div><h4>${esc(L.footerCompany)}</h4><ul>
      ${link('/faq/', faqLabel(lang))}
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
  <p class="ad-note">${esc(L.footerAdDisclosure)}</p>
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
  try{ if(tz) document.documentElement.setAttribute('data-ps-tz',tz); }catch(e){}
  function ck(){
    var m=document.cookie.match(/(?:^|;\s*)ps_tz=([^;]*)/);
    return m?decodeURIComponent(m[1]):'';
  }
  // Keep the cookie in sync with the browser's CURRENT zone on every load.
  // (It used to be written once and then never touched again, so any later
  //  timezone change could never be undone — the server kept rendering the
  //  very first zone forever, and no amount of refreshing fixed it.)
  function remember(){
    if(!tz) return;
    try{
      if(ck()===tz) return;
      document.cookie='ps_tz='+encodeURIComponent(tz)+
        '; path=/; max-age=31536000; samesite=lax';
    }catch(e){}
  }
  function run(){
    var els=document.querySelectorAll('time[data-ts]');
    for(var i=0;i<els.length;i++){
      var el=els[i],d=new Date(el.getAttribute('data-ts'));
      if(isNaN(d))continue;
      // A plain calendar date (FX fixing day, policy date) must NOT be
      // shifted by timezone, or it silently jumps a day backwards.
      var dateOnly=el.getAttribute('data-date-only')==='1';
      try{
        var opt=dateOnly
          ? {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}
          : {year:'numeric',month:'2-digit',day:'2-digit',
             hour:'2-digit',minute:'2-digit',hour12:false,timeZoneName:'short'};
        if(!dateOnly&&tz)opt.timeZone=tz;
        el.textContent=new Intl.DateTimeFormat(loc,opt).format(d);
      }catch(e){/* keep the server-rendered value */}
    }
  }
  function all(){ remember(); run(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',all);
  else all();
  // Back/forward (bfcache) restores the page WITHOUT re-running scripts,
  // and returning to a background tab may skip a re-render too — re-run in
  // both cases so timestamps always match the browser's current zone.
  window.addEventListener('pageshow',all);
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible') all();
  });
})();
</script>
</body></html>`;
}
