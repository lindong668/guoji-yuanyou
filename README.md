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
