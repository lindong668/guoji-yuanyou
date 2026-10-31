// 2号停服重定向 —— 真实调用测试（不是查字符串，是跑 fetch 看返回）
let pass = 0, fail = 0;
const ok = (n, c, extra) => { if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ ' + n + (extra ? '  → ' + extra : '')); } };

// mock CF Workers 的 Response
global.Response = class {
  constructor(body, init = {}) {
    this.body = body; this.status = init.status || 200; this.headers = init.headers || {};
  }
  static redirect(to, status) { return { __redirect: to, status }; }
};

const mod = await import('./src/index.js');
const worker = mod.default;

const hit = async (path) => {
  const r = await worker.fetch({ url: 'https://you.piccalc.com' + path });
  return r;
};
const to = async (path) => { const r = await hit(path); return r.__redirect; };

console.log('\n=== 1. 精准映射（内容相关的才精准跳）===');
ok('/en/currency/ → 5号汇率计算器 #fx',
  (await to('/en/currency/')) === 'https://home.saoo.me/#fx', await to('/en/currency/'));
ok('/zh/blog/mid-market-vs-bank-rate/ → 汇率基础指南',
  (await to('/zh/blog/mid-market-vs-bank-rate/')) === 'https://home.saoo.me/guides/exchange-rate-basics.html',
  await to('/zh/blog/mid-market-vs-bank-rate/'));
ok('/en/privacy/ → 5号隐私页',
  (await to('/en/privacy/')) === 'https://home.saoo.me/privacy.html');
ok('/en/about/ → 5号关于页',
  (await to('/en/about/')) === 'https://home.saoo.me/about.html');
ok('/en/contact/ → 5号联系页',
  (await to('/en/contact/')) === 'https://home.saoo.me/contact.html');
ok('/ → 5号首页',
  (await to('/')) === 'https://home.saoo.me/');

console.log('\n=== 2. 原油/黄金/油价（无对应内容）→ 5号首页 ===');
for (const p of ['/oil/', '/wti/', '/oil-report/', '/gold/', '/china-fuel/']) {
  ok(p + ' → 首页', (await to(p)) === 'https://home.saoo.me/', await to(p));
}

console.log('\n=== 3. 7 种语言前缀都能正确剥离 ===');
const LANGS = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'pt'];
let langOK = true, langBad = '';
for (const l of LANGS) {
  const r = await to('/' + l + '/currency/');
  if (r !== 'https://home.saoo.me/#fx') { langOK = false; langBad = l + ' → ' + r; }
}
ok('7语 /{lang}/currency/ 全部 → #fx', langOK, langBad);

let oilOK = true, oilBad = '';
for (const l of LANGS) {
  const r = await to('/' + l + '/gold/');
  if (r !== 'https://home.saoo.me/') { oilOK = false; oilBad = l + ' → ' + r; }
}
ok('7语 /{lang}/gold/ 全部 → 首页', oilOK, oilBad);

console.log('\n=== 4. 文章页：非精准的落 guides ===');
ok('/en/blog/why-brent-is-oil-benchmark/ → /guides/',
  (await to('/en/blog/why-brent-is-oil-benchmark/')) === 'https://home.saoo.me/guides/');
ok('/ja/blog/mid-market-vs-bank-rate/ 也精准（跨语言）',
  (await to('/ja/blog/mid-market-vs-bank-rate/')) === 'https://home.saoo.me/guides/exchange-rate-basics.html');

console.log('\n=== 5. 状态码必须是 301（302 不传权重）===');
const r1 = await hit('/en/oil/');
ok('返回 301 而非 302', r1.status === 301, '实际 ' + r1.status);

console.log('\n=== 6. 必须保留的文件（决定权重能否传递）===');
const sm = await hit('/sitemap.xml');
ok('/sitemap.xml 返回 XML', String(sm.body).indexOf('<urlset') >= 0);
const cnt = (String(sm.body).match(/<loc>/g) || []).length;
ok('sitemap 含全部 154 个 URL（7语×22）', cnt === 154, '实际 ' + cnt);

const rb = await hit('/robots.txt');
ok('/robots.txt 保持 Allow（禁抓会断权重）',
  String(rb.body).indexOf('Allow: /') >= 0 && String(rb.body).indexOf('Disallow') < 0);
ok('/robots.txt 未重定向', rb.__redirect === undefined);

const ads = await hit('/ads.txt');
ok('/ads.txt 原样返回（避免 AdSense 报缺失）', ads.__redirect === undefined);
const bing = await hit('/BingSiteAuth.xml');
ok('/BingSiteAuth.xml 原样返回', bing.__redirect === undefined);
const gv = await hit('/google6474e28bb6098302.html');
ok('/google6474e28bb6098302.html 原样返回', gv.__redirect === undefined);

console.log('\n=== 7. 边界 ===');
ok('未知路径 → 首页（不 404）',
  (await to('/zh/does-not-exist/')) === 'https://home.saoo.me/');
ok('尾部无斜杠也处理', (await to('/en/oil')) === 'https://home.saoo.me/');
ok('sitemap 里不出现 you.piccalc 以外的域名',
  String(sm.body).indexOf('home.saoo.me') < 0);

console.log('\n────────────────────────');
console.log(`通过 ${pass} / 失败 ${fail}`);
process.exit(fail ? 1 : 0);
