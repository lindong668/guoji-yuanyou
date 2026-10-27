// ============================================================
// PriceScope — Cloudflare Worker entry (SSR, multilingual)
// Deploy target: https://you.piccalc.com
// Data source:   https://ss.wwok.eu.cc/data  (your existing Worker)
// ============================================================
import { LANGS, DEFAULT_LANG, detectLang, SITE, t } from './i18n.js';
import { getMarket, getFx, fetchGoldLive } from './data.js';
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

/* base64 → 二进制响应（图标专用，长期缓存） */
function bin(b64, mime) {
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': mime,
      'cache-control': 'public, max-age=604800',
    },
  });
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

    /* ★ A16：图标已改为 public/ 下的真静态文件（见 wrangler.toml [assets]）
     * 由 Cloudflare 直接返回，不再经过 Worker，也不再 base64 内嵌。
     * 原 6 个图标路由已删除；icons.js 已删除。 */

    // ---------- ads.txt (required by AdSense) ----------
    /* ★ v2 修正：ads.txt 必须提前给出真实 publisher ID
     *
     * 原逻辑依赖 adsTxtPublisher()，而它受 ADSENSE_CLIENT 控制；
     * wrangler.toml 里该值留空（为了审核期间不展示广告位），
     * 结果 ads.txt 输出的是一行注释 —— AdSense 抓取器会判定
     * 「ads.txt 无效 / 缺失」，审核直接卡住。
     *
     * 关键点：ads.txt 只是所有权声明文件，本身不含广告代码，
     * 提前放置完全符合 AdSense 政策（政策禁止的是审核期间展示广告位，
     * 不是禁止声明所有权）。
     *
     * 所以这里写死真实 pub ID，且与广告位开关解耦 ——
     * ads.txt 立即生效，广告位仍等批准后由 ADSENSE_CLIENT 控制开启。 */
    /* Bing 站点所有权 XML 验证。
     * 本包同时也在 public/ 根目录放了同名静态文件（assets 优先命中）；
     * 这里再加一层 Worker 兜底，确保任何情况下都能返回。 */
    if (url.pathname === '/BingSiteAuth.xml') {
      return new Response(
        `<?xml version="1.0"?>
<users>
\t<user>922DCA6E549674B12068F412FE444631</user>
</users>
`,
        { headers: { 'content-type': 'application/xml; charset=utf-8' } }
      );
    }

    if (url.pathname === '/ads.txt') {
      const pub = adsTxtPublisher() || 'pub-8915931557404979';
      const body = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
      return new Response(body, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }

    // ---------- Google 站点验证文件 ----------
    // 与 1号(piccalc.com) / 5号(k789.cc.cd) 使用同一份验证文件，
    // 便于在 Search Console 用同一账号添加属性。
    if (url.pathname === '/google6474e28bb6098302.html') {
      return new Response('google-site-verification: google6474e28bb6098302.html', {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }

    // ---------- robots.txt ----------
    if (url.pathname === '/robots.txt') {
      const body = `User-agent: Mediapartners-Google
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Applebot：支撑 Spotlight / Siri / Safari 搜索
# （若 robots 未提 Applebot，它会沿用 Googlebot 的规则；显式声明更稳妥）
User-agent: Applebot
Allow: /

# AI 搜索爬虫：允许抓取，让内容可被 AI 回答引用
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: *
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

    /* ★ A22g：记住访客手动选过的语言。
     * 用 cookie 而不是 localStorage —— 按返回键时浏览器走 bfcache（往返缓存），
     * 上一页是从内存原样恢复的，既不再请求服务端也不重跑 JS，
     * 任何写在页面里的 localStorage 记忆逻辑都不会执行。
     * cookie 随请求头自动带回服务端，服务端直接给出正确语言，不依赖 JS。
     * 爬虫不带 cookie，因此行为与改动前完全一致（SEO 无影响）。 */
    const langCookie = (function () {
      const jar = request.headers.get('Cookie') || '';
      const hit = jar.match(/(?:^|;\s*)ps_lang=([a-z]{2})(?:;|$)/);
      return (hit && LANGS.includes(hit[1])) ? hit[1] : null;
    })();

    // ---------- root: render the landing page IN PLACE (200, no redirect) ----------
    // This used to 302 to /{lang}/. Google Search Console kept reporting
    // "Redirect error" on https://you.piccalc.com/ and never indexed the
    // entry URL. Serving 200 removes the hop entirely.
    // The canonical tag inside renderHome() already points at /{lang}/ , so
    // Google consolidates ranking on the language URL — no duplicate content,
    // no redirect for the crawler to trip over.
    if (seg.length === 0) {
      // English is the site's primary language: the bare domain is the
      // English door. Auto-detection still applies everywhere else —
      // an unknown language segment is resolved from Accept-Language below.
      // 手动选过语言的访客按他选的渲染；新访客（无 cookie）仍是英文正门。
      const langR = langCookie || DEFAULT_LANG;
      const [mR, fxR] = await Promise.all([getMarket(), getFx()]);
      const html = renderHome(langR, mR, fxR, tz);
      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          // ★ A22g: no-store also keeps the page OUT of the browser's
          // back/forward cache (bfcache). A bfcache restore replays the page
          // from memory without asking the server, so the remembered
          // language would never be applied. Every response here was already
          // private/max-age=0, so request volume is unchanged.
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    }

    // ---------- optional JSON API (handy for debugging) ----------
    if (url.pathname === '/api/market') {
      const m = await getMarket();
      return Response.json(m, { headers: { 'cache-control': 'public, max-age=300' } });
    }

    /* ★ A22：黄金现抓代理
     * 前端实时链路全挂时调用。密钥只在服务端出现，前端页面源码里没有。
     * 同源（/api/...），因此没有 CORS 问题。 */
    if (url.pathname === '/api/gold-live') {
      const r = await fetchGoldLive();
      return Response.json(r, { headers: { 'cache-control': 'no-store' } });
    }

    // ---------- language-scoped routes ----------
    let lang = (seg[0] || '').toLowerCase();
    if (!LANGS.includes(lang)) {
      // unknown first segment -> send to browser language home
      const l = langCookie || detectLang(request.headers.get('Accept-Language'));
      return Response.redirect(`${SITE.domain}/${l}/`, 302);
    }

    /* ★ A22g：URL 语言与访客选过的语言不一致时，302 到他选的那个。
     * 只在这一浏览器真的存过 ps_lang 时才发生；没有 cookie（新访客、爬虫）
     * 走原路径，分享出去的 /zh/gold/ 链接在别人那里照旧是中文。
     * 302 会替换掉历史里这一条，所以按返回落回来时就是这个语言，
     * 再按一次返回即离开本站 —— 不会出现"一层层退语言"的情况。 */
    if (langCookie && langCookie !== lang) {
      const rest = '/' + seg.slice(1).join('/');
      // 目标必须自带尾斜杠，否则会再触发一次 canonical 301 才落地。
      const tail = (rest.endsWith('/') ? rest : rest + '/') + url.search;
      return Response.redirect(`${SITE.domain}/${langCookie}${tail}`, 302);
    }

    // ---------- legacy dated URLs -> 301 to the current, undated form ----------
    // An earlier build appended a date segment to every URL
    // (/{lang}/about/2026-10-20/). Google has already crawled and indexed
    // that shape, so those URLs must not 404 — a 301 hands the accumulated
    // signals to the live page instead of throwing them away.
    // Handled BEFORE the trailing-slash redirect so the crawler only ever
    // sees one hop, not two.
    const segs = seg.slice(1);
    if (segs.some(x => /^\d{4}-\d{2}-\d{2}$/.test(x))) {
      // strip the date segment, then rebuild
      let clean = segs.filter(x => !/^\d{4}-\d{2}-\d{2}$/.test(x)).join('/');
      return Response.redirect(`${SITE.domain}/${lang}/${clean}${clean ? '/' : ''}`, 301);
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
          // ★ A22g: no-store also keeps the page OUT of the browser's
          // back/forward cache (bfcache). A bfcache restore replays the page
          // from memory without asking the server, so the remembered
          // language would never be applied. Every response here was already
          // private/max-age=0, so request volume is unchanged.
          'cache-control': 'no-store',
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
      case '/gold/':       return render((l, a, z) => renderGold(l, a.m, a.fx, z), true, true);
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
