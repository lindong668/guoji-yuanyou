/* ===================================================================
 * CF Worker 版测试 —— 直接以【真实 Worker 形态】调用
 *   worker.fetch(request, env, ctx)
 * 不经过任何 HTTP 服务器、不经过 Netlify 适配层，
 * 因此测到的就是 CF 生产环境会跑的那条路径。
 *
 * ★ 沙盒对外网全封（连 er-api 都 403），上游一律 mock。
 *   本测试验的是「Worker 入口 + 路由 + 结构」，不是真实网络。
 *   真实源能不能用，以部署后 /probe 的结果为准。
 * =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from './src/index.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const chk = (n, c) => { if (c) pass++; else { fail++; console.log('  NG  ' + n); } };

/* CF 原生提供 caches.default；Node 里没有，补一个空实现。
 * （Netlify 版也是这么做的，CF 生产环境不会用到这层 polyfill） */
if (typeof globalThis.caches === 'undefined') {
  globalThis.caches = { default: {
    async match(){ return null; }, async put(){}, async delete(){ return true; } } };
}

const REAL = globalThis.fetch;
const FX = { base:'USD', rates:{ CNY:6.681042, EUR:0.893935, JPY:157.437384 }, date:'2026-10-28' };
const UP = {
  '油': { price:101.53, '格式化后':'$101.53', updatedLocal:'2026-10-28 08:30' },
  wti:  { price:99.91,  formatted:'$99.91',  updatedLocal:'2026-10-28 08:30' },
  '金子': { priceUsdPerOz:4046.6, priceCnyPerGram:869.21, updatedAt:new Date().toISOString() },
  cn_oil: { list:[{ '省':'北京', p92:8.66, p95:9.22, p98:10.10, p0:8.30 },
                  { '省':'上海', p92:8.62, p95:9.17, p98:10.05, p0:8.26 }],
            updatedAt:new Date().toISOString() },
};
let BLOCK = false;
globalThis.fetch = async (u, o) => {
  const s = (u && u.url) ? u.url : String(u);
  if (BLOCK && !s.includes('ss.wwok.eu.cc')) return new Response('blocked', { status:403 });
  if (s.includes('ss.wwok.eu.cc')) return new Response(JSON.stringify(UP),
    { status:200, headers:{'content-type':'application/json'} });
  if (s.includes('er-api') || s.includes('frankfurter'))
    return new Response(JSON.stringify({ ...FX, result:'success', rates:FX.rates }),
      { status:200, headers:{'content-type':'application/json'} });
  if (BLOCK) return new Response('blocked', { status:403 });
  return new Response('{}', { status:200, headers:{'content-type':'application/json'} });
};


/* ★ CSS 断言必须先剥掉 /*...*\/ 注释再匹配。
 *   之前踩过坑：注释里写了 "之前用 flex-wrap:wrap"，
 *   正则直接在注释里命中 → 规则其实已改成 nowrap，测试却仍报通过（假阳性）。 */
const stripCss = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '');

async function get(p, hdrs = {}) {
  const req = new Request('https://you.piccalc.com' + p, { headers: hdrs });
  const res = await worker.fetch(req, {}, { waitUntil(){}, passThroughOnException(){} });
  const body = await res.text();
  return { status: res.status, body, ct: res.headers.get('content-type') || '' };
}

console.log('==== 一、Worker 入口形态（CF 专属）====');
chk('导出 default.fetch（标准 Worker 形态）', typeof worker.fetch === 'function');
{
  const r = await get('/zh/');
  chk('直接 fetch 可渲染首页（无需适配层）', r.status === 200 && r.body.includes('<html'));
  chk('首页 canonical 指向 you.piccalc.com', r.body.includes('you.piccalc.com'));
}

console.log('==== 二、核心路由（七语 × 关键页）====');
for (const lg of ['zh','en','ja','es','fr','de','pt']) {
  for (const [n, p] of [['首页','/'],['布伦特','/oil/'],['WTI','/wti/'],
                        ['黄金','/gold/'],['国内油价','/china-fuel/'],['汇率','/currency/']]) {
    const r = await get('/' + lg + p);
    chk(lg + ' ' + n, r.status === 200 && r.ct.includes('text/html'));
  }
}

console.log('==== 三、国内油价仍靠 3 号（本次重点确认）====');
{
  const r = await get('/zh/china-fuel/');
  chk('国内油价页渲染成功', r.status === 200);
  chk('页面含省份数据（说明 3 号 /data 解析成功）', r.body.includes('北京'));
  chk('页面含 92# 价格', /8\.6[0-9]/.test(r.body));
  chk('data.js 仍以 X-Access-Key 读 3 号 /data',
      fs.readFileSync(ROOT + '/src/data.js','utf8').includes("'X-Access-Key': SOURCE_ACCESS_KEY"));
}

console.log('==== 四、汇率不靠 3 号（独立公开源）====');
{
  const d = fs.readFileSync(ROOT + '/src/data.js','utf8');
  chk('汇率主源是 er-api', d.includes('open.er-api.com'));
  chk('汇率备源是 frankfurter', d.includes('frankfurter'));
  chk('汇率逻辑不引用 SOURCE_WORKER', !/getFx[\s\S]{0,400}SOURCE_WORKER/.test(d));
  const r = await get('/zh/currency/');
  chk('汇率页渲染成功', r.status === 200);
}

console.log('==== 五、实时链路（本次回迁核心）====');
{
  for (const p of ['/api/oil-live','/api/gold-live']) {
    const r = await get(p);
    chk(p + ' 接口可达', r.status === 200);
    let j = null; try { j = JSON.parse(r.body); } catch(e){}
    chk(p + ' 返回合法 JSON', !!j);
    if (p.includes('oil')) chk('oil-live 含布伦特字段', j && (j.brent != null || j.oil != null || Array.isArray(j.providers)));
    else chk('gold-live 保留 priceUsdPerOz 字段契约', j && 'priceUsdPerOz' in j);
  }
}

console.log('==== 六、探针 /probe（15 源）====');
{
  BLOCK = true;
  const r = await get('/probe');
  chk('/probe 可达', r.status === 200);
  for (const id of ['biquote','yahoo','yahoo2','site3','stooq','oilwatch','opademo','cpapi'])
    chk('原油源 ' + id + ' 出现在探针', r.body.includes('>' + id + '<'));
  for (const id of ['site3live','biquote','xaus','goldapi','site3data','yahoogold','stooqgold'])
    chk('黄金源 ' + id + ' 出现在探针', r.body.includes('>' + id + '<'));
  chk('3 号被接入（原油）', r.body.includes('site3'));
  chk('3 号被接入（黄金）', r.body.includes('site3live') && r.body.includes('site3data'));
  BLOCK = false;
}

console.log('==== 七、v0 回归（前面各版成果不能丢）====');
{
  const r = await get('/zh/');
  chk('页脚含运营者署名', r.body.includes('独立开发者'));
  chk('免责用"数据"口径', !r.body.includes('以上价格') && r.body.includes('以上数据'));
  chk('首页三卡都有实时徽标节点',
      r.body.includes('home-oil-chip') && r.body.includes('home-wti-chip') && r.body.includes('home-gold-chip'));
  const css = stripCss(fs.readFileSync(ROOT + '/src/ui.js','utf8'));
  const pj  = fs.readFileSync(ROOT + '/src/pages.js','utf8');
  chk('徽标不可压缩（不被压扁裁字）', /\.live-dot\{[^}]*flex:0 0 auto/.test(css));
  /* ★ 本次修复：h3 改为【纵向两行】—— 第一行 .hd（色块+标题），第二行徽标。
   *   徽标没有横向邻居，宽度变化（4s→14s）不可能导致跳位。 */
  chk('h3 纵向排列（标题在上、徽标在下）', /\.card h3\{[^}]*flex-direction:column/.test(css));
  chk('h3 不再是横向 nowrap', !/\.card h3\{[^}]*flex-wrap:nowrap/.test(css));
  chk('第一行 .hd 为横向（色块+标题同行）', /\.card h3 \.hd\{[^}]*display:flex/.test(css));
  chk('.hd 不纵向排列', !/\.card h3 \.hd\{[^}]*flex-direction:column/.test(css));
  chk('标题 .ttl 可收缩（吸收宽度变化）', /\.card h3 \.ttl\{[^}]*flex:0 1 auto/.test(css));
  /* ★ 本次修复：标题只能在【词与词之间】换行，绝不在单词内部断开
   *   （break-word 曾把 "Pétrole brut Brent" 劈成三四行） */
  chk('标题 .ttl 禁止词内断行', /\.card h3 \.ttl\{[^}]*overflow-wrap:normal/.test(css));
  chk('标题 .ttl 不再是 break-word', !/\.card h3 \.ttl\{[^}]*overflow-wrap:break-word/.test(css));
  chk('标题 .ttl 不强制伸展', /\.card h3 \.ttl\{[^}]*flex:0 1 auto/.test(css));
  chk('秒数锁宽 3ch（一位/两位不换宽度）', /\.live-dot \.ago\{[^}]*min-width:3ch/.test(css));
  /* ★ 徽标锁高：浏览器翻译插件会【先摘掉节点、插 <font> 包裹、再放回】，
   *   那一瞬间徽标高度为 0 → column 布局第二行塌陷 → 卡片变矮 → 反复上下跳。
   *   锁 min-height 后该行恒占位，高度不再变化。 */
  chk('徽标锁死高度（翻译插件摘节点时不塌陷）', /\.live-dot\{[^}]*min-height:1em/.test(css));
  chk('徽标不换行（换行=高度变化=跳动）', /\.live-dot\{[^}]*overflow:hidden/.test(css));
  chk('色块不收缩', /\.card h3 \.swatch\{[^}]*flex:0 0 auto/.test(css));
  /* 三张卡片的标题必须真的包进 .ttl，否则上面的 CSS 无处生效 */
  for (const id of ['home-oil-chip','home-wti-chip','home-gold-chip']) {
    /* 结构必须是：.hd（含色块+标题）在其前，徽标在其后 —— 这才构成两行 */
    chk(id + ' 徽标位于 .hd 之后（独占第二行）',
        new RegExp('<span class="hd"><span class="swatch[^"]*"></span><span class="ttl">[^<]*</span></span><span id="' + id + '"').test(r.body));
  }
  /* ★ 徽标独占第二行后空间充足，首页恢复【完整文案】（与详情页一致）：
   *   "实时 · 14s 前更新" / "En direct · Mis à jour il y a 14s"。
   *   上一版为塞进窄行砍成 "En direct · 14s"，现在不必了。 */
  chk('首页 setAgo 拼接完整文案（含 AGOPRE）',
      /createTextNode\(T\.live\+' · '\+AGOPRE\)/.test(pj));
  chk('首页 setAgo 拼接 AGOTAIL 后缀', /AGOTAIL\) box\.appendChild/.test(pj));

  chk('setAgo 幂等（不推倒重建）', /el\.querySelector\('\.ago'\)/.test(pj));
  chk('秒数标 notranslate', /ago notranslate/.test(pj));
}

console.log('==== 七之二、原油开休市判断（本次新增）====');
{
  const pj = fs.readFileSync(ROOT + '/src/pages.js','utf8');
  chk('详情页按品种绑定时区（布伦特伦敦 / WTI 纽约）',
      /var TZ=\(KIND==='wti'\)\?'America\/New_York':'Europe\/London'/.test(pj));
  chk('首页三卡各自绑定时区', /oil\.tz='Europe\/London'/.test(pj) && /wti\.tz='America\/New_York'/.test(pj));
  chk('用 IANA 时区名（不写死 UTC 偏移）',
      pj.includes("timeZone:tz") && !/UTC[+-]\d/.test(pj.slice(pj.indexOf('function mktOpen'))));
  /* ★ 休市定格规则（曾写反过）：休市【也要抓一次】拿收盘价，之后不再轮询。
   *   若改成"休市就不抓"，首页会用 /api/oil-live 的值、详情页留服务端值（3号），
   *   两个页面数字不一致 —— 用户实测到 110.56 vs 114.19。 */
  chk('休市也抓一次（拿收盘价，不是不抓）', !/if\(!mktOpen\(TZ\)\)\{ state='closed'/.test(pj));
  chk('详情页：休市降级为 5 分钟复查（不是完全不查）',
      /if\(effOpen\(\) \|\| Date\.now\(\)-lastTryAt>300000\)/.test(pj));
  chk('首页：休市腿降级为 5 分钟复查', /now-oil\.lastTryAt>300000/.test(pj));
  chk('两腿独立判断（各自调 effOpen，不共用状态）',
      /oil\.state=effOpen\(oil\)\?'live':'closed'/.test(pj) &&
      /wti\.state=effOpen\(wti\)\?'live':'closed'/.test(pj));
  /* ★★ 实测覆盖层：排程只是参考，价格有没有在动才是真相 */
  chk('★ 已加实测覆盖层 effOpen（首页）', /function effOpen\(it\)\{/.test(pj));
  chk('★ 已加实测覆盖层 effOpen（详情页）', pj.includes('function effOpen(){'));
  chk('★ 状态改由实测值决定，不再直接用 mktOpen',
      !/oil\.state=mktOpen\(oil\.tz\)/.test(pj) && !/lastOk=Date\.now\(\); state=mktOpen\(TZ\)/.test(pj));
  /* ★ h24 bug：hour12:false 在 en-US 下午夜返回 24，会导致时段判断错乱 */
  chk('★ 已修 h24 午夜 bug（改用 hourCycle h23）',
      pj.includes("hourCycle:'h23'") && !/hour:'2-digit',hour12:false/.test(pj));
  chk('休市/断线也幂等（不每秒重写 DOM）',
      /state==='closed'\)\{ chip\.classList\.add\('is-lost'\); setNote\(true\);\s*\n?\s*if\(chip\.textContent!==T\.closed\)/.test(pj));
  chk('两页都有休市说明元素', (pj.match(/id="oil-closed-note"/g)||[]).length === 2);
  /* 七语都要有原油休市说明 */
  const ib = fs.readFileSync(ROOT + '/src/i18n.js','utf8');
  chk('七语都有 oilClosedNote', (ib.match(/oilClosedNote:/g)||[]).length === 7);
  for (const lg of ['zh','en','ja','es','fr','de','pt']) {
    const r = await get('/' + lg + '/oil/');
    chk(lg + ' 原油页含休市说明元素', r.body.includes('oil-closed-note'));
  }
  /* ★ 真实执行开休市判断：冻结时刻，验证状态 */
  const i2 = pj.indexOf('function mktOpen(tz){', pj.indexOf('var KIND='));
  const body = pj.slice(i2, pj.indexOf('\n  }', i2)+4);
  const mk = (tz) => new Function('tz', body.replace(/^function mktOpen\(tz\)\{/,'').replace(/\}$/,''))(tz);
  const RealDate = Date;
  const at = (iso) => {
    globalThis.Date = class extends RealDate {
      constructor(...a){ return a.length ? new RealDate(...a) : new RealDate(iso); }
      static now(){ return new RealDate(iso).getTime(); }
    };
  };
  at('2026-10-29T07:26:00+08:00');   // 当前：伦敦 23:26、纽约 19:26
  chk('当前时刻：布伦特休市（伦敦 23:00-01:00 结算）', mk('Europe/London') === false);
  chk('当前时刻：WTI 开市（纽约已过 17-18 休市）', mk('America/New_York') === true);
  at('2026-10-31T08:00:00+08:00');   // 周六
  chk('周六：布伦特休市', mk('Europe/London') === false);
  chk('周六：WTI 休市', mk('America/New_York') === false);
  at('2026-11-02T08:00:00+08:00');   // 周一，美国 11/1 已切冬令时
  chk('冬令时切换后仍能正确判断（WTI 周日 18:00 后开市）', mk('America/New_York') === true);
  globalThis.Date = RealDate;
}

console.log('==== 八、CF 专属配置====');
{
  const w = fs.readFileSync(ROOT + '/wrangler.toml','utf8');
  chk('worker 名 guoji-yuanyou', w.includes("name = 'guoji-yuanyou'"));
  chk('入口 src/index.js', w.includes('main = "src/index.js"'));
  chk('路由 you.piccalc.com/*', w.includes('you.piccalc.com/*'));
  chk('静态资源目录 ./public', w.includes('directory = "./public"'));
  const lines = w.split('\n');
  const grab = (k) => { let cur=null,out=[]; for(const l of lines){ const s=l.trim();
    if(s==='['+k+']'){cur=1;continue;} if(s.startsWith('[')&&s.endsWith(']')){cur=null;continue;}
    if(cur&&s.includes('=')&&!s.startsWith('#')) out.push(s.split('=')[0].trim()); } return out; };
  chk('vars 与 previews.vars 完全一致', JSON.stringify(grab('vars'))===JSON.stringify(grab('previews.vars')));
  for (const f of ['favicon.ico','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png',
                   'icon-128.png','og-image.png','og-v2.png','BingSiteAuth.xml'])
    chk('静态文件 ' + f + ' 已放入 public/', fs.existsSync(ROOT + '/public/' + f));
}
console.log('');
console.log('  通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
