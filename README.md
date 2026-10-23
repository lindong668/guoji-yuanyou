# PriceScope

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
