// ============================================================
// PriceScope — Page renderers (SSR, so crawlers read real numbers)
// ============================================================
import { t, provName, LANGS } from './i18n.js';
import { page, hero, esc, adSlot } from './ui.js';
import { CURRENCIES, POPULAR_PAIRS, convert, rateOf, fmt } from './data.js';
import { curName } from './i18n.js';

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

let renderTz = 'UTC';
export function setRenderTz(tz) { renderTz = (typeof tz === 'string' && tz) || 'UTC'; }
export function getRenderTz() { return renderTz; }

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
    return new Intl.DateTimeFormat(loc, { ...opt, timeZone: tz || renderTz }).format(d);
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

function updatedLine(lang, iso) {
  const L = t(lang);
  if (!iso) return '';
  const s = fmtStamp(iso, lang, renderTz);
  if (!s) return '';
  // data-ts lets the inline script re-render in the browser's own zone
  return `${esc(L.updatedAt)}: <time datetime="${esc(iso)}" data-ts="${esc(iso)}">${esc(s)}</time>`;
}

// Today's date, formatted for the current interface language
function localDate(lang) {
  try {
    return new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: renderTz,
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
  return `${esc(L.fxUpdated)}: <time datetime="${esc(dateStr)}">${esc(s)}</time>`;
}

// ------------------------------------------------------------
// HOME / OVERVIEW
// ------------------------------------------------------------
export function renderHome(lang, m, fx) {
  const L = t(lang);
  const oilPrice = m?.oil?.price;
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
  <p class="sub">${esc(L.weekendNote)}</p>
  <div class="grid">
    <div class="card oil">
      <h3><span class="swatch o"></span>${esc(L.secOil)}</h3>
      <div class="big">${oilPrice != null ? '$' + fmt(oilPrice) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span>${updatedLine(lang, m?.oil?.updated)}</span>
        <a href="/${lang}/oil/">${esc(L.viewAll)} →</a></div>
    </div>
    <div class="card gold">
      <h3><span class="swatch"></span>${esc(L.secGold)}</h3>
      <div class="big">${goldUsd != null ? '$' + fmt(goldUsd) : '—'}</div>
      <div class="unit">${esc(L.goldUsd)}</div>
      <div class="meta"><span>${goldCny != null ? '¥' + fmt(goldCny) + ' / g' : ''}</span>
        <a href="/${lang}/gold/">${esc(L.viewAll)} →</a></div>
    </div>
    <div class="card cn">
      <h3><span class="swatch s"></span>${esc(L.secCn)}</h3>
      <div class="big">${a92 != null ? '¥' + fmt(a92) : '—'}</div>
      <div class="unit">92# ${esc(L.thProvince)} ${list.length ? '· ' + list.length + ' ' + esc(L.provincesCount) : ''}</div>
      <div class="meta"><span>${updatedLine(lang, m?.cnOil?.updated)}</span>
        <a href="/${lang}/china-fuel/">${esc(L.viewAll)} →</a></div>
    </div>
    <div class="card fx">
      <h3><span class="swatch f"></span>${esc(L.secFx)}</h3>
      <div class="big">${fx ? fmt(rateOf('USD', 'EUR', fx) ?? 0, 4) : '—'}</div>
      <div class="unit">1 USD = ${fx ? fmt(rateOf('USD', 'EUR', fx), 4) : '—'} EUR</div>
      <div class="meta"><span>${fx?.date ? fxDateLine(lang, fx.date) : ''}</span>
        <a href="/${lang}/currency/">${esc(L.viewAll)} →</a></div>
    </div>
  </div>
  ${adSlot('home')}
</div></section>`;

  const body = hero(lang) + cards;
  return page({ lang, title: L.homeTitle, desc: L.homeDesc, path: '/', active: '/', body });
}

// ------------------------------------------------------------
// CRUDE OIL
// ------------------------------------------------------------
export function renderOil(lang, m) {
  const L = t(lang);
  const p = m?.oil?.price;
  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">🛢</span>${esc(L.oilTitle)}</h2>
  <p class="sub">${esc(L.weekendNote)}</p>
  <div class="grid">
    <div class="card oil">
      <h3><span class="swatch o"></span>${esc(L.price)}</h3>
      <div class="big">${p != null ? '$' + fmt(p) : '—'}</div>
      <div class="unit">${esc(L.unitBarrel)}</div>
      <div class="meta"><span>${updatedLine(lang, m?.oil?.updated)}</span></div>
    </div>
  </div>
  <p class="sub" style="margin-top:22px">${esc(m?.oil?.isSettlement ? 'Settlement price' : L.dataSource)}: ${esc(L.tagline)}</p>
  ${adSlot('oil')}
</div></section>`;
  return page({ lang, title: L.oilMetaTitle, desc: L.oilMetaDesc, path: '/oil/', active: '/oil/', body });
}

// ------------------------------------------------------------
// GOLD
// ------------------------------------------------------------
export function renderGold(lang, m) {
  const L = t(lang);
  const u = m?.gold?.usdOz, c = m?.gold?.cnyGram;
  const body = `<section class="blk"><div class="wrap">
  <h2 class="h2"><span class="ico">🥇</span>${esc(L.goldTitle)}</h2>
  <p class="sub">${esc(L.weekendNote)}</p>
  <div class="grid">
    <div class="card gold">
      <h3><span class="swatch"></span>${esc(L.goldUsd)}</h3>
      <div class="big">${u != null ? '$' + fmt(u) : '—'}</div>
      <div class="unit">USD / troy oz</div>
      <div class="meta"><span>${updatedLine(lang, m?.gold?.updated)}</span></div>
    </div>
    <div class="card gold">
      <h3><span class="swatch"></span>${esc(L.goldCny)}</h3>
      <div class="big">${c != null ? '¥' + fmt(c) : '—'}</div>
      <div class="unit">CNY / gram</div>
      <div class="meta"><span>${updatedLine(lang, m?.gold?.updated)}</span></div>
    </div>
  </div>
  ${adSlot('gold')}
</div></section>`;
  return page({ lang, title: L.goldMetaTitle, desc: L.goldMetaDesc, path: '/gold/', active: '/gold/', body });
}

// ------------------------------------------------------------
// CHINA FUEL (full province table — strong SEO content)
// ------------------------------------------------------------
export function renderCn(lang, m) {
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
  <p class="sub">${esc(L.cnNote)} ${updatedLine(lang, m?.cnOil?.updated)}</p>
  <div class="tblwrap"><table>
    <thead><tr>
      <th>${esc(L.thProvince)}</th><th>${esc(L.th92)}</th><th>${esc(L.th95)}</th>
      <th>${esc(L.th98)}</th><th>${esc(L.th0)}</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="5">—</td></tr>`}</tbody>
  </table></div>
  <p class="sub" style="margin-top:14px">${esc(list.length)} ${esc(L.provincesCount)} · ${esc(L.dataSource)}: showapi</p>
  ${adSlot('cn')}
</div></section>`;
  return page({ lang, title: L.cnMetaTitle, desc: L.cnMetaDesc, path: '/china-fuel/', active: '/china-fuel/', body });
}

// ------------------------------------------------------------
// CURRENCY CONVERTER
// ------------------------------------------------------------
export function renderFx(lang, fx) {
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
  <p class="sub">${esc(L.fxNote)} ${fx?.date ? '· ' + fxDateLine(lang, fx.date) : ''}</p>

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
</script>`;
  return page({ lang, title: L.fxMetaTitle, desc: L.fxMetaDesc, path: '/currency/', active: '/currency/', body });
}

// ------------------------------------------------------------
// PRIVACY
// ------------------------------------------------------------
export function renderPrivacy(lang) {
  const L = t(lang);
  const secs = L.privacySections.map(s =>
    `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('');
  const body = `<section class="blk"><div class="wrap prose">
  <h2 class="h2"><span class="ico">🔒</span>${esc(L.privacyTitle)}</h2>
  <p class="sub">${esc(L.privacyUpdated)}: ${localDate(lang)}</p>
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
</div></section>`;
  return page({ lang, title: `${L.aboutTitle} — ${L.brand}`, desc: L.aboutMetaDesc,
    path: '/about/', active: '/about/', body });
}

// ------------------------------------------------------------
// CONTACT
// ------------------------------------------------------------
export function renderContact(lang) {
  const L = t(lang);
  const { contactEmail } = { contactEmail: 'FENG91111@gmail.com' };
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
  const paths = ['/', '/oil/', '/gold/', '/china-fuel/', '/currency/', '/about/', '/privacy/', '/contact/'];
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  for (const p of paths) {
    for (const l of LANGS) {
      const loc = `https://you.piccalc.com/${l}${p}`;
      const alts = LANGS.map(x =>
        `<xhtml:link rel="alternate" hreflang="${x}" href="https://you.piccalc.com/${x}${p}"/>`).join('');
      urls.push(`<url><loc>${loc}</loc><lastmod>${today}</lastmod>
    <changefreq>${p === '/' ? 'hourly' : 'daily'}</changefreq>
    <priority>${p === '/' ? '1.0' : '0.8'}</priority>${alts}</url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
}
