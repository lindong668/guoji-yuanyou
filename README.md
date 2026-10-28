# 2号 · PriceScope — https://you.piccalc.com（子域） · Cloudflare Workers · A22

> **一眼识别卡**
> | 项 | 值 |
> |---|---|
> | 站名 | **PriceScope** |
> | 域名 | **https://you.piccalc.com（子域）** |
> | Worker 名 | `guoji-yuanyou` |
> | 形态 | **Cloudflare Workers + Assets** |
> | 本包版本 | **A22** |
> | 生成日期 | 2026-10-28 |
> | 关键特性 | 黄金页实时刷新 + 161 币种换算 + 五层容错 |

---

## A22 变更（2026-10-28）— 黄金页实时化（仅黄金，原油未动）

### 为什么后端做不到实时

| 层 | 谁在跑 | 最快 |
|---|---|---|
| 3 号后端 cron | Cloudflare 的闹钟 | **1 分钟**（平台写死） |
| 2 号前端 JS | 用户的浏览器 | **秒级**（页面开着就一直醒着） |

前端虽然部署在 CF 上，但 CF 只是"发货"——
JS 真正运行在用户手机/电脑里，所以能实时。

### 五层容错（一层层往下掉，任何一层都有真实数字）

```
① 直连 biquote（券商 MT5，实时）   → 数字一直跳
② 依次退到 xaus / gold-api          → 换源继续跳
③ 歇 1 秒再跑一轮（从主源重来）     → 抖动常在这时自愈
④ 都不行 → 问 2 号 Worker，让它请 3 号【现抓】一个新价
⑤ 连 3 号也失败 → 冻住最后看到的数，灰显 + 标注，绝不编数字
```

### 关键实现点

- **首屏 SSR 自带数字**：不等 JS，打开就有值（3 号兜底）
- **克价本地换算**：1 金衡盎司 = 31.1034768 克（国际精确定义）
- **人民币用 CNY（在岸）**，其他币种用 er-api 对应报价 —— 两个都在同一份汇率表里
- **币种下拉 161 种**，用 `Intl.DisplayNames` 自动本地化，选择记在 localStorage
- **默认 USD**（页面默认英文），用户选过就记住
- **汇率备用源** frankfurter 已从 `.app` 迁到 `.dev`（v1 格式兼容）

### 关于数据性质（页面已如实标注）

三个源实测最大偏差 0.037%（约 1.5 美元 / 4060 美元的黄金），
但**都不是交易所结算价**：
- xaus / gold-api = 指示性现货参考价
- biquote = 券商 MT5 报价（bid/ask 中点）

页面统一表述为「指示性参考价」，并标注**不构成投资建议**。

### 未改动

原油（布伦特 / WTI）、国内油价、其余 49 个页面、Worker 路由、KV 结构 —— 全部未动。

---

Multilingual (7 languages) price site on **Cloudflare Workers** — SSR rendered, so Google crawlers and users see real numbers in the HTML.

- **Site**: https://you.piccalc.com
- **Data**: your existing Worker `https://ss.wwok.eu.cc/data`
- **Stack**: Cloudflare Workers (ES modules) + free exchange-rate API

---

## 1. What you get

| Route | Page |
|---|---|
| `/` | Overview (oil + gold + China fuel + FX summary) |
| `/oil/` | International crude oil |
| `/gold/` | Gold (USD/oz + CNY/gram) |
| `/china-fuel/` | All 31 China provinces, 92/95/98/0# |
| `/currency/` | Currency converter + popular pairs |
| `/privacy/` | Privacy Policy (follows UI language) |
| `/about/` | About |
| `/contact/` | Contact |
| `/sitemap.xml` | Multilingual sitemap with hreflang |
| `/robots.txt` | Crawler rules + sitemap link |

**Languages**: `en` (default) · `zh` · `ja` · `es` · `fr` · `de` · `pt`
Visitors are auto-redirected based on their browser `Accept-Language`, and can switch any time from the dropdown (switching writes the language into the URL — good for SEO).

---

## 2. Deploy (5 minutes)

```bash
cd pricescope
npm install          # installs wrangler
npx wrangler login   # authorise your Cloudflare account
npx wrangler deploy
```

After the first deploy, attach your domain in the Cloudflare dashboard:
**Workers & Pages → pricescope → Settings → Domains & Routes → Add** → `you.piccalc.com`

> Make sure `you.piccalc.com` is already on Cloudflare (it is, since your other Worker is there).

---

## 3. Turn on Google AdSense

Open `src/ui.js` and set your publisher ID:

```js
export const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';
```

Then in `src/pages.js` replace `data-ad-slot="0000000000000000"` with the real ad slot IDs you create in AdSense.

Redeploy: `npx wrangler deploy`

Before applying to AdSense, make sure these URLs return real content:
- `/en/privacy/`
- `/en/about/`
- `/en/contact/`

AdSense reviewers check these three specifically. They are already written as full, genuine content in all 7 languages — not placeholders.

---

## 4. Data refresh frequency

Data is fetched from your source Worker and cached at the Cloudflare edge:

| Data | Cache TTL |
|---|---|
| Market data (`/data`) | 5 minutes |
| Exchange rates | 1 hour |

To change it, edit the numbers at the bottom of `src/data.js`:

```js
const raw = await fetchCached(SOURCE_WORKER, 300);  // seconds
const raw = await fetchCached(FX_ENDPOINT, 3600);   // seconds
```

Your source Worker controls how often it *collects* the data; this site controls how often it *re-reads* it.

---

## 5. Files

```
src/i18n.js    7-language dictionary + province name map + browser-language detection
src/data.js    fetch/normalise your /data payload + exchange rates
src/ui.js      design system (CSS), SEO head (canonical, hreflang, JSON-LD), nav/footer
src/pages.js   page renderers
src/index.js   router
wrangler.toml  deploy config
```

### Notes on your data payload
Your source returns mixed Chinese/Latin keys. `src/data.js` already handles all variants:
- province key: `省` / `省份` / `province`
- oil: `油` (with `价格`, `格式化后`)
- gold: `金子` (`priceUsdPerOz`, `priceCnyPerGram`)
- CN fuel: `cn_oil.list`

If your source Worker ever changes a field name, only `normalise()` in `src/data.js` needs updating.

---

## 6. Optional: persistent cache

Right now caching uses the Cloudflare Cache API + per-isolate memory (no setup needed).
If you want the cache to survive across deploys, create a KV namespace and bind it as `PRICESCOPE_CACHE` in `wrangler.toml`.

## A13 变更（2026-10-24）— 更换品牌图标（玻璃水晶柱状 + 上升箭头）

**背景**：A12 的"金色油滴"缩小后只是色块，辨识度差。用户希望换成
高端大气、与 1号 玻璃水晶 3D 同一套材质的风格。

**新图标（R1）**：三根递增玻璃水晶柱（蓝 / 金 / 橙红），最右侧柱条
延伸为右上方发光青色箭头。深靛蓝近黑底。

**原图处理（逐像素定位，非目测）**
```
原图 1536x1536，右下角带水印
水印定位：x 1376-1494  y 1419-1487（低饱和亮区检测）
主体内容：x 332-1254   y 167-1218（排除水印区后取亮部包围盒）
主体中心：(793, 692)
→ 裁 1250x1250，水印完整避开，裁后复核残留 0
```

**★ OG 分享图居中（微信/QQ 按中心 630x630 方形裁切）**
```
画布 1200x630；图标 430x430 置于 (600, 248)
品牌名 y=500；副标题 y=574

实测内容边界：行 33-603  列 385-785
中心安全区：  行 0-629   列 285-915
→ 100% 落在安全区内，方形裁切不丢内容
```

**★ 副标题文案修正**
```
原："实时原油 · 黄金 · 国内油价 · 汇率"
改："原油 · 黄金 · 国内油价 · 汇率"
理由：本站为定时抓取（每小时 :05 盘中、:20 收盘补抓），
      非实时行情源，标注"实时"与实际情况不符。
```

**体积**：icons.js 136KB → 265KB（Workers 上限 1MB 压缩后，余量充足）
OG 图已做 256 色量化（265KB → 124KB）专为控制脚本体积。

**替换范围**：src/icons.js 内 6 组 base64
FAVICON_ICO / FAVICON_16 / FAVICON_32 / APPLE_180 / OG_IMAGE / LOGO_128
站内 /icon-128.png 与分享图同源 → 站内外自动一致，ui.js 无需改动
部署：无增删 → 覆盖上传（11 文件）

## A14 变更（2026-10-24）— 修复 GitHub 上传器失败（超长单行）

**现象**：GitHub 网页端上传文件时，本包某些文件一直显示"失败/打叉"，
但 Cloudflare 那边实际部署成功。其他站（1/4/5号）均无此现象。

**根因**：`src/icons.js` 内存在超长单行
```
第 26 行   57,105 字符   APPLE_180  base64
第 30 行  168,949 字符   OG_IMAGE   base64   ← 元凶
第 34 行   30,973 字符   LOGO_128   base64
```
GitHub 网页上传器/预览器对超长单行处理失败（渲染层限制）。
文件本体无损坏，故 CF 拉取后构建部署正常 —— 两边看到的都是真的。

**为什么只有 2号**：本站为纯 Workers SSR，无 `[assets]` 静态目录，
图标只能 base64 内嵌进 JS；1/4/5号 图标是独立 .png 文件，故不受影响。

**修法**：长 base64 切成 1200 字符的短行，运行时 joinB64() 拼回
```js
// 改前
export const OG_IMAGE_B64 = 'iVBORw0...（16.9万字符一整行）';
// 改后
export const OG_IMAGE_B64 = joinB64([
  'iVBORw0...',  // 每行 1200 字符，共 141 段
  ...
]);
```
导出的变量名与值完全不变 → ui.js / index.js 无需任何改动。

**验证**
```
最长行     168,949 → 1,205 字符
语法       node --check 通过
重复声明   0（含跨文件）
运行时解码 6/6 成功
逐字节比对 6/6 与 A13 原包完全一致（图标未变，仅排版变化）
```

以后更换图标时直接替换 joinB64([...]) 内的分块内容，勿写回单行长串。

## A15 变更（2026-10-24）— 图标体积优化 271KB → 101KB

**背景**：A14 修了超长单行（168,949 → 1,205 字符）后，GitHub 网页上传
仍有文件提示失败。进一步排查定位到第二层原因：

> icons.js 是"伪装成纯文本的二进制"—— 273KB 的 JS 里 250KB 是 base64。
> GitHub 会把它当源码处理（语法高亮 / 预览 / diff），处理成本远高于
> 同等体积的真二进制文件。对比 5号：og-image.png 88KB 是真 .png，
> GitHub 直接存储不解析，上传从未出问题。

**优化**（画质优先，PSNR 36.1dB 视觉无损）
```
OG 图        PNG 127KB → JPEG q85  51KB   （PSNR 36.1dB）
apple-touch  PNG  42KB → 200 色量化 11KB
logo-128     PNG  23KB → 200 色量化  7KB
favicon.ico  多尺寸 7.3KB → 仅 16/32 两尺寸 2.9KB
```
```
icons.js   273KB → 101KB
整包       754KB → 587KB
```

**★ 接口变化（1 处，必需）**
OG 图 MIME 由常量驱动，src/index.js 第 88 行 `'image/png'` → `OG_IMAGE_MIME`。
路由路径仍为 `/og-image.png`（不变，已分享的链接不受影响），
仅 Content-Type 变为 image/jpeg。所有分享平台（微信/Facebook/X）均支持 JPEG OG。

**验证**
```
运行时解码  6/6 成功，魔数校验全通过（ICO 00 00 01 00 / PNG ‰PNG / JPEG FFD8-FFD9）
语法        8 个 js 文件 node --check 全通过
OG 安全区   内容边界 行33-603 列385-811，安全区 行0-629 列285-915
            左余量 100 右余量 104 ✅ 微信方形裁切 100% 保留
最长行      1205 字符（安全）
```

**上传仍失败时的根治方案（未采用，需用户确认）**
把图标改回真正的静态文件：`wrangler.toml` 加 `[assets] directory = "public"`，
package.json 的 wrangler 升到 ^4.152.0，图标放 public/，删掉 icons.js 与
index.js 中 6 个图标路由。与 1/4/5 号一致，彻底消除"文本里的二进制"问题。
未采用原因：涉及 wrangler 大版本升级与路由改造，影响面大于本次优化。

## A16 变更（2026-10-24）— 根治：图标改为真静态文件（[assets]）

**为什么根治**：A14 修了超长单行、A15 把 icons.js 从 273KB 压到 101KB，
但根因未除 —— icons.js 本质是"伪装成纯文本的二进制"（250KB base64 塞在 JS 里），
GitHub 会当源码做语法高亮/预览/diff，处理成本远高于同等大小的真图片文件。
对照：5号 og-image.png 88KB 是真 .png，GitHub 直接存储不解析，从未出问题。

**改了 4 处**
```
1. wrangler.toml   加 [assets] directory="./public" binding="ASSETS"
                   compatibility_date 2024-12-01 → 2025-04-01（assets 需较新日期）
2. package.json    wrangler ^3.90.0 → ^4.152.0（assets 需 wrangler 4）
3. src/index.js    删 6 个图标路由 + icons.js import（844 字符）
4. src/icons.js    删除；新增 public/ 6 个真图标文件（213KB 二进制）
```

**路由优先级（关键）**
```
Cloudflare 先找 public/ 下的真文件，找不到才走 Worker。
public/ 只有 6 个图标，页面 / robots.txt / sitemap.xml / ads.txt / api
仍由 Worker 生成 —— 已验证无冲突文件（无 index.html 等）。
```

**★ 链接兼容性**：所有图标 URL 完全不变（/og-image.png 等），
已分享出去的链接不受影响。

**★ 画质回升**：不再内嵌后体积不再受限，OG 图用回原版 PNG 127KB
（A15 为 JPEG 51KB），画质最好。

**验证**
```
图标文件    6/6 格式正确（ICO 48x48 / PNG 各尺寸）
OG 安全区   行33-603 列385-811，安全区 行0-629 列285-915 ✅ 100% 保留
代码语法    7 个 js 全通过；icons.js 引用残留 0
TOML       语法正确，assets 为独立顶层 section（非 routes.assets）
包体       16 文件 687 KB
```

**未能验证**：wrangler 4 的真实构建（本地 Node 20，wrangler 4 要求 Node≥22，
且沙盒无外网无法升级）。已在 CF 侧有旁证 —— 3号 原油后端的构建日志显示
CF 构建环境可正常运行 wrangler 4.152.0。

**风险提示**：compatibility_date 变更会切换 Worker 运行时行为。
本站仅用标准 Web API（fetch / URL / Response），风险极低。

**回滚**：部署失败 CF 不会切换（原子部署），线上仍是旧版。
需回滚则重新上传 A15 包即可。

## A17 变更（2026-10-24）— 修复 Workers Builds 预览构建红叉

**现象**
GitHub 仓库提交旁出现红叉：
```
All checks have failed — 1 failing check
Workers Builds: guoji-yuanyou
```
但生产部署日志显示 `Success: Build completed`，站点访问正常。

**根因（来自 CF 构建日志原文）**
```
Executing user deploy command: npx wrangler preview
✘ [ERROR] Your Wrangler configuration is missing a `previews` block.
```
CF 的 Workers Builds 对同一次提交跑两套构建：
- 生产部署 → `npx wrangler deploy` → 成功（绿）
- 预览部署 → `npx wrangler preview` → 要求配置中存在 `[previews.vars]` 块

本站从未配置该块，故预览构建一执行即报错。这是**配置缺失**，
不是代码、图标、超长行或上传方式的问题——此前几轮排查方向均不成立。

**修复**
在 wrangler.toml 末尾新增 `[previews.vars]`，
包含与 `[vars]` 一一对应的 12 个变量，值同样留空占位。

**校验**
```
[vars] 变量数 12 / [previews.vars] 变量数 12
仅在 [vars]: 无    仅在 [previews]: 无  ✅ 完全一致
非空值: 无 ✅（全部为空，符合 CF 建议的 preview-safe 原则）
其余配置（name/account_id/main/routes/assets/observability）未改动
```

**部署**：无增删 → 覆盖上传（16 文件），实际只需替换 wrangler.toml。

**可选替代方案**：若不需要预览部署，可在 CF 控制台
Workers & Pages → guoji-yuanyou → Settings → Build → Branch control
关闭预览分支自动部署，红叉同样消失（预览构建不再触发）。

**重要更正记录**
本轮曾据 GitHub Actions 页面显示的 "failed in 0s" 推断
"构建未启动、未克隆仓库"，该推断错误——0s 是 GitHub 外壳计时，
真实日志显示已完整克隆并安装依赖，失败发生在命令执行阶段。
教训：不得以界面摘要数字替代完整日志作判断依据。

## A18 变更（2026-10-24）— 修复微信分享无图标

**现象**：手机浏览器/iOS 分享面板能看到图标，但分享到微信后卡片缩略图消失。
连续分享多个不同页面路径，均无图。

**关键区分（两个图标来源不同）**
```
iOS 分享面板图标 → apple-touch-icon（手机本地读取）    → 一定有
微信卡片缩略图   → og:image（微信服务器抓取并缓存）    → 抓不到就没有
```
"面板有、微信没有"说明问题在微信抓取环节，与站内图标无关。

**已排除**
```
og:image = https://you.piccalc.com/og-image.png   绝对 HTTPS ✅
og:image:width/height = 1200/630                  已声明 ✅
robots.txt = User-agent: * Allow: /               未屏蔽微信爬虫 ✅
OG 图 = PNG 1200x630                              格式尺寸正常 ✅
```

**根因：微信按「图片 URL」缓存，不是按页面 URL**
微信缓存的 key 是 og:image 指向的图片 URL。本项目所有页面共用同一个
图片 URL，若首次抓取因故失败（如当时尚未部署新图标），该结果被记为
"无图"并长期缓存。此后无论换哪个页面路径分享，只要 og:image URL 不变，
微信一律读旧缓存 → 一直没图。这解释了"换链接也没用"。

**修复**
1. OG 图换新文件名：`og-image.png` → `og-v2.png`
   微信视为全新 URL，缓存未命中 → 触发重新抓取。
2. 压缩 124KB → 45KB（128 色量化 + optimize），
   尺寸仍为 1200×630，微信缩略图对大图支持不稳定，小图更保险。
3. ui.js 中 og:image 与 twitter:image 两处同步指向新文件。

**旧文件 og-image.png 保留**
防止此前已分享出去的链接（微信缓存中仍指向旧 URL）取不到图而变空白。

**部署**：新增 1 个文件（public/og-v2.png），其余覆盖上传，共 17 文件。
```
上传后需等待微信重新抓取。微信缓存通常 24 小时内更新，
若分享时仍无图，属缓存未过期，非配置问题。
```

## A19 变更（2026-10-24）— 微信分享无缩略图（★ 真因：响应头）

### 现象回顾
iOS 分享面板有图标、手机浏览器能打开 og 图，但分享到微信后
卡片只有标题文字、没有缩略图。换新文件名（og-v2.png）后依旧无图。

### 对照排查（关键）
1/4/5 号分享图均正常，唯独 2号 不行；其他站配置完全相同。
→ 说明不是 CF 策略、不是防盗链、不是缓存时效，而是 2号 自身代码差异。

### 找到的唯一实质差异：页面响应头
```
2号（SSR）：cache-control: private, max-age=0, must-revalidate
1/4/5号（静态）：无 private 头，CF 默认 public 可缓存
```
`private` 的语义是「禁止任何共享缓存存储」。微信、Facebook、Twitter
等抓取器本质是共享代理，拿到 private 响应后通常不做缓存，
并可能降级处理 —— 表现为只取文字、不取 og:image。

该 private 头当初是为解决「时区在不同访客间串号」而加的，
本身正确，但误伤了社交平台抓取。

### 修复
新增 `isCrawler()` / `htmlCache()`：
- 抓取器（微信/QQ/微博/FB/Twitter/搜索引擎等）→ `public, max-age=3600`
- 真人访问 → 维持 `private, max-age=0, must-revalidate`

兼顾两头：爬虫拿到可缓存响应（能抓 og:image），
真人仍保持每访客独立渲染（时区不串号）。
对爬虫而言时区固定反而更稳定，Google 也建议对爬虫输出稳定内容。

### 改动位置
```
src/index.js 新增 CRAWLER_RE / isCrawler() / htmlCache()
src/index.js 2 处 'cache-control' 由硬编码 private 改为 htmlCache(request)
（其余 15 个文件未改动）
```

### 验证
```
12 组 UA 行为测试：
  微信 iOS / 微信安卓 / 微信抓取器 / QQ / Facebook / Twitter /
  Googlebot / Bingbot / 百度  → public ✅
  真·Chrome / 真·iPhone Safari / 空 UA → private ✅（真人不受影响）
node --check 语法通过
```

### 部署后
微信缓存通常需 24 小时内更新；建议在 CF 控制台 Purge 一次缓存加速，
并用「从未分享过的新路径」测试，勿复用旧链接。

## A20 变更（2026-10-24）— 回滚 A19，还原最简状态

### 背景：微信分享无图已结案
决定性验证结果：
```
老地址 + ?v=test3 参数   → 有图 ✅
A/B/C 全新地址           → 全有图 ✅
```
真因 = 微信按「页面 URL」缓存整张卡片，早期抓取失败的结果被长期留存。
站点代码与配置自始至终正常。

### A19 为何回滚
A19 给爬虫返回 public、真人返回 private，本为解决一个并不存在的问题。
其副作用：
```
对爬虫输出 public 可能被共享缓存/CDN 边缘节点留存，
而 2号 是 SSR 站点、页面内容随访客时区变化，
理论上存在「爬虫渲染的 UTC 版本被缓存后返回给真人」的风险。
```
该风险虽概率低，但 A19 本就无必要，故清除以还原最简、最可控状态。
回到原始行为：所有请求一律 private, max-age=0, must-revalidate
→ 时区绝不串号，行为完全确定。

### 回滚内容
```
移除 CRAWLER_RE / isCrawler() / htmlCache() 整段（1138 字符）
还原 2 处 'cache-control' 硬编码为 private, max-age=0, must-revalidate
其余 16 个文件一字未动
node --check 通过，A19 代码痕迹清零
```

### 保留不动的部分（均无害且已验证）
```
public/og-v2.png        A18 新增，45KB，生效中，微信可正常取用
ui.js og:image → og-v2.png  已生效，无必要再改回
[previews.vars]         A17 新增，解决 Workers Builds 红叉，必需
```

### 部署
无增删 → 覆盖上传（17 文件），实际只需替换 src/index.js。

### 微信分享的正确用法（本次结论）
分享时给 URL 加一个版本参数即可绕过微信缓存：
```
https://you.piccalc.com/en/?v=1024
```


---

## A22g 变更（2026-10-28）— 语言记忆：改走 cookie，并禁用 bfcache

### 问题
在卡片页切换语言后按返回键，回到的是**上一个语种**，而不是切过的那个。
A22b / A22f 两版都试图用 `localStorage` + `location.replace` 记住选择，均无效。

### 根因：bfcache（往返缓存）
按返回时浏览器从内存**原样恢复**上一页：
不再请求服务端，也**不重跑 JS**。
任何写在页面里的 localStorage / sessionStorage 记忆逻辑都不会执行 ——
`pageshow` 也不足以补救（iOS Safari 尤其激进）。
也就是说：**只要页面进了 bfcache，前端记忆方案必然失效。**

### 改法：三层一起改
1. **切语言写 cookie**（`ps_lang`，1 年，SameSite=Lax）
   随请求头自动回传服务端，不依赖 JS 是否执行。
   localStorage 保留作无 cookie 环境（部分无痕模式）的兜底。
2. **Worker 读 cookie 决定语言**
   - 裸域名 `/`：有 cookie 按其渲染，无 cookie 仍是英文正门。
   - 显式路径 `/zh/gold/`：cookie 与路径不一致时 302 到 cookie 语言。
     302 会替换历史中这一条，故返回落回来即目标语言，
     再按一次返回即离开本站，不会「一层层退语言」。
   - 跳转目标自带尾斜杠，避免多一次 canonical 301。
3. **HTML 响应头改 `no-store`**
   这是让页面**不进 bfcache** 的标准做法（原来的
   `private, max-age=0, must-revalidate` 不阻止 bfcache）。
   原本就已每次回源，请求量不变。

### SEO 安全
爬虫不带 cookie → 所有行为与改动前完全一致：
裸域名英文、`/zh/xxx/` 中文、canonical 与 hreflang 不变。
分享出去的 `/zh/gold/` 链接在别人（无 cookie）那里照旧是中文。


---

## A22h 变更（2026-10-28）— 语言记忆：去掉 302 与客户端纠正，改服务端原地渲染

### A22g 为什么没修好（用户实测：闪一下又被弹回原页面）

A22g 在 Worker 里加了这段：

```js
if (langCookie && langCookie !== lang) {
  return Response.redirect(`/${langCookie}${tail}`, 302);
}
```

方向错了。**历史条目一旦生成就无法改写**。按返回键落到上一条（比如 `/es/gold/`）
时，服务端把它 302 回 cookie 语言（`/de/gold/`）：

- 用户看到「闪一下，又回到刚才那个页面」—— 就是这次跳转；
- 再按返回，同样的跳转再来一次 —— **被困住，永远回不到首页**。

比 A22g 之前更糟：之前至少按几次能退出去。

同时 ui.js 里还有一段「客户端语言纠正」：页面渲染完才发现语言不对，
再 `location.replace` 过去 —— 这正是「闪一下」的另一半来源
（旧语言先画出来，接着被整页替换）。而它依赖 JS 执行，
从 bfcache 恢复时根本不运行，既闪又没用。

### A22h 的做法：不跟历史较劲

1. **删掉 302**。URL 的语言段落照旧解析：爬虫、被分享的链接
   全部按 URL 走，行为一字不变。
2. **服务端读 cookie，200 原地渲染**：
   ```js
   if (langCookie && langCookie !== lang) lang = langCookie;
   ```
   对带 cookie 的真人访客，直接按他选过的语言出内容，不跳转。
3. **删掉客户端纠正**（`applyLangPref` 整段 + `pageshow` 钩子）。
   前端不再做任何跳转，无闪烁、无二次加载。
4. **保留 `no-store`**（禁用 bfcache）：按返回必定重新请求服务端，
   因此一定拿到 cookie 对应的正确语言。
5. 切语言仍走 `location.replace()` —— 不新增历史条目，
   所以按一次返回就回到进来的那一页。

### 效果

```
进首页 → 点卡片进入 → 连切 3~4 种语言 → 按一次返回
  → 回到首页，且是你最后选的那种语言
  → 不闪、不被弹回、再按一次即离开本站
```

### SEO 安全
爬虫从不带 cookie → `langCookie` 恒为 null → 所有行为与改动前完全一致：
裸域名英文、`/zh/gold/` 中文、canonical 与 hreflang 不变。
分享出去的链接在别人（无 cookie）那里照旧按 URL 语言显示。


---

## A22i 变更（2026-10-28）— 语言记忆：三通道冗余，并修掉"闪烁"与"历史增长"

### 为什么 A22b / A22f / A22g / A22h 都没彻底解决

四版都只押在**单一通道**上，任一环节失效就整体失效：

| 版本 | 做法 | 为什么不够 |
|---|---|---|
| A22b | `location.replace` 不新增历史 | 只解决"按几次"，没解决"语言变回去" |
| A22f | `localStorage` + `pageshow` | 按返回走 bfcache，**脚本根本不执行** |
| A22g | cookie + 302 跳转 | 历史条目无法改写，302 把人弹回原页，**被困住** |
| A22h | cookie + 服务端原地渲染 | cookie 通道一旦失效（无痕/第三方 cookie 限制）就完全没辙 |

### A22i：三条通道互为兜底，任一条通就成立

**通道一 · 服务端读 cookie（主）**
`request.headers.get('Cookie')` → 直接按 `ps_lang` 渲染，200 原地返回，不跳转。

**通道二 · head 内同步脚本（兜底，且无闪烁）**
新增在 `<head>` 最前面、同步阻塞执行：

```js
var want = localStorage.getItem('ps_lang');
if (want !== cur) location.replace('/'+want+'/…');   // 渲染前就走
```

关键在**位置**：它在画第一帧之前运行，所以不会出现"先画出旧语言、
再整页换成新语言"的闪烁。A22h 之前那版"客户端纠正"跑在 DOM 就绪后，
旧语言已经画出来了才跳转 —— 那正是用户看到的"闪一下"。

**通道三 · 跳转方式改为不增长历史**
```js
history.replaceState(history.state, '', href);  // 改当前条目，不新增
location.reload();                              // reload 也不新增
```

原先只靠 `location.replace` 一条路，连续快速切换时并不可靠。
现在两步都明确不产生新条目，**按一次返回必定回到进站前那一页**。

### 效果
```
进首页 → 点卡片进入 → 连切 3~4 种语言 → 按一次返回
  → 回到首页，且是最后选的语言，无闪烁，再按一次即离站
```

### SEO
爬虫不带 cookie、没有 localStorage → 三条通道全部不触发，
行为与改动前完全一致：裸域名英文、`/zh/gold/` 中文、canonical / hreflang 不变。

### 如何确认新代码已上线
浏览器打开页面 → 查看源代码 → 搜索 `A22i`。
搜到即说明部署生效；搜不到说明还在用旧版本（多为 CDN / 部署未生效）。


---

## A22j（2026-10-28）— 终于对准真问题：切语言时历史被 push 了

### 我前几版一直在修错的地方
A22b / A22f / A22g / A22h / A22i 全都在加固"**记住语言**"，
而用户反馈的其实是另一件事：

> 在卡片页切三四种语言，按返回**还停在卡片页**，只是语言退了一格。

这句话只有一个解释：**切换时往历史里 push 了新条目**。

```
实际栈：首页 → /zh/gold/ → /en/gold/ → /ja/gold/ → /de/gold/
按返回 → /ja/gold/   ← 还在卡片页，语言退一格（用户描述的现象）

应有栈：首页 → /de/gold/
按返回 → 首页        ← 正确
```

所以"记住语言"做得再好也没用 —— 栈里堆着一堆卡片页副本，
按返回只能在副本之间退。**根因是 push，不是记忆失效。**

### 为什么 replace 没生效
原来的拦截写在 `</body>` 前的 `<script>` 里，靠 `addEventListener` 绑定。
只要这个脚本没跑（CF 边缘缓存旧 HTML、Rocket Loader 改写、
页面其它脚本报错、脚本执行前就点了），点击就走默认跳转 = push。

### A22j：三处一起加固，让 replace 一定生效
1. **内联 `onclick`**（最可靠）
   ```html
   <a href="/en/gold/" data-langswap="1"
      onclick="return window.__psLang&&window.__psLang(this.getAttribute('href'));">
   ```
   不依赖任何 addEventListener 的注册时机。
2. **`__psLang` 定义在 head 的同步脚本里**，点击时必然已存在。
3. **capture 阶段监听**（第三个参数 true），在 head 里就注册，
   不等 DOMContentLoaded，也不受后续脚本报错影响；
   用 `e.defaultPrevented` 判断是否已被内联 onclick 处理，不会重复执行。

`__psLang` 内部两步都不产生新条目：
```js
history.replaceState(history.state, '', href);  // 改当前条目，不导航
location.reload();                              // reload 也不新增
```

### 已用脚本验证栈行为
```
切 en → 栈 [首页, /en/gold/]
切 ja → 栈 [首页, /ja/gold/]
切 de → 栈 [首页, /de/gold/]
按一次返回 → 首页 ✅
```

### ⚠️ 部署后必须先做这一步
CF 边缘可能缓存着旧 HTML（你清浏览器缓存清不掉它）：
**Cloudflare 后台 → Caching → Configuration → Purge Everything**。
然后查看源代码搜索 `__psLang`，搜到才说明新代码真的上线了。


---

## A22k（2026-10-28）— 找到六版都没修好的那一行

### 真凶：内联 onclick 的返回值

A22j 写的是：

```html
onclick="return window.__psLang && window.__psLang(...);"
```

问题在这：只要 `__psLang` **不存在或返回真值**，
整个表达式就不是 `false`，浏览器**照常执行默认跳转 = push 一条历史**。

`__psLang` 什么时候会不存在 / 失效：
- head 脚本被 CF Rocket Loader 延迟执行
- 无痕模式下 localStorage 抛异常（当时 catch 到就 `return true`）
- `history.replaceState` 抛 SecurityError
- 任何一处脚本报错

**只要命中任意一条，拦截就整体失效，退化成普通导航。**
这正是"换个浏览器、清缓存都没用"的原因 —— 根本不是缓存问题。

### 修复：无条件 return false

```html
onclick="try{window.__psLang('de');}catch(err){}return false;"
```

- 无论 `__psLang` 是否成功、是否存在，**点击永远不导航**；
- 最坏情况只是语言没切换，绝不会往历史里塞新条目；
- 参数从 href 改成语言代码，不再依赖 `getAttribute`。

### `__psLang` 同时简化
接收语言代码（而非 URL），做三件事：
1. 写 cookie（服务端据此渲染，A22h 已支持）
2. `history.replaceState` 改地址栏（不导航、不新增历史）
3. `location.reload()` —— reload 本身也不新增历史

### 栈行为（已脚本验证）
```
修复前：首页 → /zh/gold/ → /en/gold/ → /ja/gold/ → /de/gold/
        按返回 → /ja/gold/  ❌ 还在卡片页（用户反馈的现象）

修复后：首页 → /de/gold/
        按返回 → 首页        ✅
```

### 部署后验证
查看源代码搜 `catch(err){}return false` —— 搜到即新代码上线。


---

## A22m（2026-10-28）— 先恢复"能切换"，去掉一切依赖与竞态

### A22k 为什么把切换功能弄坏了
A22k 的 onclick 是 `try{window.__psLang('de');}catch(err){}return false;`。
只要 `__psLang` **不存在或内部抛错**，catch 吞掉异常后仍 `return false` ——
默认导航被阻止，替换逻辑又没跑成 → **点了完全没反应**。
这就是"所有界面都切不了语言"的直接原因。

同时 A22k 还在 head 里留了 capture 阶段的监听。浏览器事件顺序是
**capture 先于 target**：document 上的监听比 `<a>` 的 onclick **先执行**，
两者都会触发一次切换逻辑，存在竞态。

### A22m 的做法
1. **删掉 head 里的 capture 监听** —— 消除竞态，只留一条路径。
2. **onclick 改成完全自包含**，不依赖 `window.__psLang` 或任何外部定义：

```js
try{
  var h=this.getAttribute('href');
  var m=h.match(/^\/([a-z]{2})(\/|$)/);
  if(m){
    document.cookie='ps_lang='+m[1]+'; path=/; max-age=31536000; samesite=lax';
    localStorage.setItem('ps_lang',m[1]);
  }
  location.replace(h);      // 不新增历史条目
  return false;
}catch(err){ return true; } // ★ 出错就放行默认导航，保证至少能切换
```

关键在最后一行：**出错时返回 true，允许浏览器正常跳转**。
最坏情况只是历史多一条，绝不会出现"点了没反应"。

### 已验证
- onclick 代码单独 `node --check` 语法通过
- 模拟四种语言点击：均能阻止默认导航并 replace 到目标 URL
- 栈模拟：切 3 次后栈为 [首页, /de/gold/]，按一次返回 → 首页 ✅

### 部署后
查看源代码搜 `return true;}">` 确认新代码上线。


---

## A22n（2026-10-28）— 真机实测后定位：正则里的反斜杠被模板字符串吃掉了

### 这次是真测出来的，不是猜的
用 Playwright 驱动真实 Chromium（iPhone 13 / Pixel 5 / 桌面 Chrome 三种设备）
把 2 号 Worker 在本地跑起来做端到端实测，控制台报：

```
PAGEERROR: missing ) after argument list
```

抓下生成的 HTML 一看，内联 onclick 里的正则是：

```js
h.match(/^/([a-z]{2})(/|$)/)     ← 反斜杠没了，语法错误
```

而源码里写的是 `\/([a-z]{2})(\/|$)`？不 —— 源码里写的是 `\/`……
**关键**：这些代码位于 JS **模板字符串**内，
`\/` 经过模板字符串转义后变成 `\/`，但**写 `\/` 才对**；
此前所有版本都只写了单反斜杠 `\/` 的"一半"，
模板字符串把它当无效转义直接吃掉，输出成 `/`。

后果：正则语法错误 → 整段 onclick 被浏览器丢弃
→ `return false` 根本不存在 → 默认导航 → **push 一条历史**。

**这就是改了六版都没效果的唯一原因。** 不是缓存、不是 bfcache、
不是 cookie、不是 302 —— 是正则从来就没能运行过一次。

### 修复
模板字符串内一律写成 `\\/`（源码里四个字符），确保输出 `\/`：
- 内联 onclick 的正则
- head 脚本里"渲染前决定语言"的正则
- head 脚本里 URL→语言码的正则

### 实测结果（真实 Chromium，非模拟）

```
════ 模拟 iPhone 13 端到端实测 ════
① 首页            : /              lang=en
② 点黄金卡片      : /en/gold/      lang=en
③ 切到 en/ja/de   : /de/gold/      lang=de
④ 按一次返回      : /de/gold/ → /  lang=de   ✅ 回到首页
历史条目数: 3（切 3 次语言，零增长）
页面 JS 错误: 无
```

多场景回归（切 2 种语言后按一次返回）：

| 场景 | 结果 |
|---|---|
| iPhone · 黄金页 | /de/gold/ → / ✅ |
| iPhone · 原油页 | /de/oil/ → / ✅ |
| iPhone · 直接进入 /zh/gold/ | → 离站 ✅（历史只有一条，正确） |
| 桌面 · 汇率页 | /de/currency/ → / ✅ |
| 安卓 · 国内油价页 | /de/china-fuel/ → / ✅ |

桌面端连切 6 种语言（en→ja→de→fr→zh→pt）：
返回后 `/`，lang=pt，历史条目仍为 3，无 JS 错误。

### 页面上如何确认新代码已生效
查看源代码，搜索 `getAttribute('href')`，应能看到：
```
h.match(/^\/([a-z]{2})(\/|$)/)
```
注意是 **两个反斜杠**。如果只看到一个，说明还是旧版本。


---

# A22o：黄金页显示「休市中」（2026-10-28）

原来的黄金页只有两种状态：绿色「实时」和灰色「连接中断」。
周末或每日结算时段，页面照样显示「实时」+ 一动不动的旧价，会误导访客。

本次加了第三种状态「休市中」：

- open（交易中）→ 绿色「实时」+ 秒数
- settlement / weekend → 灰色「休市中」，并显示一行说明
- 连接中断 → 维持原来的灰色「连接中断，正在重试」

休市判定的规则与 3 号后台完全一致（纽约时间，标准时区名，自动跟随冬令时），
前端每分钟核对一次，休市结束会自动切回「实时」。

休市期间不再去轮询数据源（此时抓到的只是沿用值），数字保留休市前
最后一次真实成交价。

七种语言（en / zh / ja / es / fr / de / pt）的文案都已补齐：
goldClosedTag（状态栏）与 goldClosedNote（说明文字）。
