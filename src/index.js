// ============================================================
// PriceScope — 停服重定向专用 Worker（A46-STOP，2026-10-31）
//
// ★ 用途：2 号站（you.piccalc.com）因数据源授权风险停止运营，
//   全部已收录页面做 301 永久重定向，把权重与访问者导到 5 号站
//   CalcHub（home.saoo.me）—— 唯一同属「金融 / 汇率计算」品类、
//   且数据源合规（ExchangeRate-API 明文商用 + Frankfurter/ECB）的站。
//
// ★ 为什么做成独立小 Worker，而不是改原来的 index.js：
//   原站 9 个 JS、31 个文件，且本地版本与线上可能有出入。
//   停服后页面内容已无意义，只留重定向，所以整套换成这 1 个文件，
//   不依赖 articles.js / pages.js 等任何旧模块，部署零风险。
//
// ★ 关键设计（决定权重能不能传过去）：
//   ① 301 而不是 302 —— 只有 301 传递排名信号
//   ② sitemap.xml 原样保留 —— Google 靠它发现全部 154 个 URL
//      才会去抓、才会看到 301。删了 sitemap 等于放弃这批收录。
//   ③ robots.txt 保持 allow —— 禁止抓取会让 Google 无法跟随
//      重定向，权重直接断掉
//   ④ ads.txt / 验证文件保留 —— 避免 AdSense 报「ads.txt 缺失」
// ============================================================

const TARGET = 'https://home.saoo.me';

// 语言前缀（与原站 i18n.js 保持一致）
const LANGS = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'pt'];

/* ---- 停服后仍需「原样返回」的文件 ----
 * 返回内容而不是重定向，理由见上面 ②③④。 */
const KEEP_FILE = {
  '/ads.txt': 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0',
  '/robots.txt': [
    'User-agent: *',
    'Allow: /',
    '',
    '# 本站已停止运营，所有页面 301 至 https://home.saoo.me',
    '# 保持 Allow 是刻意的：禁止抓取会让搜索引擎无法跟随重定向，',
    '# 已收录页面的权重将无法传递。',
    '',
    'Sitemap: https://you.piccalc.com/sitemap.xml',
    '',
  ].join('\n'),
  '/BingSiteAuth.xml': [
    '<?xml version="1.0"?>',
    '<users>',
    '\t<user>922DCA6E549674B12068F412FE444631</user>',
    '</users>',
    '',
  ].join('\n'),
  '/google6474e28bb6098302.html':
    'google-site-verification: google6474e28bb6098302.html',
};

/* ---- 页面级精准映射 ----
 * 只在「两边内容真的相关」时才做精准映射。
 * 不相关却硬指到某个具体页，会被 Google 判为软 404，
 * 反而比指向首页更糟 —— 所以原油/黄金页统一落到 5 号首页。 */
const PAGE_MAP = {
  '/':          TARGET + '/',                              // 首页 → 首页
  '/currency/': TARGET + '/#fx',                           // 汇率 → 汇率计算器
  '/blog/':     TARGET + '/guides/',                       // 博客列表 → 指南列表
  '/faq/':      TARGET + '/guides/',                       // FAQ → 指南列表
  '/privacy/':  TARGET + '/privacy.html',
  '/about/':    TARGET + '/about.html',
  '/contact/':  TARGET + '/contact.html',
};

/* ---- 文章级精准映射 ----
 * 10 篇里只有 1 篇在 5 号有对应内容，其余不强凑。 */
const ARTICLE_MAP = {
  // 中间价 vs 银行价 → 汇率基础（内容确实对应）
  'mid-market-vs-bank-rate': TARGET + '/guides/exchange-rate-basics.html',
};

// 原站全部 12 个页面路由
const ROUTES = [
  '/', '/oil/', '/wti/', '/oil-report/', '/gold/', '/china-fuel/',
  '/currency/', '/blog/', '/faq/', '/privacy/', '/about/', '/contact/',
];

// 原站全部 10 篇文章 slug
const SLUGS = [
  'china-fuel-pricing-mechanism',
  'gasoline-92-95-98-octane',
  'gold-investment-vehicles-compared',
  'how-to-read-gold-price',
  'mid-market-vs-bank-rate',
  'what-is-wti-crude-cushing',
  'what-one-barrel-produces',
  'why-brent-is-oil-benchmark',
  'why-fuel-prices-differ-by-province',
  'wti-vs-brent-spread-explained',
];

/* ------------------------------------------------------------
 * 核心：算出某个路径该跳到哪里
 *   step 1  命中 KEEP_FILE → 返回 null（不跳，原样返回内容）
 *   step 2  剥掉语言前缀：/zh/oil/ → /oil/
 *   step 3  文章页优先匹配
 *   step 4  页面映射命中 → 精准跳
 *   step 5  其余（原油/黄金/油价/未知路径）→ 5 号首页
 * ---------------------------------------------------------- */
function retireTarget(pathname) {
  if (Object.prototype.hasOwnProperty.call(KEEP_FILE, pathname)) return null;

  const seg = pathname.split('/').filter(Boolean);
  const rest = seg.length && LANGS.indexOf(seg[0]) >= 0 ? seg.slice(1) : seg;
  const norm = '/' + (rest.length ? rest.join('/') + '/' : '');

  const am = /^\/blog\/([a-z0-9-]+)\/$/.exec(norm);
  if (am) return ARTICLE_MAP[am[1]] || TARGET + '/guides/';

  if (Object.prototype.hasOwnProperty.call(PAGE_MAP, norm)) return PAGE_MAP[norm];

  return TARGET + '/';
}

/* ---- sitemap：原样输出全部 154 个 URL ----
 * 保留它，Google 才会重新抓取并发现 301。 */
function buildSitemap() {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  const push = (p) => {
    out.push('  <url>');
    out.push(`    <loc>https://you.piccalc.com${p}</loc>`);
    out.push('    <lastmod>2026-10-31</lastmod>');
    out.push('  </url>');
  };
  for (const l of LANGS) {
    for (const r of ROUTES) push(`/${l}${r}`);
    for (const s of SLUGS) push(`/${l}/blog/${s}/`);
  }
  out.push('</urlset>', '');
  return out.join('\n');
}

const HTML_HDR = { 'content-type': 'text/html; charset=utf-8' };
const TXT_HDR  = { 'content-type': 'text/plain; charset=utf-8' };

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/sitemap.xml') {
      return new Response(buildSitemap(), {
        headers: { 'content-type': 'application/xml; charset=utf-8' },
      });
    }

    if (Object.prototype.hasOwnProperty.call(KEEP_FILE, p)) {
      return new Response(KEEP_FILE[p], { headers: TXT_HDR });
    }

    const to = retireTarget(p);

    // 兜底提示页：正常情况走不到，仅防 retireTarget 返回空
    if (!to) {
      return new Response(
        '<!doctype html><meta charset="utf-8">' +
        '<p>PriceScope has moved. <a href="' + TARGET + '/">' + TARGET + '</a></p>',
        { status: 200, headers: HTML_HDR });
    }

    return Response.redirect(to, 301);
  },
};
