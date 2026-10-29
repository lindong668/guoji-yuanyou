/* ★★★ 服务端 Cron 独立判定休市 —— 行为测试
 *
 * 针对用户提出的痛点：
 *   周末用户打开页面，前端只能从「打开那一刻」开始观察，
 *   必须自己等满 15 分钟才敢显示休市中 —— 体验很差。
 *
 * 本测试验证：
 *   ① 服务端 Cron 自己抓价、自己判定，不依赖用户是否打开页面
 *   ② 休市确认后写进 KV，之后任何人打开都【立刻】显示休市中
 *   ③ 省额度：只在「价格变了」或「状态翻转」时才写 KV
 *      休市期间价格不动 → 一次都不写（周末近 0 次）
 *   ④ 开市：一旦抓到新价立刻翻回 live
 */
import { MKT_FREEZE_MS, mktStep, mktNeedWrite, mktTick } from './src/index.js';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : (fail++, console.log('  NG  ✗ ' + n)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---- 可控时钟 ---- */
const RealDate = Date;
let NOW = new RealDate('2026-10-31T09:00:00+08:00').getTime();  /* 周六上午 */
Date.now = () => NOW;
const advance = ms => { NOW += ms; };

/* ---- 内存版 KV，统计写入次数 ---- */
function mkKV() {
  const m = new Map();
  return {
    puts: 0,
    async get(k, o) {
      const v = m.get(k);
      if (v == null) return null;
      try { return JSON.parse(v); } catch (e) { return null; }
    },
    async put(k, v) { this.puts++; m.set(k, v); },
  };
}

console.log('=== 配置核对 ===');
ok('★ 冻结门槛 = 20 分钟（与前端 CLOSED_MS 一致）', MKT_FREEZE_MS === 1200000);

console.log('\n测试1  ★ 纯函数 mktStep：价格变动 / 冻结判定');
{
  const t0 = NOW;
  let s = mktStep(null, 110.50);
  ok('★ 首次拿到价 → live', s.st === 'live');
  ok('★ 首次记录 mv = 现在', s.mv === t0);

  advance(600000);                      /* 10 分钟后，价格没变 */
  let s2 = mktStep(s, 110.50);
  ok('★ 冻结 10 分钟（<20）→ 仍 live', s2.st === 'live');

  advance(480000);                      /* 累计 18 分钟 */
  let s2b = mktStep(s2, 110.50);
  ok('★★ 冻结 18 分钟（差一点）→ 仍 live', s2b.st === 'live');

  advance(120000);                      /* 累计 20 分钟 */
  let s3 = mktStep(s2b, 110.50);
  ok('★★★ 冻结满 20 分钟 → closed', s3.st === 'closed');

  let s4 = mktStep(s3, 110.80);         /* 价格动了 */
  ok('★★★ 抓到新价 → 立刻翻回 live', s4.st === 'live');
  ok('★ 变动后 mv 更新为现在', s4.mv === NOW);
}

console.log('\n测试2  ★★ 省额度：只在必要时写 KV');
{
  const kv = mkKV();
  const env = { MKT_STATE_KV: kv };
  let price = 110.50;
  const grab = {
    oil: async () => ({ brent: price, wti: 101.20 }),
    gold: async () => ({ usdOz: 4030.00 }),
  };
  await mktTick(env, grab);             /* 第 1 次：初始写入 */
  const after1 = kv.puts;
  ok('★ 首次写入 1 次', after1 === 1);

  /* 价格一直不动，连跑 3 次 Cron（累计 30 分钟） */
  advance(600000); await mktTick(env, grab);
  advance(600000); await mktTick(env, grab);
  advance(600000); await mktTick(env, grab);
  console.log('   价格不动连跑 4 次 Cron，累计写入 = ' + kv.puts + ' 次');
  ok('★★★ 冻结期间「未翻转」不重复写（只写翻转那 1 次）',
     kv.puts - after1 <= 1);

  /* 休市已确认后再跑，应该一次都不写 */
  const beforeIdle = kv.puts;
  for (let i = 0; i < 5; i++) { advance(600000); await mktTick(env, grab); }
  console.log('   休市确认后再跑 5 次 Cron，新增写入 = ' + (kv.puts - beforeIdle) + ' 次');
  ok('★★★★★ 休市期间价格不动 → 一次都不写（周末近 0 消耗）',
     kv.puts === beforeIdle);

  /* 价格动了 → 应该写 */
  price = 110.90;
  await mktTick(env, grab);
  ok('★★★ 价格变动 → 写入 1 次', kv.puts === beforeIdle + 1);
}

console.log('\n测试3  ★★★★ 周末场景：Cron 提前判定，用户打开立刻显示休市');
{
  const kv = mkKV();
  const env = { MKT_STATE_KV: kv };
  let price = 110.50;
  const grab = {
    oil: async () => ({ brent: price, wti: 101.20 }),
    gold: async () => ({ usdOz: 4030.00 }),
  };
  /* 周五收盘后价格冻结，Cron 每 10 分钟跑一次 */
  await mktTick(env, grab);             /* T+0   初始 */
  advance(600000); await mktTick(env, grab);   /* T+10 */
  advance(600000); await mktTick(env, grab);   /* T+20 → 冻结 20 分钟 ≥15 → closed */
  const st1 = await kv.get('ps2_market_state');
  console.log('   Cron 跑 3 轮后 服务端状态 = brent:' + (st1.brent && st1.brent.st));
  ok('★★★★★ 服务端 Cron 已独立判定为休市（用户还没打开页面）',
     st1.brent.st === 'closed');
  ok('★★★★★ WTI 同样判定休市', st1.wti.st === 'closed');
  ok('★★★★★ 黄金同样判定休市', st1.gold.st === 'closed');

  /* ★ 关键：此后过了 2 小时，用户才第一次打开页面 */
  advance(7200000);
  const st2 = await kv.get('ps2_market_state');
  ok('★★★★★ 2 小时后用户打开 → 服务端仍记着休市（立刻显示，不用等 15 分钟）',
     st2.brent.st === 'closed');
  console.log('   ★ 用户周六打开：服务端标记 = ' + st2.brent.st + ' → 立刻显示休市中');

  /* 周日晚上开市：价格动了 */
  price = 112.30;
  await mktTick(env, grab);
  const st3 = await kv.get('ps2_market_state');
  ok('★★★★★ 开市：抓到新价 → 服务端立刻翻回 live', st3.brent.st === 'live');
}

console.log('\n测试4  ★ 没绑 KV → 优雅降级，不报错');
{
  const env = {};
  let threw = false;
  try { await mktTick(env, { oil: async () => ({ brent: 1 }), gold: async () => ({}) }); }
  catch (e) { threw = true; }
  ok('★★★ 未绑定 KV 时不抛异常（自动降级）', !threw);
}

console.log('\n测试5  ★ 抓价失败 → 维持原状态，不误判休市');
{
  const kv = mkKV();
  const env = { MKT_STATE_KV: kv };
  await mktTick(env, { oil: async () => ({ brent: 110.5, wti: 101 }), gold: async () => ({ usdOz: 4000 }) });
  const before = await kv.get('ps2_market_state');
  /* 全部源挂掉 */
  await mktTick(env, { oil: async () => { throw new Error('down'); }, gold: async () => ({ usdOz: 0 }) });
  const after = await kv.get('ps2_market_state');
  ok('★★★★★ 抓价失败不把状态改成休市（那是断线，不是休市）',
     after.brent.st === before.brent.st);
}

console.log('\n测试6  ★★★ 防污染：服务端抓到的价格【绝不能】传到前端');
{
  /* 这是纯静态检查 —— 只在测试里跑，不进运行代码，零运行影响 */
  const fsp = await import('node:fs');
  const ij  = await fsp.promises.readFile('./src/index.js', 'utf8');
  const pg  = await fsp.promises.readFile('./src/pages.js', 'utf8');

  const m = /if \(url\.pathname === '\/api\/market-state'\)[\s\S]*?\n    \}/.exec(ij);
  ok('★ 能定位到 market-state 路由', !!m);
  const b = m ? m[0] : '';

  ok('★★ 返回体不含 .v（价格字段）',        !/\.v\b/.test(b));
  ok('★★ 不含 usdOz / priceUsd 等价格名',  !/usdOz|priceUsd|price:/.test(b));
  ok('★★★ 只回传状态字符串 st',
     /brent:\s*\(s\.brent\s*&&\s*s\.brent\.st\)/.test(b) &&
     /gold:\s*\(s\.gold\s*&&\s*s\.gold\.st\)/.test(b));

  /* ★ 反证：服务端内部确实存着价格 —— 说明是"故意不给"，不是"本来就没有"。
     少了这条，上面的检查可能只是因为压根没存价格而假绿。 */
  const kv = mkKV(); const env = { MKT_STATE_KV: kv };
  await mktTick(env, { oil: async () => ({ brent: 110.5, wti: 101.2 }),
                       gold: async () => ({ usdOz: 4030.0 }) });
  const stored = await kv.get('ps2_market_state');
  ok('★★★ 反证：服务端内部确实存着价格（是故意不外传）',
     stored && stored.brent && typeof stored.brent.v === 'number');
  ok('★★★ 反证：前端拿不到它（接口只发 st）', !/brent:\s*\(s\.brent\s*&&\s*s\.brent\.v\)/.test(b));

  /* 门槛一致性：服务端与前端必须同一个值，否则两边结论会打架 */
  const fm = /var CLOSED_MS=(\d+)/.exec(pg);
  ok('★★★★★ 前端 CLOSED_MS 与服务端 MKT_FREEZE_MS 一致',
     fm && +fm[1] === MKT_FREEZE_MS);
  const fok = /var CLOSED_OK=(\d+)/.exec(pg);
  ok('★★★★★ 前端 CLOSED_OK 与门槛匹配（CLOSED_OK × 15s = CLOSED_MS）',
     fok && +fok[1] * 15000 === MKT_FREEZE_MS);
}

Date.now = RealDate.now.bind(RealDate);
console.log('\n  通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
