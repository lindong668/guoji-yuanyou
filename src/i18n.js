// ============================================================
// PriceScope — Internationalisation (7 languages)
// Default / fallback language: English
// ============================================================

export const LANGS = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'pt'];
export const DEFAULT_LANG = 'en';
export const SITE = {
  brand: 'PriceScope',
  domain: 'https://you.piccalc.com',
  contactEmail: 'FENG91111@gmail.com',
};

// ------------------------------------------------------------
// Translations
// ------------------------------------------------------------
export const T = {

  /* ============================ ENGLISH ============================ */
  en: {
    htmlLang: 'en', label: 'English', flag: '🇺🇸',
    brand: 'PriceScope',
    tagline: 'Live Oil, Gold, Fuel & Currency Rates',
    homeTitle: 'PriceScope — Live Crude Oil, Gold, China Fuel & Currency Rates',
    homeDesc: 'Track international crude oil prices, gold rates in USD/oz and CNY/gram, China retail fuel prices by province, and live currency exchange rates. Free, fast, updated worldwide.',

    nav: { overview: 'Overview', oil: 'Crude Oil', gold: 'Gold', cn: 'China Fuel', fx: 'Currency', about: 'About', privacy: 'Privacy', contact: 'Contact' },

    heroBadge: 'Live Market Data',
    heroTitle: 'Global Oil, Gold & Currency Prices in One Place',
    heroSub: 'Real-time crude oil, gold and China retail fuel prices — plus a free currency converter. Data refreshes automatically, served from a global edge network for visitors worldwide.',
    heroCta: 'See Live Prices',

    secOverview: 'Market Overview',
    secOil: 'International Crude Oil',
    secGold: 'International Gold',
    secCn: 'China Retail Fuel',
    secFx: 'Currency Converter',

    price: 'Price', updatedAt: 'Updated', dataSource: 'Data source', unitBarrel: 'USD / barrel',
    goldUsd: 'Gold (USD / troy ounce)', goldCny: 'Gold (CNY / gram)',
    cnNote: 'Provincial maximum retail prices, revised roughly every 10 working days.',
    thProvince: 'Province / Region', th92: '92#', th95: '95#', th98: '98#', th0: '0# Diesel',
    provincesCount: 'regions covered',
    weekendNote: 'Markets are closed on weekends — the most recent trading day figures are shown.',
    viewAll: 'View all',

    fxAmount: 'Amount', fxFrom: 'From', fxTo: 'To', fxResult: 'Result', fxBtn: 'Convert', fxRate: '1 {from} = {rate} {to}', fxUpdated: 'Rates updated', fxNote: 'Mid-market reference rates, refreshed daily. For indication only — not for settlement.', fxPopular: 'Popular conversions',

    oilTitle: 'International Crude Oil Price',
    oilMetaTitle: 'Crude Oil Price Today — Live International Oil Rate | PriceScope',
    oilMetaDesc: 'Live international crude oil price per barrel with automatic updates. Track the global benchmark oil rate used by markets worldwide.',
    goldTitle: 'International Gold Price',
    goldMetaTitle: 'Gold Price Today — Live USD/oz & CNY/gram | PriceScope',
    goldMetaDesc: 'Live international gold price in US dollars per troy ounce and Chinese yuan per gram. Updated automatically from global market data.',
    cnTitle: 'China Retail Fuel Prices',
    cnMetaTitle: 'China Fuel Price Today — 92, 95, 98 & Diesel by Province | PriceScope',
    cnMetaDesc: 'Latest China retail fuel prices for 92#, 95#, 98# gasoline and 0# diesel across all provinces. Provincial maximum retail prices, updated regularly.',
    fxTitle: 'Currency Converter & Exchange Rates',
    fxMetaTitle: 'Currency Converter — Live Exchange Rates | PriceScope',
    fxMetaDesc: 'Free currency converter with live mid-market exchange rates. Convert between major world currencies instantly, with daily refreshed reference rates.',

    privacyTitle: 'Privacy Policy',
    privacyMetaDesc: 'How PriceScope collects, uses and protects your information, including the use of cookies and advertising partners.',
    privacyUpdated: 'Last updated',
    privacyIntro: 'PriceScope ("we", "our") is committed to protecting your privacy. This policy explains what information is collected when you visit our website, how it is used, and the choices available to you.',
    privacySections: [
      { h: 'Information We Collect', p: 'We collect limited non-personal information automatically when you visit the site, such as your browser language preference, approximate region derived from your IP address, pages visited and referring page. We do not require you to register, and we do not ask for your name, address or payment details to use this website.' },
      { h: 'How We Use Information', p: 'The information collected is used to display the site in your preferred language, to understand aggregate traffic patterns so we can improve performance and content, to keep the service secure and prevent abuse, and to display relevant advertising.' },
      { h: 'Cookies & Advertising (Google)', p: 'We use cookies and similar technologies to operate the site and to serve advertisements. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this or other websites. Google\'s use of advertising cookies enables it and its partners to serve ads based on your interests. You may opt out of personalised advertising by visiting Google Ads Settings, or opt out of third-party cookies at aboutads.info.' },
      { h: 'Data Sources & Accuracy', p: 'Market prices shown on this website are obtained from third-party public data providers and are provided for informational and reference purposes only. Prices may be delayed, rounded, or temporarily unavailable, and may differ from the rates offered by your bank, broker or local fuel station. We make no warranty as to accuracy, completeness or fitness for any particular purpose.' },
      { h: 'Your Rights & Contact', p: 'Depending on your location, you may have the right to request access to, correction of, or deletion of any personal data we hold, and to object to certain processing. You may also disable cookies in your browser settings at any time. For any privacy question, please contact us at FENG91111@gmail.com.' },
    ],

    aboutTitle: 'About PriceScope',
    aboutMetaDesc: 'PriceScope provides free, fast and globally accessible market price data for crude oil, gold, China retail fuel and world currencies.',
    aboutIntro: 'PriceScope is an independent price information website built for a worldwide audience. Our goal is simple: make essential market prices easy to read, in your own language, on any device.',
    aboutSections: [
      { h: 'Our Mission', p: 'Energy, precious metal and currency prices move constantly and affect everyday decisions everywhere. Yet most price sources are slow, region-locked, or buried in advertising. PriceScope presents the numbers cleanly, loads instantly from a global edge network, and speaks your language — currently seven of them.' },
      { h: 'What We Track', p: 'We focus on four core datasets: the international crude oil benchmark price per barrel, the international gold price expressed both in US dollars per troy ounce and Chinese yuan per gram, China retail fuel ceiling prices for 92#, 95#, 98# gasoline and 0# diesel across all provinces, and reference exchange rates between major world currencies.' },
      { h: 'How It Works', p: 'Our backend retrieves market data from third-party public data providers on a scheduled basis and stores it at the network edge. When you open a page, the latest stored values are rendered directly into the HTML before it reaches your browser. This makes pages fast, and it also means search engines and assistive technologies can read the real numbers without running scripts.' },
      { h: 'Disclaimer', p: 'All prices are indicative reference values sourced from third parties and may be delayed or rounded. Nothing on this website constitutes financial, investment, tax or legal advice. Always verify current rates with an official or licensed provider before making any transaction.' },
    ],

    contactTitle: 'Contact Us',
    contactMetaDesc: 'Get in touch with the PriceScope team for data questions, corrections, advertising or partnership enquiries.',
    contactIntro: 'Have a question, spotted an incorrect figure, or want to discuss advertising or data partnership? We would like to hear from you.',
    contactEmailLabel: 'Email us directly',
    contactNote: 'We typically respond within 1–3 business days. Please include the page URL and, if reporting a data issue, the value you believe is incorrect and the approximate time you saw it.',
    contactTopics: 'We welcome enquiries about: data accuracy and corrections, advertising and sponsorship, partnership and data licensing, technical issues or accessibility, and privacy requests.',

    footerRights: 'All rights reserved.',
    footerDisclaimer: 'Prices are indicative reference values from third-party sources and may be delayed or rounded. Not financial advice.',
    footerQuick: 'Markets', footerLegal: 'Legal', footerCompany: 'Site',
  },

  /* ========================= 简体中文 (ZH) ========================= */
  zh: {
    htmlLang: 'zh-CN', label: '简体中文', flag: '🇨🇳',
    brand: 'PriceScope',
    tagline: '实时原油 · 黄金 · 油价 · 汇率',
    homeTitle: 'PriceScope — 实时国际原油、黄金、国内油价与汇率',
    homeDesc: '一站式查看国际原油价格、国际金价（美元/盎司 与 人民币/克）、中国各省份成品油零售价，以及实时货币汇率。免费、快速、面向全球用户。',

    nav: { overview: '总览', oil: '国际原油', gold: '国际黄金', cn: '国内油价', fx: '汇率换算', about: '关于本站', privacy: '隐私政策', contact: '联系我们' },

    heroBadge: '实时行情数据',
    heroTitle: '全球原油、黄金与汇率，一站掌握',
    heroSub: '实时国际原油、黄金与中国成品油价格，并内置免费汇率换算工具。数据自动更新，依托全球边缘网络为各地访客快速加载。',
    heroCta: '查看实时价格',

    secOverview: '行情总览',
    secOil: '国际原油',
    secGold: '国际黄金',
    secCn: '国内油价',
    secFx: '汇率换算',

    price: '价格', updatedAt: '更新时间', dataSource: '数据来源', unitBarrel: '美元 / 桶',
    goldUsd: '黄金（美元 / 金衡盎司）', goldCny: '黄金（人民币 / 克）',
    cnNote: '各省最高零售限价，约每 10 个工作日调整一次。',
    thProvince: '省份 / 地区', th92: '92#', th95: '95#', th98: '98#', th0: '0# 柴油',
    provincesCount: '个地区',
    weekendNote: '周末市场休市，显示最近一个交易日数据。',
    viewAll: '查看全部',

    fxAmount: '金额', fxFrom: '源货币', fxTo: '目标货币', fxResult: '换算结果', fxBtn: '换算', fxRate: '1 {from} = {rate} {to}', fxUpdated: '汇率更新', fxNote: '中间市场参考汇率，每日刷新。仅供参考，不作为结算依据。', fxPopular: '常用换算',

    oilTitle: '国际原油价格',
    oilMetaTitle: '今日国际原油价格 — 实时油价查询 | PriceScope',
    oilMetaDesc: '实时国际原油每桶价格，自动更新。追踪全球市场通用的原油基准报价。',
    goldTitle: '国际黄金价格',
    goldMetaTitle: '今日国际金价 — 美元/盎司 与 人民币/克 实时查询 | PriceScope',
    goldMetaDesc: '实时国际黄金价格，同时以美元/金衡盎司与人民币/克显示，数据自动更新。',
    cnTitle: '中国国内成品油价格',
    cnMetaTitle: '今日国内油价 — 全国各省份 92、95、98 及柴油价格 | PriceScope',
    cnMetaDesc: '全国各省份 92#、95#、98# 汽油与 0# 柴油最新零售价，省级最高零售限价，定期更新。',
    fxTitle: '汇率换算与外币牌价',
    fxMetaTitle: '汇率换算器 — 实时外币汇率 | PriceScope',
    fxMetaDesc: '免费汇率换算工具，提供实时中间市场汇率，支持全球主要货币即时换算，参考汇率每日刷新。',

    privacyTitle: '隐私政策',
    privacyMetaDesc: 'PriceScope 如何收集、使用与保护您的信息，包括 Cookie 与广告合作方的相关说明。',
    privacyUpdated: '最后更新',
    privacyIntro: 'PriceScope（以下简称"我们"）重视并保护您的隐私。本政策说明您访问本站时我们会收集哪些信息、如何使用这些信息，以及您拥有的选择权。',
    privacySections: [
      { h: '我们收集的信息', p: '您访问本站时，我们会自动收集少量非个人信息，例如浏览器语言偏好、由 IP 地址推导的大致地区、访问页面与来源页面。使用本站无需注册，我们也绝不要求您提供姓名、住址或支付信息。' },
      { h: '信息的使用方式', p: '所收集的信息用于：以您偏好的语言显示网站、分析汇总流量趋势以优化性能与内容、保障服务安全并防止滥用，以及展示相关广告。' },
      { h: 'Cookie 与广告（Google）', p: '我们使用 Cookie 及类似技术来运行网站并投放广告。包括 Google 在内的第三方供应商会使用 Cookie，基于您此前访问本站或其他网站的记录来投放广告。Google 使用广告 Cookie 使其及合作伙伴能够根据您的兴趣投放广告。您可访问 Google 广告设置关闭个性化广告，或通过 aboutads.info 选择退出第三方 Cookie。' },
      { h: '数据来源与准确性', p: '本站展示的市场价格来自第三方公开数据提供方，仅供信息参考。价格可能存在延迟、四舍五入或暂时不可用的情况，也可能与您所在银行、券商或当地加油站的实际报价存在差异。我们不对数据的准确性、完整性或对特定用途的适用性作出任何保证。' },
      { h: '您的权利与联系方式', p: '根据您所在地区，您可能有权要求访问、更正或删除我们所持有的个人数据，并有权拒绝某些处理行为。您也可随时在浏览器设置中禁用 Cookie。如有任何隐私问题，请通过 FENG91111@gmail.com 与我们联系。' },
    ],

    aboutTitle: '关于 PriceScope',
    aboutMetaDesc: 'PriceScope 为全球用户提供免费、快速、易访问的原油、黄金、国内成品油与货币汇率价格数据。',
    aboutIntro: 'PriceScope 是一个面向全球受众的独立价格信息网站。我们的目标很单纯：让重要的市场价格变得易读、以您的母语呈现，并适配任何设备。',
    aboutSections: [
      { h: '我们的使命', p: '能源、贵金属与货币价格时刻波动，影响着各地人们的日常决策。然而多数价格来源要么迟缓、要么有地区限制、要么被广告淹没。PriceScope 以清爽的方式呈现数字，从全球边缘网络即时加载，并支持您的语言——目前已支持七种。' },
      { h: '我们追踪的数据', p: '我们聚焦四类核心数据：国际原油基准价格（每桶）、国际黄金价格（同时以美元/金衡盎司与人民币/克表示）、中国各省份 92#、95#、98# 汽油与 0# 柴油的零售最高限价，以及全球主要货币之间的参考汇率。' },
      { h: '运作方式', p: '我们的后端按计划从第三方公开数据提供方获取市场数据，并将其存储在网络边缘节点。当您打开页面时，最新的数值会在 HTML 送达浏览器之前就已经渲染完成。这不仅让页面加载飞快，也意味着搜索引擎与辅助技术无需执行脚本即可读取真实数字。' },
      { h: '免责声明', p: '所有价格均为来自第三方的指示性参考数值，可能存在延迟或四舍五入。本站内容不构成任何金融、投资、税务或法律建议。在进行任何交易前，请务必向官方或持牌机构核实当前价格。' },
    ],

    contactTitle: '联系我们',
    contactMetaDesc: '如需数据咨询、纠错、广告或合作事宜，欢迎联系 PriceScope 团队。',
    contactIntro: '有问题、发现数据有误，或想洽谈广告与数据合作？欢迎与我们联系。',
    contactEmailLabel: '直接发送邮件',
    contactNote: '我们通常在 1–3 个工作日内回复。如反馈数据问题，请附上页面链接、您认为有误的数值以及您看到该数值的大致时间。',
    contactTopics: '我们欢迎以下类型的咨询：数据准确性与纠错、广告与赞助、合作与数据授权、技术故障或无障碍访问、以及隐私相关请求。',

    footerRights: '保留所有权利。',
    footerDisclaimer: '价格为第三方来源的指示性参考值，可能存在延迟或四舍五入，不构成金融建议。',
    footerQuick: '行情', footerLegal: '条款', footerCompany: '站点',
  },

  /* ========================== 日本語 (JA) ========================== */
  ja: {
    htmlLang: 'ja', label: '日本語', flag: '🇯🇵',
    brand: 'PriceScope',
    tagline: '原油・金・燃料・為替の最新レート',
    homeTitle: 'PriceScope — 国際原油・金・中国燃料価格・為替レート',
    homeDesc: '国際原油価格、金価格（USD/オンス および CNY/グラム）、中国の地域別燃料小売価格、主要通貨の為替レートをまとめて確認できます。無料・高速・世界中で利用可能。',

    nav: { overview: '概要', oil: '原油', gold: '金', cn: '中国燃料', fx: '為替', about: '当サイトについて', privacy: 'プライバシー', contact: 'お問い合わせ' },

    heroBadge: 'ライブ市場データ',
    heroTitle: '世界の原油・金・為替をひとつに',
    heroSub: '国際原油・金・中国燃料価格をリアルタイムで表示し、無料の通貨換算ツールも搭載。データは自動更新され、グローバルエッジネットワークから高速配信されます。',
    heroCta: '価格を見る',

    secOverview: 'マーケット概要',
    secOil: '国際原油',
    secGold: '国際金価格',
    secCn: '中国燃料価格',
    secFx: '通貨換算',

    price: '価格', updatedAt: '更新', dataSource: 'データ源', unitBarrel: 'USD / バレル',
    goldUsd: '金（USD / トロイオンス）', goldCny: '金（CNY / グラム）',
    cnNote: '地域別の小売最高価格。概ね10営業日ごとに改定されます。',
    thProvince: '省・地域', th92: '92#', th95: '95#', th98: '98#', th0: '0# 軽油',
    provincesCount: '地域',
    weekendNote: '週末は市場が休場のため、直近の営業日の数値を表示しています。',
    viewAll: 'すべて見る',

    fxAmount: '金額', fxFrom: '換算元', fxTo: '換算先', fxResult: '結果', fxBtn: '換算', fxRate: '1 {from} = {rate} {to}', fxUpdated: 'レート更新', fxNote: '日次更新のミッドマーケット参考レートです。参考用途のみで、決済には使用できません。', fxPopular: 'よく使われる換算',

    oilTitle: '国際原油価格',
    oilMetaTitle: '本日の原油価格 — 国際オイルレート | PriceScope',
    oilMetaDesc: '国際原油の1バレルあたり価格を自動更新で表示。世界の市場で参照される原油ベンチマークを追跡します。',
    goldTitle: '国際金価格',
    goldMetaTitle: '本日の金価格 — USD/オンス & CNY/グラム | PriceScope',
    goldMetaDesc: '国際金価格をUSD/トロイオンスとCNY/グラムの両方で表示。世界市場データから自動更新されます。',
    cnTitle: '中国燃料小売価格',
    cnMetaTitle: '中国の燃料価格 — 地域別 92・95・98・軽油 | PriceScope',
    cnMetaDesc: '中国全地域の92#・95#・98#ガソリンおよび0#軽油の最新小売価格。地域別小売最高価格を定期更新。',
    fxTitle: '通貨換算・為替レート',
    fxMetaTitle: '通貨換算ツール — 最新為替レート | PriceScope',
    fxMetaDesc: '無料の通貨換算ツール。主要通貨のミッドマーケットレートで即時に換算でき、レートは毎日更新されます。',

    privacyTitle: 'プライバシーポリシー',
    privacyMetaDesc: 'PriceScope が情報をどのように収集・利用・保護するか、Cookie と広告パートナーの利用を含めて説明します。',
    privacyUpdated: '最終更新',
    privacyIntro: 'PriceScope（以下「当サイト」）は、お客様のプライバシー保護に努めます。本ポリシーは、サイト訪問時に収集する情報、その利用方法、およびお客様が選択できる事項を説明するものです。',
    privacySections: [
      { h: '収集する情報', p: 'サイト訪問時に、ブラウザの言語設定、IP アドレスから推定される大まかな地域、閲覧ページ、参照元ページなどの限定的な非個人情報を自動的に収集します。本サイトの利用に登録は不要であり、氏名・住所・支払い情報の入力を求めることはありません。' },
      { h: '情報の利用目的', p: '収集した情報は、お客様の言語での表示、パフォーマンスとコンテンツ改善のための集計トラフィック分析、サービス保護と不正防止、および関連広告の表示に利用されます。' },
      { h: 'Cookie と広告（Google）', p: '当サイトはサイト運営および広告配信のために Cookie および類似技術を使用します。Google を含む第三者ベンダーは、本サイトまたは他サイトへの過去の訪問に基づき Cookie を用いて広告を配信します。Google の広告 Cookie の使用により、Google およびそのパートナーは興味に基づく広告を配信できます。パーソナライズ広告は Google 広告設定から、第三者 Cookie は aboutads.info からオプトアウトできます。' },
      { h: 'データ源と正確性', p: '本サイトに表示される市場価格は第三者の公開データ提供元から取得しており、情報提供のみを目的としています。価格は遅延・丸め・一時的な欠損が生じる場合があり、お客様の銀行・証券会社・最寄りの給油所の実際の価格と異なる場合があります。正確性・完全性・特定目的への適合性について、当サイトは一切の保証を行いません。' },
      { h: 'お客様の権利とお問い合わせ', p: 'お住まいの地域により、保有する個人データへのアクセス、訂正、削除の請求、および一部の処理に対する異議申し立てができる場合があります。またブラウザ設定でいつでも Cookie を無効化できます。プライバシーに関するご質問は FENG91111@gmail.com までご連絡ください。' },
    ],

    aboutTitle: 'PriceScope について',
    aboutMetaDesc: 'PriceScope は原油・金・中国燃料・世界通貨の市場価格データを、無料・高速・世界中からアクセス可能な形で提供します。',
    aboutIntro: 'PriceScope は世界中の利用者に向けた独立系価格情報サイトです。目的はシンプルです。重要な市場価格を、どのデバイスでも、お客様の言語で、読みやすく届けることです。',
    aboutSections: [
      { h: '私たちの使命', p: 'エネルギー、貴金属、通貨の価格は常に変動し、世界中の人々の日々の判断に影響します。しかし多くの価格情報源は遅い、地域制限がある、あるいは広告まみれです。PriceScope は数字をすっきり表示し、グローバルエッジネットワークから瞬時に読み込み、お客様の言語に対応します（現在7言語）。' },
      { h: '対象データ', p: '私たちは4つの中核データに注力しています。国際原油ベンチマーク価格（1バレルあたり）、国際金価格（USD/トロイオンスとCNY/グラムの両方）、中国全地域の92#・95#・98#ガソリンおよび0#軽油の小売最高価格、そして主要通貨間の参考為替レートです。' },
      { h: '仕組み', p: 'バックエンドは第三者の公開データ提供元から定期的に市場データを取得し、ネットワークのエッジに保存します。ページを開くと、最新の値はブラウザに届く前の HTML に既に描画されています。これによりページは高速になり、検索エンジンや支援技術がスクリプトなしで実際の数値を読み取れるようになります。' },
      { h: '免責事項', p: 'すべての価格は第三者由来の参考値であり、遅延や丸めが生じる場合があります。本サイトの内容は金融・投資・税務・法務の助言ではありません。取引の前に必ず公式または認可された提供元で現在の価格をご確認ください。' },
    ],

    contactTitle: 'お問い合わせ',
    contactMetaDesc: 'データのご質問、誤りのご報告、広告・提携のご相談は PriceScope チームまで。',
    contactIntro: 'ご質問、データの誤りの発見、広告やデータ連携のご相談など、お気軽にご連絡ください。',
    contactEmailLabel: 'メールで連絡する',
    contactNote: '通常1〜3営業日以内に返信いたします。データの問題をご報告の際は、ページ URL、誤っていると思われる値、その値を確認したおおよその時刻をお知らせください。',
    contactTopics: '以下のご相談を歓迎します。データの正確性と訂正、広告・スポンサー、提携とデータライセンス、技術的な問題やアクセシビリティ、プライバシーに関するご請求。',

    footerRights: 'All rights reserved.',
    footerDisclaimer: '価格は第三者由来の参考値であり、遅延や丸めが生じる場合があります。金融助言ではありません。',
    footerQuick: 'マーケット', footerLegal: '規約', footerCompany: 'サイト',
  },

  /* ========================== ESPAÑOL (ES) ========================= */
  es: {
    htmlLang: 'es', label: 'Español', flag: '🇪🇸',
    brand: 'PriceScope',
    tagline: 'Petróleo, oro, combustible y divisas en vivo',
    homeTitle: 'PriceScope — Petróleo, oro, combustible en China y divisas en vivo',
    homeDesc: 'Consulta el precio internacional del petróleo crudo, el oro en USD/onza y CNY/gramo, los precios minoristas de combustible en China por provincia y los tipos de cambio en vivo. Gratis, rápido y disponible en todo el mundo.',

    nav: { overview: 'Resumen', oil: 'Petróleo', gold: 'Oro', cn: 'Combustible China', fx: 'Divisas', about: 'Quiénes somos', privacy: 'Privacidad', contact: 'Contacto' },

    heroBadge: 'Datos de mercado en vivo',
    heroTitle: 'Petróleo, oro y divisas mundiales en un solo lugar',
    heroSub: 'Precios en tiempo real de petróleo crudo, oro y combustible en China, además de un conversor de divisas gratuito. Actualización automática y distribución global desde la red perimetral.',
    heroCta: 'Ver precios',

    secOverview: 'Resumen del mercado',
    secOil: 'Petróleo crudo internacional',
    secGold: 'Oro internacional',
    secCn: 'Combustible en China',
    secFx: 'Conversor de divisas',

    price: 'Precio', updatedAt: 'Actualizado', dataSource: 'Fuente', unitBarrel: 'USD / barril',
    goldUsd: 'Oro (USD / onza troy)', goldCny: 'Oro (CNY / gramo)',
    cnNote: 'Precios minoristas máximos por provincia, revisados aproximadamente cada 10 días hábiles.',
    thProvince: 'Provincia / Región', th92: '92#', th95: '95#', th98: '98#', th0: '0# Diésel',
    provincesCount: 'regiones',
    weekendNote: 'Los mercados cierran el fin de semana: se muestran los datos del último día hábil.',
    viewAll: 'Ver todo',

    fxAmount: 'Importe', fxFrom: 'De', fxTo: 'A', fxResult: 'Resultado', fxBtn: 'Convertir', fxRate: '1 {from} = {rate} {to}', fxUpdated: 'Actualizado', fxNote: 'Tipos de referencia de mercado medio, renovados diariamente. Solo informativo, no válido para liquidación.', fxPopular: 'Conversiones frecuentes',

    oilTitle: 'Precio internacional del petróleo crudo',
    oilMetaTitle: 'Precio del petróleo hoy — cotización internacional en vivo | PriceScope',
    oilMetaDesc: 'Precio internacional del petróleo crudo por barril con actualización automática. Sigue la referencia global utilizada por los mercados.',
    goldTitle: 'Precio internacional del oro',
    goldMetaTitle: 'Precio del oro hoy — USD/onza y CNY/gramo en vivo | PriceScope',
    goldMetaDesc: 'Precio internacional del oro en dólares por onza troy y yuanes por gramo, actualizado automáticamente.',
    cnTitle: 'Precios de combustible en China',
    cnMetaTitle: 'Precio del combustible en China — 92, 95, 98 y diésel por provincia | PriceScope',
    cnMetaDesc: 'Últimos precios minoristas de gasolina 92#, 95#, 98# y diésel 0# en todas las provincias de China. Precios máximos provinciales, actualizados periódicamente.',
    fxTitle: 'Conversor de divisas y tipos de cambio',
    fxMetaTitle: 'Conversor de divisas — tipos de cambio en vivo | PriceScope',
    fxMetaDesc: 'Conversor de divisas gratuito con tipos de cambio de mercado medio. Convierte entre las principales monedas del mundo al instante, con referencias renovadas cada día.',

    privacyTitle: 'Política de privacidad',
    privacyMetaDesc: 'Cómo PriceScope recopila, utiliza y protege tu información, incluido el uso de cookies y socios publicitarios.',
    privacyUpdated: 'Última actualización',
    privacyIntro: 'PriceScope («nosotros») se compromete a proteger tu privacidad. Esta política explica qué información se recopila al visitar el sitio, cómo se utiliza y qué opciones tienes.',
    privacySections: [
      { h: 'Información que recopilamos', p: 'Recopilamos automáticamente información limitada y no personal cuando visitas el sitio, como tu preferencia de idioma del navegador, la región aproximada derivada de tu dirección IP, las páginas visitadas y la página de referencia. No es necesario registrarse y no solicitamos nombre, dirección ni datos de pago para usar este sitio.' },
      { h: 'Cómo usamos la información', p: 'La información se usa para mostrar el sitio en tu idioma, entender patrones de tráfico agregados para mejorar el rendimiento y el contenido, mantener la seguridad y prevenir abusos, y mostrar publicidad relevante.' },
      { h: 'Cookies y publicidad (Google)', p: 'Usamos cookies y tecnologías similares para operar el sitio y publicar anuncios. Proveedores externos, incluido Google, usan cookies para mostrar anuncios basados en tus visitas anteriores a este u otros sitios. El uso de cookies publicitarias por parte de Google le permite a él y a sus socios mostrar anuncios según tus intereses. Puedes desactivar la publicidad personalizada en la configuración de anuncios de Google, o excluirte de cookies de terceros en aboutads.info.' },
      { h: 'Fuentes de datos y exactitud', p: 'Los precios mostrados provienen de proveedores públicos externos y se ofrecen solo con fines informativos. Pueden tener retraso, redondeo o no estar disponibles temporalmente, y diferir de los que ofrezcan tu banco, bróker o gasolinera local. No garantizamos exactitud, integridad ni idoneidad para ningún fin.' },
      { h: 'Tus derechos y contacto', p: 'Según tu ubicación, puedes solicitar acceso, corrección o eliminación de los datos personales que tengamos, y oponerte a ciertos tratamientos. También puedes desactivar las cookies en tu navegador en cualquier momento. Para cualquier duda de privacidad, escríbenos a FENG91111@gmail.com.' },
    ],

    aboutTitle: 'Sobre PriceScope',
    aboutMetaDesc: 'PriceScope ofrece datos de precios de petróleo, oro, combustible en China y divisas: gratis, rápidos y accesibles mundialmente.',
    aboutIntro: 'PriceScope es un sitio independiente de información de precios para una audiencia global. Nuestro objetivo es simple: que los precios esenciales sean fáciles de leer, en tu idioma y en cualquier dispositivo.',
    aboutSections: [
      { h: 'Nuestra misión', p: 'Los precios de la energía, los metales preciosos y las divisas cambian constantemente y afectan decisiones cotidianas en todo el mundo. Sin embargo, la mayoría de las fuentes son lentas, tienen bloqueo regional o están saturadas de publicidad. PriceScope presenta las cifras con claridad, carga al instante desde una red perimetral global y habla tu idioma: actualmente siete.' },
      { h: 'Qué seguimos', p: 'Nos centramos en cuatro conjuntos de datos: el precio de referencia internacional del crudo por barril, el oro internacional expresado en dólares por onza troy y yuanes por gramo, los precios máximos minoristas de gasolina 92#, 95#, 98# y diésel 0# en todas las provincias chinas, y los tipos de cambio de referencia entre las principales divisas.' },
      { h: 'Cómo funciona', p: 'Nuestro backend obtiene datos de proveedores públicos externos de forma programada y los almacena en el borde de la red. Al abrir una página, los valores más recientes se insertan directamente en el HTML antes de llegar a tu navegador. Esto hace las páginas rápidas y permite que los motores de búsqueda y las tecnologías de asistencia lean las cifras reales sin ejecutar scripts.' },
      { h: 'Descargo de responsabilidad', p: 'Todos los precios son valores de referencia de terceros y pueden tener retraso o redondeo. Nada en este sitio constituye asesoramiento financiero, de inversión, fiscal o legal. Verifica siempre las tarifas vigentes con un proveedor oficial o autorizado antes de cualquier operación.' },
    ],

    contactTitle: 'Contáctanos',
    contactMetaDesc: 'Escribe al equipo de PriceScope para dudas sobre datos, correcciones, publicidad o alianzas.',
    contactIntro: '¿Tienes una pregunta, has visto una cifra incorrecta o quieres hablar de publicidad o colaboración de datos? Nos encantaría saber de ti.',
    contactEmailLabel: 'Escríbenos directamente',
    contactNote: 'Normalmente respondemos en 1–3 días laborables. Si informas de un problema de datos, incluye la URL de la página, el valor que consideras incorrecto y la hora aproximada en que lo viste.',
    contactTopics: 'Atendemos consultas sobre: exactitud y corrección de datos, publicidad y patrocinio, alianzas y licencias de datos, problemas técnicos o accesibilidad, y solicitudes de privacidad.',

    footerRights: 'Todos los derechos reservados.',
    footerDisclaimer: 'Los precios son valores de referencia de terceros y pueden tener retraso o redondeo. No constituyen asesoramiento financiero.',
    footerQuick: 'Mercados', footerLegal: 'Legal', footerCompany: 'Sitio',
  },

  /* ========================== FRANÇAIS (FR) ========================= */
  fr: {
    htmlLang: 'fr', label: 'Français', flag: '🇫🇷',
    brand: 'PriceScope',
    tagline: 'Pétrole, or, carburant et devises en direct',
    homeTitle: 'PriceScope — Pétrole, or, carburant en Chine et devises en direct',
    homeDesc: 'Suivez le prix international du pétrole brut, le cours de l\'or en USD/once et CNY/gramme, les prix de détail des carburants en Chine par province et les taux de change en direct. Gratuit, rapide, accessible dans le monde entier.',

    nav: { overview: 'Aperçu', oil: 'Pétrole', gold: 'Or', cn: 'Carburant Chine', fx: 'Devises', about: 'À propos', privacy: 'Confidentialité', contact: 'Contact' },

    heroBadge: 'Données de marché en direct',
    heroTitle: 'Pétrole, or et devises mondiaux en un seul endroit',
    heroSub: 'Prix en temps réel du pétrole brut, de l\'or et des carburants en Chine, plus un convertisseur de devises gratuit. Mise à jour automatique, diffusé depuis un réseau périphérique mondial.',
    heroCta: 'Voir les prix',

    secOverview: 'Aperçu du marché',
    secOil: 'Pétrole brut international',
    secGold: 'Or international',
    secCn: 'Carburant en Chine',
    secFx: 'Convertisseur de devises',

    price: 'Prix', updatedAt: 'Mis à jour', dataSource: 'Source', unitBarrel: 'USD / baril',
    goldUsd: 'Or (USD / once troy)', goldCny: 'Or (CNY / gramme)',
    cnNote: 'Prix de détail maximaux provinciaux, révisés environ tous les 10 jours ouvrés.',
    thProvince: 'Province / Région', th92: '92#', th95: '95#', th98: '98#', th0: '0# Diesel',
    provincesCount: 'régions',
    weekendNote: 'Marchés fermés le week-end : les chiffres du dernier jour de cotation sont affichés.',
    viewAll: 'Voir tout',

    fxAmount: 'Montant', fxFrom: 'De', fxTo: 'Vers', fxResult: 'Résultat', fxBtn: 'Convertir', fxRate: '1 {from} = {rate} {to}', fxUpdated: 'Mise à jour', fxNote: 'Taux de référence de marché moyen, actualisés chaque jour. Indicatif uniquement, non valable pour un règlement.', fxPopular: 'Conversions courantes',

    oilTitle: 'Prix international du pétrole brut',
    oilMetaTitle: 'Prix du pétrole aujourd\'hui — cours international en direct | PriceScope',
    oilMetaDesc: 'Prix international du pétrole brut au baril avec mise à jour automatique. Suivez la référence mondiale utilisée par les marchés.',
    goldTitle: 'Prix international de l\'or',
    goldMetaTitle: 'Prix de l\'or aujourd\'hui — USD/once et CNY/gramme | PriceScope',
    goldMetaDesc: 'Prix international de l\'or en dollars par once troy et en yuans par gramme, mis à jour automatiquement.',
    cnTitle: 'Prix des carburants en Chine',
    cnMetaTitle: 'Prix du carburant en Chine — 92, 95, 98 et diesel par province | PriceScope',
    cnMetaDesc: 'Derniers prix de détail de l\'essence 92#, 95#, 98# et du diesel 0# dans toutes les provinces chinoises. Plafonds provinciaux, mis à jour régulièrement.',
    fxTitle: 'Convertisseur de devises et taux de change',
    fxMetaTitle: 'Convertisseur de devises — taux de change en direct | PriceScope',
    fxMetaDesc: 'Convertisseur de devises gratuit avec taux de marché moyen. Convertissez instantanément entre les principales monnaies mondiales, références actualisées chaque jour.',

    privacyTitle: 'Politique de confidentialité',
    privacyMetaDesc: 'Comment PriceScope collecte, utilise et protège vos informations, y compris les cookies et les partenaires publicitaires.',
    privacyUpdated: 'Dernière mise à jour',
    privacyIntro: 'PriceScope (« nous ») s\'engage à protéger votre vie privée. Cette politique explique quelles informations sont collectées lors de votre visite, comment elles sont utilisées et les choix qui s\'offrent à vous.',
    privacySections: [
      { h: 'Informations que nous collectons', p: 'Nous collectons automatiquement des informations limitées et non personnelles lors de votre visite : préférence de langue du navigateur, région approximative déduite de votre adresse IP, pages visitées et page référente. Aucune inscription n\'est requise et nous ne demandons ni nom, ni adresse, ni informations de paiement.' },
      { h: 'Comment nous utilisons ces informations', p: 'Elles servent à afficher le site dans votre langue, à analyser le trafic agrégé pour améliorer performances et contenu, à sécuriser le service et prévenir les abus, ainsi qu\'à diffuser des publicités pertinentes.' },
      { h: 'Cookies et publicité (Google)', p: 'Nous utilisons des cookies et technologies similaires pour faire fonctionner le site et diffuser des annonces. Des prestataires tiers, dont Google, utilisent des cookies pour diffuser des annonces selon vos visites antérieures. L\'utilisation des cookies publicitaires par Google lui permet, ainsi qu\'à ses partenaires, de diffuser des annonces selon vos intérêts. Vous pouvez désactiver la personnalisation dans les paramètres Google Ads, ou vous exclure des cookies tiers sur aboutads.info.' },
      { h: 'Sources des données et exactitude', p: 'Les prix affichés proviennent de fournisseurs publics tiers et sont donnés à titre indicatif. Ils peuvent être retardés, arrondis ou temporairement indisponibles, et différer de ceux de votre banque, courtier ou station-service. Nous ne garantissons ni l\'exactitude, ni l\'exhaustivité, ni l\'adéquation à un usage particulier.' },
      { h: 'Vos droits et contact', p: 'Selon votre lieu de résidence, vous pouvez demander l\'accès, la correction ou la suppression des données détenues, et vous opposer à certains traitements. Vous pouvez aussi désactiver les cookies à tout moment. Pour toute question : FENG91111@gmail.com.' },
    ],

    aboutTitle: 'À propos de PriceScope',
    aboutMetaDesc: 'PriceScope fournit gratuitement des données de prix sur le pétrole, l\'or, les carburants chinois et les devises, de façon rapide et mondiale.',
    aboutIntro: 'PriceScope est un site indépendant d\'information sur les prix, destiné à un public mondial. Notre objectif est simple : rendre les prix essentiels lisibles, dans votre langue, sur tout appareil.',
    aboutSections: [
      { h: 'Notre mission', p: 'Les prix de l\'énergie, des métaux précieux et des devises évoluent constamment et influencent les décisions quotidiennes partout. Pourtant, la plupart des sources sont lentes, limitées géographiquement ou noyées sous la publicité. PriceScope présente les chiffres clairement, charge instantanément depuis un réseau périphérique mondial et parle votre langue — actuellement sept.' },
      { h: 'Ce que nous suivons', p: 'Quatre jeux de données : le prix de référence international du brut au baril, l\'or international exprimé en dollars par once troy et en yuans par gramme, les plafonds de détail chinois pour l\'essence 92#, 95#, 98# et le diesel 0# dans toutes les provinces, et les taux de change de référence entre grandes devises.' },
      { h: 'Comment ça marche', p: 'Notre backend récupère les données auprès de fournisseurs publics tiers selon une planification et les stocke en périphérie du réseau. À l\'ouverture d\'une page, les dernières valeurs sont déjà insérées dans le HTML avant qu\'il n\'atteigne votre navigateur. Les pages sont ainsi rapides, et les moteurs de recherche comme les technologies d\'assistance peuvent lire les vrais chiffres sans exécuter de scripts.' },
      { h: 'Avertissement', p: 'Tous les prix sont des valeurs indicatives issues de tiers et peuvent être retardés ou arrondis. Rien sur ce site ne constitue un conseil financier, d\'investissement, fiscal ou juridique. Vérifiez toujours les tarifs en vigueur auprès d\'un fournisseur officiel avant toute opération.' },
    ],

    contactTitle: 'Nous contacter',
    contactMetaDesc: 'Contactez l\'équipe PriceScope pour vos questions sur les données, corrections, publicité ou partenariats.',
    contactIntro: 'Une question, une donnée erronée, ou un projet de publicité ou de partenariat de données ? Nous serions ravis de vous lire.',
    contactEmailLabel: 'Nous écrire directement',
    contactNote: 'Nous répondons généralement sous 1 à 3 jours ouvrés. Pour un signalement de données, indiquez l\'URL de la page, la valeur jugée incorrecte et l\'heure approximative de votre observation.',
    contactTopics: 'Nous traitons : exactitude et corrections de données, publicité et sponsoring, partenariats et licences de données, problèmes techniques ou d\'accessibilité, et demandes relatives à la vie privée.',

    footerRights: 'Tous droits réservés.',
    footerDisclaimer: 'Les prix sont des valeurs indicatives de tiers, pouvant être retardées ou arrondies. Ne constituent pas un conseil financier.',
    footerQuick: 'Marchés', footerLegal: 'Mentions légales', footerCompany: 'Site',
  },

  /* ========================== DEUTSCH (DE) ========================= */
  de: {
    htmlLang: 'de', label: 'Deutsch', flag: '🇩🇪',
    brand: 'PriceScope',
    tagline: 'Öl, Gold, Kraftstoff & Währungen live',
    homeTitle: 'PriceScope — Ölpreis, Goldpreis, chinesische Kraftstoffpreise & Wechselkurse live',
    homeDesc: 'Verfolgen Sie internationale Rohölpreise, Gold in USD/Unze und CNY/Gramm, chinesische Einzelhandelspreise für Kraftstoff nach Provinz sowie aktuelle Wechselkurse. Kostenlos, schnell, weltweit verfügbar.',

    nav: { overview: 'Überblick', oil: 'Rohöl', gold: 'Gold', cn: 'Kraftstoff China', fx: 'Währungen', about: 'Über uns', privacy: 'Datenschutz', contact: 'Kontakt' },

    heroBadge: 'Live-Marktdaten',
    heroTitle: 'Öl, Gold und Währungen weltweit an einem Ort',
    heroSub: 'Echtzeitpreise für Rohöl, Gold und chinesische Kraftstoffe – plus ein kostenloser Währungsrechner. Automatische Aktualisierung, weltweit über ein Edge-Netzwerk ausgeliefert.',
    heroCta: 'Preise ansehen',

    secOverview: 'Marktüberblick',
    secOil: 'Internationales Rohöl',
    secGold: 'Internationales Gold',
    secCn: 'Kraftstoff in China',
    secFx: 'Währungsrechner',

    price: 'Preis', updatedAt: 'Aktualisiert', dataSource: 'Quelle', unitBarrel: 'USD / Barrel',
    goldUsd: 'Gold (USD / Feinunze)', goldCny: 'Gold (CNY / Gramm)',
    cnNote: 'Provinziale Höchst-Einzelhandelspreise, etwa alle 10 Werktage angepasst.',
    thProvince: 'Provinz / Region', th92: '92#', th95: '95#', th98: '98#', th0: '0# Diesel',
    provincesCount: 'Regionen',
    weekendNote: 'Märkte sind am Wochenende geschlossen – es werden die Werte des letzten Handelstags angezeigt.',
    viewAll: 'Alle ansehen',

    fxAmount: 'Betrag', fxFrom: 'Von', fxTo: 'Nach', fxResult: 'Ergebnis', fxBtn: 'Umrechnen', fxRate: '1 {from} = {rate} {to}', fxUpdated: 'Aktualisiert', fxNote: 'Referenzkurse (Mittelkurs), täglich erneuert. Nur zur Orientierung, nicht für Abrechnungen.', fxPopular: 'Häufige Umrechnungen',

    oilTitle: 'Internationaler Rohölpreis',
    oilMetaTitle: 'Ölpreis heute — internationaler Rohölkurs live | PriceScope',
    oilMetaDesc: 'Internationaler Rohölpreis pro Barrel mit automatischer Aktualisierung. Verfolgen Sie die weltweite Referenznotierung der Märkte.',
    goldTitle: 'Internationaler Goldpreis',
    goldMetaTitle: 'Goldpreis heute — USD/Unze & CNY/Gramm live | PriceScope',
    goldMetaDesc: 'Internationaler Goldpreis in US-Dollar pro Feinunze und Renminbi pro Gramm, automatisch aktualisiert.',
    cnTitle: 'Kraftstoffpreise in China',
    cnMetaTitle: 'Kraftstoffpreise China — 92, 95, 98 und Diesel nach Provinz | PriceScope',
    cnMetaDesc: 'Aktuelle Einzelhandelspreise für Benzin 92#, 95#, 98# und Diesel 0# in allen chinesischen Provinzen. Provinziale Höchstpreise, regelmäßig aktualisiert.',
    fxTitle: 'Währungsrechner & Wechselkurse',
    fxMetaTitle: 'Währungsrechner — aktuelle Wechselkurse | PriceScope',
    fxMetaDesc: 'Kostenloser Währungsrechner mit Mittelkursen. Rechnen Sie sofort zwischen den wichtigsten Weltwährungen um, Referenzkurse täglich aktualisiert.',

    privacyTitle: 'Datenschutzerklärung',
    privacyMetaDesc: 'Wie PriceScope Ihre Informationen erhebt, nutzt und schützt – einschließlich Cookies und Werbepartnern.',
    privacyUpdated: 'Zuletzt aktualisiert',
    privacyIntro: 'PriceScope („wir“) verpflichtet sich, Ihre Privatsphäre zu schützen. Diese Erklärung beschreibt, welche Daten beim Besuch erhoben werden, wie sie genutzt werden und welche Wahlmöglichkeiten Sie haben.',
    privacySections: [
      { h: 'Welche Daten wir erheben', p: 'Beim Besuch erheben wir automatisch wenige, nicht-personenbezogene Daten: die Spracheinstellung Ihres Browsers, die aus Ihrer IP abgeleitete ungefähre Region, besuchte Seiten und die Verweisseite. Eine Registrierung ist nicht nötig, und wir fragen niemals Name, Adresse oder Zahlungsdaten ab.' },
      { h: 'Wie wir Daten nutzen', p: 'Die Daten dienen der Anzeige in Ihrer Sprache, der Analyse aggregierter Zugriffsmuster zur Verbesserung von Leistung und Inhalten, der Sicherheit und Missbrauchsprävention sowie der Auslieferung relevanter Werbung.' },
      { h: 'Cookies & Werbung (Google)', p: 'Wir verwenden Cookies und ähnliche Technologien zum Betrieb der Seite und zur Anzeige von Werbung. Drittanbieter, darunter Google, nutzen Cookies, um Anzeigen auf Basis früherer Besuche zu schalten. Googles Werbe-Cookies ermöglichen ihm und Partnern interessenbasierte Werbung. Sie können personalisierte Werbung in den Google-Anzeigeneinstellungen oder Drittcookies unter aboutads.info abwählen.' },
      { h: 'Datenquellen & Genauigkeit', p: 'Die angezeigten Preise stammen von öffentlichen Drittanbietern und dienen nur der Information. Sie können verzögert, gerundet oder vorübergehend nicht verfügbar sein und von den Kursen Ihrer Bank, Ihres Brokers oder Ihrer Tankstelle abweichen. Wir übernehmen keine Gewähr für Richtigkeit, Vollständigkeit oder Eignung.' },
      { h: 'Ihre Rechte & Kontakt', p: 'Je nach Wohnsitz können Sie Auskunft, Berichtigung oder Löschung gespeicherter Daten verlangen und bestimmten Verarbeitungen widersprechen. Cookies können Sie jederzeit im Browser deaktivieren. Datenschutzfragen richten Sie bitte an FENG91111@gmail.com.' },
    ],

    aboutTitle: 'Über PriceScope',
    aboutMetaDesc: 'PriceScope bietet kostenlose, schnelle und weltweit zugängliche Preisdaten für Rohöl, Gold, chinesische Kraftstoffe und Währungen.',
    aboutIntro: 'PriceScope ist eine unabhängige Preis-Informationsseite für ein weltweites Publikum. Unser Ziel ist einfach: wesentliche Marktpreise leicht lesbar zu machen – in Ihrer Sprache und auf jedem Gerät.',
    aboutSections: [
      { h: 'Unsere Mission', p: 'Energie-, Edelmetall- und Währungspreise bewegen sich ständig und beeinflussen tägliche Entscheidungen überall. Dennoch sind viele Quellen langsam, regional gesperrt oder werblich überladen. PriceScope zeigt Zahlen klar, lädt sofort aus einem globalen Edge-Netzwerk und spricht Ihre Sprache – derzeit sieben.' },
      { h: 'Was wir verfolgen', p: 'Vier Kerndatensätze: der internationale Rohöl-Referenzpreis pro Barrel, der Goldpreis in US-Dollar pro Feinunze und Renminbi pro Gramm, die chinesischen Einzelhandelshöchstpreise für Benzin 92#, 95#, 98# und Diesel 0# in allen Provinzen sowie Referenzwechselkurse zwischen wichtigen Währungen.' },
      { h: 'Wie es funktioniert', p: 'Unser Backend ruft Marktdaten planmäßig von öffentlichen Drittanbietern ab und speichert sie am Netzwerkrand. Beim Öffnen einer Seite sind die neuesten Werte bereits im HTML gerendert, bevor es Ihren Browser erreicht. Dadurch sind Seiten schnell, und Suchmaschinen sowie assistive Technologien können die echten Zahlen ohne Skriptausführung lesen.' },
      { h: 'Haftungsausschluss', p: 'Alle Preise sind indikative Referenzwerte von Drittanbietern und können verzögert oder gerundet sein. Nichts auf dieser Seite stellt Finanz-, Anlage-, Steuer- oder Rechtsberatung dar. Prüfen Sie aktuelle Kurse stets bei einem offiziellen oder zugelassenen Anbieter.' },
    ],

    contactTitle: 'Kontaktieren Sie uns',
    contactMetaDesc: 'Kontaktieren Sie das PriceScope-Team bei Datenfragen, Korrekturen, Werbung oder Partnerschaften.',
    contactIntro: 'Haben Sie eine Frage, einen fehlerhaften Wert entdeckt oder möchten Sie über Werbung oder Datenpartnerschaft sprechen? Wir freuen uns über Ihre Nachricht.',
    contactEmailLabel: 'Direkt per E-Mail',
    contactNote: 'Wir antworten in der Regel innerhalb von 1–3 Werktagen. Bei Datenfehlern nennen Sie bitte die Seiten-URL, den Ihrer Meinung nach falschen Wert und die ungefähre Uhrzeit Ihrer Beobachtung.',
    contactTopics: 'Wir beantworten gern Anfragen zu: Datengenauigkeit und Korrekturen, Werbung und Sponsoring, Partnerschaften und Datenlizenzen, technischen Problemen oder Barrierefreiheit sowie Datenschutzanliegen.',

    footerRights: 'Alle Rechte vorbehalten.',
    footerDisclaimer: 'Preise sind indikative Referenzwerte aus Drittquellen und können verzögert oder gerundet sein. Keine Finanzberatung.',
    footerQuick: 'Märkte', footerLegal: 'Rechtliches', footerCompany: 'Website',
  },

  /* ======================= PORTUGUÊS (PT) ======================= */
  pt: {
    htmlLang: 'pt', label: 'Português', flag: '🇧🇷',
    brand: 'PriceScope',
    tagline: 'Petróleo, ouro, combustível e câmbio ao vivo',
    homeTitle: 'PriceScope — Petróleo, ouro, combustível na China e câmbio ao vivo',
    homeDesc: 'Acompanhe o preço internacional do petróleo bruto, o ouro em USD/onça e CNY/grama, os preços de combustível na China por província e as taxas de câmbio ao vivo. Grátis, rápido e disponível mundialmente.',

    nav: { overview: 'Visão geral', oil: 'Petróleo', gold: 'Ouro', cn: 'Combustível China', fx: 'Moedas', about: 'Sobre', privacy: 'Privacidade', contact: 'Contato' },

    heroBadge: 'Dados de mercado ao vivo',
    heroTitle: 'Petróleo, ouro e câmbio mundiais em um só lugar',
    heroSub: 'Preços em tempo real de petróleo bruto, ouro e combustível na China, além de um conversor de moedas gratuito. Atualização automática, entregue por uma rede de borda global.',
    heroCta: 'Ver preços',

    secOverview: 'Visão geral do mercado',
    secOil: 'Petróleo bruto internacional',
    secGold: 'Ouro internacional',
    secCn: 'Combustível na China',
    secFx: 'Conversor de moedas',

    price: 'Preço', updatedAt: 'Atualizado', dataSource: 'Fonte', unitBarrel: 'USD / barril',
    goldUsd: 'Ouro (USD / onça troy)', goldCny: 'Ouro (CNY / grama)',
    cnNote: 'Preços máximos de varejo por província, revisados aproximadamente a cada 10 dias úteis.',
    thProvince: 'Província / Região', th92: '92#', th95: '95#', th98: '98#', th0: '0# Diesel',
    provincesCount: 'regiões',
    weekendNote: 'Mercados fecham no fim de semana — são exibidos os dados do último dia útil.',
    viewAll: 'Ver tudo',

    fxAmount: 'Valor', fxFrom: 'De', fxTo: 'Para', fxResult: 'Resultado', fxBtn: 'Converter', fxRate: '1 {from} = {rate} {to}', fxUpdated: 'Atualizado', fxNote: 'Taxas de referência de mercado médio, renovadas diariamente. Apenas indicativo, não serve para liquidação.', fxPopular: 'Conversões frequentes',

    oilTitle: 'Preço internacional do petróleo bruto',
    oilMetaTitle: 'Preço do petróleo hoje — cotação internacional ao vivo | PriceScope',
    oilMetaDesc: 'Preço internacional do petróleo bruto por barril com atualização automática. Acompanhe a referência global usada pelos mercados.',
    goldTitle: 'Preço internacional do ouro',
    goldMetaTitle: 'Preço do ouro hoje — USD/onça e CNY/grama | PriceScope',
    goldMetaDesc: 'Preço internacional do ouro em dólares por onça troy e em yuan por grama, atualizado automaticamente.',
    cnTitle: 'Preços de combustível na China',
    cnMetaTitle: 'Preço do combustível na China — 92, 95, 98 e diesel por província | PriceScope',
    cnMetaDesc: 'Últimos preços de varejo da gasolina 92#, 95#, 98# e do diesel 0# em todas as províncias chinesas. Tetos provinciais, atualizados regularmente.',
    fxTitle: 'Conversor de moedas e taxas de câmbio',
    fxMetaTitle: 'Conversor de moedas — taxas de câmbio ao vivo | PriceScope',
    fxMetaDesc: 'Conversor de moedas gratuito com taxas de mercado médio. Converta instantaneamente entre as principais moedas do mundo, com referências renovadas diariamente.',

    privacyTitle: 'Política de privacidade',
    privacyMetaDesc: 'Como o PriceScope coleta, usa e protege suas informações, incluindo cookies e parceiros de publicidade.',
    privacyUpdated: 'Última atualização',
    privacyIntro: 'O PriceScope (“nós”) está comprometido em proteger sua privacidade. Esta política explica quais informações são coletadas quando você visita o site, como são usadas e quais opções você tem.',
    privacySections: [
      { h: 'Informações que coletamos', p: 'Coletamos automaticamente informações limitadas e não pessoais quando você visita o site, como a preferência de idioma do navegador, a região aproximada derivada do seu endereço IP, as páginas visitadas e a página de origem. Não é necessário se cadastrar e não solicitamos nome, endereço ou dados de pagamento.' },
      { h: 'Como usamos as informações', p: 'As informações são usadas para exibir o site no seu idioma, entender padrões agregados de tráfego para melhorar desempenho e conteúdo, manter a segurança e evitar abusos, e exibir publicidade relevante.' },
      { h: 'Cookies e publicidade (Google)', p: 'Usamos cookies e tecnologias semelhantes para operar o site e veicular anúncios. Fornecedores terceiros, incluindo o Google, usam cookies para veicular anúncios com base em visitas anteriores a este ou outros sites. O uso de cookies publicitários pelo Google permite que ele e seus parceiros veiculem anúncios por interesse. Você pode desativar a personalização nas configurações de anúncios do Google ou recusar cookies de terceiros em aboutads.info.' },
      { h: 'Fontes de dados e precisão', p: 'Os preços exibidos vêm de fornecedores públicos terceiros e servem apenas para informação. Podem sofrer atraso, arredondamento ou indisponibilidade temporária, e diferir dos valores praticados pelo seu banco, corretora ou posto local. Não garantimos precisão, integralidade ou adequação a qualquer finalidade.' },
      { h: 'Seus direitos e contato', p: 'Dependendo da sua localização, você pode solicitar acesso, correção ou exclusão de dados pessoais que mantemos, e se opor a certos tratamentos. Também é possível desativar cookies no navegador a qualquer momento. Para dúvidas de privacidade, escreva para FENG91111@gmail.com.' },
    ],

    aboutTitle: 'Sobre o PriceScope',
    aboutMetaDesc: 'O PriceScope oferece dados de preços de petróleo, ouro, combustível na China e moedas de forma gratuita, rápida e acessível mundialmente.',
    aboutIntro: 'O PriceScope é um site independente de informações de preços para um público global. Nosso objetivo é simples: tornar os preços essenciais fáceis de ler, no seu idioma e em qualquer dispositivo.',
    aboutSections: [
      { h: 'Nossa missão', p: 'Os preços de energia, metais preciosos e moedas mudam constantemente e afetam decisões diárias em todo o mundo. Ainda assim, a maioria das fontes é lenta, com bloqueio regional ou saturada de anúncios. O PriceScope apresenta os números com clareza, carrega instantaneamente de uma rede de borda global e fala o seu idioma — atualmente sete.' },
      { h: 'O que acompanhamos', p: 'Quatro conjuntos de dados principais: o preço de referência internacional do petróleo bruto por barril, o ouro internacional em dólares por onça troy e em yuan por grama, os tetos de varejo chineses para gasolina 92#, 95#, 98# e diesel 0# em todas as províncias, e as taxas de câmbio de referência entre as principais moedas.' },
      { h: 'Como funciona', p: 'Nosso backend busca dados de fornecedores públicos terceiros de forma programada e os armazena na borda da rede. Ao abrir uma página, os valores mais recentes já estão renderizados no HTML antes de chegar ao seu navegador. Isso torna as páginas rápidas e permite que mecanismos de busca e tecnologias assistivas leiam os números reais sem executar scripts.' },
      { h: 'Aviso legal', p: 'Todos os preços são valores de referência de terceiros e podem estar atrasados ou arredondados. Nada neste site constitui aconselhamento financeiro, de investimento, fiscal ou jurídico. Sempre confirme as cotações atuais com um fornecedor oficial ou licenciado antes de qualquer transação.' },
    ],

    contactTitle: 'Fale conosco',
    contactMetaDesc: 'Entre em contato com a equipe do PriceScope para dúvidas sobre dados, correções, publicidade ou parcerias.',
    contactIntro: 'Tem uma pergunta, encontrou um valor incorreto ou quer falar sobre publicidade ou parceria de dados? Adoraríamos saber de você.',
    contactEmailLabel: 'Envie um e-mail direto',
    contactNote: 'Normalmente respondemos em 1–3 dias úteis. Ao relatar um problema de dados, inclua a URL da página, o valor que considera incorreto e o horário aproximado em que o viu.',
    contactTopics: 'Atendemos dúvidas sobre: precisão e correção de dados, publicidade e patrocínio, parcerias e licenciamento de dados, problemas técnicos ou de acessibilidade, e solicitações de privacidade.',

    footerRights: 'Todos os direitos reservados.',
    footerDisclaimer: 'Os preços são valores indicativos de terceiros e podem estar atrasados ou arredondados. Não constituem aconselhamento financeiro.',
    footerQuick: 'Mercados', footerLegal: 'Jurídico', footerCompany: 'Site',
  },
};

// ------------------------------------------------------------
// Province name localisation
// Chinese source -> { zh, ja, pinyin }  (latin languages use pinyin)
// ------------------------------------------------------------
export const PROVINCE = {
  '山东': { zh: '山东', ja: '山東', py: 'Shandong' },
  '西藏': { zh: '西藏', ja: '西藏', py: 'Xizang (Tibet)' },
  '吉林': { zh: '吉林', ja: '吉林', py: 'Jilin' },
  '福建': { zh: '福建', ja: '福建', py: 'Fujian' },
  '上海': { zh: '上海', ja: '上海', py: 'Shanghai' },
  '甘肃': { zh: '甘肃', ja: '甘粛', py: 'Gansu' },
  '宁夏': { zh: '宁夏', ja: '寧夏', py: 'Ningxia' },
  '山西': { zh: '山西', ja: '山西', py: 'Shanxi' },
  '四川': { zh: '四川', ja: '四川', py: 'Sichuan' },
  '河南': { zh: '河南', ja: '河南', py: 'Henan' },
  '河北': { zh: '河北', ja: '河北', py: 'Hebei' },
  '广西': { zh: '广西', ja: '広西', py: 'Guangxi' },
  '重庆': { zh: '重庆', ja: '重慶', py: 'Chongqing' },
  '浙江': { zh: '浙江', ja: '浙江', py: 'Zhejiang' },
  '湖南': { zh: '湖南', ja: '湖南', py: 'Hunan' },
  '湖北': { zh: '湖北', ja: '湖北', py: 'Hubei' },
  '海南': { zh: '海南', ja: '海南', py: 'Hainan' },
  '江西': { zh: '江西', ja: '江西', py: 'Jiangxi' },
  '云南': { zh: '云南', ja: '雲南', py: 'Yunnan' },
  '黑龙江': { zh: '黑龙江', ja: '黒竜江', py: 'Heilongjiang' },
  '内蒙古': { zh: '内蒙古', ja: '内モンゴル', py: 'Inner Mongolia' },
  '辽宁': { zh: '辽宁', ja: '遼寧', py: 'Liaoning' },
  '广东': { zh: '广东', ja: '広東', py: 'Guangdong' },
  '天津': { zh: '天津', ja: '天津', py: 'Tianjin' },
  '青海': { zh: '青海', ja: '青海', py: 'Qinghai' },
  '陕西': { zh: '陕西', ja: '陝西', py: 'Shaanxi' },
  '贵州': { zh: '贵州', ja: '貴州', py: 'Guizhou' },
  '新疆': { zh: '新疆', ja: '新疆', py: 'Xinjiang' },
  '江苏': { zh: '江苏', ja: '江蘇', py: 'Jiangsu' },
  '北京': { zh: '北京', ja: '北京', py: 'Beijing' },
  '安徽': { zh: '安徽', ja: '安徽', py: 'Anhui' },
};

export function provName(raw, lang) {
  if (!raw) return '—';
  const e = PROVINCE[raw];
  if (!e) return raw;
  if (lang === 'zh') return e.zh;
  if (lang === 'ja') return e.ja;
  return e.py;
}

// Browser Accept-Language -> supported lang
export function detectLang(header) {
  if (!header) return DEFAULT_LANG;
  const parts = header.split(',').map(s => {
    const [code, q] = s.trim().split(';q=');
    return { code: code.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
  }).sort((a, b) => b.q - a.q);

  for (const p of parts) {
    const base = p.code.split('-')[0];
    if (LANGS.includes(base)) return base;
  }
  return DEFAULT_LANG;
}

export function t(lang) {
  return T[lang] || T[DEFAULT_LANG];
}

// ------------------------------------------------------------
// Localised currency names (code -> display name per language)
// ------------------------------------------------------------
const CUR_ROWS = [
  ['USD','US Dollar','美元','米ドル','Dólar estadounidense','Dollar américain','US-Dollar','Dólar americano'],
  ['EUR','Euro','欧元','ユーロ','Euro','Euro','Euro','Euro'],
  ['CNY','Chinese Yuan','人民币','人民元','Yuan chino','Yuan chinois','Chinesischer Yuan','Yuan chinês'],
  ['JPY','Japanese Yen','日元','日本円','Yen japonés','Yen japonais','Japanischer Yen','Iene japonês'],
  ['GBP','British Pound','英镑','英ポンド','Libra esterlina','Livre sterling','Pfund Sterling','Libra esterlina'],
  ['AUD','Australian Dollar','澳元','豪ドル','Dólar australiano','Dollar australien','Australischer Dollar','Dólar australiano'],
  ['CAD','Canadian Dollar','加元','カナダドル','Dólar canadiense','Dollar canadien','Kanadischer Dollar','Dólar canadense'],
  ['CHF','Swiss Franc','瑞士法郎','スイスフラン','Franco suizo','Franc suisse','Schweizer Franken','Franco suíço'],
  ['HKD','Hong Kong Dollar','港元','香港ドル','Dólar de Hong Kong','Dollar de Hong Kong','Hongkong-Dollar','Dólar de Hong Kong'],
  ['SGD','Singapore Dollar','新加坡元','シンガポールドル','Dólar de Singapur','Dollar de Singapour','Singapur-Dollar','Dólar de Cingapura'],
  ['KRW','South Korean Won','韩元','韓国ウォン','Won surcoreano','Won sud-coréen','Südkoreanischer Won','Won sul-coreano'],
  ['INR','Indian Rupee','印度卢比','インドルピー','Rupia india','Roupie indienne','Indische Rupie','Rúpia indiana'],
  ['BRL','Brazilian Real','巴西雷亚尔','ブラジルレアル','Real brasileño','Real brésilien','Brasilianischer Real','Real brasileiro'],
  ['RUB','Russian Ruble','俄罗斯卢布','ロシアルーブル','Rublo ruso','Rouble russe','Russischer Rubel','Rublo russo'],
  ['MXN','Mexican Peso','墨西哥比索','メキシコペソ','Peso mexicano','Peso mexicain','Mexikanischer Peso','Peso mexicano'],
  ['IDR','Indonesian Rupiah','印尼盾','インドネシアルピア','Rupia indonesia','Roupie indonésienne','Indonesische Rupiah','Rúpia indonésia'],
  ['THB','Thai Baht','泰铢','タイバーツ','Baht tailandés','Baht thaïlandais','Thailändischer Baht','Baht tailandês'],
  ['VND','Vietnamese Dong','越南盾','ベトナムドン','Dong vietnamita','Dong vietnamien','Vietnamesischer Dong','Dong vietnamita'],
  ['MYR','Malaysian Ringgit','马来西亚林吉特','マレーシアリンギット','Ringgit malayo','Ringgit malaisien','Malaysischer Ringgit','Ringgit malaio'],
  ['PHP','Philippine Peso','菲律宾比索','フィリピンペソ','Peso filipino','Peso philippin','Philippinischer Peso','Peso filipino'],
  ['TRY','Turkish Lira','土耳其里拉','トルコリラ','Lira turca','Livre turque','Türkische Lira','Lira turca'],
  ['ZAR','South African Rand','南非兰特','南アフリカランド','Rand sudafricano','Rand sud-africain','Südafrikanischer Rand','Rand sul-africano'],
  ['AED','UAE Dirham','阿联酋迪拉姆','UAEディルハム','Dírham de los EAU','Dirham des ÉAU','VAE-Dirham','Dirham dos EAU'],
  ['SAR','Saudi Riyal','沙特里亚尔','サウジリヤル','Riyal saudí','Riyal saoudien','Saudi-Riyal','Rial saudita'],
  ['NZD','New Zealand Dollar','新西兰元','ニュージーランドドル','Dólar neozelandés','Dollar néo-zélandais','Neuseeland-Dollar','Dólar neozelandês'],
  ['SEK','Swedish Krona','瑞典克朗','スウェーデンクローナ','Corona sueca','Couronne suédoise','Schwedische Krone','Coroa sueca'],
  ['NOK','Norwegian Krone','挪威克朗','ノルウェークローネ','Corona noruega','Couronne norvégienne','Norwegische Krone','Coroa norueguesa'],
  ['PLN','Polish Zloty','波兰兹罗提','ポーランドズウォティ','Zloty polaco','Zloty polonais','Polnischer Zloty','Zloty polonês'],
  ['TWD','New Taiwan Dollar','新台币','ニュー台湾ドル','Dólar taiwanés','Dollar taïwanais','Taiwan-Dollar','Dólar taiwanês'],
  ['NGN','Nigerian Naira','尼日利亚奈拉','ナイジェリアナイラ','Naira nigeriana','Naira nigérian','Nigerianische Naira','Naira nigeriana'],
];

export const CUR_NAMES = Object.fromEntries(
  CUR_ROWS.map(([code, ...names]) => [code, Object.fromEntries(LANGS.map((lg, i) => [lg, names[i]]))])
);

/** Localised currency name, e.g. curName('zh','USD') -> '美元' */
export function curName(lang, code) {
  const byLang = CUR_NAMES[code];
  return (byLang && byLang[lang]) || (byLang && byLang[DEFAULT_LANG]) || code;
}
