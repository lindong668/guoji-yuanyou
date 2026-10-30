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
const KV_KEY = 'live:v1';
let liveCache = { at: 0, oil: null, gold: null };

/* ------------------------------------------------------------------
 * ★★★ 共享缓存（KV）—— 彻底解决"来回导航跳价"
 * --------------------------------------------------------------------
 * 问题：模块级 liveCache 是【每个 Worker 实例各自一份】。
 *   CF 会并行跑多个实例，用户点页面这次打到 A 实例、下次打到 B 实例，
 *   两份缓存各自刷新 → 来回导航时拿到不同值。模块级缓存治不了这个。
 *
 * 修法：把缓存写进 KV（所有实例共享同一份），读的时候统一从 KV 取。
 *   未绑定 KV 时【自动降级】为原来的模块级缓存 —— 开箱即用，不会报错。
 *
 * ★ 当前【未启用】：wrangler.toml 里 kv_namespaces 保持注释。
 *   否决理由：见 wrangler.toml 顶部说明 —— 省额度就得把刷新降到 3 分钟，
 *   那会把实时行情变成旧值，不划算。跨实例的一致性改由【前端锚定】解决
 *   （见 pages.js 的 ps_anchor_*），零额度消耗且更对症。
 *
 * 若将来启用（见 wrangler.toml 与 README）：
 *   npx wrangler kv:namespace create PRICESCOPE_CACHE
 *   把返回的 id 填进 wrangler.toml 的 [[kv_namespaces]]
 * ---------------------------------------------------------------- */
let KV = null;
function bindKV(env) { if (env && env.PRICESCOPE_CACHE) KV = env.PRICESCOPE_CACHE; }

async function kvGet() {
  if (!KV) return null;
  try {
    const raw = await KV.get(KV_KEY, { type: 'json' });
    if (!raw || !raw.at) return null;
    /* ★ 与 liveOverlay 同一周期，别再用 15 秒判断（否则 KV 永远算过期，
     *   每次都重抓 → 写入次数翻几十倍，额度瞬间耗尽） */
    if (Date.now() - raw.at >= KV_SHARE_TTL) return null;   /* 已过期 */
    return raw;
  } catch (e) { return null; }
}
async function kvPut(v) {
  if (!KV) return;
  /* expirationTtl 以秒计：比共享周期多留一倍余量，
     避免"刚好过期但还没人重写"的空窗（读到 null 会各自重抓，又不一致了） */
  try { await KV.put(KV_KEY, JSON.stringify(v),
        { expirationTtl: Math.ceil(KV_SHARE_TTL/1000) * 2 }); } catch (e) {}
}

/* ------------------------------------------------------------------
 * ★ 共享缓存的有效期 = 全局刷新频率 = KV 写入频率（重要！）
 * --------------------------------------------------------------------
 * 额度账（Workers KV 免费版：1,000 次写入/天，按账号算、所有 namespace 合计）：
 *
 *   15 秒 → 5,760 次/天   ✗ 必爆
 *   60 秒 → 1,440 次/天   ✗ 爆
 *  120 秒 →   720 次/天   △ 偏紧
 *  180 秒 →   480 次/天   ★ 默认（与 3 号黄金同频）
 *  300 秒 →   288 次/天   ○ 省，但页面 5 分钟才变一次
 *
 * 注意：3 号自己也在写同一份额度（黄金每 3 分钟写 2 个 key ≈ 960 次/天），
 * 所以 2 号必须省着用。想更实时就调小这个值，或升级 Workers 付费版。
 * ---------------------------------------------------------------- */
const KV_SHARE_TTL = 180000;   /* 3 分钟 —— 想更实时可改小，注意额度 */

/* ★ 服务端渲染的"耐心上限"：为取实时价最多等这么久（毫秒）。
 *
 * 为什么必须有：
 *   手机把浏览器挂后台很久再回来刷新，往往会打到一个【冷实例】——
 *   实例内存缓存已空、共享缓存也没绑定，服务端必须把 8 个原油源 +
 *   7 个黄金源依次跑一遍。实测（所有源都慢到超时时）TTFB 高达 24.5 秒。
 *   这期间浏览器一直转圈，Safari 最终报「连接错误 / 白屏」，
 *   而网络其实是好的 —— 用户会以为站挂了。
 *
 * 加了预算之后：
 *   超过上限就先用【旧值】（哪怕过期几分钟）把页面渲染出来，页面立刻可见；
 *   抓取在后台继续跑完并写进缓存，下一次刷新就是新价。
 *   页面永远出得来，比"等 24 秒然后白屏"好得多。
 *
 * 2.5 秒的取舍：够第一个源（券商 MT5，实测通常 300~800ms）跑完拿到价，
 *   又不至于让谷歌爬虫或用户干等。想更快可改小，但太小会经常拿不到价。 */
const SSR_LIVE_BUDGET = 2500;

/* 接口轮询（/api/oil-live、/api/gold-live）用的预算：8 秒。
 * 与页面渲染不同 —— 接口没人干等（前端只是这一拍拿不到，下一拍再来），
 * 所以给它更长时间，更可能【真的抓到价】而不是退回旧值。
 * 页面渲染仍用 2.5 秒，因为浏览器在等，快最重要。 */
const API_LIVE_BUDGET = 8000;

/* ------------------------------------------------------------------
 * ★★★★ 并发闸门 —— 防止"访问量一大就把 KV 写爆"
 * --------------------------------------------------------------------
 * 危险（已实测，见 bursttest.mjs）：
 *   缓存过期的瞬间，如果同时来了 N 个请求，【每个都会认为该自己刷新】，
 *   于是 N 次抓取 + N 次 KV 写入。实测 50 并发 = 50 次写入。
 *   访问量一大，480 次/天会变成几千次/天，额度瞬间耗尽。
 *
 * 两道闸门：
 *   ① 单飞（inflight）：同一实例内并发请求【共享同一次抓取】，不重复抓。
 *   ② 写入前二次确认（double-check）：抓完准备写 KV 时，再看一眼 KV ——
 *      若别人已经写了更新的，就【丢弃自己的、采用别人的】，不写第二次。
 *      这样即使跨实例撞车，实际落盘次数也接近 1。
 * ---------------------------------------------------------------- */
let inflight = null;

async function liveOverlay(budgetMs = SSR_LIVE_BUDGET) {
  const now = Date.now();
  /* 有效期：有 KV 时用共享周期，没 KV 时用原来的 15 秒 */
  const ttl = KV ? KV_SHARE_TTL : LIVE_TTL;
  /* ① 先看本实例内存（最快） */
  if (liveCache.at && now - liveCache.at < ttl) return liveCache;
  /* ② 再看共享 KV —— 别的实例刚抓过就直接复用，避免重复抓导致数值不同 */
  const shared = await kvGet();
  if (shared && (shared.oil || shared.gold)) {
    liveCache = shared;   /* ★ 保留 shared.at（真实抓取时刻），否则永远不更新 */
    return liveCache;
  }
  /* ③ 闸门①：本实例已有刷新在跑 → 共享同一次抓取，不重复抓 */
  if (!inflight) {
    inflight = doRefresh(now);
    /* 跑完就清空闸门；catch 防止 rejection 没人接变成 unhandled */
    inflight.then(() => { inflight = null; }, () => { inflight = null; });
  }
  /* ★ 预算：服务端最多为取价等 budgetMs 毫秒。
   *   超时就先拿旧值（哪怕已过期）把页面渲染出来 —— 页面永远出得来；
   *   抓取在后台跑完会写进 liveCache，用户下一次刷新就是新值。
   *   没有这道预算时，冷实例 + 全部源慢 = 实测 TTFB 24.5 秒，
   *   手机浏览器会一直转圈，最后报"连接错误 / 白屏"。 */
  const res = await Promise.race([
    inflight.catch(() => null),
    new Promise(r => setTimeout(() => r('__BUDGET__'), budgetMs)),
  ]);
  /* ★★ 绝不返回 null —— 调用方写的是 (await liveOverlay()).oil，
   *   返回 null 会当场 TypeError → 接口 500 → 前端显示"连接中断"。
   *   预算到点或抓取失败时，一律退回 liveCache（哪怕是空的 {oil:null}），
   *   由调用方 .oil || {} 兜底，绝不抛异常。 */
  if (res === '__BUDGET__') return liveCache;
  return res || liveCache;
}

/* 原油兜底：自己的源全失败时，回落到 3 号 /data（只读 KV，不消耗配额）。
 * 黄金前端已有浏览器直连兜底，所以这里只需要补原油。 */
async function oilFallback() {
  try {
    const m = await getMarket();
    const b = m && m.oil && +m.oil.price || 0;
    const w = m && m.wti && +m.wti.price || 0;
    if (b || w) {
      return {
        brent: b, wti: w,
        provider: 'site3',
        providerLabel: '3号后端（自有源全部失败时兜底）',
        stale: true,
      };
    }
  } catch (e) { /* 3 号也挂了就返回 null，由调用方保留旧值 */ }
  return null;
}

async function doRefresh(now) {
  /* 都没有才真的去抓 */
  const [o, g] = await Promise.all([
    getOilLive().catch(() => null),
    getGoldLive().catch(() => null),
  ]);
  /* 原油：自有源全失败 → 回落到 3 号（黄金前端有浏览器直连兜底，不需要） */
  let oilVal = (o && (o.brent || o.wti)) ? o : liveCache.oil;
  if (!oilVal || (!oilVal.brent && !oilVal.wti)) {
    oilVal = (await oilFallback()) || liveCache.oil;
  }
  /* ★ 补齐缺口：本次只拿到其中一种原油时，另一种【沿用上一次的值】，
   *   绝不让 brent/wti 变成 0 —— 0 会让前端判定"取数失败"，
   *   表现就是布伦特那一格迟迟不更新、甚至显示连接中断。 */
  if (oilVal && (o && (o.brent || o.wti))) {
    const prev = liveCache.oil || {};
    const nb = +oilVal.brent || 0, nw = +oilVal.wti || 0;
    if (!nb || !nw) {
      oilVal = { ...oilVal,
                 brent: nb || +prev.brent || 0,
                 wti:   nw || +prev.wti   || 0 };
    }
  }
  const mine = {
    at: Date.now(),
    oil: oilVal,
    gold: (g && g.usdOz && !g.stale) ? g : liveCache.gold,
  };
  /* ④ 闸门②：写之前再确认一次 —— 别人已经写了更新的就采用别人的 */
  const fresh = await kvGet();
  if (fresh && fresh.at && fresh.at > mine.at - 1000 && (fresh.oil || fresh.gold)) {
    liveCache = fresh;      /* 用别人的，保证所有实例同一份 */
    return liveCache;
  }
  liveCache = mine;
  await kvPut(liveCache);   /* 写回共享缓存，让其它实例也用同一份 */
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

/* ==================================================================
 * ★★★ 服务端独立判定休市（Cron 每 10 分钟）—— 不依赖用户是否打开页面
 * ------------------------------------------------------------------
 * 解决的问题：前端只能从「用户打开页面」那一刻起才开始观察，于是周末
 *   打开必须自己等满 15 分钟才敢显示休市中。服务端 Cron 一直在跑，
 *   休市 15 分钟后就已记下状态，任何人任何时刻打开都【立刻】显示。
 *
 * ★ 省额度关键：只在【价格变了】或【状态翻转】时才写 KV。
 *   休市期间价格不动 → 一次都不写（周末接近 0 次）。
 *   这与上面那个「共享实时缓存」是两回事，后者 15 秒写一次必爆额度。
 *
 * MKT_FREEZE_MS 必须与 pages.js 里的 CLOSED_MS 保持一致（20 分钟）。
 * 为什么是 20 而不是 15：Cron 每 10 分钟一跑，判定只能落在 10/20/30 整点。
 *   15 与 20 都在第 2 次（20 分钟）判出，速度完全一样，但 20 多 5 分钟容错。
 *   再往上（25/30）就要等第 3 次 = 30 分钟，慢 10 分钟，不划算。
 * ================================================================= */
const MKT_KEY = 'ps2_market_state';
const MKT_FREEZE_MS = 1200000;     /* 价格冻结 20 分钟才判休市 */

function mktKV(env) { return (env && env.MKT_STATE_KV) ? env.MKT_STATE_KV : null; }

/* 判定单个品种：喂进新价，返回 { v 上次价, mv 上次变动时刻, st 状态 } */
function mktStep(prev, v) {
  const now = Date.now();
  if (!(v > 0)) return prev || null;            /* 抓不到价：维持原状态 */
  const p = (prev && prev.v) ? prev : { v: null, mv: now, st: 'live' };
  if (p.v == null || Math.abs(v - p.v) > 1e-9) return { v: v, mv: now, st: 'live' };
  const frozen = now - (p.mv || now);
  return { v: p.v, mv: p.mv, st: frozen >= MKT_FREEZE_MS ? 'closed' : 'live' };
}

/* 只有「价变了」或「状态翻转」才值得写一次 KV */
function mktNeedWrite(prev, next) {
  if (!next) return false;
  if (!prev) return true;
  if (prev.st !== next.st) return true;
  return Math.abs((prev.v || 0) - (next.v || 0)) > 1e-9;
}

async function mktRead(env) {
  const kv = mktKV(env); if (!kv) return null;
  try { return await kv.get(MKT_KEY, { type: 'json' }); } catch (e) { return null; }
}
async function mktWrite(env, obj) {
  const kv = mktKV(env); if (!kv) return;
  try { await kv.put(MKT_KEY, JSON.stringify(obj)); } catch (e) {}
}

/* Cron 主体：抓一次价 → 判定 → 必要时才写 */
/* SSR 注入：把服务端已确认的休市状态直接写进 HTML。
 * 为什么需要：前端 srvLoad() 是异步 fetch，首屏 paint 时还没回来，
 *   周末用户会先看到「实时」再闪成「休市中」。写进 HTML 就零闪烁。 */
async function mktInject(env) {
  const kv = mktKV(env); if (!kv) return '';
  const s = await mktRead(env);
  if (!s) return '';
  const o = { brent: (s.brent && s.brent.st) || null,
              wti:   (s.wti   && s.wti.st)   || null,
              gold:  (s.gold  && s.gold.st)  || null };
  return '<script type="application/json" id="ps-mkt">'
       + JSON.stringify(o).replace(/</g, '\\u003c')
       + '<\/script>';
}

async function mktTick(env, grab) {
  const kv = mktKV(env); if (!kv) return null;
  const oilFn  = (grab && grab.oil)  || getOilLive;
  const goldFn = (grab && grab.gold) || getGoldLive;
  const [oil, gold] = await Promise.all([
    oilFn().catch(() => null),
    goldFn().catch(() => null),
  ]);
  const prev = (await mktRead(env)) || {};
  const next = {
    at: Date.now(),
    brent: mktStep(prev.brent, oil && oil.brent),
    wti:   mktStep(prev.wti,   oil && oil.wti),
    gold:  mktStep(prev.gold,  gold && gold.usdOz),
  };
  const need = ['brent', 'wti', 'gold'].some(k => mktNeedWrite(prev[k], next[k]));
  if (need) await mktWrite(env, next);
  return next;
}

export { MKT_FREEZE_MS, mktStep, mktNeedWrite, mktTick, mktRead };

export default {
  /* Cron：每 10 分钟独立判定一次休市并记进 KV（不依赖用户打开页面） */
  async scheduled(controller, env, ctx) {
    try { await mktTick(env); } catch (e) { /* Cron 失败不影响站点 */ }
  },
  async fetch(request, env, ctx) {
    bindKV(env);          /* ★ 绑定 KV（未配置则自动降级为模块级缓存） */
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
      /* ★ 屏蔽 /api/ 与 /probe 的理由（收录 + AdSense 相关）：
       *   /api/*  是给前端 JS 取实时价的 JSON 接口，不是给人看的页面。
       *          让它被抓取只会白白消耗抓取预算，还可能被当成"空内容页"。
       *          ★ 关键：屏蔽它【不影响收录】，因为价格是服务端渲染进 HTML 的，
       *            爬虫不看 JS 也能拿到真实价格。
       *   /probe  是早期遗留的数据源调试面板，会列出每个源的成败耗时，
       *          属于内部工具页。被抓到会显得站点像半成品，对 AdSense 审核不利。
       *   ★ ads.txt / sitemap.xml / BingSiteAuth / google 验证文件全部保持放行 ——
       *     AdSense 必须能抓 ads.txt，否则会影响广告投放。
       *   ★ Disallow 只管爬虫，真实浏览器完全不受影响，实时跳动照常。 */
      const DENY = `Disallow: /api/
Disallow: /probe
`;
      const body = `User-agent: Mediapartners-Google
Allow: /
${DENY}
User-agent: Googlebot
Allow: /
${DENY}
User-agent: Bingbot
Allow: /
${DENY}
# Applebot：支撑 Spotlight / Siri / Safari 搜索
# （若 robots 未提 Applebot，它会沿用 Googlebot 的规则；显式声明更稳妥）
User-agent: Applebot
Allow: /
${DENY}
# AI 搜索爬虫：允许抓取，让内容可被 AI 回答引用
User-agent: GPTBot
Allow: /
${DENY}
User-agent: ChatGPT-User
Allow: /
${DENY}
User-agent: ClaudeBot
Allow: /
${DENY}
User-agent: PerplexityBot
Allow: /
${DENY}
User-agent: *
Allow: /
${DENY}
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
      let html = renderHome(langR, applyLive(mR, lvR), fxR, tz);
      /* ★ 首屏零闪烁：与 render() 同款注入（这个分支不走 render 包装） */
      try {
        const inj = await mktInject(env);
        if (inj && html.indexOf('</head>') > 0) html = html.replace('</head>', inj + '</head>');
      } catch (e) {}
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

    /* ★ 服务端 Cron 判定的休市状态。前端首屏读一次，若服务端早已确认休市，
     *   就【立刻】显示休市中，不必自己从零等满 15 分钟（这是周末体验的关键）。 */
    if (url.pathname === '/api/market-state') {
      const s = (await mktRead(env)) || {};
      return Response.json({
        ok: true,
        at: s.at || 0,
        brent: (s.brent && s.brent.st) || null,
        wti:   (s.wti   && s.wti.st)   || null,
        gold:  (s.gold  && s.gold.st)  || null,
        hasKV: !!mktKV(env),
      }, { headers: { 'cache-control': 'public, max-age=60' } });
    }

    /* ★ A22：黄金现抓代理
     * 前端实时链路全挂时调用。密钥只在服务端出现，前端页面源码里没有。
     * 同源（/api/...），因此没有 CORS 问题。 */
    if (url.pathname === '/api/gold-live') {
      const order = (url.searchParams.get('src') || '').split(',').filter(Boolean);
      /* ★★ deep 兜底（★ 前端两条路都断了之后的第三条路）
       *
       * 背景：服务端在 CF 海外节点出网，能连的源比浏览器多。
       *   但服务端结果有 15 秒缓存；若缓存那一拍恰好全挂，返回的 priceUsdPerOz=0，
       *   前端就只能【浏览器直连】国外源 —— 国内访问常常连不上 → 一直"连接中断"。
       *   这就是"服务端明明拿得到、页面却一直断"的兜底缺口。
       *
       * ?deep=1 的作用：绕开 15 秒缓存，让服务端【立刻重新遍历全部 7 个源】
       *   （含最后的 3 号兜底）。只在前端两条路都失败时才调用，频率极低。
       *   3 号那头已有 60 秒缓存 + 每日真抓上限，不会被放大。 */
      const deep = url.searchParams.get('deep') === '1';
      /* ★★ 根因修复：原来这里【直接调 getGoldLive()，绕过 15 秒缓存】，
       *   于是 SSR（走缓存）与前端轮询（现抓）取到的不是同一份值 ——
       *   用户看到"点进去一个数、点出来又一个数"。
       *   现在：不带 ?src= 时统一走 liveOverlay()（与 SSR 同一份缓存）；
       *   只有探针显式指定 ?src= 才绕过缓存直连（那是排查用的，要新鲜值）。 */
      const r = (order.length || deep) ? await getGoldLive(order)
                             : (await liveOverlay(API_LIVE_BUDGET)).gold || {};
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
        deep: deep ? true : undefined,
      }, { headers: { 'cache-control': 'no-store' } });
    }

    /* ★ Vercel 测试版：原油实时价接口
     * 服务端逐个尝试 OIL_PROVIDERS，拿到就停。
     * 同源调用，无 CORS 问题；结果不缓存，保证每次都是新的。 */
    if (url.pathname === '/api/oil-live') {
      const order = (url.searchParams.get('src') || '').split(',').filter(Boolean);
      /* ★★ 同上：不带 ?src= 时走 liveOverlay()，保证与 SSR 同一份值 */
      const r = order.length ? await getOilLive(order)
                             : (await liveOverlay(API_LIVE_BUDGET)).oil || {};
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
      let html = fn(lang, { m: applyLive(m, lv), fx }, tz);
      /* ★ 首屏零闪烁：服务端已确认的休市状态直接写进 HTML */
      try {
        const inj = await mktInject(env);
        if (inj && html.indexOf('</head>') > 0) html = html.replace('</head>', inj + '</head>');
      } catch (e) { /* 注入失败不影响页面 */ }
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
