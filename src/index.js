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
  renderPrivacy, renderAbout, renderContact, renderFaq, sitemap,
  renderBlogList, renderArticle, renderWti,
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

    // ---------- root: render the landing page IN PLACE (200, no redirect) ----------
    // This used to 302 to /{lang}/. Google Search Console kept reporting
    // "Redirect error" on https://you.piccalc.com/ and never indexed the
    // entry URL. Serving 200 removes the hop entirely.
    // The canonical tag inside renderHome() already points at /{lang}/ , so
    // Google consolidates ranking on the language URL — no duplicate content,
    // no redirect for the crawler to trip over.
    if (seg.length === 0) {
      const langR = detectLang(request.headers.get('Accept-Language'));
      const [mR, fxR] = await Promise.all([getMarket(), getFx()]);
      const html = renderHome(langR, mR, fxR, tz);
      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'private, max-age=0, must-revalidate',
          // Content varies by Accept-Language, so caches must key on it.
          'vary': 'Accept-Language',
          'x-content-type-options': 'nosniff',
        },
      });
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
          // max-age=0 forces a re-render on every load, so a timezone
          // change takes effect immediately instead of being masked by a
          // 60-second local copy. Data itself is cached in Worker memory,
          // so re-rendering costs well under a millisecond.
          'cache-control': 'private, max-age=0, must-revalidate',
          'x-content-type-options': 'nosniff',
        },
      });
    };

    // ---------- article detail: /blog/{slug}/ ----------
    // Checked before the switch because the slug varies. A slug with no
    // translation in this language is sent to the index rather than 404 —
    // it keeps crawlers and readers off a dead end.
    const artM = /^\/blog\/([a-z0-9-]+)\/$/.exec(norm);
    if (artM) {
      const html = renderArticle(lang, artM[1]);
      if (!html) return Response.redirect(`${SITE.domain}/${lang}/blog/`, 302);
      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=600',
          'x-content-type-options': 'nosniff',
        },
      });
    }

    switch (norm) {
      case '/':            return render((l, a, z) => renderHome(l, a.m, a.fx, z), true, true);
      case '/oil/':        return render((l, a, z) => renderOil(l, a.m, z), true, false);
      case '/wti/':        return render((l, a, z) => renderWti(l, a.m, z), true, false);
      case '/gold/':       return render((l, a, z) => renderGold(l, a.m, z), true, false);
      case '/china-fuel/': return render((l, a, z) => renderCn(l, a.m, z), true, false);
      case '/currency/':   return render((l, a, z) => renderFx(l, a.fx, z), false, true);
      case '/blog/':       return render((l) => renderBlogList(l), false, false);
      case '/faq/':        return render((l, a, z) => renderFaq(l), false, false);
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
