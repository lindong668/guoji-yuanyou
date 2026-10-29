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
  chk('★ 详情页按全局节拍 15 秒一抓（不节流）', /setInterval\(pull,BEAT\)/.test(pj));
  /* 现在两腿各自按自己的探测进度判断（互不共用），比原来各自调 effOpen 更严 */
  chk('两腿独立判断（各自按自己的探测进度，不共用状态）',
      /probeDone\('brent',OIL_ROUNDS\)/.test(pj) && /probeDone\('wti',OIL_ROUNDS\)/.test(pj));
  /* ★★★ 开休市判定 = 三规则（抗抖动最终版） */
  chk('★ 已加实测覆盖层 effOpen（首页）', /function effOpen\(it\)\{/.test(pj));
  chk('★ 已加实测覆盖层 effOpen（详情页）', pj.includes('function effOpen(){'));
  chk('★ 状态改由 effOpen 决定，不再直接用 mktOpen',
      !/oil\.state=mktOpen\(oil\.tz\)/.test(pj) && !/lastOk=Date\.now\(\); state=mktOpen\(TZ\)/.test(pj));
  chk('★ 判定阈值为 2 分钟（用户拍板：连抓几轮不动即休市）',
      /MOVE_MS=120000/.test(pj));
  chk('★ 判定只看「价格有没有在动」，不再依赖交易所排程',
      /return \(Date\.now\(\)-it\.lastMoveAt\) < MOVE_MS;/.test(pj));
  chk('★ 首次取到值也记时刻（否则冻结永远判不出来）',
      /if\(it\.lastVal==null\)\{ it\.lastVal=v; it\.lastMoveAt=Date\.now\(\); return; \}/.test(pj));
  /* ★★ 根因修复：/api 必须走同一份缓存，否则 SSR 与前端轮询取到不同值 */
  const ij = fs.readFileSync(ROOT + '/src/index.js', 'utf8');
  const wt = fs.readFileSync(ROOT + '/wrangler.toml', 'utf8');
  chk('★★ /api/oil-live 走 liveOverlay 缓存（不再绕过缓存直连）',
      ij.includes('liveOverlay()).oil'));
  chk('★★ /api/gold-live 走 liveOverlay 缓存',
      ij.includes('liveOverlay()).gold'));
  chk('★★ 探针带 ?src= 时仍绕过缓存（排查要新鲜值）',
      /order\.length \? await getOilLive\(order\)/.test(ij) &&
      /order\.length \? await getGoldLive\(order\)/.test(ij));
  /* ★★★ 来回导航一致性：黄金前端必须优先走接口缓存，不能直连外部源 */
  chk('★★★ 首页黄金优先走 /api/gold-live（不再直连外部源）',
      /function pullGold\(\)\{[\s\S]{0,500}fetch\('\/api\/gold-live'/.test(pj));
  chk('★★★ 黄金详情页 pass 先走锚定/接口、失败才直连',
      /function pass\(cb\)\{[\s\S]{0,400}passDirect\(cb\)/.test(pj));
  chk('★★★ 直连降级为兜底函数（goldDirect / passDirect）',
      /function goldDirect\(\)\{/.test(pj) && /function passDirect\(cb\)\{/.test(pj));
  chk('★★★ askBackend 支持回调（供 pass 判断是否成功）',
      /function askBackend\(cb\)\{/.test(pj) && /if\(cb\) cb\(true\)/.test(pj));
  /* ★★★★ 共享缓存 KV：解决跨实例跳价（原油/黄金都靠它） */
  chk('★★★★ 已接入共享缓存 KV（kvGet/kvPut）',
      ij.includes('async function kvGet()') && ij.includes('async function kvPut(v)'));
  chk('★★★★ liveOverlay 优先读共享缓存，命中就不再抓',
      /const shared = await kvGet\(\);[\s\S]{0,200}return liveCache;/.test(ij));
  chk('★★★★ 抓完写回共享缓存，让其它实例复用',
      /await kvPut\(liveCache\);/.test(ij));
  chk('★★★★ 未绑定 KV 时自动降级（bindKV 判空，不报错）',
      /function bindKV\(env\) \{ if \(env && env\.PRICESCOPE_CACHE\)/.test(ij));
  chk('★★★★ 入口已绑定 KV', /bindKV\(env\);/.test(ij));
  chk('★★★★ wrangler.toml 未启用 KV（保持注释，避免误开导致数据变旧）',
      wt.includes('# [[kv_namespaces]]') && !/\n\[\[kv_namespaces\]\]/.test(wt));
  chk('★★★★ wrangler.toml 写有 KV 否决理由（防止后来人误启用）',
      wt.includes('已否决'));
  /* ★ 额度：15 秒写一次 = 5760 次/天，必爆免费额度 1000/天 */
  chk('★★★★ 共享周期已放宽（不再是 15 秒，否则 KV 写入必爆额度）',
      /const KV_SHARE_TTL = (\d+);/.test(ij) &&
      +ij.match(/const KV_SHARE_TTL = (\d+);/)[1] > 15000);
  chk('★★★★ KV 过期判断用同一周期（否则每次都重抓，写入翻倍）',
      /raw\.at >= KV_SHARE_TTL/.test(ij));
  /* ★★★★★ 并发闸门：防止访问量一大就把 KV 写爆（实测 50 并发曾 = 50 次写入） */
  chk('★★★★★ 单飞闸门：本实例已有刷新在跑则共享（不重复抓）',
      ij.includes('let inflight = null;') && /if \(inflight\) return inflight;/.test(ij));
  chk('★★★★★ 单飞用 try/finally 释放（异常时不会永久卡死）',
      /try \{ return await inflight; \} finally \{ inflight = null; \}/.test(ij));
  chk('★★★★★ 写入前二次确认：别人已写更新则采用别人的、不写第二次',
      ij.includes('async function doRefresh(') && /const fresh = await kvGet\(\);/.test(ij)
      && /if \(fresh && fresh\.at[\s\S]{0,120}return liveCache;/.test(ij));
  chk('★★★★★ 抓取逻辑已抽到 doRefresh（liveOverlay 只做闸门）',
      ij.includes('inflight = doRefresh(now);'));
  /* ★★★★★ 行情节拍快照：锚点与节拍合并后的统一机制 */
  chk('★★★★★ 用统一快照 ps_tick_*（不再有独立的 ps_anchor / ps_beat）',
      pj.includes("function tKey(k){ return 'ps_tick_'+k; }")
      && !pj.includes('ps_anchor') && !pj.includes("'ps_beat'"));
  chk('★★★★★ 节拍周期统一 15000ms（三处：首页/原油页/黄金页）',
      (pj.match(/var BEAT=15000;/g) || []).length === 3);
  chk('★★★★★ 首页沿用快照时不发请求',
      /function pullOil\(\)\{[\s\S]{0,900}var d=oilDelay\(\);[\s\S]{0,400}return;/.test(pj));
  chk('★★★★★ 首页不再用 effOpen 直接判休市（改为 stOf 探测确认）',
      /oil\.state=stOf\(oil\)/.test(pj) && /wti\.state=stOf\(wti\)/.test(pj));
  chk('★★★★★ 探测参数：每源 3 次、原油 3 轮、黄金 6 轮、冻结 4 拍才启动',
      pj.includes('var PGAP=3000, PPER=3, PSTILL=4') && pj.includes('OIL_ROUNDS=3, GOLD_ROUNDS=6'));
  chk('★★★★★ 连接中断不能随便显示：跑完第一整圈（r>=1）才允许',
      /st\.r>=rounds\)\?'closed':\(st\.r>=1\?'probing':'live'\)/.test(pj)
      || /st\.r>=ROUNDS\)\?'closed':\(\(needProbe\(\)&&st\.r>=1\)\?'probing':'live'\)/.test(pj));
  chk('★★★★★ 三个页面都注册了探测心跳 3000ms',
      (pj.match(/setInterval\((probeTick|probeTick),PGAP\)/g)||[]).length>=2
      || /setInterval\(probeTick,PGAP\)/.test(pj));
  chk('★★★★★ 黄金页沿用快照时不发请求', /tDelay\(\)>0&&a&&a\.v/.test(pj));
  chk('★★★★★ 原油详情页按 brent/wti 分 key',
      pj.includes("var AK=(KIND==='wti')?'wti':'brent';"));
  chk('★★★★★ 启动逻辑不在 fetch 完成前算 d0（避免 setTimeout(fn,0) 重复抓）',
      /if\(oilDelay\(\)>0\)\{[\s\S]{0,120}\}else\{[\s\S]{0,60}setInterval\(cycle,BEAT\)/.test(pj));

  chk('★ 无条件 15 秒一抓（不再节流，否则观察不到变动）',
      /pullOil\(\);/.test(pj) && /setInterval\(pull,BEAT\)/.test(pj));
  /* 卡片上的「更新于 08:05」已去掉（已有实时徽标，多余且误导）；
     国内油价与汇率的日期保留 —— 那是按天更新的数据，日期有实际意义 */
  chk('★ 布伦特卡片不再显示更新时间', !/updatedLine\(lang, m\?\.oil\?\.updated/.test(pj));
  chk('★ WTI 卡片不再显示更新时间', !/updatedLine\(lang, m\?\.wti\?\.updated/.test(pj));
  chk('国内油价/汇率的日期保留（按天更新，日期有意义）',
      /updatedLine\(lang, m\?\.cnOil\?\.updated/.test(pj));
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
