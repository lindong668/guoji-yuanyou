# PriceScope — 2 号原油站（生产源码）

实时国际原油、黄金、国内油价与汇率的多语言站点，运行在 Cloudflare Workers。

## 目录结构

```
src/
  index.js     入口，路由与页面装配
  oilLive.js   布伦特 / WTI 实时价（多源可插拔）
  goldLive.js  黄金实时价
  data.js      3 号后端数据（国内油价、汇率等）
  pages.js     各页面 HTML 生成
  content.js   文章内容
  articles.js  文章数据
  i18n.js      多语言文案
  ui.js        界面组件
public/        站点图标（静态资源，由 [assets] 托管）
wrangler.toml  CF Workers 配置
package.json   依赖 wrangler
```

## 部署前必做：配置 3 号密钥

代码里**没有内置任何密钥**，密钥由平台侧加密注入。

在 Cloudflare 后台：

```
Workers 和 Pages → 本项目 → 设置 → 变量和机密 → 添加

  类型  密钥 / Secret（加密，不进代码、不进 Git）
  名称  SITE3_KEY
  值    <你的 3 号访问密钥>
```

未配置时，国内油价模块会显示「0 个地区」（抓不到 3 号），
但布伦特 / WTI / 黄金不受影响（它们走新浪、腾讯等公开源）。

> 注意：`wrangler.toml` 里**故意不写** `SITE3_KEY`。
> 明文空值会顶掉加密 Secret，导致"配了值却依然取不到数"。

## 原油主源顺序

```
第 1 批  新浪 hf_OIL/hf_CL → 腾讯 hf_OIL/hf_CL   （真·实时，秒级）
第 2 批  Yahoo chart / spark                      （兜底，约 10 分钟延迟）
```

新浪、腾讯都失败时自动降级到 Yahoo，不会开天窗。

## 部署

推送到绑定的 Git 仓库即自动部署（Workers Builds），或本地执行：

```bash
npx wrangler deploy
```
