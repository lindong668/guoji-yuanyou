// ============================================================
// PriceScope — Cloudflare Worker entry (SSR, multilingual)
// Deploy target: https://you.piccalc.com
// Data source:   https://ss.wwok.eu.cc/data  (your existing Worker)
// ============================================================
import { LANGS, DEFAULT_LANG, detectLang, SITE, t } from './i18n.js';
import { getMarket, getFx, fetchGoldLive } from './data.js';
import { getOilLive, probeAll as probeOil, OIL_PROVIDERS } from './oilLive.js';
import { getGoldLive, probeAll as probeGold, GOLD_PROVIDERS } from './goldLive.js';
import { page, esc, configure, adsTxtPublisher } from './ui.js';
/* ------------------------------------------------------------
 * ★ 服务端实时覆盖层（A26）
 * 背景：页面首屏数字来自 getMarket()（3号后端），而浏览器进来后
 *   又去拉 /api/oil-live（8源实时链路）覆盖 —— 两个来源数值不同，
 *   用户看到「点进卡片先闪 114.10，再跳回 110.70」。
 *   SEO 要求首屏 HTML 里必须有真数字，所以不能把首屏留空。
 * 做法：首屏【也用实时链路的值】，与浏览器后来拉的是同一个来源 → 不再跳变。
 *   为避免每个访客都触发一次外部请求，这里做 15 秒模块级缓存；
 *   链路全挂时回落到 3 号的值（保留原 getMarket 结果）。
 * ---------------------------------------------------------- */
const LIVE_TTL = 15000;
let liveCache = { at: 0, oil: null, gold: null };

async function liveOverlay() {
  const now = Date.now();
  if (liveCache.at && now - liveCache.at < LIVE_TTL) return liveCache;
  const [o, g] = await Promise.all([
    getOilLive().catch(() => null),
    getGoldLive().catch(() => null),
  ]);
  /* 只登记成功的那一半，失败的沿用上一轮缓存值，避免一次抖动把整页打空 */
  liveCache = {
    at: now,
    oil: (o && (o.brent || o.wti)) ? o : liveCache.oil,
    gold: (g && g.usdOz && !g.stale) ? g : liveCache.gold,
  };
  return liveCache;
}

/* 把实时值覆盖进 getMarket() 的结果（3号的值作为兜底保留） */
function applyLive(m, lv) {
  if (!m) return m;
  const out = { ...m };
  if (lv && lv.oil) {
    const b = +lv.oil.brent || 0, w = +lv.oil.wti || 0;
    if (b) out.oil = { ...(out.oil || {}), price: b,
                       updated: lv.oil.updated || out.oil?.updated,
                       provider: lv.oil.provider };
    if (w) out.wti = { ...(out.wti || {}), price: w,
                       updated: lv.oil.updated || out.wti?.updated,
                       provider: lv.oil.provider };
  }
  if (lv && lv.gold && +lv.gold.usdOz) {
    out.gold = { ...(out.gold || {}), usdOz: +lv.gold.usdOz,
                 updated: lv.gold.updated || out.gold?.updated,
                 provider: lv.gold.provider };
  }
  return out;
}

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

    // ★ Vercel 适配：canonical / hreflang / 301 全部按本次请求的域名生成，
    //   否则会全部指向线上正式站 you.piccalc.com。
    //   同一部署下 origin 恒定，无并发竞态。
    SITE.domain = url.origin;

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
      const [mR, fxR, lvR] = await Promise.all([getMarket(), getFx(), liveOverlay()]);
      const html = renderHome(langR, applyLive(mR, lvR), fxR, tz);
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
      const order = (url.searchParams.get('src') || '').split(',').filter(Boolean);
      const r = await getGoldLive(order);
      // 字段契约保持与旧版一致（前端读 priceUsdPerOz / live），
      // 额外带出 provider / stale / tried，便于排查到底走的哪条链路。
      return Response.json({
        priceUsdPerOz: r.usdOz || 0,
        live: !!r.usdOz && !r.stale,
        provider: r.provider,
        providerLabel: r.providerLabel,
        stale: !!r.stale,
        note: r.note || '',
        tried: r.tried || [],
      }, { headers: { 'cache-control': 'no-store' } });
    }

    /* ★ Vercel 测试版：原油实时价接口
     * 服务端逐个尝试 OIL_PROVIDERS，拿到就停。
     * 同源调用，无 CORS 问题；结果不缓存，保证每次都是新的。 */
    if (url.pathname === '/api/oil-live') {
      const order = (url.searchParams.get('src') || '').split(',').filter(Boolean);
      const r = await getOilLive(order);
      return Response.json(r, { headers: { 'cache-control': 'no-store' } });
    }

    /* ★ Vercel 测试版：数据源探针
     * 在 Vercel 的服务器（出口干净）上逐个实测所有候选源，
     * 用实测结果决定生产用哪个源。 */
    if (url.pathname === '/probe') {
      /* 原油与黄金【并行】探测，一次打开看全部。 */
      const [ro, rg] = await Promise.all([probeOil(), probeGold()]);

      const oilRows = ro.results.map(r => r.ok
        ? `<tr style="background:${r.stale ? '#fff8e6' : '#e8f7ee'}">
             <td><b>${r.id}</b></td><td>${r.stale ? '⚠️ 可用(旧值)' : '✅ 可用'}</td><td>${r.ms}ms</td>
             <td>布伦特 ${r.brent || '—'} / WTI ${r.wti || '—'}</td>
             <td style="color:#666">${r.note || ''}</td></tr>`
        : `<tr style="background:#fdeaea">
             <td><b>${r.id}</b></td><td>❌ 失败</td><td>${r.ms}ms</td>
             <td>—</td><td style="color:#a00">${r.error || ''}</td></tr>`
      ).join('');

      const goldRows = rg.results.map(r => r.ok
        ? `<tr style="background:${r.stale ? '#fff8e6' : '#e8f7ee'}">
             <td><b>${r.id}</b></td><td>${r.stale ? '⚠️ 可用(旧值)' : '✅ 可用'}</td><td>${r.ms}ms</td>
             <td>${r.usdOz || '—'} USD/oz</td>
             <td style="color:#666">${r.note || ''}</td></tr>`
        : `<tr style="background:#fdeaea">
             <td><b>${r.id}</b></td><td>❌ 失败</td><td>${r.ms}ms</td>
             <td>—</td><td style="color:#a00">${r.error || ''}</td></tr>`
      ).join('');

      const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>数据源实测探针（原油 + 黄金）</title>
<style>
body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
     max-width:980px;margin:0 auto;padding:24px;line-height:1.6}
h1{font-size:22px} h2{font-size:17px;margin-top:26px}
.meta{color:#666;font-size:13px;margin-bottom:16px}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:8px}
th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}
th{background:#f5f5f5}
code{background:#f3f3f3;padding:2px 6px;border-radius:4px}
.warn{background:#fff8e6;border-left:3px solid #e0a800;padding:10px 14px;font-size:14px;margin-top:16px}
</style></head><body>
<h1>数据源实测探针</h1>
<div class="meta">探测时间：${ro.at} ｜ 由部署平台服务器发起（出口干净）</div>

<h2>一、原油（布伦特 / WTI）— 可用 ${ro.okCount} / ${ro.total}</h2>
<table>
<tr><th>源</th><th>状态</th><th>耗时</th><th>样例价</th><th>说明 / 错误</th></tr>
${oilRows}
</table>

<h2>二、国际黄金（XAU/USD）— 可用 ${rg.okCount} / ${rg.total}</h2>
<table>
<tr><th>源</th><th>状态</th><th>耗时</th><th>样例价</th><th>说明 / 错误</th></tr>
${goldRows}
</table>

<div class="warn">
<b>怎么看结果</b>：<code>⚠️ 可用(旧值)</code> 表示该源能连通，但返回的是它缓存/沿用的上一次价格
（不是此刻的真实价）。这类源适合兜底，<b>不适合当主源</b> —— 之前线上那个 101.53 就是这么来的。
</div>

<p style="margin-top:20px;font-size:14px">
确定用哪个源之后：
<code>/api/oil-live?src=源ID</code>、
<code>/api/gold-live?src=源ID</code> 可指定顺序验证，多个用逗号分隔。
</p>
<p style="font-size:14px;color:#666">
不传 src 时按默认顺序：原油 ${OIL_PROVIDERS.map(p => p.id).join(' → ')}；
黄金 ${GOLD_PROVIDERS.map(p => p.id).join(' → ')}。
</p>
</body></html>`;
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    // ---------- language-scoped routes ----------
    let lang = (seg[0] || '').toLowerCase();
    if (!LANGS.includes(lang)) {
      // unknown first segment -> send to browser language home
      const l = langCookie || detectLang(request.headers.get('Accept-Language'));
      return Response.redirect(`${SITE.domain}/${l}/`, 302);
    }

    /* ★★ A22h：语言以 cookie 为准，【原地 200 渲染，不做任何跳转】。
     *
     * A22g 在这里用的是 302 跳到 cookie 语言。问题在于：按返回键落到历史
     * 里的上一条（比如 /es/gold/）时，服务端把它 302 回cookie 语言
     * （/de/gold/）—— 用户看到"闪一下，又回到刚才那个页面"，
     * 再按返回还是同样的结果，等于被困住，永远回不到首页。
     * 历史条目一旦生成就无法改写，重定向只会把人弹回来。
     *
     * 正确做法：不跟历史较劲。URL 的语言段落照旧解析（爬虫、被分享的
     * 链接全部按 URL 走，行为一字不变），但对【带 cookie 的真人访客】
     * 直接按他选过的语言渲染内容，200 原地返回：
     *   · 没有跳转 → 不闪、不被弹回、不会被困住
     *   · no-store 已禁用 bfcache → 按返回必重新请求 → 拿到正确语言
     * 爬虫从不带 cookie，因此 canonical / hreflang / SEO 完全不受影响。 */
    if (langCookie && langCookie !== lang) lang = langCookie;

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
      const [m, fx, lv] = await Promise.all([
        needsMarket ? getMarket() : Promise.resolve(null),
        needsFx ? getFx() : Promise.resolve(null),
        needsMarket ? liveOverlay() : Promise.resolve(null),
      ]);
      const html = fn(lang, { m: applyLive(m, lv), fx }, tz);
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
