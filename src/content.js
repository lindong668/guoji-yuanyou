// ============================================================
// PriceScope — Editorial content module (original, human-written)
//
// WHY THIS FILE EXISTS
// A pure data dashboard carries almost no original text. AdSense
// reviewers look for substantive, genuinely useful content, so every
// market page now ships with an explainer section and an FAQ.
//
// The copy below is written per language (not machine-translated
// boilerplate) so each locale reads naturally to a human reviewer.
//
// Shape:
//   CONTENT[lang][page] = {
//     intro:    one-paragraph lead shown under the price card
//     sections: [{ h, p }]  explainer blocks
//     faq:      [{ q, a }]  page-specific questions
//   }
//   CONTENT[lang].common = shared disclaimer / source strings
//   CONTENT[lang].faqPage = site-wide FAQ page copy
// ============================================================

export const CONTENT = {
  /* ============================== EN ============================== */
  en: {
    common: {
      dataSources: 'Data sources',
      sourcesBody: 'Brent crude — the international oil benchmark price. WTI crude — the US oil benchmark price. International gold (XAU/USD) — the open spot market price, taken from several independent providers and updated in real time in your browser. China retail fuel prices — provincial maximum retail guidance prices. Reference FX rates — mid-market rates. All figures are indicative reference values, not exchange settlement prices.',
      disclaimerTitle: 'Disclaimer',
      disclaimerBody: 'The prices and rates shown here are reference figures for general information only. They are not exchange settlement prices and must not be used for trading, settlement, accounting or any investment decision. Figures may be delayed and may differ from those quoted by your bank, broker or local retailer.',
      learnMore: 'Learn more',
      faqHeading: 'Frequently asked questions',
      aboutThisData: 'About this data',
    },
    oil: {
      intro: 'Brent crude is the price benchmark for roughly two thirds of the world\'s internationally traded oil. The figure below is quoted in US dollars per barrel and updated in real time during trading hours.',
      sections: [
        { h: 'What is Brent crude oil?', p: 'Brent is a light, sweet crude blend produced from oil fields in the North Sea between the United Kingdom and Norway. Because it is low in sulphur and relatively easy to refine, it became the reference grade against which most internationally traded crude is priced. When news reports say "the oil price", they are usually quoting Brent.' },
        { h: 'Why Brent is the global benchmark', p: 'Unlike landlocked grades, Brent can be loaded onto tankers directly at sea, which makes it easy to trade and ship anywhere. That physical flexibility, combined with a deep futures market on the ICE exchange, turned it into the pricing anchor for crude sold from Europe, Africa and the Middle East to Asia.' },
        { h: 'How the price is quoted', p: 'Brent is quoted in US dollars per barrel, and one barrel equals 42 US gallons or about 159 litres. To convert to a per-litre figure, divide the barrel price by 159. The US dollar quotation means that a stronger dollar tends to make oil more expensive for buyers using other currencies, even when the underlying price has not moved.' },
        { h: 'What moves the price', p: 'Supply decisions by OPEC and other major producers, geopolitical events in producing regions, changes in global demand, refinery maintenance seasons and currency swings in the US dollar all influence the quote. Because oil is priced in dollars, currency moves alone can shift the figure.' },
      ],
      faq: [
        { q: 'How often is the Brent price updated?', a: 'Prices update in real time during trading hours, with a brief cache so pages load fast. Markets close at weekends, so the most recent trading day figure is shown until trading resumes.' },
        { q: 'Is this the official settlement price?', a: 'No. The figure is a market reference price from public data providers, not an official exchange settlement. It is suitable for tracking general trends, not for settlement or trading.' },
        { q: 'Why does the price not change at weekends?', a: 'Global oil markets close for the weekend. Any figure shown over Saturday and Sunday is the last price from the previous trading session.' },
      ],
    },
    gold: {
      intro: 'Gold is quoted internationally in US dollars per troy ounce. The gram figure is derived from that quote, so both move together.',
      sections: [
        { h: 'What is the international gold price?', p: 'The international spot price, often written as XAU/USD, is the price of one troy ounce of pure gold in US dollars. It is set by continuous trading across major dealing centres and is the reference used by bullion dealers, jewellers and financial institutions worldwide.' },
        { h: 'Troy ounces and grams', p: 'Precious metals use the troy ounce, which is about 31.1035 grams — slightly heavier than an ordinary ounce of 28.35 grams. To convert a gram price into a troy ounce price, multiply by 31.1035. Most retail jewellery is sold by the gram, so the gram figure is usually the more practical one for personal purchases.' },
        { h: 'Purity and fineness', p: 'The spot price refers to pure 24-carat gold. Lower-carat items contain less gold: 18-carat is 75% gold, 14-carat about 58.5%. To estimate the gold value of an item, multiply its weight by its fineness and then by the current price.' },
        { h: 'What moves the price', p: 'Gold responds to real interest rates, inflation expectations, the strength of the US dollar, central bank purchasing and demand for safe-haven assets during periods of uncertainty. Because it is quoted in dollars, it often moves inversely to the dollar.' },
      ],
      faq: [
        { q: 'How often is the gold price updated?', a: 'Continuously. While the market is open, the figure on this page updates in real time in your browser straight from the spot market, with several independent providers standing behind it. A server-side copy captured every three minutes supplies the first paint and acts as a fallback.' },
        { q: 'Why is the gram price different from what my jeweller quotes?', a: 'Retail prices include making charges, design costs, taxes and a dealer margin on top of the metal value. This page shows the raw metal reference price only.' },
        { q: 'Is this the price I would get if I sold gold?', a: 'Not necessarily. Dealers buy back below the spot price and may apply assay or handling fees. Treat the figure here as a benchmark for comparison.' },
      ],
    },
    cn: {
      intro: 'China publishes maximum retail fuel prices per province. The figures below are guidance ceilings in yuan per litre, revised periodically by the national pricing authority.',
      sections: [
        { h: 'How China sets fuel prices', p: 'Retail fuel prices in mainland China follow a managed pricing mechanism. The national authority adjusts the ceiling price when the moving average of international crude prices moves beyond a set threshold, and adjustments are reviewed on a cycle of roughly ten working days. When international crude moves very sharply, the mechanism also dampens the pass-through to protect consumers and industry.' },
        { h: 'Why prices differ by province', p: 'The national guidance sets a baseline, but each province publishes its own ceiling. Transport distance from refineries and ports, local distribution costs, regional taxes and market conditions all create variation. This is why inland provinces are often slightly more expensive than coastal ones.' },
        { h: 'What the grades mean', p: 'The numbers 92, 95 and 98 refer to the research octane number, a measure of resistance to engine knocking. Higher numbers suit engines with higher compression ratios. Choosing a grade above what your engine requires does not usually improve performance, so the manufacturer recommendation in your handbook is the right guide.' },
        { h: 'Diesel and seasonal grades', p: 'Zero-grade diesel is the standard automotive diesel grade. In colder northern regions, seasonal variants with lower cloud points are supplied in winter to prevent waxing in the fuel system.' },
      ],
      faq: [
        { q: 'Are these the exact prices at the pump?', a: 'They are provincial maximum retail guidance prices. Individual stations may offer discounts or adjustments, so the price you actually pay can be slightly lower.' },
        { q: 'How often does the price change?', a: 'The guidance is reviewed roughly every ten working days, or sooner when international crude moves sharply. This page follows the official revision cycle.' },
        { q: 'Why is my city different from the provincial figure?', a: 'Some provinces publish a single provincial ceiling while others differentiate by city or region. Check the entry closest to your location.' },
      ],
    },
    fx: {
      intro: 'The converter below uses reference exchange rates that are updated in real time during trading hours. It is designed for quick estimates rather than exact settlement.',
      sections: [
        { h: 'What is a reference exchange rate?', p: 'A mid-market or reference rate sits roughly halfway between the buy and sell prices that banks quote each other. It is the fairest single number to describe what a currency is worth at a point in time, and it is what most public rate tables display.' },
        { h: 'Why your bank gives a different number', p: 'Retail and commercial banks add a margin on top of the mid-market rate, and card networks add their own spread and fees. That is why the rate you receive in practice is usually a little worse than the reference rate shown here.' },
        { h: 'How to read a currency pair', p: 'In a pair such as USD/CNY, the first currency is the base and the second is the quote. The number tells you how much of the quote currency one unit of the base currency buys. If the number rises, the base currency has strengthened against the quote currency.' },
        { h: 'What moves exchange rates', p: 'Interest rate differentials between countries, inflation outlook, trade balances, capital flows, political stability and central bank policy all influence rates. Currency markets are open around the clock on weekdays but close at weekends, which is why rates appear frozen from Friday evening to Sunday.' },
      ],
      faq: [
        { q: 'How current are these rates?', a: 'Rates are updated in real time during trading hours. They are suitable for budgeting and comparison, but not for executing a transfer.' },
        { q: 'Is this the rate my bank will give me?', a: 'No. Banks and money transfer services apply a margin and fees on top of the reference rate. Expect the practical rate to differ.' },
        { q: 'Can I use this for accounting or settlement?', a: 'No. Use the official rate published by your bank, payment provider or tax authority for any financial record.' },
      ],
    },
    wti: {
      intro: 'WTI is the benchmark crude for the United States and the second most quoted oil price in the world after Brent. It is quoted in US dollars per barrel and updated in real time while US markets are trading.',
      sections: [
        { h: 'What is WTI crude oil?', p: 'West Texas Intermediate is a light, sweet crude grade produced primarily in the US Permian Basin and the mid-continent. It is very light and very low in sulphur — arguably the highest quality of the major benchmarks — which makes it especially attractive to refineries configured for gasoline production. Despite the name, it is no longer produced only in Texas; the grade now describes a specification rather than a single geographic source.' },
        { h: 'Why WTI is delivered at Cushing', p: 'The WTI futures contract settles at Cushing, Oklahoma — an inland hub where dozens of pipelines converge and hundreds of storage tanks sit. That concentration of infrastructure makes it the natural pricing point for US inland crude. But it is also WTI\'s structural weakness: oil sitting in Cushing must leave by pipeline, and when those pipelines are full the local price can fall out of step with the seaborne international market.' },
        { h: 'WTI and Brent: why two benchmarks', p: 'Both are light sweet crudes, so over long periods their prices move together. The gap between them is not a mistake — it reflects real differences in logistics. Brent can be loaded directly onto tankers in the North Sea and shipped anywhere, so it tracks the global seaborne market. WTI is priced inland in the American mid-continent, so it responds more sharply to US pipeline capacity, Cushing inventory levels and domestic shale output.' },
        { h: 'What the Brent–WTI spread tells you', p: 'The difference between the two prices is one of the most watched numbers in energy. When Brent trades well above WTI, it usually means US crude is trapped inland by pipeline constraints or a supply glut. When the gap narrows, it often signals that export capacity has expanded or that global supply has tightened. Reading the two together gives a far clearer picture of the oil market than either price alone.' },
      ],
      faq: [
        { q: 'Is WTI the oil price US drivers pay?', a: 'It is the main reference for US crude, but pump prices also depend on refining costs, distribution, taxes and regional supply. WTI tells you what the raw crude costs, not what the finished fuel costs.' },
        { q: 'Why is WTI usually cheaper than Brent?', a: 'It often is, but not always. WTI is priced at an inland hub rather than a seaport, so it is more sensitive to US pipeline bottlenecks and domestic inventory. A wide gap generally reflects a logistics constraint rather than a difference in oil quality.' },
        { q: 'How often is the WTI price updated?', a: 'The figure updates in real time while markets are trading, with a brief cache for fast delivery. Markets close at weekends, so the most recent trading day level is shown until trading resumes.' },
      ],
    },
    faqPage: {
      lead: 'Answers to the questions visitors ask most often about how this site collects and presents market data.',
      items: [
        { q: 'Is PriceScope free to use?', a: 'Yes. Every page is free and requires no registration or subscription.' },
        { q: 'Where does the data come from?', a: 'Every page names its own sources. Brent and WTI crude are the international and US oil benchmark prices. International gold (XAU/USD) is the open spot market price, taken from several independent providers. China retail fuel prices are provincial maximum retail guidance prices. Reference FX rates are mid-market rates. All figures are indicative reference values, not exchange settlement prices.' },
        { q: 'How often is data refreshed?', a: 'International gold updates in real time in your browser while the market is open. Brent and WTI update in real time during trading hours. China fuel prices follow the official revision cycle of roughly ten working days. Currency rates are refreshed daily. Global markets close at weekends, so weekend figures reflect the last trading session until trading resumes.' },
        { q: 'Are these official prices?', a: 'No. All figures are reference prices intended for general information. They are not exchange settlement prices and should not be used for trading, settlement or accounting.' },
        { q: 'Can I rely on this for investment decisions?', a: 'No. The data is provided for general information only and does not constitute investment advice. Always confirm figures with a licensed professional or an official source before acting.' },
        { q: 'Do you store my personal data?', a: 'The site does not require registration. Please read the privacy policy for full details on cookies and analytics.' },
        { q: 'How do I report a problem with the data?', a: 'Use the email address on the contact page. Reports about specific figures are genuinely appreciated and investigated promptly.' },
      ],
    },
  },

  /* ============================== ZH ============================== */
  zh: {
    common: {
      dataSources: '数据来源',
      sourcesBody: '布伦特原油 —— 国际原油市场基准报价。WTI 原油 —— 美国原油基准报价。国际黄金（XAU/USD）—— 公开现货市场报价，取自多个独立数据源，在你的浏览器中实时更新。中国成品油价格 —— 各省最高零售指导价。参考汇率 —— 中间市场汇率。所有数据均为指示性参考价，非交易所结算价。',
      disclaimerTitle: '免责声明',
      disclaimerBody: '本页所示价格与汇率仅为一般性参考信息，并非交易所结算价，不得用于交易、结算、记账或任何投资决策。数据可能存在延迟，且与你的银行、券商或当地零售商所报价格可能存在差异。',
      learnMore: '了解更多',
      faqHeading: '常见问题',
      aboutThisData: '关于本页数据',
    },
    oil: {
      intro: '布伦特原油是全球约三分之二国际原油贸易的定价基准。下方报价以美元/桶计，交易时段实时更新。',
      sections: [
        { h: '什么是布伦特原油？', p: '布伦特是产自英国与挪威之间北海油田的一种轻质低硫原油。由于含硫量低、易于炼化，它成为国际原油贸易中最主要的参考油种。当新闻报道提到「国际油价」时，通常指的就是布伦特价格。' },
        { h: '为什么它成为全球基准', p: '与内陆油种不同，布伦特原油可在海上直接装船，便于运输到世界任何地方。这种物流上的灵活性，加上 ICE 交易所成熟的期货市场，使它成为欧洲、非洲、中东销往亚洲原油的定价锚。' },
        { h: '报价单位与换算', p: '布伦特以美元/桶报价，1 桶等于 42 美制加仑，约 159 升。换算成每升价格时，用每桶价格除以 159 即可。由于以美元计价，美元走强时，使用其他货币的买家即使在国际油价未变的情况下也会感到更贵。' },
        { h: '影响价格的因素', p: 'OPEC 及主要产油国的产量决策、产区的地缘政治事件、全球需求变化、炼厂检修季节以及美元汇率波动都会影响报价。因为石油以美元计价，汇率变动本身就能改变数字。' },
      ],
      faq: [
        { q: '布伦特价格多久更新一次？', a: '价格在交易时段实时更新，并做短暂缓存以便快速分发。市场周末休市，因此在恢复交易前显示的是最近一个交易日的价格。' },
        { q: '这是官方结算价吗？', a: '不是。这是来自公开数据服务商的市场参考价，并非交易所官方结算价。适合用于观察整体趋势，不适用于结算或交易。' },
        { q: '为什么周末价格不变？', a: '全球原油市场周末休市。周六和周日显示的均为上一交易日最后一笔价格。' },
      ],
    },
    gold: {
      intro: '国际金价以美元/金衡盎司报价。克价由该报价换算而来，因此两者同步变动。',
      sections: [
        { h: '什么是国际金价？', p: '国际现货金价通常写作 XAU/USD，即每金衡盎司纯金的美元价格。它由全球主要交易中心的连续交易形成，是金条经销商、珠宝商和金融机构普遍采用的参考价。' },
        { h: '金衡盎司与克', p: '贵金属使用金衡盎司，约合 31.1035 克，比常衡盎司的 28.35 克略重。要把克价换算成金衡盎司价，乘以 31.1035 即可。零售金饰多按克计价，因此克价通常对个人购买更实用。' },
        { h: '成色与纯度', p: '现货金价对应的是纯金，即 24K。低成色饰品含金量更低：18K 为 75%，14K 约为 58.5%。估算一件金饰的黄金价值时，用重量乘以成色再乘以当前金价。' },
        { h: '影响金价的因素', p: '实际利率、通胀预期、美元强弱、各国央行的购金行为，以及市场不确定性时期的避险需求，都会影响金价。由于以美元计价，金价常与美元呈反向走势。' },
      ],
      faq: [
        { q: '金价多久更新一次？', a: '持续更新。开市期间，本页数字在你的浏览器中直接跟随现货市场实时刷新，背后由多个独立数据源互为备用。服务端另有每 3 分钟采集的副本，用于首屏显示与兜底。' },
        { q: '为什么克价与金店报价不同？', a: '零售价格在此金属价之上还包含工费、设计费、税费和经销商利润。本页显示的仅为金属参考价。' },
        { q: '这是我卖出黄金能得到的价格吗？', a: '不一定。经销商回购价通常低于现货价，并可能收取检测或手续费。请把本页数字当作比价基准。' },
      ],
    },
    cn: {
      intro: '中国按省公布成品油最高零售价格。以下为以元/升计的指导价上限，由国家价格主管部门定期调整。',
      sections: [
        { h: '成品油定价机制', p: '中国内地成品油零售价格实行有管理的定价机制。当国际原油价格移动平均值超过设定幅度时，国家主管部门会相应调整最高限价，调整周期大致为每十个工作日一次。当国际原油价格剧烈波动时，机制还会对传导幅度进行适当调控，以保护消费者和产业。' },
        { h: '为什么各省价格不同', p: '国家指导价给出基准，但各省会公布各自的最高限价。从炼厂和港口的运输距离、地方配送成本、区域税费以及市场状况都会造成差异，这也是内陆省份油价通常略高于沿海地区的原因。' },
        { h: '标号代表什么', p: '92、95、98 指的是研究法辛烷值，衡量汽油抗爆震的能力。标号越高，越适合压缩比更高的发动机。使用高于发动机要求的标号通常不会提升性能，因此车辆手册中的厂家建议才是对的参考。' },
        { h: '柴油与季节标号', p: '0 号柴油是标准的车用柴油标号。在北方寒冷地区，冬季会供应浊点更低的季节性牌号，以防止燃油系统结蜡。' },
      ],
      faq: [
        { q: '这是加油站的实际价格吗？', a: '这是各省最高零售指导价。个别加油站可能提供优惠或向下浮动，因此你实际支付的价格可能略低。' },
        { q: '价格多久调整一次？', a: '指导价大致每十个工作日调整一次，若国际原油价格剧烈波动则会更频繁。本页跟随官方调整周期更新。' },
        { q: '为什么我所在城市与省级价格不同？', a: '部分省份只公布省级统一上限，另一些则按城市或区域分别定价。请选择与你所在地最接近的条目。' },
      ],
    },
    fx: {
      intro: '下方换算器使用按每日计划刷新的参考汇率，适合快速估算，不适用于精确结算。',
      sections: [
        { h: '什么是参考汇率？', p: '参考汇率（中间价）大致处于银行间买卖报价的中间位置。它最能公平地描述某一时刻一种货币的价值，也是大多数公开汇率表所采用的口径。' },
        { h: '为什么银行给的汇率不同', p: '零售银行和商业银行会在中间价之上加点，卡组织还会额外收取价差和手续费。这就是你实际拿到的汇率通常比本页参考汇率略差的原因。' },
        { h: '如何看懂货币对', p: '在 USD/CNY 这样的货币对中，前者是基准货币，后者是报价货币。数字表示一单位基准货币能兑换多少报价货币。数字上升，说明基准货币相对报价货币走强。' },
        { h: '影响汇率的因素', p: '国家间的利率差、通胀预期、贸易收支、资本流动、政治稳定性以及央行政策都会影响汇率。外汇市场在工作日全天候运行，周末休市，因此周五晚到周日汇率会显示为冻结状态。' },
      ],
      faq: [
        { q: '这些汇率有多及时？', a: '汇率按每日计划刷新，适合预算估算和比较，但不适用于实际转账操作。' },
        { q: '这是银行会给我的汇率吗？', a: '不是。银行和汇款机构会在参考汇率之上加点并收取费用，实际汇率会有所不同。' },
        { q: '可以用于记账或结算吗？', a: '不可以。任何财务记录请使用你的银行、支付机构或税务机关公布的官方汇率。' },
      ],
    },
    wti: {
      intro: 'WTI 是美国原油的定价基准，也是继布伦特之后全球第二大受关注的油价指标。以美元每桶报价，在美盘交易时段内持续更新。',
      sections: [
        { h: 'WTI 原油是什么', p: 'WTI 全称西德克萨斯中质原油（West Texas Intermediate），主产区在美国二叠纪盆地与中部大陆地区。它属于轻质低硫原油，密度低、含硫量少——品质在各大基准油中堪称最优，对以汽油为主要产品的炼厂尤其有吸引力。尽管名字里带着“德克萨斯”，但它如今已不再局限于德州产地，更多是指一套品质规格，而非某一个具体油田的产出。' },
        { h: '为什么交割地是库欣', p: 'WTI 期货合约的交割地设在俄克拉何马州的库欣——那里是数十条管道交汇、数百座储油罐林立的内陆枢纽。这种基础设施的高度集中，让它成为美国内陆原油最自然的定价点。但这也正是 WTI 的结构性弱点：滞留在库欣的原油只能依靠管道外运，一旦管道满负荷，当地价格就会与国际海运市场脱节。' },
        { h: 'WTI 与布伦特：为什么会有两个基准', p: '两者同属轻质低硫原油，长期走势高度一致。它们之间的价差不是误差，而是物流差异的真实反映。布伦特可在北海直接装船运往任何地方，因此紧贴全球海运市场；WTI 在美国中部内陆定价，对美国管道运力、库欣库存水平和本土页岩油产量的反应更为敏感。' },
        { h: '布伦特与 WTI 的价差告诉了你什么', p: '这两个价格之间的差值，是能源领域最受关注的数字之一。布伦特明显高于 WTI，通常意味着美国原油因管道瓶颈或供应过剩被困在内陆；价差收窄，则往往说明出口能力已经提升，或全球供应趋紧。把两个价格放在一起看，比只看其中一个更能看清整个原油市场。' },
      ],
      faq: [
        { q: '美国车主加的油是按 WTI 计价的吗？', a: 'WTI 是美国原油的主要参照，但加油站的实际价格还要叠加炼化成本、运输分销、税费和区域供需。WTI 告诉你原油本身值多少钱，不代表成品油的最终售价。' },
        { q: '为什么 WTI 通常比布伦特便宜？', a: '多数时候如此，但并非绝对。WTI 在内陆枢纽而非海港定价，对美国管道瓶颈和本土库存更敏感。价差拉大通常反映的是物流受阻，而不是油品质量有差别。' },
        { q: 'WTI 价格多久更新一次？', a: '价格在交易时段内采集并缓存以便快速呈现。周末市场休市，此时显示的是最近一个交易日的水平，直到恢复交易。' },
      ],
    },
    faqPage: {
      lead: '关于本站如何采集与呈现市场数据，以下是访客最常提出的问题与解答。',
      items: [
        { q: 'PriceScope 是免费使用的吗？', a: '是的。所有页面免费开放，无需注册或订阅。' },
        { q: '数据来自哪里？', a: '每个页面都单独标注自己的来源。布伦特原油与 WTI 原油为国际与美国原油基准报价；国际黄金（XAU/USD）为公开现货市场报价，取自多个独立数据源；中国成品油价格为各省最高零售指导价；参考汇率为中间市场汇率。所有数据均为指示性参考价，非交易所结算价。' },
        { q: '数据多久刷新一次？', a: '国际黄金在开市期间于你的浏览器中实时更新；布伦特与 WTI 原油在交易时段实时更新；国内成品油价格跟随官方约每 10 个工作日的调整周期；参考汇率每日刷新。全球市场周末休市，周末显示的是最近一个交易日的数值。' },
        { q: '这些是官方价格吗？', a: '不是。所有数字均为一般性参考信息，并非交易所结算价，不得用于交易、结算或记账。' },
        { q: '可以作为投资决策依据吗？', a: '不可以。本站数据仅供一般性参考，不构成投资建议。实际操作前请务必向持牌专业人士或官方渠道核实。' },
        { q: '你们会存储我的个人数据吗？', a: '本站无需注册即可使用。关于 Cookie 和分析工具的完整说明，请参阅隐私政策。' },
        { q: '如何反馈数据问题？', a: '请使用联系页面上的邮箱。我们真诚欢迎针对具体数字的反馈，并会及时核查。' },
      ],
    },
  },

  /* ============================== JA ============================== */
  ja: {
    common: {
      dataSources: 'データ提供元',
      sourcesBody: 'ブレント原油 —— 国際原油市場の指標価格。WTI原油 —— 米国の原油指標価格。国際金（XAU/USD）—— 公開スポット市場価格。複数の独立した情報源から取得し、ブラウザ上でリアルタイムに更新されます。中国の小売燃料価格 —— 省別の小売最高指導価格。参考レート —— 仲値レート。すべて指示性の参考値であり、取引所の清算価格ではありません。',
      disclaimerTitle: '免責事項',
      disclaimerBody: '本ページの価格と為替レートは一般的な参考情報であり、取引所の清算価格ではありません。取引、決済、会計、投資判断には使用しないでください。データは遅延する場合があり、銀行や証券会社、地域の販売店が提示する数値と異なることがあります。',
      learnMore: '詳しく見る',
      faqHeading: 'よくある質問',
      aboutThisData: 'このデータについて',
    },
    oil: {
      intro: 'ブレント原油は、国際的に取引される原油の約3分の2の価格指標です。以下の価格は1バレルあたりの米ドルで表示され、取引時間中はリアルタイムで更新されます。',
      sections: [
        { h: 'ブレント原油とは', p: 'ブレントは、英国とノルウェーの間の北海油田で産出される軽質・低硫黄の原油ブレンドです。硫黄分が少なく精製しやすいため、国際的な原油取引の基準油種となりました。報道で「原油価格」と言われる場合、通常はブレントの価格を指します。' },
        { h: '世界的な指標となった理由', p: '内陸の油種と異なり、ブレントは海上で直接タンカーに積めるため、世界中へ輸送しやすいという特徴があります。この物流上の柔軟性と、ICE取引所の成熟した先物市場により、欧州・アフリカ・中東からアジアへ販売される原油の価格指標となりました。' },
        { h: '価格の表示方法', p: 'ブレントは1バレルあたりの米ドルで表示され、1バレルは42米ガロン、約159リットルです。リットルあたりに換算するには、バレル価格を159で割ります。米ドル建てのため、ドル高になると原油価格自体が動かなくても他通貨の買い手には割高に感じられます。' },
        { h: '価格を動かす要因', p: 'OPECや主要産油国の生産判断、産油地域の地政学的イベント、世界需要の変化、製油所の定期修理時期、米ドルの為替変動などが価格に影響します。ドル建てであるため、為替の動きだけでも数値は変化します。' },
      ],
      faq: [
        { q: 'ブレント価格はどのくらいの頻度で更新されますか？', a: '取引時間中はリアルタイムで価格を更新し、高速配信のため短時間キャッシュしています。市場は週末に閉まるため、取引再開までは直近の営業日の数値を表示します。' },
        { q: 'これは公式の清算価格ですか？', a: 'いいえ。公開データ提供者による市場参考価格であり、取引所の公式清算価格ではありません。全体的な傾向の把握には適していますが、決済や取引には使用できません。' },
        { q: '週末に価格が変わらないのはなぜですか？', a: '世界の原油市場は週末に休場します。土曜・日曜に表示されるのは、直前の営業日の最終価格です。' },
      ],
    },
    gold: {
      intro: '国際的な金価格は米ドル/トロイオンスで表示されます。グラムあたりの価格はそこから換算されるため、両者は連動します。',
      sections: [
        { h: '国際金価格とは', p: '国際スポット価格は一般に XAU/USD と表記され、純金1トロイオンスの米ドル価格です。主要なディーリング拠点での継続的な取引によって形成され、地金業者、宝飾品店、金融機関が広く参照する指標です。' },
        { h: 'トロイオンスとグラム', p: '貴金属にはトロイオンスが使われ、約31.1035グラムです。通常のオンス（28.35グラム）よりやや重くなります。グラム価格をトロイオンス価格に換算するには31.1035を掛けます。小売の宝飾品はグラム単位で販売されることが多いため、個人の購入にはグラム表示が実用的です。' },
        { h: '純度について', p: 'スポット価格は純金、つまり24金を基準としています。18金は75%、14金は約58.5%の金含有率です。製品の地金価値を概算するには、重量に純度と現在価格を掛けます。' },
        { h: '価格を動かす要因', p: '実質金利、インフレ期待、米ドルの強弱、各国中央銀行の購入動向、不透明感が高まる局面での安全資産需要などが影響します。米ドル建てのため、金価格はドルと逆方向に動くことが多いです。' },
      ],
      faq: [
        { q: '金価格はどのくらいの頻度で更新されますか？', a: '継続的に更新されます。取引時間中、本ページの数値はスポット市場からブラウザ上でリアルタイムに更新され、背後で複数の独立した情報源が互いに予備として機能します。サーバー側では3分ごとのコピーも保持し、初回表示とバックアップに使われます。' },
        { q: 'グラム価格が宝飾店の提示と違うのはなぜですか？', a: '小売価格には地金価格に加えて加工費、デザイン料、税金、販売店の利益が含まれます。本ページは地金そのものの参考価格のみを表示しています。' },
        { q: '金を売るときの価格と同じですか？', a: '必ずしも同じではありません。買取業者はスポット価格より低く買い取り、分析料や手数料を差し引く場合があります。比較のための目安としてご利用ください。' },
      ],
    },
    cn: {
      intro: '中国では省ごとに小売燃料の上限価格が公表されます。以下は1リットルあたりの元建て指導上限価格で、国家の価格主管部門が定期的に改定します。',
      sections: [
        { h: '中国の燃料価格の仕組み', p: '中国本土の小売燃料価格は管理された価格形成メカニズムに従っています。国際原油価格の移動平均が一定の幅を超えた場合、国家主管部門が上限価格を調整し、その周期は概ね10営業日ごとです。国際原油価格が急激に変動した場合は、消費者と産業を保護するため調整幅が抑えられます。' },
        { h: '地域によって価格が異なる理由', p: '国家指導価格が基準を示しますが、各省が独自の上限価格を公表します。製油所や港からの輸送距離、地域の流通コスト、地方の税負担、市場環境などが差異を生みます。内陸部の価格が沿岸部よりやや高いのはこのためです。' },
        { h: '等級の意味', p: '92、95、98はリサーチオクタン価を示し、エンジンのノッキングへの耐性を表します。数値が高いほど圧縮比の高いエンジンに適します。エンジンが必要とする以上の等級を使っても性能は通常向上しないため、取扱説明書の推奨に従うのが適切です。' },
        { h: '軽油と季節等級', p: '0号軽油は標準的な自動車用軽油の等級です。北方の寒冷地域では、燃料系統のワックス析出を防ぐため、冬季に曇り点の低い季節規格が供給されます。' },
      ],
      faq: [
        { q: 'これは給油所の実際の価格ですか？', a: '各省の小売上限指導価格です。個々の給油所が割引や調整を行う場合があるため、実際の支払額はやや低くなることがあります。' },
        { q: '価格はどのくらいの頻度で変わりますか？', a: '指導価格は概ね10営業日ごとに見直され、国際原油価格が急変した場合はより短い間隔で調整されます。本ページは公式の改定サイクルに追随して更新されます。' },
        { q: '私の都市の価格が省の数値と違うのはなぜですか？', a: '省全体で単一の上限を公表する地域もあれば、都市や地域ごとに設定する地域もあります。お住まいの地域に最も近い項目をご確認ください。' },
      ],
    },
    fx: {
      intro: '以下の換算ツールは毎日のスケジュールで更新される参考レートを使用します。素早い概算向けであり、正確な決済には適しません。',
      sections: [
        { h: '参考レートとは', p: '中間レートと呼ばれる参考レートは、銀行間で提示される買値と売値のほぼ中央に位置します。ある時点での通貨の価値を最も公平に表す数値であり、多くの公開レート表で採用されています。' },
        { h: '銀行の提示が異なる理由', p: 'リテール銀行や商業銀行は中間レートにマージンを上乗せし、カードネットワークも独自のスプレッドと手数料を加えます。そのため、実際に適用されるレートは本ページの参考レートよりやや不利になります。' },
        { h: '通貨ペアの読み方', p: 'USD/CNY のような通貨ペアでは、前者が基軸通貨、後者が決済通貨です。数値は基軸通貨1単位が決済通貨をいくら買えるかを示します。数値が上昇すれば、基軸通貨が決済通貨に対して強くなったことを意味します。' },
        { h: '為替を動かす要因', p: '国間の金利差、インフレ見通し、貿易収支、資本移動、政治的安定性、中央銀行の政策などが為替に影響します。外国為替市場は平日は24時間稼働しますが週末は休場するため、金曜夜から日曜までレートは固定されたように見えます。' },
      ],
      faq: [
        { q: 'このレートはどの程度新しいですか？', a: 'レートは毎日のスケジュールで更新されます。予算の概算や比較には適していますが、実際の送金の実行には使用しないでください。' },
        { q: '銀行が適用するレートと同じですか？', a: 'いいえ。銀行や送金業者は参考レートにマージンと手数料を上乗せします。実際のレートは異なるとお考えください。' },
        { q: '会計や決済に使えますか？', a: 'できません。財務記録には、銀行、決済事業者、税務当局が公表する公式レートをご使用ください。' },
      ],
    },
    wti: {
      intro: 'WTIは米国原油の指標であり、ブレントに次いで世界で2番目に多く参照される原油価格です。米ドル建てで1バレルあたりで表示され、米国市場が取引されている時間帯に更新されます。',
      sections: [
        { h: 'WTI原油とは何か', p: 'WTI（West Texas Intermediate、西テキサス中間質原油）は、主に米国のパーミアン盆地と中部大陸地域で産出される軽質スイート原油です。非常に軽く硫黄分が少ない——主要な指標油の中でも最高品質とされ——ガソリン生産に最適化された製油所にとりわけ魅力的な原油です。名前に「テキサス」とありますが、現在では特定の産地ではなく、一つの品質規格を指す呼び名として使われています。' },
        { h: '受渡地がクッシングである理由', p: 'WTI先物契約の受渡地は米オクラホマ州クッシングです。ここは数十本のパイプラインが集中し、数百基の貯油タンクが並ぶ内陸のハブであり、米国内陸産原油の価格決定点として自然な場所となりました。しかし同時に、これがWTIの構造的な弱点でもあります。クッシングに滞留した原油はパイプラインでしか搬出できず、パイプが満杯になると現地価格は海上輸送の国際市場から乖離してしまいます。' },
        { h: 'WTIとブレント——なぜ指標が二つあるのか', p: 'どちらも軽質スイート原油であるため、長期的にはほぼ同じ動きをします。両者の価格差は誤差ではなく、物流の違いを正直に反映したものです。ブレントは北海で直接タンカーに積まれ世界中へ運べるため、海上輸送のグローバル市場に連動します。一方WTIは米国中部の内陸で値決めされるため、米国内のパイプライン輸送能力、クッシングの在庫水準、国内のシェール生産量により鋭く反応します。' },
        { h: 'ブレントとWTIの価格差が示すもの', p: 'この二つの価格の差は、エネルギー市場で最も注目される数字の一つです。ブレントがWTIを大きく上回る場合、米国産原油がパイプラインの制約や供給過剰で内陸に閉じ込められていることを示唆します。逆に差が縮まれば、輸出能力が拡大したか、世界的な供給が引き締まったシグナルであることが多いです。二つの価格を並べて見ることで、どちらか一方だけを見るより原油市場の全体像が格段に明確になります。' },
      ],
      faq: [
        { q: '米国のドライバーが払うガソリン代はWTI連動ですか？', a: 'WTIは米国原油の主要な参照指標ですが、ガソリンスタンドの実際の価格には精製コスト、流通、税金、地域の需給が上乗せされます。WTIが示すのは原油そのものの値段であり、完成した燃料の価格ではありません。' },
        { q: 'なぜWTIはブレントより安いことが多いのですか？', a: '多くの場合そうですが、常にではありません。WTIは海港ではなく内陸のハブで値決めされるため、米国のパイプラインのボトルネックや国内在庫の影響を受けやすいのです。価格差の拡大は、品質の差というより物流の制約を反映していることが一般的です。' },
        { q: 'WTI価格はどのくらいの頻度で更新されますか？', a: '価格は市場が取引されている時間帯に取得され、高速配信のためにキャッシュされます。週末は市場が休場するため、取引再開までは直近の営業日の水準が表示されます。' },
      ],
    },
    faqPage: {
      lead: '本サイトが市場データをどのように収集・表示しているかについて、よく寄せられる質問と回答です。',
      items: [
        { q: 'PriceScope は無料で使えますか？', a: 'はい。すべてのページが無料で、登録も購読も必要ありません。' },
        { q: 'データはどこから取得していますか？', a: '各ページがそれぞれの提供元を明記しています。ブレント原油とWTI原油は国際および米国の原油指標価格、国際金価格（XAU/USD）は公開スポット市場価格（複数の独立した情報源から取得）、中国の小売燃料価格は省別の小売最高指導価格、参考レートは仲値レートです。いずれも指示性の参考値であり、取引所の清算価格ではありません。' },
        { q: 'データはどのくらいの頻度で更新されますか？', a: '国際金価格は取引時間中、ブラウザ上でリアルタイムに更新されます。ブレント原油とWTI原油は取引時間中にリアルタイムで更新、中国の燃料価格は概ね10営業日ごとの公式改定に追随、為替レートは毎日更新されます。世界の市場は週末休場のため、週末は直近の営業日の数値を表示します。' },
        { q: 'これらは公式価格ですか？', a: 'いいえ。すべての数値は一般的な参考情報であり、取引所の清算価格ではありません。取引、決済、記帳には使用できません。' },
        { q: '投資判断の根拠にできますか？', a: 'できません。本サイトのデータは一般的な参考情報であり、投資助言を構成するものではありません。行動する前に必ず資格を持つ専門家または公的機関でご確認ください。' },
        { q: '個人データは保存されますか？', a: '本サイトの利用に登録は不要です。Cookie と分析ツールの詳細はプライバシーポリシーをご覧ください。' },
        { q: 'データの誤りを報告するには？', a: 'お問い合わせページのメールアドレスをご利用ください。具体的な数値に関するご指摘は歓迎し、速やかに確認いたします。' },
      ],
    },
  },

  /* ============================== ES ============================== */
  es: {
    common: {
      dataSources: 'Fuentes de datos',
      sourcesBody: 'Crudo Brent — precio de referencia del mercado internacional de petróleo. Crudo WTI — precio de referencia del petróleo estadounidense. Oro internacional (XAU/USD) — precio del mercado spot abierto, tomado de varios proveedores independientes y actualizado en tiempo real en tu navegador. Combustibles minoristas de China — precios máximos de venta al público por provincia. Tipos de cambio de referencia — tipos medios de mercado. Todas las cifras son valores indicativos de referencia, no precios de liquidación de bolsa.',
      disclaimerTitle: 'Aviso legal',
      disclaimerBody: 'Los precios y tipos de cambio mostrados son cifras de referencia con fines informativos generales. No son precios de liquidación de bolsa y no deben utilizarse para operar, liquidar, contabilizar ni para ninguna decisión de inversión. Las cifras pueden tener retraso y diferir de las indicadas por su banco, bróker o comercio local.',
      learnMore: 'Más información',
      faqHeading: 'Preguntas frecuentes',
      aboutThisData: 'Sobre estos datos',
    },
    oil: {
      intro: 'El crudo Brent es la referencia de precio de aproximadamente dos tercios del petróleo comercializado internacionalmente. La cifra siguiente se expresa en dólares estadounidenses por barril y se actualiza en tiempo real durante el horario de negociación.',
      sections: [
        { h: '¿Qué es el crudo Brent?', p: 'El Brent es una mezcla de crudo ligero y de bajo contenido en azufre extraída de yacimientos del mar del Norte, entre el Reino Unido y Noruega. Por su bajo azufre y relativa facilidad de refinado se convirtió en el grado de referencia con el que se precio la mayor parte del crudo que se comercializa internacionalmente. Cuando los medios hablan de «el precio del petróleo», suelen citar el Brent.' },
        { h: 'Por qué el Brent es la referencia mundial', p: 'A diferencia de los grados situados en el interior, el Brent puede cargarse directamente en buques cisterna en el mar, lo que facilita su comercio y envío a cualquier lugar. Esa flexibilidad logística, junto con un profundo mercado de futuros en la bolsa ICE, lo convirtió en el ancla de precios del crudo vendido desde Europa, África y Oriente Medio hacia Asia.' },
        { h: 'Cómo se cotiza el precio', p: 'El Brent se cotiza en dólares por barril; un barril equivale a 42 galones estadounidenses, unos 159 litros. Para obtener el precio por litro, divida el precio del barril entre 159. La cotización en dólares implica que un dólar más fuerte encarece el petróleo para compradores de otras divisas, aunque el precio subyacente no haya cambiado.' },
        { h: 'Qué mueve el precio', p: 'Las decisiones de producción de la OPEP y otros grandes productores, los acontecimientos geopolíticos en las regiones productoras, los cambios en la demanda global, las temporadas de mantenimiento de refinerías y las oscilaciones del dólar influyen en la cotización. Como el petróleo se precio en dólares, el movimiento de las divisas por sí solo puede alterar la cifra.' },
      ],
      faq: [
        { q: '¿Con qué frecuencia se actualiza el precio del Brent?', a: 'Los precios se actualizan en tiempo real durante el horario de negociación y se guardan en caché brevemente para una entrega rápida. Los mercados cierran los fines de semana, por lo que se muestra la cifra de la sesión más reciente hasta que se reanuda la negociación.' },
        { q: '¿Es este el precio oficial de liquidación?', a: 'No. Es un precio de referencia de mercado de proveedores públicos de datos, no una liquidación oficial de bolsa. Sirve para seguir tendencias generales, no para liquidar ni operar.' },
        { q: '¿Por qué el precio no cambia los fines de semana?', a: 'Los mercados mundiales de petróleo cierran el fin de semana. Las cifras de sábado y domingo son el último precio de la sesión anterior.' },
      ],
    },
    gold: {
      intro: 'El oro se cotiza internacionalmente en dólares por onza troy. La cifra por gramo se deriva de esa cotización, por lo que ambas se mueven de forma conjunta.',
      sections: [
        { h: '¿Qué es el precio internacional del oro?', p: 'El precio internacional al contado, a menudo escrito XAU/USD, es el precio de una onza troy de oro puro en dólares estadounidenses. Se forma mediante la negociación continua en los principales centros de contratación y es la referencia utilizada por distribuidores de lingotes, joyeros e instituciones financieras de todo el mundo.' },
        { h: 'Onzas troy y gramos', p: 'Los metales preciosos utilizan la onza troy, equivalente a unos 31,1035 gramos, algo más pesada que la onza ordinaria de 28,35 gramos. Para convertir un precio por gramo a precio por onza troy, multiplique por 31,1035. La mayoría de la joyería minorista se vende por gramo, por lo que esa cifra suele ser la más práctica para compras personales.' },
        { h: 'Pureza y ley', p: 'El precio al contado se refiere a oro puro, de 24 quilates. Los artículos de menor ley contienen menos oro: 18 quilates es 75% y 14 quilates aproximadamente 58,5%. Para estimar el valor del oro de una pieza, multiplique su peso por su ley y después por el precio actual.' },
        { h: 'Qué mueve el precio', p: 'El oro responde a los tipos de interés reales, las expectativas de inflación, la fortaleza del dólar, las compras de los bancos centrales y la demanda de activos refugio en periodos de incertidumbre. Al cotizarse en dólares, suele moverse de forma inversa al dólar.' },
      ],
      faq: [
        { q: '¿Con qué frecuencia se actualiza el precio del oro?', a: 'De forma continua. Mientras el mercado está abierto, la cifra de esta página se actualiza en tiempo real en tu navegador directamente desde el mercado spot, con varios proveedores independientes como respaldo. Una copia del servidor capturada cada tres minutos alimenta la primera carga y sirve de respaldo.' },
        { q: '¿Por qué el precio por gramo difiere del que indica mi joyero?', a: 'Los precios minoristas incluyen cargos de fabricación, costes de diseño, impuestos y el margen del distribuidor además del valor del metal. Esta página muestra únicamente el precio de referencia del metal.' },
        { q: '¿Es este el precio que recibiría si vendiera oro?', a: 'No necesariamente. Los distribuidores compran por debajo del precio al contado y pueden aplicar cargos de ensayo o gestión. Considere la cifra como una referencia para comparar.' },
      ],
    },
    cn: {
      intro: 'China publica precios minoristas máximos de combustible por provincia. Las cifras siguientes son techos de orientación en yuanes por litro, revisados periódicamente por la autoridad nacional de precios.',
      sections: [
        { h: 'Cómo fija China los precios del combustible', p: 'Los precios minoristas de combustible en la China continental siguen un mecanismo de precios gestionado. La autoridad nacional ajusta el precio techo cuando la media móvil de los precios internacionales del crudo supera un umbral establecido, y los ajustes se revisan en un ciclo de unos diez días laborables. Cuando el crudo internacional se mueve de forma muy brusca, el mecanismo también amortigua el traspaso para proteger a consumidores e industria.' },
        { h: 'Por qué los precios difieren por provincia', p: 'La orientación nacional fija una base, pero cada provincia publica su propio techo. La distancia de transporte desde refinerías y puertos, los costes locales de distribución, los impuestos regionales y las condiciones de mercado generan variación. Por eso las provincias del interior suelen ser ligeramente más caras que las costeras.' },
        { h: 'Qué significan los grados', p: 'Los números 92, 95 y 98 se refieren al índice de octano de investigación, una medida de la resistencia al picado del motor. Los números más altos convienen a motores con mayor relación de compresión. Elegir un grado superior al que su motor necesita no suele mejorar el rendimiento, por lo que la recomendación del fabricante en el manual es la guía correcta.' },
        { h: 'Diésel y grados estacionales', p: 'El diésel de grado cero es el grado estándar de diésel para automoción. En las regiones frías del norte se suministran en invierno variantes estacionales con puntos de enturbiamiento más bajos para evitar la formación de ceras en el sistema de combustible.' },
      ],
      faq: [
        { q: '¿Son estos los precios exactos en la gasolinera?', a: 'Son precios máximos minoristas de orientación provincial. Las estaciones individuales pueden ofrecer descuentos o ajustes, por lo que el precio que pague en la práctica puede ser algo menor.' },
        { q: '¿Con qué frecuencia cambia el precio?', a: 'La orientación se revisa aproximadamente cada diez días laborables, o antes si el crudo internacional se mueve bruscamente. Esta página sigue el ciclo oficial de revisión.' },
        { q: '¿Por qué mi ciudad difiere de la cifra provincial?', a: 'Algunas provincias publican un único techo provincial mientras que otras diferencian por ciudad o región. Consulte la entrada más cercana a su ubicación.' },
      ],
    },
    fx: {
      intro: 'El conversor siguiente utiliza tipos de cambio de referencia que se actualizan según un calendario diario. Está pensado para estimaciones rápidas, no para liquidaciones exactas.',
      sections: [
        { h: '¿Qué es un tipo de cambio de referencia?', p: 'Un tipo medio o de referencia se sitúa aproximadamente a mitad de camino entre los precios de compra y venta que los bancos se cotizan entre sí. Es el número único más justo para describir lo que vale una divisa en un momento dado, y es lo que muestran la mayoría de las tablas públicas de tipos.' },
        { h: 'Por qué su banco da una cifra distinta', p: 'Los bancos minoristas y comerciales añaden un margen sobre el tipo medio, y las redes de tarjetas añaden su propio diferencial y comisiones. Por eso el tipo que recibe en la práctica suele ser algo peor que el de referencia mostrado aquí.' },
        { h: 'Cómo leer un par de divisas', p: 'En un par como USD/CNY, la primera divisa es la base y la segunda la cotizada. El número indica cuánto de la divisa cotizada compra una unidad de la divisa base. Si el número sube, la divisa base se ha fortalecido frente a la cotizada.' },
        { h: 'Qué mueve los tipos de cambio', p: 'Los diferenciales de tipos de interés entre países, las expectativas de inflación, las balanzas comerciales, los flujos de capital, la estabilidad política y la política de los bancos centrales influyen en los tipos. Los mercados de divisas operan sin interrupción los días laborables pero cierran en fin de semana, por lo que los tipos aparecen congelados desde el viernes por la noche hasta el domingo.' },
      ],
      faq: [
        { q: '¿Cuál es la actualidad de estos tipos?', a: 'Los tipos se actualizan según un calendario diario. Son adecuados para presupuestar y comparar, pero no para ejecutar una transferencia.' },
        { q: '¿Es este el tipo que me dará mi banco?', a: 'No. Los bancos y servicios de transferencia aplican un margen y comisiones sobre el tipo de referencia. Espere que el tipo práctico difiera.' },
        { q: '¿Puedo usar esto para contabilidad o liquidación?', a: 'No. Utilice el tipo oficial publicado por su banco, proveedor de pago o autoridad fiscal para cualquier registro financiero.' },
      ],
    },
    wti: {
      intro: 'El WTI es la referencia del crudo estadounidense y el segundo precio del petróleo más citado del mundo después del Brent. Se cotiza en dólares por barril y se actualiza mientras operan los mercados.',
      sections: [
        { h: '¿Qué es el crudo WTI?', p: 'El West Texas Intermediate es un crudo ligero y dulce que se produce principalmente en la cuenca Pérmica y en la región centrocontinental de Estados Unidos. Es muy ligero y con un contenido de azufre muy bajo — posiblemente la mayor calidad entre las grandes referencias —, lo que lo hace especialmente atractivo para las refinerías orientadas a la producción de gasolina. A pesar del nombre, ya no se extrae solo en Texas: hoy el grado describe una especificación más que un único origen geográfico.' },
        { h: 'Por qué se entrega en Cushing', p: 'El contrato de futuros del WTI se liquida en Cushing, Oklahoma, un nudo interior donde convergen decenas de oleoductos y se alzan cientos de tanques de almacenamiento. Esa concentración de infraestructura lo convierte en el punto natural de fijación de precios del crudo del interior estadounidense. Pero también es su debilidad estructural: el petróleo almacenado en Cushing solo puede salir por oleoducto, y cuando esos ductos están llenos el precio local se desajusta del mercado marítimo internacional.' },
        { h: 'WTI y Brent: por qué hay dos referencias', p: 'Ambos son crudos ligeros y dulces, de modo que a largo plazo sus precios se mueven juntos. La diferencia entre ellos no es un error: refleja diferencias logísticas reales. El Brent puede cargarse directamente en buques en el Mar del Norte y enviarse a cualquier parte, por lo que sigue al mercado marítimo global. El WTI se fija tierra adentro, en el centro del continente americano, y reacciona con más fuerza a la capacidad de los oleoductos, al nivel de inventarios en Cushing y a la producción de esquisto nacional.' },
        { h: 'Qué indica el diferencial Brent-WTI', p: 'La diferencia entre ambos precios es uno de los números más observados del sector energético. Cuando el Brent cotiza muy por encima del WTI, suele significar que el crudo estadounidense está atrapado tierra adentro por limitaciones de oleoductos o por exceso de oferta. Cuando la brecha se estrecha, a menudo indica que la capacidad de exportación se ha ampliado o que la oferta global se ha ajustado. Leer los dos precios juntos da una imagen mucho más clara del mercado que cualquiera de ellos por separado.' },
      ],
      faq: [
        { q: '¿Es el WTI el precio que pagan los conductores estadounidenses?', a: 'Es la referencia principal del crudo en EE. UU., pero el precio en el surtidor también depende de los costes de refino, la distribución, los impuestos y la oferta regional. El WTI indica cuánto cuesta el crudo, no el combustible terminado.' },
        { q: '¿Por qué el WTI suele ser más barato que el Brent?', a: 'A menudo lo es, pero no siempre. El WTI se fija en un nudo interior y no en un puerto, por lo que es más sensible a los cuellos de botella de los oleoductos y a los inventarios nacionales. Una brecha amplia suele reflejar una limitación logística, no una diferencia de calidad.' },
        { q: '¿Cada cuánto se actualiza el precio del WTI?', a: 'El dato se recoge mientras los mercados operan y se almacena en caché para una entrega rápida. Los mercados cierran el fin de semana, por lo que se muestra el nivel de la última sesión hasta que se reanuda la negociación.' },
      ],
    },
    faqPage: {
      lead: 'Respuestas a las preguntas que los visitantes plantean con más frecuencia sobre cómo este sitio recopila y presenta los datos de mercado.',
      items: [
        { q: '¿Es PriceScope gratuito?', a: 'Sí. Todas las páginas son gratuitas y no requieren registro ni suscripción.' },
        { q: '¿De dónde provienen los datos?', a: 'Cada página indica sus propias fuentes. El crudo Brent y el WTI son los precios de referencia internacional y estadounidense del petróleo. El oro internacional (XAU/USD) es el precio del mercado spot abierto, tomado de varios proveedores independientes. Los combustibles minoristas de China son precios máximos de venta al público por provincia. Los tipos de cambio de referencia son tipos medios de mercado. Todas las cifras son valores indicativos de referencia, no precios de liquidación de bolsa.' },
        { q: '¿Con qué frecuencia se actualizan los datos?', a: 'El oro internacional se actualiza en tiempo real en tu navegador mientras el mercado está abierto. El Brent y el WTI se actualizan en tiempo real durante el horario de negociación. Los combustibles de China siguen el ciclo oficial de revisión de unos diez días hábiles. Los tipos de cambio se actualizan a diario. Como los mercados cierran los fines de semana, las cifras reflejan la última sesión hasta la reapertura.' },
        { q: '¿Son precios oficiales?', a: 'No. Todas las cifras son precios de referencia con fines informativos generales. No son precios de liquidación de bolsa y no deben usarse para operar, liquidar ni contabilizar.' },
        { q: '¿Puedo basar decisiones de inversión en ellos?', a: 'No. Los datos se ofrecen solo con fines informativos generales y no constituyen asesoramiento de inversión. Confirme siempre las cifras con un profesional autorizado o una fuente oficial antes de actuar.' },
        { q: '¿Almacenan mis datos personales?', a: 'El sitio no requiere registro. Consulte la política de privacidad para conocer todos los detalles sobre cookies y analítica.' },
        { q: '¿Cómo informo de un problema con los datos?', a: 'Utilice la dirección de correo de la página de contacto. Los informes sobre cifras concretas son bienvenidos y se investigan con rapidez.' },
      ],
    },
  },

  /* ============================== FR ============================== */
  fr: {
    common: {
      dataSources: 'Sources des données',
      sourcesBody: 'Brut Brent — prix de référence du marché pétrolier international. Brut WTI — prix de référence du pétrole américain. Or international (XAU/USD) — prix du marché spot ouvert, issu de plusieurs fournisseurs indépendants et actualisé en temps réel dans votre navigateur. Carburants de détail en Chine — prix plafonds de vente au détail par province. Taux de change de référence — taux moyens de marché. Toutes les valeurs sont indicatives et ne sont pas des prix de règlement de bourse.',
      disclaimerTitle: 'Avertissement',
      disclaimerBody: 'Les prix et taux affichés sont des valeurs de référence fournies à titre d\'information générale. Il ne s\'agit pas de cours de compensation de bourse et ils ne doivent pas être utilisés pour trader, compenser, comptabiliser ni pour toute décision d\'investissement. Les chiffres peuvent être différés et différer de ceux indiqués par votre banque, votre courtier ou votre détaillant local.',
      learnMore: 'En savoir plus',
      faqHeading: 'Questions fréquentes',
      aboutThisData: 'À propos de ces données',
    },
    oil: {
      intro: 'Le brut Brent est la référence de prix d\'environ deux tiers du pétrole échangé dans le monde. Le chiffre ci-dessous est exprimé en dollars américains par baril et actualisé en temps réel pendant les heures de négociation.',
      sections: [
        { h: 'Qu\'est-ce que le brut Brent ?', p: 'Le Brent est un mélange de pétrole brut léger et à faible teneur en soufre issu de gisements de la mer du Nord, entre le Royaume-Uni et la Norvège. Sa faible teneur en soufre et sa relative facilité de raffinage en ont fait la qualité de référence pour la fixation du prix de la plupart du pétrole échangé internationalement. Lorsque les médias évoquent « le prix du pétrole », ils citent généralement le Brent.' },
        { h: 'Pourquoi le Brent est-il la référence mondiale', p: 'Contrairement aux qualités enclavées, le Brent peut être chargé directement sur des pétroliers en mer, ce qui facilite son commerce et son expédition partout dans le monde. Cette souplesse logistique, associée à un marché à terme profond sur la bourse ICE, en a fait l\'ancre de prix du pétrole vendu de l\'Europe, de l\'Afrique et du Moyen-Orient vers l\'Asie.' },
        { h: 'Comment le prix est-il coté', p: 'Le Brent est coté en dollars par baril, un baril valant 42 gallons américains, soit environ 159 litres. Pour obtenir le prix au litre, divisez le prix du baril par 159. La cotation en dollars signifie qu\'un dollar plus fort renchérit le pétrole pour les acheteurs d\'autres devises, même si le prix sous-jacent n\'a pas bougé.' },
        { h: 'Ce qui fait bouger le prix', p: 'Les décisions de production de l\'OPEP et des autres grands producteurs, les événements géopolitiques dans les régions productrices, l\'évolution de la demande mondiale, les saisons de maintenance des raffineries et les fluctuations du dollar influencent la cotation. Le pétrole étant libellé en dollars, le seul mouvement des devises peut modifier le chiffre.' },
      ],
      faq: [
        { q: 'À quelle fréquence le prix du Brent est-il actualisé ?', a: 'Les prix sont actualisés en temps réel pendant les heures de négociation et mis brièvement en cache pour une diffusion rapide. Les marchés ferment le week-end : la valeur de la dernière séance est donc affichée jusqu\'à la reprise des échanges.' },
        { q: 'S\'agit-il du cours officiel de compensation ?', a: 'Non. Il s\'agit d\'un prix de référence de marché issu de fournisseurs publics de données, et non d\'une compensation officielle de bourse. Il convient pour suivre les tendances générales, pas pour compenser ni trader.' },
        { q: 'Pourquoi le prix ne change-t-il pas le week-end ?', a: 'Les marchés pétroliers mondiaux ferment le week-end. Les chiffres affichés samedi et dimanche sont le dernier prix de la séance précédente.' },
      ],
    },
    gold: {
      intro: 'L\'or est coté à l\'international en dollars américains par once troy. Le prix au gramme en découle, de sorte que les deux évoluent ensemble.',
      sections: [
        { h: 'Qu\'est-ce que le prix international de l\'or ?', p: 'Le prix au comptant international, souvent écrit XAU/USD, est le prix d\'une once troy d\'or pur en dollars américains. Il se forme par des échanges continus entre les grandes places de cotation et constitue la référence utilisée par les négociants en lingots, les bijoutiers et les institutions financières du monde entier.' },
        { h: 'Onces troy et grammes', p: 'Les métaux précieux utilisent l\'once troy, soit environ 31,1035 grammes, légèrement plus lourde que l\'once ordinaire de 28,35 grammes. Pour convertir un prix au gramme en prix à l\'once troy, multipliez par 31,1035. La plupart des bijoux vendus au détail le sont au gramme : cette valeur est donc la plus pratique pour un achat personnel.' },
        { h: 'Pureté et titre', p: 'Le prix au comptant se rapporte à l\'or pur, soit 24 carats. Les articles de titre inférieur contiennent moins d\'or : 18 carats représentent 75% et 14 carats environ 58,5%. Pour estimer la valeur en or d\'un objet, multipliez son poids par son titre puis par le prix actuel.' },
        { h: 'Ce qui fait bouger le prix', p: 'L\'or réagit aux taux d\'intérêt réels, aux anticipations d\'inflation, à la force du dollar, aux achats des banques centrales et à la demande de valeurs refuges en période d\'incertitude. Libellé en dollars, il évolue souvent à contre-courant du dollar.' },
      ],
      faq: [
        { q: 'À quelle fréquence le prix de l\'or est-il actualisé ?', a: 'En continu. Pendant les heures de marché, le chiffre de cette page est actualisé en temps réel dans votre navigateur directement depuis le marché spot, avec plusieurs fournisseurs indépendants en repli. Une copie côté serveur capturée toutes les trois minutes alimente le premier affichage et sert de secours.' },
        { q: 'Pourquoi le prix au gramme diffère-t-il de celui de mon bijoutier ?', a: 'Les prix de détail incluent des frais de fabrication, des coûts de design, des taxes et la marge du distributeur en plus de la valeur du métal. Cette page n\'affiche que le prix de référence du métal brut.' },
        { q: 'Est-ce le prix que j\'obtiendrais en vendant de l\'or ?', a: 'Pas nécessairement. Les négociants rachètent en dessous du prix au comptant et peuvent appliquer des frais d\'essai ou de manipulation. Considérez ce chiffre comme une base de comparaison.' },
      ],
    },
    cn: {
      intro: 'La Chine publie des prix de détail maximaux des carburants par province. Les chiffres ci-dessous sont des plafonds indicatifs en yuans par litre, révisés périodiquement par l\'autorité nationale des prix.',
      sections: [
        { h: 'Comment la Chine fixe les prix des carburants', p: 'Les prix de détail des carburants en Chine continentale suivent un mécanisme de prix administré. L\'autorité nationale ajuste le prix plafond lorsque la moyenne mobile des cours internationaux du brut dépasse un seuil défini, et les ajustements sont examinés selon un cycle d\'environ dix jours ouvrés. Lorsque le brut international évolue très brutalement, le mécanisme amortit également la répercussion pour protéger les consommateurs et l\'industrie.' },
        { h: 'Pourquoi les prix diffèrent-ils par province', p: 'L\'orientation nationale fixe une base, mais chaque province publie son propre plafond. La distance de transport depuis les raffineries et les ports, les coûts locaux de distribution, les taxes régionales et les conditions de marché créent des écarts. C\'est pourquoi les provinces de l\'intérieur sont souvent légèrement plus chères que les provinces côtières.' },
        { h: 'Ce que signifient les indices', p: 'Les nombres 92, 95 et 98 correspondent à l\'indice d\'octane recherche, qui mesure la résistance au cliquetis du moteur. Les indices plus élevés conviennent aux moteurs à taux de compression plus élevé. Choisir un indice supérieur à ce que votre moteur exige n\'améliore généralement pas les performances : la recommandation du constructeur dans le manuel est le bon guide.' },
        { h: 'Diesel et indices saisonniers', p: 'Le diesel de grade zéro est la qualité standard de diesel automobile. Dans les régions froides du nord, des variantes saisonnières à point de trouble plus bas sont fournies en hiver afin d\'éviter la formation de paraffine dans le circuit de carburant.' },
      ],
      faq: [
        { q: 'S\'agit-il des prix exacts à la pompe ?', a: 'Ce sont des prix de détail maximaux indicatifs par province. Certaines stations peuvent offrir des remises ou des ajustements : le prix réellement payé peut donc être légèrement inférieur.' },
        { q: 'À quelle fréquence le prix change-t-il ?', a: 'L\'orientation est révisée environ tous les dix jours ouvrés, ou plus tôt si le brut international évolue brutalement. Cette page suit le cycle officiel de révision.' },
        { q: 'Pourquoi ma ville diffère-t-elle du chiffre provincial ?', a: 'Certaines provinces publient un plafond provincial unique tandis que d\'autres différencient par ville ou par région. Consultez l\'entrée la plus proche de votre lieu.' },
      ],
    },
    fx: {
      intro: 'Le convertisseur ci-dessous utilise des taux de change de référence actualisés selon un calendrier quotidien. Il est conçu pour des estimations rapides, non pour des règlements exacts.',
      sections: [
        { h: 'Qu\'est-ce qu\'un taux de change de référence ?', p: 'Un taux moyen ou de référence se situe à peu près à mi-chemin entre les prix d\'achat et de vente que les banques se cotent entre elles. C\'est le chiffre unique le plus juste pour décrire la valeur d\'une devise à un instant donné, et c\'est celui que la plupart des tableaux publics affichent.' },
        { h: 'Pourquoi votre banque donne un chiffre différent', p: 'Les banques de détail et commerciales ajoutent une marge au taux moyen, et les réseaux de cartes ajoutent leur propre écart et leurs frais. Le taux que vous obtenez en pratique est donc généralement un peu moins bon que le taux de référence affiché ici.' },
        { h: 'Comment lire une paire de devises', p: 'Dans une paire comme USD/CNY, la première devise est la devise de base et la seconde la devise cotée. Le chiffre indique combien de devise cotée une unité de devise de base permet d\'acheter. Si le chiffre monte, la devise de base s\'est renforcée face à la devise cotée.' },
        { h: 'Ce qui fait bouger les taux de change', p: 'Les écarts de taux d\'intérêt entre pays, les anticipations d\'inflation, les balances commerciales, les flux de capitaux, la stabilité politique et la politique des banques centrales influencent les taux. Les marchés des changes fonctionnent sans interruption les jours ouvrés mais ferment le week-end : les taux semblent donc figés du vendredi soir au dimanche.' },
      ],
      faq: [
        { q: 'Quelle est l\'actualité de ces taux ?', a: 'Les taux sont actualisés selon un calendrier quotidien. Ils conviennent pour budgétiser et comparer, mais pas pour exécuter un transfert.' },
        { q: 'Est-ce le taux que ma banque m\'accordera ?', a: 'Non. Les banques et services de transfert appliquent une marge et des frais au taux de référence. Attendez-vous à ce que le taux réel diffère.' },
        { q: 'Puis-je utiliser ceci pour la comptabilité ou le règlement ?', a: 'Non. Utilisez le taux officiel publié par votre banque, votre prestataire de paiement ou votre administration fiscale pour tout enregistrement financier.' },
      ],
    },
    wti: {
      intro: 'Le WTI est la référence du pétrole brut américain et le deuxième prix du brut le plus cité au monde après le Brent. Il est coté en dollars par baril et actualisé pendant les heures de cotation.',
      sections: [
        { h: "Qu'est-ce que le brut WTI ?", p: "Le West Texas Intermediate est un brut léger et doux produit principalement dans le bassin permien et la région du centre du continent américain. Il est très léger et très pauvre en soufre — sans doute la meilleure qualité parmi les grandes références —, ce qui le rend particulièrement attractif pour les raffineries orientées vers l'essence. Malgré son nom, il n'est plus produit uniquement au Texas : le grade décrit aujourd'hui une spécification plutôt qu'une origine géographique unique." },
        { h: 'Pourquoi la livraison se fait à Cushing', p: "Le contrat à terme du WTI se dénoue à Cushing, en Oklahoma, un nœud intérieur où convergent des dizaines d'oléoducs et où s'alignent des centaines de réservoirs. Cette concentration d'infrastructures en fait le point de cotation naturel du brut de l'intérieur des États-Unis. Mais c'est aussi sa faiblesse structurelle : le pétrole stocké à Cushing ne peut partir que par oléoduc, et lorsque ces conduits sont saturés, le prix local se désynchronise du marché maritime international." },
        { h: 'WTI et Brent : pourquoi deux références', p: "Les deux sont des bruts légers et doux : à long terme, leurs prix évoluent ensemble. L'écart entre eux n'est pas une erreur, il reflète des différences logistiques bien réelles. Le Brent peut être chargé directement sur des navires en mer du Nord et expédié n'importe où : il suit donc le marché maritime mondial. Le WTI est coté à l'intérieur des terres, au centre du continent américain, et réagit plus vivement à la capacité des oléoducs, au niveau des stocks de Cushing et à la production nationale de schiste." },
        { h: "Ce que l'écart Brent-WTI vous apprend", p: "La différence entre les deux prix est l'un des chiffres les plus surveillés du secteur énergétique. Quand le Brent se négocie nettement au-dessus du WTI, cela signifie généralement que le brut américain est bloqué à l'intérieur des terres par des contraintes d'oléoducs ou un excédent d'offre. Quand l'écart se resserre, cela indique souvent que la capacité d'exportation s'est développée ou que l'offre mondiale s'est tendue. Lire les deux prix ensemble donne une image bien plus claire du marché que chacun pris isolément." },
      ],
      faq: [
        { q: "Est-ce le prix que paient les automobilistes américains ?", a: "C'est la référence principale du brut aux États-Unis, mais le prix à la pompe dépend aussi des coûts de raffinage, de la distribution, des taxes et de l'offre régionale. Le WTI indique le prix du brut lui-même, pas celui du carburant fini." },
        { q: 'Pourquoi le WTI est-il souvent moins cher que le Brent ?', a: "Souvent, mais pas toujours. Le WTI est coté à un nœud intérieur et non dans un port, ce qui le rend plus sensible aux goulets d'étranglement des oléoducs et aux stocks nationaux. Un écart important reflète généralement une contrainte logistique, non une différence de qualité." },
        { q: 'À quelle fréquence le prix du WTI est-il actualisé ?', a: "La donnée est collectée pendant les heures de cotation et mise en cache pour une diffusion rapide. Les marchés ferment le week-end : le niveau de la dernière séance est donc affiché jusqu'à la reprise des échanges." },
      ],
    },
    faqPage: {
      lead: 'Réponses aux questions les plus fréquentes des visiteurs sur la façon dont ce site collecte et présente les données de marché.',
      items: [
        { q: 'PriceScope est-il gratuit ?', a: 'Oui. Toutes les pages sont gratuites et ne nécessitent ni inscription ni abonnement.' },
        { q: 'D\'où proviennent les données ?', a: 'Chaque page cite ses propres sources. Le brut Brent et le WTI sont les prix de référence du pétrole, international et américain. L\'or international (XAU/USD) est le prix du marché spot ouvert, issu de plusieurs fournisseurs indépendants. Les carburants de détail chinois sont les prix plafonds de vente au détail par province. Les taux de change de référence sont des taux moyens de marché. Toutes les valeurs sont indicatives, et non des prix de liquidation de bourse.' },
        { q: 'À quelle fréquence les données sont-elles actualisées ?', a: 'L\'or international est actualisé en temps réel dans votre navigateur pendant les heures de marché. Le Brent et le WTI sont collectés chaque heure pendant les heures de négociation. Les carburants chinois suivent le cycle officiel de révision d\'environ dix jours ouvrés. Les taux de change sont actualisés chaque jour. Les marchés ferment le week-end : les chiffres reflètent alors la dernière séance jusqu\'à la réouverture.' },
        { q: 'S\'agit-il de prix officiels ?', a: 'Non. Tous les chiffres sont des prix de référence à titre d\'information générale. Il ne s\'agit pas de cours de compensation de bourse et ils ne doivent pas servir à trader, compenser ou comptabiliser.' },
        { q: 'Puis-je m\'en servir pour des décisions d\'investissement ?', a: 'Non. Les données sont fournies à titre d\'information générale uniquement et ne constituent pas un conseil en investissement. Vérifiez toujours les chiffres auprès d\'un professionnel agréé ou d\'une source officielle avant d\'agir.' },
        { q: 'Stockez-vous mes données personnelles ?', a: 'Le site ne nécessite aucune inscription. Consultez la politique de confidentialité pour tous les détails sur les cookies et l\'analyse.' },
        { q: 'Comment signaler un problème avec les données ?', a: 'Utilisez l\'adresse e-mail de la page de contact. Les signalements sur des chiffres précis sont appréciés et examinés rapidement.' },
      ],
    },
  },

  /* ============================== DE ============================== */
  de: {
    common: {
      dataSources: 'Datenquellen',
      sourcesBody: 'Brent-Rohöl — Referenzpreis des internationalen Ölmarkts. WTI-Rohöl — Referenzpreis für US-Rohöl. Internationales Gold (XAU/USD) — Preis des offenen Spotmarkts, von mehreren unabhängigen Anbietern und in Echtzeit in Ihrem Browser aktualisiert. Chinas Einzelhandels-Kraftstoffpreise — provinziale Höchstpreise. Referenzwechselkurse — Mittelkurse. Alle Werte sind indikative Referenzwerte, keine Börsenabrechnungspreise.',
      disclaimerTitle: 'Haftungsausschluss',
      disclaimerBody: 'Die hier gezeigten Preise und Kurse sind Referenzwerte für allgemeine Informationszwecke. Es handelt sich nicht um Börsenabrechnungspreise; sie dürfen nicht für Handel, Abrechnung, Buchhaltung oder irgendwelche Anlageentscheidungen verwendet werden. Die Werte können verzögert sein und von den Angaben Ihrer Bank, Ihres Brokers oder des lokalen Händlers abweichen.',
      learnMore: 'Mehr erfahren',
      faqHeading: 'Häufige Fragen',
      aboutThisData: 'Über diese Daten',
    },
    oil: {
      intro: 'Brent-Rohöl ist die Preisreferenz für rund zwei Drittel des international gehandelten Öls. Der Wert unten wird in US-Dollar pro Barrel angegeben und während der Handelszeiten in Echtzeit aktualisiert.',
      sections: [
        { h: 'Was ist Brent-Rohöl?', p: 'Brent ist eine leichte, schwefelarme Rohölmischung aus Ölfeldern in der Nordsee zwischen dem Vereinigten Königreich und Norwegen. Wegen ihres geringen Schwefelgehalts und der vergleichsweise einfachen Raffination wurde sie zur Referenzsorte, an der sich der größte Teil des international gehandelten Rohöls orientiert. Wenn in den Nachrichten vom „Ölpreis" die Rede ist, ist meist Brent gemeint.' },
        { h: 'Warum Brent die globale Referenz ist', p: 'Anders als Binnensorten kann Brent direkt auf See auf Tanker verladen werden, was Handel und Verschiffung an jeden Ort erleichtert. Diese logistische Flexibilität hat es zusammen mit einem tiefen Terminmarkt an der Börse ICE zum Preisananker für Rohöl gemacht, das von Europa, Afrika und dem Nahen Osten nach Asien verkauft wird.' },
        { h: 'Wie der Preis notiert wird', p: 'Brent wird in US-Dollar pro Barrel notiert; ein Barrel entspricht 42 US-Gallonen oder etwa 159 Litern. Für den Preis pro Liter teilt man den Barrelpreis durch 159. Die Notierung in Dollar bedeutet, dass ein stärkerer Dollar Öl für Käufer anderer Währungen verteuert, selbst wenn sich der eigentliche Preis nicht bewegt hat.' },
        { h: 'Was den Preis bewegt', p: 'Produktionsentscheidungen der OPEC und anderer großer Förderländer, geopolitische Ereignisse in den Förderregionen, Änderungen der weltweiten Nachfrage, Wartungszeiten der Raffinerien und Schwankungen des US-Dollar beeinflussen die Notierung. Da Öl in Dollar bepreist wird, kann allein eine Währungsbewegung die Zahl verändern.' },
      ],
      faq: [
        { q: 'Wie oft wird der Brent-Preis aktualisiert?', a: 'Die Preise werden während der Handelszeiten in Echtzeit aktualisiert und für eine schnelle Auslieferung kurz zwischengespeichert. Die Märkte sind am Wochenende geschlossen; daher wird bis zur Wiederaufnahme des Handels der Wert des letzten Handelstags angezeigt.' },
        { q: 'Ist das der offizielle Abrechnungspreis?', a: 'Nein. Es handelt sich um einen Marktreferenzpreis öffentlicher Datenanbieter, nicht um einen offiziellen Börsenabrechnungspreis. Er eignet sich, um allgemeine Trends zu verfolgen, nicht für Abrechnung oder Handel.' },
        { q: 'Warum ändert sich der Preis am Wochenende nicht?', a: 'Die globalen Ölmärkte sind am Wochenende geschlossen. Die Werte für Samstag und Sonntag sind der letzte Preis der vorherigen Handelssitzung.' },
      ],
    },
    gold: {
      intro: 'Gold wird international in US-Dollar pro Feinunze notiert. Der Grammpreis wird daraus abgeleitet, sodass sich beide gemeinsam bewegen.',
      sections: [
        { h: 'Was ist der internationale Goldpreis?', p: 'Der internationale Spotpreis, oft als XAU/USD geschrieben, ist der Preis einer Feinunze reinen Goldes in US-Dollar. Er entsteht durch fortlaufenden Handel an den großen Handelsplätzen und ist die Referenz, die Barrenhändler, Juweliere und Finanzinstitute weltweit verwenden.' },
        { h: 'Feinunzen und Gramm', p: 'Edelmetalle verwenden die Feinunze (Troy-Ounce) mit etwa 31,1035 Gramm; sie ist damit etwas schwerer als die gewöhnliche Unze mit 28,35 Gramm. Um einen Grammpreis in einen Feinunzenpreis umzurechnen, multipliziert man mit 31,1035. Die meisten Schmuckstücke im Einzelhandel werden pro Gramm verkauft; für private Käufe ist dieser Wert daher der praktischere.' },
        { h: 'Reinheit und Feingehalt', p: 'Der Spotpreis bezieht sich auf reines Gold, also 24 Karat. Stücke mit niedrigerem Feingehalt enthalten weniger Gold: 18 Karat entsprechen 75%, 14 Karat etwa 58,5%. Um den Goldwert eines Stücks zu schätzen, multipliziert man Gewicht mal Feingehalt mal aktuellen Preis.' },
        { h: 'Was den Preis bewegt', p: 'Gold reagiert auf Realzinsen, Inflationserwartungen, die Stärke des US-Dollar, Käufe der Zentralbanken und die Nachfrage nach sicheren Häfen in unsicheren Zeiten. Da es in Dollar notiert wird, bewegt es sich oft gegenläufig zum Dollar.' },
      ],
      faq: [
        { q: 'Wie oft wird der Goldpreis aktualisiert?', a: 'Fortlaufend. Während der Handelszeiten wird der Wert auf dieser Seite in Ihrem Browser in Echtzeit direkt vom Spotmarkt aktualisiert, mit mehreren unabhängigen Anbietern als Ausweichwert. Eine serverseitige Kopie alle drei Minuten liefert die Erstanzeige und dient als Reserve.' },
        { q: 'Warum weicht der Grammpreis von der Angabe meines Juweliers ab?', a: 'Einzelhandelspreise enthalten über dem Metallwert auch Verarbeitungskosten, Designkosten, Steuern und die Marge des Händlers. Diese Seite zeigt ausschließlich den Referenzpreis des Metalls.' },
        { q: 'Ist das der Preis, den ich beim Goldverkauf erhalte?', a: 'Nicht unbedingt. Händler kaufen unter dem Spotpreis an und können Prüf- oder Bearbeitungsgebühren erheben. Betrachten Sie den Wert hier als Vergleichsmaßstab.' },
      ],
    },
    cn: {
      intro: 'China veröffentlicht Höchst-Einzelhandelspreise für Kraftstoffe je Provinz. Die Werte unten sind Orientierungsobergrenzen in Yuan pro Liter und werden von der nationalen Preisaufsicht regelmäßig angepasst.',
      sections: [
        { h: 'Wie China die Kraftstoffpreise festsetzt', p: 'Die Einzelhandelspreise für Kraftstoffe in Festlandchina folgen einem gesteuerten Preismechanismus. Die nationale Behörde passt den Höchstpreis an, wenn der gleitende Durchschnitt der internationalen Rohölpreise eine festgelegte Schwelle überschreitet; die Anpassungen werden in einem Zyklus von etwa zehn Werktagen geprüft. Bei sehr heftigen Bewegungen des internationalen Rohöls dämpft der Mechanismus die Weitergabe, um Verbraucher und Industrie zu schützen.' },
        { h: 'Warum die Preise je Provinz unterschiedlich sind', p: 'Die nationale Orientierung setzt eine Basis, doch jede Provinz veröffentlicht ihre eigene Obergrenze. Transportentfernungen von Raffinerien und Häfen, lokale Vertriebskosten, regionale Abgaben und Marktbedingungen erzeugen Abweichungen. Deshalb sind Binnenprovinzen oft etwas teurer als Küstenprovinzen.' },
        { h: 'Was die Sortenbezeichnungen bedeuten', p: 'Die Zahlen 92, 95 und 98 bezeichnen die Research-Oktanzahl, ein Maß für die Klopffestigkeit im Motor. Höhere Werte passen zu Motoren mit höherem Verdichtungsverhältnis. Eine über dem Bedarf des Motors liegende Sorte verbessert die Leistung in der Regel nicht; die Herstellerempfehlung im Handbuch ist der richtige Maßstab.' },
        { h: 'Diesel und saisonale Sorten', p: 'Diesel der Sorte 0 ist der Standard-Dieselkraftstoff für Kraftfahrzeuge. In den kalten nördlichen Regionen werden im Winter saisonale Varianten mit niedrigerem Cloud Point geliefert, um Paraffinbildung im Kraftstoffsystem zu vermeiden.' },
      ],
      faq: [
        { q: 'Sind das die genauen Preise an der Zapfsäule?', a: 'Es sind provinziale Höchst-Einzelhandelspreise als Orientierung. Einzelne Tankstellen können Rabatte oder Anpassungen anbieten, sodass der tatsächlich gezahlte Preis etwas niedriger ausfallen kann.' },
        { q: 'Wie oft ändert sich der Preis?', a: 'Die Orientierung wird etwa alle zehn Werktage geprüft, bei heftigen Bewegungen des internationalen Rohöls früher. Diese Seite folgt dem offiziellen Anpassungszyklus.' },
        { q: 'Warum weicht meine Stadt vom Provinzwert ab?', a: 'Manche Provinzen veröffentlichen eine einzige provinzweite Obergrenze, andere differenzieren nach Stadt oder Region. Wählen Sie den Eintrag, der Ihrem Standort am nächsten liegt.' },
      ],
    },
    fx: {
      intro: 'Der Rechner unten verwendet Referenzwechselkurse, die nach einem täglichen Zeitplan aktualisiert werden. Er ist für schnelle Schätzungen gedacht, nicht für genaue Abrechnungen.',
      sections: [
        { h: 'Was ist ein Referenzwechselkurs?', p: 'Ein Referenz- oder Mittelkurs liegt etwa in der Mitte zwischen An- und Verkaufskursen, die Banken einander stellen. Er ist der fairste einzelne Wert, um zu beschreiben, was eine Währung zu einem bestimmten Zeitpunkt wert ist, und wird von den meisten öffentlichen Kurstabellen verwendet.' },
        { h: 'Warum Ihre Bank einen anderen Wert nennt', p: 'Retail- und Geschäftsbanken schlagen auf den Mittelkurs eine Marge auf, und Kartennetzwerke fügen ihre eigene Spanne und Gebühren hinzu. Deshalb ist der Kurs, den Sie tatsächlich erhalten, meist etwas schlechter als der hier gezeigte Referenzkurs.' },
        { h: 'Wie man ein Währungspaar liest', p: 'In einem Paar wie USD/CNY ist die erste Währung die Basis und die zweite die Kurswährung. Die Zahl gibt an, wie viel von der Kurswährung eine Einheit der Basiswährung kauft. Steigt die Zahl, hat sich die Basiswährung gegenüber der Kurswährung verstärkt.' },
        { h: 'Was Wechselkurse bewegt', p: 'Zinsdifferenzen zwischen Ländern, Inflationserwartungen, Handelsbilanzen, Kapitalströme, politische Stabilität und die Politik der Zentralbanken beeinflussen die Kurse. Devisenmärkte sind an Werktagen rund um die Uhr geöffnet, am Wochenende jedoch geschlossen; daher scheinen die Kurse von Freitagabend bis Sonntag eingefroren.' },
      ],
      faq: [
        { q: 'Wie aktuell sind diese Kurse?', a: 'Die Kurse werden nach einem täglichen Zeitplan aktualisiert. Sie eignen sich für Budgetplanung und Vergleiche, nicht für die Ausführung einer Überweisung.' },
        { q: 'Ist das der Kurs, den meine Bank mir gibt?', a: 'Nein. Banken und Überweisungsdienste wenden auf den Referenzkurs eine Marge und Gebühren an. Der tatsächliche Kurs wird abweichen.' },
        { q: 'Kann ich das für Buchhaltung oder Abrechnung nutzen?', a: 'Nein. Verwenden Sie für finanzielle Aufzeichnungen den offiziellen Kurs Ihrer Bank, Ihres Zahlungsdienstleisters oder Ihrer Steuerbehörde.' },
      ],
    },
    wti: {
      intro: 'WTI ist die Referenzsorte für US-Rohöl und nach Brent der weltweit zweithäufigste zitierte Ölpreis. Er wird in US-Dollar pro Barrel notiert und während der Handelszeiten aktualisiert.',
      sections: [
        { h: 'Was ist WTI-Rohöl?', p: 'West Texas Intermediate ist ein leichtes, süßes Rohöl, das vor allem im Perm-Becken und in der Mittelkontinentalregion der USA gefördert wird. Es ist sehr leicht und sehr schwefelarm — qualitativ wohl die hochwertigste der großen Referenzsorten — und damit besonders attraktiv für Raffinerien, die auf Benzin ausgelegt sind. Trotz des Namens stammt es längst nicht mehr nur aus Texas: Die Bezeichnung beschreibt heute eine Spezifikation, nicht eine einzelne geografische Quelle.' },
        { h: 'Warum Cushing der Lieferort ist', p: 'Der WTI-Terminkontrakt wird in Cushing, Oklahoma, erfüllt — einem Binnenknotenpunkt, an dem Dutzende Pipelines zusammenlaufen und mehrere hundert Lagertanks stehen. Diese Konzentration an Infrastruktur macht den Ort zum natürlichen Preispunkt für US-Binnenrohöl. Sie ist aber auch WTIs strukturelle Schwäche: Öl, das in Cushing liegt, kann nur per Pipeline abfließen, und wenn diese Pipelines voll sind, läuft der lokale Preis aus dem Takt mit dem internationalen Seemarkt.' },
        { h: 'WTI und Brent: Warum zwei Referenzen', p: 'Beide sind leichte Süßrohöle, sodass sich ihre Preise auf lange Sicht gemeinsam bewegen. Der Abstand zwischen ihnen ist kein Fehler, sondern spiegelt reale logistische Unterschiede. Brent lässt sich in der Nordsee direkt auf Tanker laden und weltweit verschiffen und folgt deshalb dem globalen Seemarkt. WTI wird im Binnenland, im amerikanischen Mittelkontinent, bepreist und reagiert stärker auf US-Pipelinekapazität, Lagerbestände in Cushing und die heimische Schieferölproduktion.' },
        { h: 'Was der Brent-WTI-Spread verrät', p: 'Die Differenz zwischen beiden Preisen ist eine der meistbeachteten Zahlen im Energiesektor. Notiert Brent deutlich über WTI, bedeutet das meist, dass US-Rohöl durch Pipelineengpässe oder ein Überangebot im Binnenland feststeckt. Verengt sich der Abstand, signalisiert das häufig ausgeweitete Exportkapazität oder einen strafferen globalen Markt. Beide Preise zusammen zu lesen ergibt ein deutlich klareres Bild als jeder für sich.' },
      ],
      faq: [
        { q: 'Ist WTI der Preis, den US-Autofahrer zahlen?', a: 'Es ist die wichtigste Referenz für US-Rohöl, doch der Preis an der Zapfsäule hängt zusätzlich an Raffineriekosten, Vertrieb, Steuern und regionalem Angebot. WTI zeigt, was das Rohöl kostet, nicht den fertigen Kraftstoff.' },
        { q: 'Warum ist WTI meist günstiger als Brent?', a: 'Oft ist es das, aber nicht immer. WTI wird an einem Binnenknoten und nicht an einem Seehafen bepreist und reagiert daher stärker auf Pipelineengpässe und Inlandsbestände. Ein großer Abstand spiegelt meist eine Logistikbeschränkung, keinen Qualitätsunterschied.' },
        { q: 'Wie oft wird der WTI-Preis aktualisiert?', a: 'Der Wert wird während der Handelszeiten erhoben und für die schnelle Auslieferung zwischengespeichert. Am Wochenende sind die Märkte geschlossen, sodass bis zur Wiederaufnahme des Handels der Stand des letzten Handelstages angezeigt wird.' },
      ],
    },
    faqPage: {
      lead: 'Antworten auf die Fragen, die Besucher am häufigsten dazu stellen, wie diese Website Marktdaten erhebt und darstellt.',
      items: [
        { q: 'Ist PriceScope kostenlos?', a: 'Ja. Alle Seiten sind kostenlos und erfordern weder Registrierung noch Abonnement.' },
        { q: 'Woher stammen die Daten?', a: 'Jede Seite nennt ihre eigenen Quellen. Brent- und WTI-Rohöl sind die internationalen bzw. US-Referenzpreise für Rohöl. Internationales Gold (XAU/USD) ist der Preis des offenen Spotmarkts, von mehreren unabhängigen Anbietern. Chinas Einzelhandels-Kraftstoffpreise sind provinziale Höchstpreise. Referenzwechselkurse sind Mittelkurse. Alle Werte sind indikative Referenzwerte, keine Börsenabrechnungspreise.' },
        { q: 'Wie oft werden die Daten aktualisiert?', a: 'Internationales Gold wird während der Handelszeiten in Echtzeit in Ihrem Browser aktualisiert. Brent und WTI werden während der Handelszeiten in Echtzeit aktualisiert. Chinas Kraftstoffpreise folgen dem offiziellen Überprüfungszyklus von etwa zehn Werktagen. Wechselkurse werden täglich aktualisiert. Die Weltmärkte sind am Wochenende geschlossen, daher zeigen die Wochenendwerte die letzte Sitzung bis zur Wiedereröffnung.' },
        { q: 'Sind das offizielle Preise?', a: 'Nein. Alle Werte sind Referenzpreise für allgemeine Informationszwecke. Es sind keine Börsenabrechnungspreise und sie dürfen nicht für Handel, Abrechnung oder Buchhaltung verwendet werden.' },
        { q: 'Kann ich mich für Anlageentscheidungen darauf verlassen?', a: 'Nein. Die Daten dienen ausschließlich der allgemeinen Information und stellen keine Anlageberatung dar. Bestätigen Sie Werte vor einer Entscheidung stets bei einer zugelassenen Fachkraft oder einer offiziellen Quelle.' },
        { q: 'Speichern Sie meine persönlichen Daten?', a: 'Die Website erfordert keine Registrierung. Alle Details zu Cookies und Analysen finden Sie in der Datenschutzerklärung.' },
        { q: 'Wie melde ich ein Datenproblem?', a: 'Nutzen Sie die E-Mail-Adresse auf der Kontaktseite. Hinweise zu konkreten Werten sind willkommen und werden zügig geprüft.' },
      ],
    },
  },

  /* ============================== PT ============================== */
  pt: {
    common: {
      dataSources: 'Fontes dos dados',
      sourcesBody: 'Petróleo Brent — preço de referência do mercado internacional de petróleo. Petróleo WTI — preço de referência do petróleo dos EUA. Ouro internacional (XAU/USD) — preço do mercado spot aberto, obtido de vários fornecedores independentes e atualizado em tempo real no seu navegador. Combustíveis no varejo da China — preços máximos de varejo por província. Taxas de câmbio de referência — taxas médias de mercado. Todos os valores são indicativos de referência, não preços de liquidação de bolsa.',
      disclaimerTitle: 'Aviso legal',
      disclaimerBody: 'Os preços e taxas exibidos são valores de referência para fins informativos gerais. Não são preços de liquidação de bolsa e não devem ser usados para negociar, liquidar, contabilizar ou para qualquer decisão de investimento. Os valores podem estar defasados e divergir dos informados pelo seu banco, corretora ou revendedor local.',
      learnMore: 'Saiba mais',
      faqHeading: 'Perguntas frequentes',
      aboutThisData: 'Sobre estes dados',
    },
    oil: {
      intro: 'O petróleo Brent é a referência de preço de cerca de dois terços do petróleo negociado internacionalmente. O valor abaixo é cotado em dólares americanos por barril e atualizado em cronograma diário.',
      sections: [
        { h: 'O que é o petróleo Brent?', p: 'O Brent é uma mistura de petróleo bruto leve e com baixo teor de enxofre, extraída de campos no Mar do Norte, entre o Reino Unido e a Noruega. Por ser pouco sulfuroso e relativamente fácil de refinar, tornou-se o tipo de referência usado para precificar a maior parte do petróleo negociado internacionalmente. Quando a imprensa fala em «o preço do petróleo», costuma citar o Brent.' },
        { h: 'Por que o Brent é a referência global', p: 'Ao contrário dos tipos situados no interior, o Brent pode ser carregado diretamente em navios-tanque no mar, o que facilita negociá-lo e enviá-lo a qualquer lugar. Essa flexibilidade logística, somada a um profundo mercado futuro na bolsa ICE, tornou-o a âncora de preços do petróleo vendido da Europa, África e Oriente Médio para a Ásia.' },
        { h: 'Como o preço é cotado', p: 'O Brent é cotado em dólares por barril; um barril equivale a 42 galões americanos, cerca de 159 litros. Para obter o preço por litro, divida o preço do barril por 159. A cotação em dólares significa que um dólar mais forte encarece o petróleo para compradores de outras moedas, mesmo que o preço subjacente não tenha mudado.' },
        { h: 'O que move o preço', p: 'Decisões de produção da OPEP e de outros grandes produtores, eventos geopolíticos nas regiões produtoras, mudanças na demanda global, temporadas de manutenção de refinarias e oscilações do dólar influenciam a cotação. Como o petróleo é precificado em dólares, o movimento cambial por si só pode alterar o número.' },
      ],
      faq: [
        { q: 'Com que frequência o preço do Brent é atualizado?', a: 'Os preços são atualizados em tempo real durante o pregão e guardados em cache por pouco tempo para entrega rápida. Os mercados fecham nos fins de semana, portanto o valor da sessão mais recente é exibido até a retomada das negociações.' },
        { q: 'Este é o preço oficial de liquidação?', a: 'Não. É um preço de referência de mercado de fornecedores públicos de dados, não uma liquidação oficial de bolsa. Serve para acompanhar tendências gerais, não para liquidar ou negociar.' },
        { q: 'Por que o preço não muda nos fins de semana?', a: 'Os mercados globais de petróleo fecham no fim de semana. Os valores de sábado e domingo são o último preço da sessão anterior.' },
      ],
    },
    gold: {
      intro: 'O ouro é cotado internacionalmente em dólares americanos por onça troy. O valor por grama é derivado dessa cotação, de modo que ambos se movem juntos.',
      sections: [
        { h: 'O que é o preço internacional do ouro?', p: 'O preço internacional à vista, frequentemente escrito XAU/USD, é o preço de uma onça troy de ouro puro em dólares americanos. Forma-se pela negociação contínua nos principais centros e é a referência usada por negociantes de barras, joalheiros e instituições financeiras no mundo todo.' },
        { h: 'Onças troy e gramas', p: 'Os metais preciosos usam a onça troy, cerca de 31,1035 gramas, um pouco mais pesada que a onça comum de 28,35 gramas. Para converter um preço por grama em preço por onça troy, multiplique por 31,1035. A maior parte das joias no varejo é vendida por grama, de modo que esse costuma ser o valor mais prático para compras pessoais.' },
        { h: 'Pureza e quilates', p: 'O preço à vista refere-se ao ouro puro, 24 quilates. Peças de quilates menores contêm menos ouro: 18 quilates equivalem a 75% e 14 quilates a cerca de 58,5%. Para estimar o valor do ouro de uma peça, multiplique o peso pelo teor e depois pelo preço atual.' },
        { h: 'O que move o preço', p: 'O ouro reage às taxas de juros reais, às expectativas de inflação, à força do dólar, às compras de bancos centrais e à demanda por ativos de refúgio em períodos de incerteza. Por ser cotado em dólares, costuma mover-se de forma inversa ao dólar.' },
      ],
      faq: [
        { q: 'Com que frequência o preço do ouro é atualizado?', a: 'Continuamente. Enquanto o mercado está aberto, o valor nesta página é atualizado em tempo real no seu navegador diretamente do mercado spot, com vários fornecedores independentes como recurso. Uma cópia do servidor capturada a cada três minutos fornece a primeira exibição e serve de backup.' },
        { q: 'Por que o preço por grama difere do que meu joalheiro cobra?', a: 'Os preços de varejo incluem, além do valor do metal, custos de fabricação, design, impostos e a margem do revendedor. Esta página mostra apenas o preço de referência do metal.' },
        { q: 'É o preço que receberia ao vender ouro?', a: 'Não necessariamente. Revendedores compram abaixo do preço à vista e podem cobrar taxas de ensaio ou manuseio. Use o valor daqui como base de comparação.' },
      ],
    },
    cn: {
      intro: 'A China publica preços máximos de varejo de combustíveis por província. Os valores abaixo são tetos de orientação em yuan por litro, revisados periodicamente pela autoridade nacional de preços.',
      sections: [
        { h: 'Como a China define os preços dos combustíveis', p: 'Os preços de varejo de combustíveis na China continental seguem um mecanismo de preços administrado. A autoridade nacional ajusta o teto quando a média móvel dos preços internacionais do petróleo ultrapassa um limite definido, e os ajustes são revisados em um ciclo de cerca de dez dias úteis. Quando o petróleo internacional oscila de forma muito brusca, o mecanismo também amortece a transferência para proteger consumidores e a indústria.' },
        { h: 'Por que os preços diferem por província', p: 'A orientação nacional estabelece uma base, mas cada província publica seu próprio teto. A distância de transporte desde refinarias e portos, custos locais de distribuição, tributos regionais e condições de mercado geram variação. Por isso, províncias do interior costumam ser um pouco mais caras que as costeiras.' },
        { h: 'O que significam os graus', p: 'Os números 92, 95 e 98 referem-se ao índice de octanagem de pesquisa, que mede a resistência à detonação no motor. Números maiores convêm a motores com taxa de compressão mais alta. Escolher um grau acima do que seu motor exige normalmente não melhora o desempenho; portanto, a recomendação do fabricante no manual é o guia correto.' },
        { h: 'Diesel e graus sazonais', p: 'O diesel grau zero é o tipo padrão de diesel automotivo. Nas regiões frias do norte, variantes sazonais com ponto de turvação mais baixo são fornecidas no inverno para evitar a formação de parafina no sistema de combustível.' },
      ],
      faq: [
        { q: 'Estes são os preços exatos na bomba?', a: 'São preços máximos de varejo de orientação por província. Postos individuais podem oferecer descontos ou ajustes, de modo que o preço efetivamente pago pode ser um pouco menor.' },
        { q: 'Com que frequência o preço muda?', a: 'A orientação é revisada a cada dez dias úteis aproximadamente, ou antes se o petróleo internacional oscilar de forma brusca. Esta página segue o ciclo oficial de revisão.' },
        { q: 'Por que minha cidade difere do valor da província?', a: 'Algumas províncias publicam um único teto provincial, enquanto outras diferenciam por cidade ou região. Consulte a entrada mais próxima da sua localização.' },
      ],
    },
    fx: {
      intro: 'O conversor abaixo usa taxas de câmbio de referência atualizadas em cronograma diário. Foi criado para estimativas rápidas, não para liquidações exatas.',
      sections: [
        { h: 'O que é uma taxa de câmbio de referência?', p: 'Uma taxa média ou de referência fica aproximadamente no meio entre os preços de compra e venda que os bancos se cotam entre si. É o número único mais justo para descrever quanto vale uma moeda em determinado momento, e é o que a maioria das tabelas públicas exibe.' },
        { h: 'Por que seu banco informa um valor diferente', p: 'Bancos de varejo e comerciais acrescentam uma margem sobre a taxa média, e as redes de cartões somam seu próprio spread e tarifas. Por isso, a taxa que você recebe na prática costuma ser um pouco pior que a de referência exibida aqui.' },
        { h: 'Como ler um par de moedas', p: 'Em um par como USD/CNY, a primeira moeda é a base e a segunda é a cotada. O número indica quanta moeda cotada uma unidade da moeda base compra. Se o número sobe, a moeda base se fortaleceu frente à moeda cotada.' },
        { h: 'O que move as taxas de câmbio', p: 'Diferenciais de juros entre países, expectativas de inflação, balanças comerciais, fluxos de capital, estabilidade política e a política dos bancos centrais influenciam as taxas. Os mercados de câmbio funcionam sem interrupção em dias úteis, mas fecham nos fins de semana; por isso as taxas parecem congeladas de sexta à noite até domingo.' },
      ],
      faq: [
        { q: 'Qual é a atualidade destas taxas?', a: 'As taxas são atualizadas em cronograma diário. Servem para orçamento e comparação, mas não para executar uma transferência.' },
        { q: 'É a taxa que meu banco me dará?', a: 'Não. Bancos e serviços de transferência aplicam margem e tarifas sobre a taxa de referência. Espere que a taxa prática seja diferente.' },
        { q: 'Posso usar isto para contabilidade ou liquidação?', a: 'Não. Use a taxa oficial publicada pelo seu banco, provedor de pagamento ou autoridade fiscal para qualquer registro financeiro.' },
      ],
    },
    wti: {
      intro: 'O WTI é a referência do petróleo bruto americano e o segundo preço de petróleo mais citado no mundo, depois do Brent. É cotado em dólares por barril e atualizado durante o horário de negociação.',
      sections: [
        { h: 'O que é o petróleo WTI?', p: 'O West Texas Intermediate é um petróleo leve e doce produzido principalmente na Bacia do Permiano e na região centro-continental dos Estados Unidos. É muito leve e com teor de enxofre muito baixo — provavelmente a mais alta qualidade entre as grandes referências —, o que o torna especialmente atraente para refinarias voltadas à produção de gasolina. Apesar do nome, já não é extraído apenas no Texas: hoje o grau descreve uma especificação, e não uma única origem geográfica.' },
        { h: 'Por que a entrega ocorre em Cushing', p: 'O contrato futuro do WTI é liquidado em Cushing, Oklahoma, um nó interior onde convergem dezenas de oleodutos e se erguem centenas de tanques de armazenagem. Essa concentração de infraestrutura faz do local o ponto natural de precificação do petróleo do interior americano. Mas é também a fraqueza estrutural do WTI: o óleo armazenado em Cushing só pode sair por oleoduto e, quando esses dutos estão cheios, o preço local se desalinha do mercado marítimo internacional.' },
        { h: 'WTI e Brent: por que existem duas referências', p: 'Ambos são petróleos leves e doces, de modo que, no longo prazo, seus preços se movem juntos. A diferença entre eles não é um erro: reflete diferenças logísticas reais. O Brent pode ser carregado diretamente em navios no Mar do Norte e enviado a qualquer lugar, acompanhando o mercado marítimo global. O WTI é cotado no interior, no centro do continente americano, e reage com mais intensidade à capacidade dos oleodutos, ao nível dos estoques em Cushing e à produção doméstica de xisto.' },
        { h: 'O que o diferencial Brent-WTI revela', p: 'A diferença entre os dois preços é um dos números mais observados do setor de energia. Quando o Brent é negociado bem acima do WTI, isso normalmente significa que o petróleo americano está preso no interior por restrições de oleodutos ou por excesso de oferta. Quando a diferença se estreita, costuma indicar que a capacidade de exportação se expandiu ou que a oferta global ficou mais apertada. Ler os dois preços em conjunto dá um quadro bem mais claro do mercado do que qualquer um isoladamente.' },
      ],
      faq: [
        { q: 'O WTI é o preço que os motoristas americanos pagam?', a: 'É a principal referência do petróleo nos EUA, mas o preço na bomba também depende dos custos de refino, da distribuição, dos impostos e da oferta regional. O WTI indica quanto custa o petróleo bruto, não o combustível pronto.' },
        { q: 'Por que o WTI costuma ser mais barato que o Brent?', a: 'Com frequência é, mas nem sempre. O WTI é cotado em um nó interior, não em um porto, o que o torna mais sensível a gargalos de oleodutos e aos estoques domésticos. Uma diferença ampla geralmente reflete uma restrição logística, não uma diferença de qualidade.' },
        { q: 'Com que frequência o preço do WTI é atualizado?', a: 'O dado é atualizado em tempo real enquanto os mercados operam e guardado em cache por pouco tempo para entrega rápida. Os mercados fecham nos fins de semana, de modo que o nível da última sessão é exibido até a retomada das negociações.' },
      ],
    },
    faqPage: {
      lead: 'Respostas às perguntas que os visitantes mais fazem sobre como este site coleta e apresenta os dados de mercado.',
      items: [
        { q: 'O PriceScope é gratuito?', a: 'Sim. Todas as páginas são gratuitas e não exigem cadastro nem assinatura.' },
        { q: 'De onde vêm os dados?', a: 'Cada página indica suas próprias fontes. O petróleo Brent e o WTI são os preços de referência internacional e dos EUA. O ouro internacional (XAU/USD) é o preço do mercado spot aberto, obtido de vários fornecedores independentes. Os combustíveis no varejo da China são preços máximos de varejo por província. As taxas de câmbio de referência são taxas médias de mercado. Todos os valores são referências indicativas, não preços de liquidação de bolsa.' },
        { q: 'Com que frequência os dados são atualizados?', a: 'O ouro internacional é atualizado em tempo real no seu navegador enquanto o mercado está aberto. Brent e WTI são atualizados em tempo real durante o pregão. Os combustíveis da China seguem o ciclo oficial de revisão de cerca de dez dias úteis. As taxas de câmbio são atualizadas diariamente. Como os mercados fecham nos fins de semana, os valores refletem a última sessão até a reabertura.' },
        { q: 'Estes são preços oficiais?', a: 'Não. Todos os valores são preços de referência para fins informativos gerais. Não são preços de liquidação de bolsa e não devem ser usados para negociar, liquidar ou contabilizar.' },
        { q: 'Posso me basear neles para decisões de investimento?', a: 'Não. Os dados são fornecidos apenas para fins informativos gerais e não constituem aconselhamento de investimento. Sempre confirme os valores com um profissional licenciado ou uma fonte oficial antes de agir.' },
        { q: 'Vocês armazenam meus dados pessoais?', a: 'O site não exige cadastro. Leia a política de privacidade para detalhes completos sobre cookies e análise.' },
        { q: 'Como informo um problema com os dados?', a: 'Use o endereço de e-mail na página de contato. Relatos sobre valores específicos são bem-vindos e investigados rapidamente.' },
      ],
    },
  },
};
