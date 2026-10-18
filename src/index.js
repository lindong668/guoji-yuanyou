// ============================================================
// PriceScope — Cloudflare Worker entry (SSR, multilingual)
// Deploy target: https://you.piccalc.com
// Data source:   https://ss.wwok.eu.cc/data  (your existing Worker)
// ============================================================
import { LANGS, DEFAULT_LANG, detectLang, SITE, t } from './i18n.js';
import { getMarket, getFx } from './data.js';
import { page, esc, configure, adsTxtPublisher } from './ui.js';
import {
  renderHome, renderOil, renderGold, renderCn, renderFx,
  renderPrivacy, renderAbout, renderContact, sitemap,
} from './pages.js';

// ------------------------------------------------------------
// Visitor timezone resolution
// Priority: 1) ps_tz cookie (written by the inline script on a previous
// visit — survives VPN / wrong CF geo)  2) Cloudflare geo  3) UTC.
// Always validated: a bogus value must never reach Intl.
// ------------------------------------------------------------
function isValidTz(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; }
  catch { return false; }
}

function pickTz(request) {
  const cookie = request.headers.get('Cookie') || '';
  const m = /(?:^|;\s*)ps_tz=([^;]+)/.exec(cookie);
  if (m) {
    let v = m[1];
    try { v = decodeURIComponent(v); } catch {}
    if (isValidTz(v)) return v;
  }
  const cf = request.cf && request.cf.timezone;
  if (isValidTz(cf)) return cf;
  return 'UTC';
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const seg = url.pathname.split('/').filter(Boolean);

    // load AdSense / GA4 / GSC ids from Worker vars
    configure(env);

    // Visitor timezone — resolved once per request and passed explicitly
    // into every renderer (never stored in module state: Workers isolates
    // interleave across `await` and would leak it between visitors).
    const tz = pickTz(request);

    // ---------- ads.txt (required by AdSense) ----------
    if (url.pathname === '/ads.txt') {
      const pub = adsTxtPublisher();
      const body = pub
        ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
        : '# ads.txt — set ADSENSE_CLIENT in wrangler.toml [vars] after AdSense approval\n';
      return new Response(body, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }

    // ---------- robots.txt ----------
    if (url.pathname === '/robots.txt') {
      const body = `User-agent: *
Allow: /

Sitemap: ${SITE.domain}/sitemap.xml
`;
      return new Response(body, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }

    // ---------- sitemap.xml ----------
    if (url.pathname === '/sitemap.xml') {
      return new Response(sitemap(), {
        headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
      });
    }

    // ---------- root: detect browser language, redirect ----------
    if (seg.length === 0) {
      const lang = detectLang(request.headers.get('Accept-Language'));
      return Response.redirect(`${SITE.domain}/${lang}/`, 302);
    }

    // ---------- optional JSON API (handy for debugging) ----------
    if (url.pathname === '/api/market') {
      const m = await getMarket();
      return Response.json(m, { headers: { 'cache-control': 'public, max-age=300' } });
    }

    // ---------- language-scoped routes ----------
    let lang = (seg[0] || '').toLowerCase();
    if (!LANGS.includes(lang)) {
      // unknown first segment -> send to browser language home
      const l = detectLang(request.headers.get('Accept-Language'));
      return Response.redirect(`${SITE.domain}/${l}/`, 302);
    }

    const rest = '/' + (seg.slice(1).join('/') || '');
    const norm = rest.endsWith('/') ? rest : rest + '/';

    // canonical redirect: ensure trailing slash (compare against the REAL
    // pathname — seg[] has already been stripped by filter(Boolean), so
    // comparing rest/norm would redirect /zh/oil/ to itself forever)
    if (!url.pathname.endsWith('/')) {
      return Response.redirect(`${SITE.domain}/${lang}${norm}`, 301);
    }

    const render = async (fn, needsMarket, needsFx) => {
      const [m, fx] = await Promise.all([
        needsMarket ? getMarket() : Promise.resolve(null),
        needsFx ? getFx() : Promise.resolve(null),
      ]);
      const html = fn(lang, { m, fx }, tz);
      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          // Rendered timestamps are per-visitor, so the HTML must NOT be
          // shared by a public cache — otherwise one visitor's timezone
          // leaks into another's page. `private` keeps it per-browser.
          // Page data itself is already cached in Worker memory, so
          // re-rendering costs well under a millisecond.
          'cache-control': 'private, max-age=60',
          'x-content-type-options': 'nosniff',
        },
      });
    };

    switch (norm) {
      case '/':            return render((l, a, z) => renderHome(l, a.m, a.fx, z), true, true);
      case '/oil/':        return render((l, a, z) => renderOil(l, a.m, z), true, false);
      case '/gold/':       return render((l, a, z) => renderGold(l, a.m, z), true, false);
      case '/china-fuel/': return render((l, a, z) => renderCn(l, a.m, z), true, false);
      case '/currency/':   return render((l, a, z) => renderFx(l, a.fx, z), false, true);
      case '/privacy/':    return render((l, a, z) => renderPrivacy(l, z), false, false);
      case '/about/':      return render((l) => renderAbout(l), false, false);
      case '/contact/':    return render((l) => renderContact(l), false, false);
      default: {
        const L = t(lang);
        const body = `<section class="blk"><div class="wrap prose">
          <h1 style="font-size:2rem;margin:0 0 10px">404</h1>
          <p>${esc(L.nav.overview)} — <a href="/${lang}/">${esc(L.brand)}</a></p>
        </div></section>`;
        return new Response(page({
          lang, title: `404 — ${L.brand}`, desc: L.homeDesc,
          path: '/404/', active: '/', body, noindex: true,
        }), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
    }
  },
};
