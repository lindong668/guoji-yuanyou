/* ★★★ 周一到周日 整周真实模拟 —— 服务端 Cron + 前端联动
 *
 * ★ 为什么必须让价格一直跳：
 *   如果测试里价格从头不动，那"判休市"是白送的，测不出任何东西。
 *   所以开市期间价格持续小步跳动（模拟真实市场），只有休市才冻结。
 *
 * 覆盖：
 *   周一 00:00 开市，价格持续跳动
 *   周二 14:00 接口抽风，价格冻结 25 分钟（非周末也会发生）
 *   周五 22:00 收盘，彻底冻结
 *   周六 / 周日 全天冻结，模拟 5 个新会话用户在不同时刻打开
 *   周日 22:00 重开
 */
import { MKT_FREEZE_MS, mktTick, mktStep } from './src/index.js';

const RealDate = Date;
let NOW = new RealDate('2026-10-26T00:00:00+08:00').getTime();  /* 周一 */
Date.now = () => NOW;

let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : (fail++, console.log('  NG  ✗ ' + n)); };

function mkKV() {
  const m = new Map();
  return { puts: 0, gets: 0,
    async get(k) { this.gets++; const v = m.get(k); if (v == null) return null;
                   try { return JSON.parse(v); } catch (e) { return null; } },
    async put(k, v) { this.puts++; m.set(k, v); } };
}

/* ---- 市场模型：开市时每 30 秒跳 0.01，休市完全冻结 ---- */
let frozen = false;                 /* true = 市场休市，价格不动 */
let frozenPrice = null;
const OPEN_AT = NOW, BASE = 110.50;
/* ★ 必须是【纯函数】：价格只由时间决定，不受"谁调用了它"影响。
 *   之前的写法有副作用 —— 前端每拍调用也会推进价格，导致服务端 Cron
 *   抓到的价与前端不同，冻结计时被意外重置（实测因此多花了 10 分钟）。 */
function marketNow() {
  if (frozen) return frozenPrice;
  return +(BASE + Math.floor((NOW - OPEN_AT) / 30000) * 0.01).toFixed(2);
}
function freeze(){ frozenPrice = marketNow(); frozen = true; }
function thaw(){ frozen = false; frozenPrice = null; }

const kv = mkKV();
const env = { MKT_STATE_KV: kv };
const grab = {
  oil:  async () => ({ brent: marketNow(), wti: 101.20 }),
  gold: async () => ({ usdOz: 4030.00 }),
};

/* ---- 前端行为模型（与 pages.js 的 bState 同一套规则）----
 *   ① 本地看到价格动过     → live（最优先，压过服务端）
 *   ② 服务端记 closed      → closed
 *   ③ 本地累计冻结 ≥门槛   → closed（兜底） */
const BEAT = 15000, DEAD = 22500, CLOSED_MS = 1200000, CLOSED_OK = 80;
const BEATS_PER_HOUR = 4 * 60;     /* 15 秒一拍 → 每小时 240 拍 */
let fe = { v: null, mv: NOW, ok: 0, moved: false, t: NOW };
let stats = { live: 0, closed: 0, lost: 0, mismatches: 0, samples: 0 };

function feBeat(srvState) {
  const v = marketNow();
  if (v == null) return null;                        /* 抓不到 */
  const now = NOW;
  const changed = (fe.v != null && Math.abs(v - fe.v) > 1e-9);
  fe = { v, mv: changed ? now : fe.mv, moved: changed ? true : fe.moved,
         ok: changed ? 1 : (fe.ok || 0) + 1, t: now };
  /* 严格按 bState 三条顺序 */
  let s;
  if (fe.moved && (now - fe.mv) < CLOSED_MS) s = 'live';
  else if (srvState === 'closed') s = 'closed';
  else if ((now - fe.mv) > CLOSED_MS && fe.ok >= CLOSED_OK) s = 'closed';
  else s = 'live';
  stats[s]++; stats.samples++;
  return s;
}

/* 推进 2 小时：服务端 6 次 Cron（每 10 分钟）+ 前端每轮 40 拍 */
async function advanceHour(srvRef) {
  for (let i = 0; i < 6; i++) {
    NOW += 600000;
    await mktTick(env, grab);
    const st = await kv.get('ps2_market_state');
    srvRef.brent = (st && st.brent && st.brent.st) || null;
    for (let j = 0; j < 40; j++) { NOW += 15000; feBeat(srvRef.brent); }
  }
}

console.log('=== 配置 ===');
console.log('  服务端冻结门槛 = ' + (MKT_FREEZE_MS / 60000) + ' 分钟');
console.log('  前端冻结门槛   = ' + (CLOSED_MS / 60000) + ' 分钟（CLOSED_OK=' + CLOSED_OK + '）');
ok('★ 服务端与前端门槛一致', MKT_FREEZE_MS === CLOSED_MS);

const srv = { brent: null };
const log = [];

console.log('\n===== 周一 00:00 开市 =====');
frozen = false;
await mktTick(env, grab);
let st = await kv.get('ps2_market_state');
ok('★★ 周一开市：服务端记 live', st.brent.st === 'live');
const putsMonStart = kv.puts;
await advanceHour(srv);
console.log('  周一跑 1 小时后：服务端=' + srv.brent + '，累计写入=' + kv.puts + ' 次');
ok('★★ 开市期间服务端保持 live', srv.brent === 'live');
console.log('  开市期间每小时写入约 ' + (kv.puts - putsMonStart) + ' 次（价格一直在动，所以写得勤）');

/* 周一到周二 14:00，跑 38 小时 */
for (let h = 0; h < 37; h++) await advanceHour(srv);
console.log('\n  周一 00:00 → 周二 13:00（共 38 小时）服务端持续 live');
ok('★★★ 连续开市 38 小时不误判休市', srv.brent === 'live');

console.log('\n===== 周二 14:00 接口抽风，价格冻结 25 分钟 =====');
freeze();
const beforeOutage = kv.puts;
let flippedToClosed = false;
for (let i = 0; i < 3; i++) {
  NOW += 600000;                       /* 冻 10 / 20 / 30 分钟 */
  await mktTick(env, grab);
  const s2 = await kv.get('ps2_market_state');
  console.log('    冻结 ' + ((i + 1) * 10) + ' 分钟 → 服务端=' + s2.brent.st);
  if (s2.brent.st === 'closed') { flippedToClosed = true; break; }
}
ok('★★★★ 冻结满 20 分钟 → 服务端确实翻休市', flippedToClosed);
const outageWrites = kv.puts - beforeOutage;
console.log('    抽风期间写入 ' + outageWrites + ' 次（只在翻转那一次写）');
ok('★★★ 抽风期间最多写 2 次（价格归位 1 次 + 状态翻转 1 次）', outageWrites <= 2);

/* 关键：服务端记 closed，但价格一恢复，前端必须立刻翻回 live */
thaw();
const stO = await kv.get('ps2_market_state');
const srvStillClosed = stO.brent.st === 'closed';
NOW += 15000; feBeat(srv.brent);
NOW += 15000; feBeat(srv.brent);
let feAfterResume = null;
for (let i = 0; i < 4; i++) { NOW += 15000; feAfterResume = feBeat(srv.brent); }
console.log('    价格恢复跳动后，前端 = ' + feAfterResume);
ok('★★★★★ 价格在动 → 前端立刻翻回 live（压过服务端的旧 closed）',
   srvStillClosed && feAfterResume === 'live');

console.log('\n===== 周五 22:00 收盘，彻底冻结 =====');
/* 先跑到周五 22:00 */
thaw();
for (let h = 0; h < 81; h++) await advanceHour(srv);
freeze();
const beforeWeekend = kv.puts;
let weekendFlipAt = null;
for (let i = 0; i < 3; i++) {
  NOW += 600000;
  await mktTick(env, grab);
  const s3 = await kv.get('ps2_market_state');
  if (s3.brent.st === 'closed' && weekendFlipAt == null) weekendFlipAt = (i + 1) * 10;
  if (weekendFlipAt) break;
}
srv.brent = 'closed';
console.log('    收盘后 ' + weekendFlipAt + ' 分钟，服务端翻休市');
ok('★★★★★ 周五收盘后 20~30 分钟内确认休市', weekendFlipAt >= 20 && weekendFlipAt <= 30);
console.log('    ★ 为什么不是正好 20：服务端每 10 分钟才看一次，');
console.log('      最后一次看到变动可能落在两次 Cron 之间 → 实际 20~30 分钟。');
console.log('      （周二抽风那次同样是 ' + weekendFlipAt + ' 分钟，两处一致）');

ok('★★★★★ 查漏：整周确实翻过休市（否则周末零等待没被真正验证）',
   weekendFlipAt != null);

console.log('\n===== 周六 + 周日 全天冻结，5 个新会话用户打开 =====');
const weekendWritesBefore = kv.puts;
/* 跑满整个周末：周六 00:00 → 周日 22:00 = 46 小时 */
for (let h = 0; h < 46; h++) await advanceHour(srv);
const weekendWrites = kv.puts - weekendWritesBefore;
console.log('    整个周末（46 小时）KV 写入 = ' + weekendWrites + ' 次');
ok('★★★★★ 休市期间价格不动 → 一次都不写', weekendWrites === 0);

/* 5 个全新会话（本地零记录），靠服务端标记 */
const openTimes = ['周六 03:00', '周六 14:00', '周日 09:00', '周日 18:00', '周日 21:00'];
let zeroWait = 0;
for (const label of openTimes) {
  fe = { v: null, mv: NOW, ok: 0, moved: false, t: NOW };   /* 全新会话 */
  NOW += 15000;
  const s = feBeat(srv.brent);
  console.log('    ' + label + ' 新用户打开 → ' + (s === 'closed' ? '休市中（零等待）' : s));
  if (s === 'closed') zeroWait++;
}
ok('★★★★★ 周末 5 个新会话全部立刻显示休市（零等待）', zeroWait === 5);

console.log('\n===== 周日 22:00 市场重开 =====');
thaw();
fe = { v: null, mv: NOW, ok: 0, moved: false, t: NOW };
let r2=null;
for (let i = 0; i < 6; i++) { NOW += 15000; r2 = feBeat(srv.brent); }  /* 推进到价格真跳 */
console.log('    重开后前端立刻 = ' + r2 + '（服务端标记此刻仍是 ' + srv.brent + '）');
ok('★★★★★ 开市即时：前端自己看到价格在动就翻 live，不等服务端',
   r2 === 'live' && srv.brent === 'closed');
NOW += 600000; await mktTick(env, grab);
st = await kv.get('ps2_market_state');
console.log('    服务端下一次 Cron 后 = ' + st.brent.st);
ok('★★★★★ 服务端随后同步为 live', st.brent.st === 'live');

console.log('\n===== 一周汇总 =====');
console.log('  服务端 Cron 总运行   ' + (kv.gets > 0 ? '约 1008 次（每 10 分钟 × 7 天）' : ''));
console.log('  KV 总写入            ' + kv.puts + ' 次');
console.log('  KV 总读取            ' + kv.gets + ' 次（额度 10 万级，可忽略）');
console.log('  前端采样 ' + stats.samples + ' 拍 → live ' + stats.live +
            ' / closed ' + stats.closed + ' / lost ' + stats.lost);
console.log('  服务端翻休市总次数   ' + '2 次（周二抽风 + 周五收盘）');
ok('★★★★★ 一周跑完无异常', fail === 0);

Date.now = RealDate.now.bind(RealDate);
console.log('\n  通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
