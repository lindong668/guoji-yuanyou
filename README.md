# 2 号站停服重定向包（A46-STOP）

## 这是什么

2 号站 `you.piccalc.com`（PriceScope 原油/黄金/汇率）因**数据源授权风险**停止运营。
这个包把整站换成「纯重定向 Worker」，把所有已收录页面 301 到 5 号站 CalcHub。

**只有 2 个文件**，不依赖原来那 31 个文件里的任何一个。

```
src/index.js      纯重定向逻辑（168 行）
wrangler.toml     精简后的配置
```

## 为什么跳到 5 号（home.saoo.me）

| 候选 | 品类 | 结论 |
|---|---|---|
| **5号 CalcHub** | 房贷/信用卡/**汇率**计算 | ✅ **选它** —— 唯一同属金融计算品类，且有汇率计算器 + 2 篇汇率指南 |
| 1号 PicStudio | 图片工具 | ✗ 品类完全不相关 |
| 4号 导航站 | 工具导航 | ✗ 不相关，硬指会被判软 404 |
| 6号 Mensura | 单位换算 | ✗ 不相关 |

2 号的 4 个板块里，**只有汇率的主题在 5 号有对应内容**，所以只给汇率做精准映射，
原油/黄金/油价一律落到 5 号首页 —— 不相关却硬指具体页，会被 Google 判为软 404，
比指向首页更糟。

## 跳转规则

| 2 号路径 | 跳到 |
|---|---|
| `/{lang}/currency/` | `home.saoo.me/#fx`（汇率计算器） |
| `/{lang}/blog/mid-market-vs-bank-rate/` | `home.saoo.me/guides/exchange-rate-basics.html` |
| `/{lang}/blog/` `/{lang}/faq/` | `home.saoo.me/guides/` |
| `/{lang}/privacy/` `/about/` `/contact/` | 5 号同名页 |
| `/` `/oil/` `/wti/` `/oil-report/` `/gold/` `/china-fuel/` | `home.saoo.me/` |
| 其它未知路径 | `home.saoo.me/` |

7 种语言前缀（en zh ja es fr de pt）都会先剥离再匹配。

## 三个刻意保留的文件（决定权重能不能传过去）

```
/robots.txt      保持 Allow —— 禁抓会让 Google 无法跟随重定向，权重直接断
/sitemap.xml     原样输出全部 154 个 URL —— Google 靠它发现所有页面才会抓
/ads.txt         避免 AdSense 报「ads.txt 缺失」
```

**这三个不要删。** 尤其 robots.txt 不能改成 Disallow。

## 部署

```
方式一（命令行）：
  npx wrangler deploy

方式二（网页上传）：
  CF 控制台 → Workers 和 Pages → guoji-yuanyou
  → 上传 src/index.js + wrangler.toml（整站替换）
```

⚠️ **这是整站替换，不是叠加。** 部署后原 31 个文件不再需要。
原源码已封存为 `2号_A45_一键生成源码.py`，想回来跑一下就还原。

## 部署后验证

```
浏览器打开 you.piccalc.com/zh/oil/
→ 地址栏应变成 home.saoo.me

curl -I https://you.piccalc.com/en/currency/
→ 应返回 301，Location: https://home.saoo.me/#fx
```

## 顺带要做的事（不在本包内）

1. **AdSense 后台移除 you.piccalc.com 这个站点**
   不移除的话，一个已停服的站点挂在账号里，可能影响账号健康度。
2. **Search Console** 里该站可以保留观察，看 301 有没有被正确跟随。
3. 4 号导航站的 PriceScope 链接已清理（见 4 号 C21 包）。

## 测试

```
node test.mjs
```

26 项全过：精准映射、7 语前缀剥离、301 状态码、sitemap 154 条、
robots 保持 Allow、ads.txt 原样返回、未知路径兜底。
