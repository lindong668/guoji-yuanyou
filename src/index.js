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
  renderPrivacy, renderAbout, renderContact, sitemap, setRenderTz,
} from './pages.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const seg = url.pathname.split('/').filter(Boolean);

    // load AdSense / GA4 / GSC ids from Worker vars
    configure(env);

    // Visitor timezone (Cloudflare geo) — used so server-rendered timestamps
    // are already in the reader's local time before any JS runs.
    setRenderTz((request.cf && request.cf.timezone) || 'UTC');

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
      const html = fn(lang, { m, fx });
      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=120, s-maxage=300',
          'x-content-type-options': 'nosniff',
        },
      });
    };

    switch (norm) {
      case '/':            return render((l, a) => renderHome(l, a.m, a.fx), true, true);
      case '/oil/':        return render((l, a) => renderOil(l, a.m), true, false);
      case '/gold/':       return render((l, a) => renderGold(l, a.m), true, false);
      case '/china-fuel/': return render((l, a) => renderCn(l, a.m), true, false);
      case '/currency/':   return render((l, a) => renderFx(l, a.fx), false, true);
      case '/privacy/':    return render((l) => renderPrivacy(l), false, false);
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
