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

## A13 变更（2026-10-24）— 更换品牌图标

**背景**：用户反馈 A12 的"金色油滴"图标缩小后只是一个色块，辨识度差，
不够匹配行情站调性，希望换成"高端大气、类似 1号 玻璃水晶 3D"的风格。

**新图标**：三根递增的玻璃水晶柱（蓝 / 金 / 红橙），最右侧柱条延伸为
向右上方的发光箭头 —— 玻璃质感 3D 渲染，深色底。

**裁剪处理（关键）**
- 原图 1601x1440（含背景渐变、右侧箭头光晕、下方镜面倒影）
- 逐扫描线定位圆角方形框：框顶 y=108、框底 y=1345、框左 x=196、框右 x=1374
- 以框中心 (785, 726) 裁 1250x1250 正方形，含完整圆角框，剔除倒影与多余光晕

**★ OG 分享图居中保证**
- 画布 1200x630，微信/QQ 按中心 630x630 方形裁切
- 图标 420x420 置于中心 (600, 250)，品牌名与副标题在下方
- 实测内容范围：行 42-601、列 390-809
- 中心方形安全区：行 0-630、列 285-915
- 结论：内容完整落在安全区内，方形裁切后 100% 保留（此前版本仅 ~50%）

**体积优化**
- OG 图 265KB → 256 色量化 128KB（玻璃质感渐变经抖动处理后无明显色带）
- icons.js 136KB → 277KB，Workers 脚本上限 1MB（压缩后），余量充足
- OG 图另存 256 色是专门为控制脚本体积，非画质妥协

**文件**：src/icons.js 内 6 组 base64 全部替换
  FAVICON_ICO / FAVICON_16 / FAVICON_32 / APPLE_180 / OG_IMAGE / LOGO_128
- 站内左上角 /icon-128.png 与分享图同源，站内外自动一致，无需改 ui.js
- 部署：无增删 → 覆盖上传（11 文件）
