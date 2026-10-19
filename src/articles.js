// ============================================================
// PriceScope — Editorial articles (long-form, original)
//
// WHY A SEPARATE MODULE
// The market pages carry short explainers, but long-form articles
// need their own URL so each one can be indexed and ranked on its
// own. This module feeds two routes:
//   /blog/          — article index
//   /blog/{slug}/   — single article
//
// TRANSLATION POLICY
// Articles are hand-written per language. Only languages present in
// `i18n` are emitted into the sitemap and hreflang set, so a half
// translated article can never be served as thin machine text.
// Add a language by writing it here — no code change needed.
//
// Shape:
//   { slug, cat, date, readMin, i18n: { lang: { title, desc, body:[{h,p}] } } }
// ============================================================

export const ARTICLES = [
  /* ================================================================
     1 — Brent benchmark
     ================================================================ */
  {
    slug: 'why-brent-is-oil-benchmark',
    cat: 'oil',
    date: '2026-09-22',
    readMin: 6,
    i18n: {
      zh: {
        title: '为什么布伦特原油是全球油价的基准？',
        desc: '全球三分之二的原油贸易以布伦特为定价锚。它凭什么取代 WTI 成为"国际油价"的代名词？本文解释布伦特的产地、品质与交易机制。',
        body: [
          { h: '布伦特到底是什么', p: '布伦特不是某一个油田的原油，而是产自北海（英国与挪威之间海域）多个油田的混合原油。它属于轻质低硫原油——密度低、含硫量少，炼厂加工起来更容易，出产的汽油、柴油等轻质油品比例更高。这种"好炼"的特性，是它成为基准的物理前提。' },
          { h: '海运属性决定了它的命运', p: '真正让布伦特胜出的，是它的运输方式。北海油田的原油可以通过海底管道直接输送到设得兰群岛的装船终端，装船后能立刻运往世界任何地方。相比之下，美国 WTI 原油的交割地在俄克拉何马州库欣，是一个内陆罐区——买家要提货得依赖管道运力，灵活性差得多。原油贸易本质是海运生意，能自由装船的品种天然更容易成为全球定价参照。' },
          { h: '期货市场给了它定价权', p: '洲际交易所（ICE）上的布伦特原油期货是全球流动性最好的能源合约之一。期货市场把全球买家、卖家、投机者和套保者聚集在一个公开价格上，这个价格反过来成为现货贸易的定价基准。中东销往欧洲和亚洲的原油，合同条款里普遍写着"以布伦特期货结算价加减升贴水"——这就是布伦特影响力的真正来源。' },
          { h: '布伦特与 WTI 的关系', p: '两者都是轻质低硫原油，价格长期高度相关，但价差不固定。当美国管道运力紧张、库欣库存积压时，WTI 会明显低于布伦特；当美国原油出口能力提升、页岩油产量大增时，价差又会收窄。观察这两个价格的价差，本身就是判断全球原油物流是否顺畅的一个窗口。' },
          { h: '"国际油价"通常指哪个', p: '新闻报道里说的"国际油价上涨"或"油价跌破某关口"，绝大多数时候指的是布伦特。原因很简单：它覆盖的贸易量更大、地理代表性更强。中国成品油调价机制所跟踪的一篮子国际原油，也包含布伦特。所以如果你想用一个数字理解全球原油走势，看布伦特比看 WTI 更合适。' },
          { h: '读价格时需要注意什么', p: '布伦特以美元每桶报价，一桶等于 42 美加仑，约 159 升。这个报价是现货市场的参考价，不是交易所的官方结算价，通常带有数分钟的延迟。周末全球市场休市，此时看到的价格是上一个交易日的收盘水平。用它判断趋势完全够用，但不要拿它做结算或交易依据。' },
        ],
      },
      en: {
        title: 'Why Brent Crude Is the Global Oil Benchmark',
        desc: 'Roughly two thirds of internationally traded crude is priced off Brent. Here is how a North Sea blend came to define what "the oil price" means.',
        body: [
          { h: 'What Brent actually is', p: 'Brent is not the output of a single field. It is a blend of crude from several fields in the North Sea between the United Kingdom and Norway. It is a light, sweet crude — low density, low sulphur — which makes it easier and cheaper to refine and yields a higher proportion of valuable light products such as petrol and diesel. That physical quality is the foundation of its status.' },
          { h: 'Seaborne delivery made the difference', p: 'What truly set Brent apart was logistics. North Sea production flows by subsea pipeline to the Sullom Voe terminal in the Shetland Islands, where it can be loaded directly onto tankers and shipped anywhere in the world. WTI, by contrast, is delivered at Cushing, Oklahoma — an inland tank hub. Buyers depend on pipeline capacity to move it. Since crude trading is fundamentally a seaborne business, a grade that can be freely loaded onto a ship is a far more natural global reference.' },
          { h: 'The futures market gave it pricing power', p: 'The Brent futures contract on the ICE exchange is one of the most liquid energy contracts in the world. A deep futures market concentrates buyers, sellers, hedgers and speculators onto a single transparent price, and that price then becomes the reference for physical trade. Cargo contracts for crude moving from the Middle East to Europe and Asia routinely settle as "the Brent futures settlement price plus or minus a differential". That contractual habit is the real source of Brent\'s influence.' },
          { h: 'Brent and WTI', p: 'Both are light sweet grades, so the two prices track each other closely over time — but the spread is not fixed. When US pipeline capacity is tight and Cushing inventories build, WTI trades at a clear discount to Brent. When US export capacity expands and shale output surges, the gap narrows again. Watching that spread is itself a useful read on whether global crude logistics are running smoothly.' },
          { h: 'Which one the news means', p: 'When a headline says oil has risen or fallen through some level, it almost always means Brent. It represents a larger share of traded volume and has broader geographic coverage. The basket of international crude that China\'s fuel pricing mechanism tracks also includes Brent. If you want a single number to understand the global crude trend, Brent is the better one to watch.' },
          { h: 'Reading the number carefully', p: 'Brent is quoted in US dollars per barrel, and one barrel is 42 US gallons or roughly 159 litres. The quote is a spot market reference, not an official exchange settlement price, and it normally carries a delay of a few minutes. Markets close at weekends, so a figure shown then is the previous session\'s closing level. It is perfectly adequate for following the trend, but not for settlement or trading.' },
        ],
      },
      ja: {
        title: 'ブレント原油はなぜ世界の価格指標なのか',
        desc: '国際的に取引される原油の約3分の2がブレントを基準に値決めされます。北海産の混合物が「国際原油価格」の代名詞になった理由を、産地・品質・取引の仕組みから解説します。',
        body: [
          { h: 'ブレントとは何か', p: 'ブレントは単一の油田から産出される原油ではありません。英国とノルウェーの間の北海に位置する複数の油田から産出される原油をブレンドしたものです。低密度・低硫黄の軽質スイート原油であり、精製が容易で、ガソリンや軽油といった価値の高い軽質製品の収率が高くなります。この「精製しやすい」という物理的特性が、指標としての地位の土台です。' },
          { h: '決め手は海上輸送', p: 'ブレントを押し上げた最大の要因は物流です。北海の原油は海底パイプラインでシェトランド諸島のサラム・ボー・ターミナルに送られ、そこで直接タンカーに積まれて世界のどこへでも運べます。対照的にWTIの受渡地は米オクラホマ州クッシングという内陸のタンク拠点で、買い手はパイプラインの輸送能力に依存します。原油取引は本質的に海上輸送のビジネスであり、自由に船積みできる銘柄のほうが世界の指標として圧倒的に自然なのです。' },
          { h: '先物市場が価格決定力を与えた', p: 'ICE（インターコンチネンタル取引所）のブレント先物は、世界で最も流動性の高いエネルギー契約の一つです。流動性の高い先物市場は、買い手・売り手・ヘッジ勢・投機筋を一つの透明な価格に集中させ、その価格が現物取引の基準となります。中東から欧州やアジアへ運ばれる原油の契約には「ブレント先物清算値にプレミアムまたはディスカウントを加減する」という条項が一般的に書かれています。この契約慣行こそがブレントの影響力の真の源泉です。' },
          { h: 'ブレントとWTIの関係', p: 'どちらも軽質スイート原油であるため、両価格は長期にわたり高い相関で推移しますが、スプレッドは一定ではありません。米国のパイプライン輸送能力が逼迫しクッシングの在庫が積み上がると、WTIはブレントに対して明確に割安になります。米国の輸出能力が拡大しシェール生産が急増すると、スプレッドは再び縮小します。このスプレッドを観察すること自体が、世界の原油物流が順調に機能しているかを測る有用な指標になります。' },
          { h: '「国際原油価格」は通常どちらを指すか', p: '報道で「原油価格が上昇した」「価格が節目を割り込んだ」と言われる場合、そのほとんどはブレントを指します。取引量に占める割合が大きく、地理的な代表性も高いからです。中国の成品油価格調整メカニズムが参照する国際原油バスケットにもブレントが含まれています。世界の原油動向を一つの数字で把握したいなら、WTIよりブレントを見るほうが適切です。' },
          { h: '価格を読む際の注意点', p: 'ブレントは1バレルあたりの米ドルで表示されます。1バレルは42米ガロン、約159リットルです。この表示は現物市場の参考価格であり、取引所の公式清算値ではなく、通常は数分の遅延があります。週末は世界の市場が休場となるため、その時間に表示される価格は前営業日の終値水準です。トレンドを追うには十分ですが、決済や取引の根拠にはしないでください。' },
        ],
      },
      es: {
        title: '¿Por qué el Brent es la referencia mundial del petróleo?',
        desc: 'En torno a dos tercios del crudo que se comercializa en el mundo se precio tomando el Brent como base. Cómo una mezcla del Mar del Norte llegó a definir lo que entendemos por "el precio del petróleo".',
        body: [
          { h: 'Qué es exactamente el Brent', p: 'El Brent no es el crudo de un único yacimiento. Es una mezcla de crudos procedentes de varios campos del Mar del Norte, entre el Reino Unido y Noruega. Es un crudo ligero y dulce —baja densidad y bajo azufre—, lo que lo hace más fácil y barato de refinar y proporciona una mayor proporción de productos ligeros valiosos como la gasolina y el diésel. Esa calidad física es el fundamento de su posición.' },
          { h: 'La entrega marítima marcó la diferencia', p: 'Lo que realmente distinguió al Brent fue la logística. La producción del Mar del Norte fluye por oleoductos submarinos hasta la terminal de Sullom Voe, en las islas Shetland, donde puede cargarse directamente en buques tanque y enviarse a cualquier lugar del mundo. El WTI, en cambio, se entrega en Cushing, Oklahoma, un centro de almacenamiento interior: los compradores dependen de la capacidad de los oleoductos para moverlo. Como el comercio de crudo es en esencia un negocio marítimo, un grado que puede cargarse libremente en un buque es una referencia global mucho más natural.' },
          { h: 'El mercado de futuros le dio poder de fijación de precios', p: 'El contrato de futuros del Brent en la bolsa ICE es uno de los contratos energéticos más líquidos del mundo. Un mercado de futuros profundo concentra a compradores, vendedores, coberturistas y especuladores en un único precio transparente, y ese precio se convierte después en la referencia del comercio físico. Los contratos de cargamentos de crudo que viajan de Oriente Medio a Europa y Asia se liquidan habitualmente como "el precio de liquidación del futuro del Brent más o menos un diferencial". Ese hábito contractual es la verdadera fuente de la influencia del Brent.' },
          { h: 'Brent y WTI', p: 'Ambos son crudos ligeros y dulces, por lo que sus precios se mueven estrechamente unidos a lo largo del tiempo, pero el diferencial no es fijo. Cuando la capacidad de los oleoductos estadounidenses está tensionada y se acumulan inventarios en Cushing, el WTI cotiza con un descuento claro frente al Brent. Cuando la capacidad exportadora de Estados Unidos se amplía y la producción de esquisto se dispara, la brecha vuelve a estrecharse. Observar ese diferencial es en sí mismo una forma útil de saber si la logística mundial del crudo funciona con normalidad.' },
          { h: 'A cuál se refieren las noticias', p: 'Cuando un titular dice que el petróleo ha subido o ha perforado algún nivel, casi siempre se refiere al Brent. Representa una mayor parte del volumen negociado y tiene una cobertura geográfica más amplia. La cesta de crudos internacionales que sigue el mecanismo chino de fijación de precios de los carburantes también incluye el Brent. Si quiere una sola cifra para entender la tendencia mundial del crudo, el Brent es la más adecuada.' },
          { h: 'Cómo leer la cotización con cuidado', p: 'El Brent se cotiza en dólares estadounidenses por barril, y un barril equivale a 42 galones estadounidenses, unos 159 litros. La cotización es una referencia del mercado al contado, no un precio oficial de liquidación de la bolsa, y normalmente lleva unos minutos de retraso. Los mercados cierran los fines de semana, de modo que la cifra que ve entonces es el cierre de la sesión anterior. Es perfectamente válida para seguir la tendencia, pero no para liquidaciones ni para operar.' },
        ],
      },
      fr: {
        title: 'Pourquoi le Brent est-il la référence mondiale du pétrole ?',
        desc: 'Environ deux tiers du pétrole brut échangé dans le monde est prixé à partir du Brent. Comment un mélange de la mer du Nord en est venu à définir ce que l\'on appelle « le prix du pétrole ».',
        body: [
          { h: 'Ce qu\'est réellement le Brent', p: 'Le Brent n\'est pas le brut d\'un seul gisement. C\'est un mélange de bruts issus de plusieurs champs de la mer du Nord, entre le Royaume-Uni et la Norvège. C\'est un brut léger et doux — faible densité, faible teneur en soufre —, ce qui le rend plus facile et moins coûteux à raffiner et donne une plus grande part de produits légers de valeur comme l\'essence et le gazole. Cette qualité physique est le fondement de son statut.' },
          { h: 'La logistique maritime a fait la différence', p: 'Ce qui a vraiment distingué le Brent, c\'est la logistique. La production de la mer du Nord circule par oléoducs sous-marins jusqu\'au terminal de Sullom Voe, dans les îles Shetland, où elle peut être chargée directement sur des pétroliers et expédiée n\'importe où dans le monde. Le WTI, à l\'inverse, est livré à Cushing, en Oklahoma, un centre de stockage intérieur : les acheteurs dépendent de la capacité des oléoducs pour l\'acheminer. Comme le commerce du brut est fondamentalement une affaire maritime, une qualité qui peut être librement chargée sur un navire constitue une référence mondiale bien plus naturelle.' },
          { h: 'Le marché à terme lui a donné le pouvoir de fixation des prix', p: 'Le contrat à terme sur le Brent de la bourse ICE est l\'un des contrats énergétiques les plus liquides au monde. Un marché à terme profond concentre acheteurs, vendeurs, couvertures et spéculateurs sur un prix unique et transparent, et ce prix devient ensuite la référence du commerce physique. Les contrats de cargaisons de brut acheminées du Moyen-Orient vers l\'Europe et l\'Asie se règlent couramment comme « le prix de règlement du contrat à terme sur le Brent plus ou moins un différentiel ». Cette habitude contractuelle est la véritable source de l\'influence du Brent.' },
          { h: 'Brent et WTI', p: 'Les deux sont des bruts légers et doux : les deux prix évoluent donc étroitement ensemble dans le temps, mais l\'écart n\'est pas fixe. Lorsque la capacité des oléoducs américains est tendue et que les stocks de Cushing s\'accumulent, le WTI se négocie avec une décote nette par rapport au Brent. Lorsque la capacité d\'exportation des États-Unis se développe et que la production de schiste bondit, l\'écart se resserre de nouveau. Observer cet écart est en soi une façon utile de savoir si la logistique mondiale du brut fonctionne sans accroc.' },
          { h: 'Lequel désignent les actualités', p: 'Quand un titre annonce que le pétrole a monté ou franchi un seuil, il s\'agit presque toujours du Brent. Il représente une part plus importante des volumes échangés et couvre une zone géographique plus large. Le panier de bruts internationaux suivi par le mécanisme chinois de fixation des prix des carburants inclut également le Brent. Si vous voulez un seul chiffre pour comprendre la tendance mondiale du brut, le Brent est le mieux adapté.' },
          { h: 'Lire la cotisation avec prudence', p: 'Le Brent est coté en dollars américains par baril, et un baril équivaut à 42 gallons américains, soit environ 159 litres. Cette cotation est une référence du marché au comptant, et non un prix officiel de règlement de la bourse ; elle comporte normalement un retard de quelques minutes. Les marchés ferment le week-end : le chiffre affiché à ce moment-là est donc le niveau de clôture de la séance précédente. Il est parfaitement adapté pour suivre une tendance, mais pas pour un règlement ou une opération de trading.' },
        ],
      },
      de: {
        title: 'Warum Brent der weltweite Ölpreis-Maßstab ist',
        desc: 'Rund zwei Drittel des international gehandelten Rohöls wird auf Basis von Brent bepreist. Wie eine Nordsee-Mischung dazu kam, „den Ölpreis“ zu definieren.',
        body: [
          { h: 'Was Brent eigentlich ist', p: 'Brent ist nicht das Rohöl eines einzelnen Feldes. Es ist eine Mischung aus Rohölen mehrerer Felder in der Nordsee zwischen Großbritannien und Norwegen. Es handelt sich um ein leichtes, süßes Rohöl – geringe Dichte, geringer Schwefelgehalt –, das sich leichter und kostengünstiger raffinieren lässt und einen höheren Anteil wertvoller Leichtprodukte wie Benzin und Diesel ergibt. Diese physikalische Beschaffenheit ist das Fundament seiner Stellung.' },
          { h: 'Der Seeweg gab den Ausschlag', p: 'Was Brent wirklich auszeichnete, war die Logistik. Die Nordsee-Produktion fließt durch Unterwasser-Pipelines zum Terminal Sullom Voe auf den Shetland-Inseln, wo sie direkt auf Tanker verladen und in die ganze Welt verschifft werden kann. WTI wird dagegen in Cushing, Oklahoma, geliefert – einem Binnen-Tanklager. Käufer sind dort von der Kapazität der Pipelines abhängig. Da der Rohölhandel im Kern ein Seeschifffahrtsgeschäft ist, ist eine Sorte, die frei auf ein Schiff geladen werden kann, eine weitaus natürlichere globale Referenz.' },
          { h: 'Der Terminmarkt verlieh ihm Preismacht', p: 'Der Brent-Terminkontrakt an der Börse ICE ist einer der liquidesten Energiekontrakte der Welt. Ein tiefer Terminmarkt bündelt Käufer, Verkäufer, Absicherer und Spekulanten auf einen einzigen transparenten Preis, und dieser Preis wird anschließend zur Referenz für das physische Geschäft. Ladungsverträge für Rohöl, das vom Nahen Osten nach Europa und Asien geht, werden üblicherweise als „Abrechnungspreis des Brent-Terminkontrakts zuzüglich oder abzüglich eines Differentials“ abgerechnet. Diese Vertragsgewohnheit ist die eigentliche Quelle des Brent-Einflusses.' },
          { h: 'Brent und WTI', p: 'Beide sind leichte, süße Sorten, daher bewegen sich die beiden Preise langfristig eng miteinander – der Spread ist jedoch nicht fest. Wenn die US-Pipelinekapazitäten angespannt sind und sich die Bestände in Cushing aufstauen, notiert WTI deutlich unter Brent. Wenn die US-Exportkapazitäten wachsen und die Schieferölproduktion stark zunimmt, verengt sich die Spanne wieder. Diesen Spread zu beobachten, ist für sich genommen ein nützlicher Indikator dafür, ob die globale Rohöllogistik reibungslos läuft.' },
          { h: 'Welchen meinen die Nachrichten', p: 'Wenn eine Schlagzeile meldet, Öl sei gestiegen oder habe eine Marke durchbrochen, ist damit fast immer Brent gemeint. Es steht für einen größeren Anteil des gehandelten Volumens und hat eine breitere geografische Abdeckung. Auch der Korb internationaler Rohölsorten, dem der chinesische Mechanismus zur Kraftstoffpreisbildung folgt, enthält Brent. Wer die globale Rohöltendenz mit einer einzigen Zahl verstehen will, ist mit Brent besser bedient.' },
          { h: 'Die Notierung richtig lesen', p: 'Brent wird in US-Dollar pro Barrel notiert, wobei ein Barrel 42 US-Gallonen oder rund 159 Litern entspricht. Diese Notierung ist eine Referenz des Spotmarkts und kein offizieller Abrechnungspreis der Börse; sie ist in der Regel um einige Minuten verzögert. Am Wochenende sind die Märkte geschlossen, der dann angezeigte Wert entspricht also dem Schlussniveau der vorherigen Sitzung. Für die Tendenz ist das völlig ausreichend, für Abrechnung oder Handel jedoch nicht.' },
        ],
      },
      pt: {
        title: 'Por que o Brent é a referência mundial do petróleo',
        desc: 'Cerca de dois terços do petróleo bruto comercializado no mundo é precificado com base no Brent. Como uma mistura do Mar do Norte passou a definir o que entendemos por "o preço do petróleo".',
        body: [
          { h: 'O que o Brent realmente é', p: 'O Brent não é o petróleo de um único campo. É uma mistura de óleos brutos de vários campos no Mar do Norte, entre o Reino Unido e a Noruega. É um bruto leve e doce — baixa densidade e baixo teor de enxofre —, o que o torna mais fácil e barato de refinar e rende uma proporção maior de produtos leves valiosos, como gasolina e diesel. Essa qualidade física é o alicerce de sua posição.' },
          { h: 'A entrega marítima fez a diferença', p: 'O que realmente distinguiu o Brent foi a logística. A produção do Mar do Norte escoa por dutos submarinos até o terminal de Sullom Voe, nas ilhas Shetland, onde pode ser carregada diretamente em navios-tanque e enviada a qualquer lugar do mundo. O WTI, em contraste, é entregue em Cushing, Oklahoma, um polo de tanques no interior: os compradores dependem da capacidade dos dutos para movê-lo. Como o comércio de bruto é essencialmente um negócio marítimo, um tipo que pode ser livremente carregado em um navio é uma referência global muito mais natural.' },
          { h: 'O mercado futuro lhe deu poder de formação de preço', p: 'O contrato futuro do Brent na bolsa ICE é um dos contratos de energia mais líquidos do mundo. Um mercado futuro profundo concentra compradores, vendedores, hedge e especuladores em um único preço transparente, e esse preço passa a ser a referência para o comércio físico. Contratos de carga de bruto que segue do Oriente Médio para a Europa e a Ásia são liquidados usualmente como "o preço de liquidação do futuro do Brent mais ou menos um diferencial". Esse hábito contratual é a verdadeira fonte da influência do Brent.' },
          { h: 'Brent e WTI', p: 'Ambos são brutos leves e doces, de modo que os dois preços caminham juntos ao longo do tempo — mas o spread não é fixo. Quando a capacidade dos dutos americanos está apertada e os estoques em Cushing se acumulam, o WTI é negociado com desconto claro frente ao Brent. Quando a capacidade de exportação dos EUA se expande e a produção de xisto dispara, a diferença volta a se estreitar. Observar esse spread é, em si, uma forma útil de saber se a logística global do bruto está funcionando sem sobressaltos.' },
          { h: 'A qual as notícias se referem', p: 'Quando uma manchete diz que o petróleo subiu ou rompeu algum patamar, quase sempre se refere ao Brent. Ele representa uma fatia maior do volume negociado e tem cobertura geográfica mais ampla. A cesta de brutos internacionais que o mecanismo chinês de preços de combustíveis acompanha também inclui o Brent. Se você quer um único número para entender a tendência global do bruto, o Brent é o mais indicado.' },
          { h: 'Como ler a cotação com cuidado', p: 'O Brent é cotado em dólares americanos por barril, e um barril equivale a 42 galões americanos, cerca de 159 litros. Essa cotação é uma referência do mercado à vista, não um preço oficial de liquidação da bolsa, e normalmente traz alguns minutos de atraso. Os mercados fecham nos fins de semana, então o valor exibido nesse momento é o nível de fechamento da sessão anterior. É perfeitamente adequado para acompanhar a tendência, mas não para liquidação ou negociação.' },
        ],
      },
    },
  },

  /* ================================================================
     2 — How to read the gold price
     ================================================================ */
  {
    slug: 'how-to-read-gold-price',
    cat: 'gold',
    date: '2026-09-25',
    readMin: 5,
    i18n: {
      zh: {
        title: '国际金价怎么读：盎司、克与成色换算',
        desc: '国际金价用"美元/金衡盎司"报价，金店却按"克"卖。两者怎么换算？18K 金的价值又该怎么估？一文讲清楚贵金属的计量单位。',
        body: [
          { h: '金衡盎司不是普通盎司', p: '贵金属使用的是金衡盎司（troy ounce），约等于 31.1035 克；而日常说的盎司（常衡盎司）约 28.35 克，两者相差约 10%。所以看到"1 盎司黄金"时千万别用 28.35 去算，否则会低估约一成。把克价换算成盎司价，乘以 31.1035 即可；反过来把盎司价换成克价，除以 31.1035。' },
          { h: '为什么报价用美元', p: '国际金价 XAU/USD 指的是"一盎司黄金值多少美元"，由伦敦、纽约、苏黎世等主要交易中心连续交易形成。美元计价意味着金价与美元强弱高度相关：美元走弱时，同样一盎司黄金需要更多美元购买，价格通常上行；美元走强则相反。这也是为什么金价常被视为美元的镜像。' },
          { h: '成色：24K 才是纯金', p: '国际报价对应的是纯度 99.9% 以上的纯金，也就是 24K。市售首饰多为合金，因为纯金太软不适合镶嵌和佩戴。18K 金含金量 75%，14K 约 58.5%。估算一件金饰的黄金价值，公式是：重量 × 成色比例 × 当日金价。例如 10 克 18K 金，含金部分是 7.5 克，按当日克价相乘就是它的金属价值。' },
          { h: '为什么金店报价比你看到的高', p: '金店零售价包含工费、设计费、品牌溢价、税费和商家利润，通常在国际金价基础上加价 10%~30% 甚至更多；而回收价则低于国际金价，因为回收商要承担检测、熔炼和资金成本。所以"买入价高于国际价、卖出价低于国际价"是正常的双向价差，不是商家欺诈。' },
          { h: '本页的克价是怎么来的', p: '本站显示的"人民币/克"是由美元盎司价经过两步换算得到的：先按当日汇率把美元折算成人民币，再除以 31.1035 得到每克价格。这是一个理论金属价，不含任何工费和溢价，适合用来横向比较、判断金价大致水平，不能直接等同于金店柜台价。' },
          { h: '金价受什么影响', p: '实际利率（名义利率减去通胀预期）是最核心的驱动：实际利率走低时，持有无息资产黄金的机会成本下降，金价倾向上行。此外，央行购金、地缘不确定性带来的避险需求、美元强弱以及实物消费（尤其亚洲市场）都会影响金价。另外，免费数据源通常按日更新，盘中剧烈波动不会即时反映。' },
        ],
      },
      en: {
        title: 'How to Read the Gold Price: Troy Ounces, Grams and Fineness',
        desc: 'The international quote is dollars per troy ounce, but jewellers sell by the gram. How the two relate, and how to value 18-carat gold.',
        body: [
          { h: 'A troy ounce is not a kitchen ounce', p: 'Precious metals are weighed in troy ounces: one troy ounce is about 31.1035 grams. The everyday avoirdupois ounce is about 28.35 grams — roughly 10% lighter. If you convert "one ounce of gold" using 28.35, you will understate the value by about a tenth. To turn a gram price into a troy ounce price, multiply by 31.1035; to go the other way, divide by 31.1035.' },
          { h: 'Why the quote is in dollars', p: 'XAU/USD means "how many US dollars one troy ounce of gold is worth", and it is formed by continuous dealing across London, New York, Zurich and other centres. Because the quote is in dollars, gold tends to move inversely to the dollar: a weaker dollar usually means it takes more dollars to buy the same ounce. This is why gold is often read as a mirror image of the currency.' },
          { h: 'Fineness: 24 carat is pure', p: 'The spot quote refers to pure gold of 99.9% or better — 24 carat. Jewellery is usually alloyed, because pure gold is too soft for settings and everyday wear. 18 carat is 75% gold, 14 carat about 58.5%. To estimate the metal value of an item, multiply weight by fineness and then by the current price. Ten grams of 18 carat contains 7.5 grams of gold; multiply that by today\'s gram price and you have its metal value.' },
          { h: 'Why the shop price is higher', p: 'Retail Jewellers add making charges, design costs, brand premium, tax and margin on top of the metal price — commonly 10% to 30% or more above the international quote. Buy-back prices sit below it, because the dealer absorbs assay, refining and financing costs. A two-way spread, buying above and selling below the benchmark, is normal market behaviour rather than a sign of bad faith.' },
          { h: 'How our gram figure is derived', p: 'The yuan-per-gram figure on this site comes from the dollar ounce quote in two steps: convert to yuan at the day\'s reference rate, then divide by 31.1035. It is a theoretical metal value with no making charge or premium included. It is well suited to comparing levels and judging where gold broadly stands, but it is not the same as a counter price in a shop.' },
          { h: 'What moves gold', p: 'Real interest rates — nominal rates minus inflation expectations — are the core driver: when real rates fall, the opportunity cost of holding a non-yielding asset like gold falls and the price tends to rise. Central bank buying, safe-haven demand during geopolitical uncertainty, the strength of the dollar and physical consumption, particularly in Asia, all matter too. Note that free data feeds are typically updated once a day, so sharp intraday moves will not appear immediately.' },
        ],
      },
      ja: {
        title: '金価格の読み方：トロイオンス・グラム・品位',
        desc: '国際的な金価格は「米ドル／トロイオンス」で表示されますが、宝飾店は「グラム」で販売します。両者の換算方法と、18金の価値の推定方法を解説します。',
        body: [
          { h: 'トロイオンスは通常のオンスではない', p: '貴金属にはトロイオンスが使われ、1トロイオンスは約31.1035グラムです。日常で使われる常衡オンスは約28.35グラムで、約10%軽くなります。「金1オンス」を28.35で換算すると、価値を約一割過小評価してしまいます。グラム価格をトロイオンス価格にするには31.1035を掛け、逆にトロイオンス価格をグラム価格にするには31.1035で割ります。' },
          { h: 'なぜ表示が米ドルなのか', p: 'XAU/USDとは「金1トロイオンスが何米ドルに相当するか」を意味し、ロンドン、ニューヨーク、チューリッヒなどの主要取引拠点での継続的な売買によって形成されます。米ドル建てであるため、金はドルの強弱と逆方向に動く傾向があります。ドル安になると同じ1オンスを買うのにより多くのドルが必要になり、価格は上昇しやすくなります。金がドルの鏡像と見なされる理由はここにあります。' },
          { h: '品位：純金は24金', p: '国際価格の対象は純度99.9%以上の純金、すなわち24金です。市販の宝飾品は合金であることが多く、純金は柔らかすぎて石留めや日常使いに適さないためです。18金は金含有率75%、14金は約58.5%です。製品の地金価値を推定する式は「重量 × 品位比率 × 当日価格」です。18金10グラムなら金部分は7.5グラムで、これに当日のグラム価格を掛ければ地金価値が出ます。' },
          { h: 'なぜ店頭価格は高いのか', p: '宝飾店の小売価格には、地金価格に加えて加工賃、デザイン料、ブランドプレミアム、税金、販売店の利益が含まれ、国際価格より一般に10%〜30%以上高くなります。一方、買取価格は国際価格を下回ります。買取業者が分析・溶解・資金コストを負担するためです。「買うときは国際価格より高く、売るときは国際価格より安い」という双方向のスプレッドは、不誠実な商慣行ではなく正常な市場の姿です。' },
          { h: '当サイトのグラム価格の算出方法', p: '当サイトが表示する「人民元／グラム」は、米ドル建てオンス価格から二段階で算出しています。まず当日の参照レートで米ドルを人民元に換算し、次に31.1035で割って1グラムあたりの価格を出します。これは加工賃やプレミアムを含まない理論上の地金価格であり、水準の比較や相場観の把握には適していますが、店頭価格と同一ではありません。' },
          { h: '金価格を動かすもの', p: '最も重要な要因は実質金利（名目金利から予想インフレ率を差し引いたもの）です。実質金利が低下すると、利息を生まない資産である金を保有する機会費用が下がり、価格は上昇しやすくなります。このほか、中央銀行の金購入、地政学的な不確実性に伴う逃避需要、ドルの強弱、そして特にアジア市場における実物消費も影響します。なお、無料のデータ配信は通常1日1回の更新であるため、日中の急変動は即座には反映されません。' },
        ],
      },
      es: {
        title: 'Cómo leer el precio del oro: onzas troy, gramos y ley',
        desc: 'La cotización internacional se expresa en dólares por onza troy, pero las joyerías venden por gramos. Cómo se relacionan ambas medidas y cómo valorar el oro de 18 quilates.',
        body: [
          { h: 'Una onza troy no es una onza común', p: 'Los metales preciosos se pesan en onzas troy: una onza troy equivale a unos 31,1035 gramos. La onza avoirdupois de uso cotidiano ronda los 28,35 gramos, aproximadamente un 10% menos. Si convierte "una onza de oro" usando 28,35, infraestimará el valor en torno a una décima parte. Para pasar un precio por gramo a precio por onza troy, multiplique por 31,1035; para el camino inverso, divida por 31,1035.' },
          { h: 'Por qué la cotización está en dólares', p: 'XAU/USD significa "cuántos dólares estadounidenses vale una onza troy de oro" y se forma mediante la negociación continua en Londres, Nueva York, Zúrich y otros centros. Como la cotización está en dólares, el oro tiende a moverse de forma inversa al dólar: un dólar más débil suele significar que hacen falta más dólares para comprar la misma onza. Por eso el oro se lee a menudo como una imagen especular de la divisa.' },
          { h: 'La ley: 24 quilates es oro puro', p: 'La cotización al contado se refiere a oro puro del 99,9% o más, es decir, 24 quilates. La joyería suele ser una aleación, porque el oro puro es demasiado blando para engastes y uso diario. 18 quilates equivale al 75% de oro y 14 quilates alrededor del 58,5%. Para estimar el valor metálico de una pieza, multiplique el peso por la ley y después por el precio actual. Diez gramos de 18 quilates contienen 7,5 gramos de oro: multiplíquelos por el precio por gramo de hoy y tendrá su valor metálico.' },
          { h: 'Por qué el precio de la tienda es más alto', p: 'Los joyeros minoristas añaden al precio del metal costes de fabricación, diseño, prima de marca, impuestos y margen: habitualmente entre un 10% y un 30% o más por encima de la cotización internacional. Los precios de recompra se sitúan por debajo, porque el comprador asume los costes de ensayo, refinado y financiación. Un diferencial a dos direcciones, comprar por encima y vender por debajo de la referencia, es un comportamiento normal del mercado y no una señal de mala fe.' },
          { h: 'Cómo se obtiene nuestra cifra por gramo', p: 'La cifra en yuanes por gramo de este sitio se obtiene a partir de la cotización en dólares por onza en dos pasos: se convierte a yuanes al tipo de referencia del día y después se divide por 31,1035. Es un valor metálico teórico que no incluye coste de fabricación ni prima. Resulta adecuado para comparar niveles y juzgar dónde se sitúa el oro en líneas generales, pero no equivale al precio de mostrador de una tienda.' },
          { h: 'Qué mueve al oro', p: 'Los tipos de interés reales —tipos nominales menos expectativas de inflación— son el motor principal: cuando los tipos reales bajan, el coste de oportunidad de mantener un activo que no devenga intereses como el oro disminuye y el precio tiende a subir. También influyen las compras de los bancos centrales, la demanda de refugio ante la incertidumbre geopolítica, la fortaleza del dólar y el consumo físico, particularmente en Asia. Tenga en cuenta que los proveedores de datos gratuitos suelen actualizar una vez al día, por lo que los movimientos bruscos intradía no aparecerán de inmediato.' },
        ],
      },
      fr: {
        title: 'Lire le prix de l\'or : once troy, grammes et titre',
        desc: 'La cotation internationale s\'exprime en dollars par once troy, mais les bijoutiers vendent au gramme. Comment les deux se relient et comment évaluer l\'or 18 carats.',
        body: [
          { h: 'Une once troy n\'est pas une once ordinaire', p: 'Les métaux précieux se pèsent en onces troy : une once troy vaut environ 31,1035 grammes. L\'once avoirdupois du quotidien vaut environ 28,35 grammes, soit à peu près 10 % de moins. Si vous convertissez « une once d\'or » avec 28,35, vous sous-estimerez la valeur d\'environ un dixième. Pour passer d\'un prix au gramme à un prix à l\'once troy, multipliez par 31,1035 ; dans l\'autre sens, divisez par 31,1035.' },
          { h: 'Pourquoi la cotation est en dollars', p: 'XAU/USD signifie « combien de dollars américains vaut une once troy d\'or », et ce prix se forme par des échanges continus entre Londres, New York, Zurich et d\'autres places. Parce que la cotation est en dollars, l\'or a tendance à évoluer en sens inverse du dollar : un dollar plus faible signifie généralement qu\'il faut plus de dollars pour acheter la même once. C\'est pour cette raison que l\'on lit souvent l\'or comme le miroir de la devise.' },
          { h: 'Le titre : 24 carats, c\'est l\'or pur', p: 'La cotation au comptant se réfère à l\'or pur à 99,9 % ou plus, c\'est-à-dire 24 carats. Les bijoux du commerce sont généralement alliés, car l\'or pur est trop mou pour les sertissages et l\'usage quotidien. 18 carats correspondent à 75 % d\'or, 14 carats à environ 58,5 %. Pour estimer la valeur métallique d\'un objet, multipliez le poids par le titre puis par le prix actuel. Dix grammes d\'or 18 carats contiennent 7,5 grammes d\'or fin : multipliez-les par le prix au gramme du jour et vous obtenez sa valeur métallique.' },
          { h: 'Pourquoi le prix en boutique est plus élevé', p: 'Les bijoutiers ajoutent au prix du métal les frais de façonnage, les coûts de design, la prime de marque, les taxes et leur marge : couramment de 10 % à 30 % ou plus au-dessus de la cotation internationale. Les prix de rachat, eux, se situent en dessous, car l\'acheteur supporte les coûts d\'essai, d\'affinage et de financement. Un écart à double sens — acheter au-dessus et vendre en dessous de la référence — relève d\'un fonctionnement normal du marché et non d\'une mauvaise foi.' },
          { h: 'Comment notre chiffre au gramme est obtenu', p: 'Le chiffre en yuans par gramme affiché sur ce site provient de la cotation en dollars par once en deux étapes : conversion en yuans au taux de référence du jour, puis division par 31,1035. Il s\'agit d\'une valeur métallique théorique qui n\'inclut aucun frais de façonnage ni prime. Elle convient bien pour comparer des niveaux et juger où se situe globalement l\'or, mais elle n\'équivaut pas au prix affiché en boutique.' },
          { h: 'Ce qui fait bouger l\'or', p: 'Les taux d\'intérêt réels — taux nominaux moins anticipations d\'inflation — sont le moteur principal : lorsque les taux réels baissent, le coût d\'opportunité de détenir un actif sans rendement comme l\'or diminue et le prix tend à monter. S\'y ajoutent les achats des banques centrales, la demande de valeurs refuges en période d\'incertitude géopolitique, la force du dollar et la consommation physique, particulièrement en Asie. Notez que les flux de données gratuits sont généralement mis à jour une fois par jour : les mouvements intraday marqués n\'apparaîtront donc pas immédiatement.' },
        ],
      },
      de: {
        title: 'Den Goldpreis lesen: Feinunze, Gramm und Feingehalt',
        desc: 'Die internationale Notierung lautet US-Dollar pro Feinunze, Juweliere verkaufen jedoch nach Gramm. Wie beides zusammenhängt und wie man 18-karätiges Gold bewertet.',
        body: [
          { h: 'Eine Feinunze ist keine gewöhnliche Unze', p: 'Edelmetalle werden in Feinunzen (Troy-Ounce) gewogen: Eine Feinunze entspricht etwa 31,1035 Gramm. Die alltägliche Unze (Avoirdupois) wiegt rund 28,35 Gramm und ist damit etwa 10 % leichter. Rechnet man „eine Unze Gold“ mit 28,35 um, unterschätzt man den Wert um etwa ein Zehntel. Um einen Grammpreis in einen Feinunzenpreis umzurechnen, multipliziert man mit 31,1035; umgekehrt teilt man durch 31,1035.' },
          { h: 'Warum die Notierung in Dollar erfolgt', p: 'XAU/USD bedeutet „wie viele US-Dollar eine Feinunze Gold wert ist“ und entsteht durch fortlaufenden Handel in London, New York, Zürich und anderen Zentren. Weil die Notierung auf Dollar lautet, bewegt sich Gold tendenziell gegenläufig zum Dollar: Ein schwächerer Dollar bedeutet meist, dass für dieselbe Unze mehr Dollar nötig sind. Deshalb wird Gold oft als Spiegelbild der Währung gelesen.' },
          { h: 'Feingehalt: 24 Karat ist reines Gold', p: 'Die Spot-Notierung bezieht sich auf reines Gold mit 99,9 % oder mehr, also 24 Karat. Handelsübliche Schmuckstücke sind meist legiert, weil reines Gold zu weich für Fassungen und den Alltagsgebrauch ist. 18 Karat entsprechen 75 % Gold, 14 Karat etwa 58,5 %. Um den Metallwert eines Stücks zu schätzen, multipliziert man Gewicht mit Feingehalt und anschließend mit dem aktuellen Preis. Zehn Gramm 18-karätiges Gold enthalten 7,5 Gramm Feingold; multipliziert mit dem heutigen Grammpreis ergibt das seinen Metallwert.' },
          { h: 'Warum der Ladenpreis höher liegt', p: 'Juweliere schlagen auf den Metallpreis Verarbeitungskosten, Designaufwand, Markenpremium, Steuern und Marge auf – üblicherweise 10 % bis 30 % oder mehr über der internationalen Notierung. Ankaufspreise liegen darunter, weil der Händler Kosten für Prüfung, Schmelze und Finanzierung trägt. Eine zweiseitige Spanne – über der Referenz kaufen und darunter verkaufen – ist normales Marktverhalten und kein Hinweis auf unredliches Geschäftsgebaren.' },
          { h: 'Wie unser Gramm-Wert entsteht', p: 'Der auf dieser Seite angezeigte Yuan-pro-Gramm-Wert wird in zwei Schritten aus der Dollar-Notierung je Unze abgeleitet: zunächst Umrechnung in Yuan zum Referenzkurs des Tages, anschließend Division durch 31,1035. Es ist ein theoretischer Metallwert ohne Verarbeitungskosten oder Aufschlag. Er eignet sich gut, um Niveaus zu vergleichen und einzuschätzen, wo Gold ungefähr steht, entspricht aber nicht dem Preis an der Ladentheke.' },
          { h: 'Was Gold bewegt', p: 'Die Realzinsen – Nominalzins minus Inflationserwartung – sind der wichtigste Treiber: Sinken die Realzinsen, sinken die Opportunitätskosten, ein zinsloses Asset wie Gold zu halten, und der Preis tendiert nach oben. Hinzu kommen Käufe der Zentralbanken, die Nachfrage nach sicheren Häfen in Zeiten geopolitischer Unsicherheit, die Stärke des Dollars und die physische Nachfrage, insbesondere in Asien. Zu beachten ist außerdem: Kostenlose Datenquellen werden meist nur einmal täglich aktualisiert, sodass starke Intraday-Bewegungen nicht sofort erscheinen.' },
        ],
      },
      pt: {
        title: 'Como ler o preço do ouro: onça troy, gramas e teor',
        desc: 'A cotação internacional é em dólares por onça troy, mas as joalherias vendem por grama. Como as duas medidas se relacionam e como avaliar o ouro 18 quilates.',
        body: [
          { h: 'Uma onça troy não é uma onça comum', p: 'Metais preciosos são pesados em onças troy: uma onça troy equivale a cerca de 31,1035 gramas. A onça avoirdupois do dia a dia tem cerca de 28,35 gramas, aproximadamente 10% mais leve. Se você converter "uma onça de ouro" usando 28,35, subestimará o valor em cerca de um décimo. Para transformar um preço por grama em preço por onça troy, multiplique por 31,1035; no caminho inverso, divida por 31,1035.' },
          { h: 'Por que a cotação é em dólares', p: 'XAU/USD significa "quantos dólares americanos vale uma onça troy de ouro" e se forma pela negociação contínua em Londres, Nova York, Zurique e outros centros. Como a cotação é em dólares, o ouro tende a se mover de forma inversa ao dólar: um dólar mais fraco geralmente significa que são necessários mais dólares para comprar a mesma onça. É por isso que o ouro costuma ser lido como uma imagem especular da moeda.' },
          { h: 'Teor: 24 quilates é ouro puro', p: 'A cotação à vista se refere ao ouro puro de 99,9% ou mais, ou seja, 24 quilates. As joias do comércio costumam ser ligadas, porque o ouro puro é macio demais para cravações e uso diário. 18 quilates equivalem a 75% de ouro e 14 quilates a cerca de 58,5%. Para estimar o valor metálico de uma peça, multiplique o peso pelo teor e depois pelo preço atual. Dez gramas de 18 quilates contêm 7,5 gramas de ouro; multiplique isso pelo preço por grama de hoje e terá o valor metálico.' },
          { h: 'Por que o preço da loja é mais alto', p: 'Os joalheiros varejistas somam ao preço do metal custos de fabricação, design, prêmio de marca, impostos e margem — comumente de 10% a 30% ou mais acima da cotação internacional. Os preços de recompra ficam abaixo, porque o comprador absorve os custos de ensaio, refino e financiamento. Um spread de duas vias — comprar acima e vender abaixo da referência — é comportamento normal de mercado, e não sinal de má-fé.' },
          { h: 'Como nosso valor por grama é obtido', p: 'O valor em yuans por grama exibido neste site vem da cotação em dólar por onça em dois passos: converte-se em yuans à taxa de referência do dia e depois divide-se por 31,1035. É um valor metálico teórico, sem custo de fabricação ou prêmio. Serve bem para comparar níveis e julgar onde o ouro está de forma geral, mas não equivale ao preço do balcão de uma loja.' },
          { h: 'O que move o ouro', p: 'As taxas de juros reais — taxas nominais menos expectativas de inflação — são o principal motor: quando os juros reais caem, o custo de oportunidade de manter um ativo que não rende juros, como o ouro, diminui e o preço tende a subir. Também influenciam as compras dos bancos centrais, a demanda por porto seguro em momentos de incerteza geopolítica, a força do dólar e o consumo físico, especialmente na Ásia. Note que feeds de dados gratuitos costumam ser atualizados uma vez por dia, então movimentos intradiários acentuados não aparecerão de imediato.' },
        ],
      },
    },
  },

  /* ================================================================
     3 — China fuel pricing mechanism
     ================================================================ */
  {
    slug: 'china-fuel-pricing-mechanism',
    cat: 'cn',
    date: '2026-09-30',
    readMin: 6,
    i18n: {
      zh: {
        title: '中国成品油为什么"十个工作日一调"？',
        desc: '国内油价不是加油站随意定的。本文拆解成品油调价机制：一篮子原油、十个工作日、调价红线，以及为什么国际油价大跌时国内却"调不动"。',
        body: [
          { h: '调价依据：一篮子原油均价', p: '国内成品油价格挂钩的不是某一个油田的报价，而是多种国际原油的加权平均价。采用"一篮子"而非单一品种，是为了平滑个别油种的剧烈波动，让国内价格更贴近真实的进口成本结构。每当这一篮子原油的均价相对上一轮调价出现明显变化，机制就会触发调整。' },
          { h: '十个工作日：为什么是这个数', p: '调价周期设定为十个工作日，是一个在"及时反映成本"与"避免频繁扰动"之间取平衡的结果。周期太短，加油站价格天天变动，既增加运营成本也容易引发公众困扰；周期太长，价格又会长期脱离国际行情。十个工作日约合两周，既能跟上趋势，又不至于日日调价。' },
          { h: '调价红线与上下限', p: '机制设有明确的阈值：当一篮子原油均价变动幅度低于设定水平时，本次不作调整，差额累积到下一轮。更重要的是，机制还设有上下限——当国际油价高于某一水平时，会适当压缩加工利润、少调甚至不调，以减轻下游负担；当国际油价低于某一水平时，不再继续下调，这部分称为"地板价"。这两道设计的目的都是避免极端行情直接冲击国内经济。' },
          { h: '为什么各省价格不一样', p: '国家公布的是各省的最高零售限价，不是统一定价。各省在此基础上根据自身情况确定具体价格，差异主要来自：炼厂与港口的运输距离、区域配送成本、地方税费与市场供需。内陆省份远离主要炼化基地和进口口岸，运费更高，价格通常略高于沿海地区。' },
          { h: '92、95、98 到底差在哪', p: '这些数字是研究法辛烷值，衡量汽油抗爆震能力的指标。数值越高，越适合高压缩比发动机。关键在于：标号代表抗爆性，不代表"更纯净"或"更耐烧"。正确做法是按车辆说明书或油箱盖标注的推荐标号加油，盲目加高标号通常不会带来实际收益，反而多花钱。' },
          { h: '使用本站数据时要注意', p: '本站展示的是各省份的最高零售指导价，实际加油时加油站常有促销或会员优惠，实付价格可能略低。数据按日更新，与官方调价发布之间可能存在短暂延迟，遇到调价窗口期请以当地加油站实际标价为准。' },
        ],
      },
      en: {
        title: 'How China Sets Fuel Prices: The Ten-Working-Day Mechanism',
        desc: 'Retail fuel prices in China follow a published mechanism — a crude basket, a ten-working-day cycle, and floors and ceilings. Here is how it works.',
        body: [
          { h: 'The reference: a basket, not a single grade', p: 'Domestic fuel prices are linked not to one quoted grade but to a weighted average of several international crudes. Using a basket rather than a single benchmark smooths out sharp moves in any one grade and keeps the domestic price closer to the real structure of import costs. When that basket average moves materially against the previous adjustment round, the mechanism triggers a change.' },
          { h: 'Why ten working days', p: 'The ten-working-day cycle is a deliberate compromise between reflecting cost promptly and avoiding constant disruption. A shorter cycle would mean pump prices changing almost daily — costly for operators and confusing for the public. A longer one would leave prices detached from the international trend for extended periods. Ten working days, roughly two weeks, tracks the trend while keeping changes occasional.' },
          { h: 'Thresholds, ceilings and floors', p: 'The mechanism applies explicit thresholds: if the basket average moves by less than the set margin, no adjustment is made and the difference carries into the next round. More importantly, there are upper and lower bounds. When international crude rises above a certain level, refining margins are compressed and increases are damped or withheld to shield downstream users. When crude falls below a lower level, further cuts are suspended — the so-called floor price. Both are designed to stop extreme moves passing straight through to the domestic economy.' },
          { h: 'Why prices differ by province', p: 'What the national authority publishes is a maximum retail price for each province, not one uniform price. Provinces then set actual prices, and the differences come from transport distance to refineries and ports, regional distribution costs, local taxes and supply conditions. Inland provinces, far from the main refining base and import terminals, carry higher freight and are typically a little more expensive than coastal ones.' },
          { h: 'What 92, 95 and 98 actually mean', p: 'These numbers are research octane ratings, a measure of resistance to engine knocking. A higher number suits engines with higher compression ratios. The important point is that the rating describes knock resistance — it does not mean cleaner, purer or more economical fuel. The right approach is to use the grade recommended in your handbook or on the fuel flap; paying for a higher grade than your engine needs rarely delivers any real benefit.' },
          { h: 'When using the data on this site', p: 'The figures shown here are provincial maximum retail guidance prices. Stations frequently offer promotions or membership discounts, so what you actually pay may be slightly lower. Data is refreshed daily, so there can be a short lag around an official adjustment — during an adjustment window, rely on the posted price at the pump.' },
        ],
      },
      ja: {
        title: '中国の成品油価格はなぜ「10営業日ごと」なのか',
        desc: '中国国内の燃料価格は任意に決められているわけではありません。原油バスケット、10営業日のサイクル、調整の閾値、そして国際価格が大きく下落しても国内価格が動かない理由を解説します。',
        body: [
          { h: '調整の基準は原油バスケットの平均', p: '国内の成品油価格は単一銘柄の価格ではなく、複数の国際原油の加重平均に連動しています。単一銘柄ではなくバスケット方式を採るのは、個別銘柄の急変動を均し、国内価格を実際の輸入コスト構造に近づけるためです。このバスケット平均が前回の調整時点から明確に変動すると、メカニズムが発動します。' },
          { h: 'なぜ10営業日なのか', p: '10営業日という調整周期は、「コストを速やかに反映させること」と「頻繁な混乱を避けること」のバランスの産物です。周期が短すぎれば給油所の価格が毎日変わり、運営コストが増えるだけでなく利用者の混乱も招きます。長すぎれば価格が長期にわたり国際相場から乖離します。10営業日はおおむね2週間に相当し、トレンドには追随しつつ変更頻度は抑えられます。' },
          { h: '閾値・上限・下限', p: 'メカニズムには明確な閾値があります。バスケット平均の変動幅が設定水準未満の場合は今回は調整せず、差額は次回に繰り越されます。さらに重要なのは上限と下限の存在です。国際原油価格が一定水準を超えると、精製マージンが圧縮され、値上げが抑制または見送られて下流の負担が軽減されます。国际価格が一定水準を下回ると、それ以上の値下げは停止され、これがいわゆる「フロア価格」です。いずれも極端な相場が国内経済に直接波及するのを防ぐための設計です。' },
          { h: 'なぜ省ごとに価格が違うのか', p: '国家が公表するのは各省の最高小売価格であって、統一価格ではありません。各省がその範囲内で実際の価格を決定し、差異は製油所や港湾からの輸送距離、地域の流通コスト、地方税、需給状況から生じます。内陸省は主要な製油拠点や輸入ターミナルから遠く輸送費がかさむため、沿海部よりやや高くなるのが一般的です。' },
          { h: '92・95・98の違い', p: 'これらの数字はリサーチオクタン価であり、エンジンのノッキング（異常燃焼）への耐性を示す指標です。数値が高いほど圧縮比の高いエンジンに適します。重要なのは、この数値が耐ノック性を示すのであって、「より純粋」「より燃費が良い」ことを意味しない点です。正しい做法是取扱説明書や給油口の表示に従うことで、必要以上に高い标号を入れても実益はほとんどなく、出費が増えるだけです。' },
          { h: '当サイトのデータを利用する際の注意', p: '当サイトが表示するのは各省の最高小売指導価格です。実際の給油所ではキャンペーンや会員割引が行われることが多く、支払額はこれより低くなる場合があります。データは日次更新であり、公式な価格調整の公表との間に短い遅れが生じることがあります。調整の時期には、実際に現地の給油所に掲示された価格を優先してください。' },
        ],
      },
      es: {
        title: 'Cómo fija China los precios de los carburantes: el mecanismo de diez días laborables',
        desc: 'Los precios minoristas de los carburantes en China siguen un mecanismo público: una cesta de crudos, un ciclo de diez días laborables y topes y suelos. Así funciona.',
        body: [
          { h: 'La referencia: una cesta, no un solo grado', p: 'Los precios nacionales de los carburantes no están vinculados a un único grado cotizado, sino a la media ponderada de varios crudos internacionales. Utilizar una cesta en lugar de una sola referencia suaviza los movimientos bruscos de cualquier grado y mantiene el precio nacional más cerca de la estructura real de los costes de importación. Cuando esa media de la cesta se mueve de forma significativa respecto a la ronda anterior de ajuste, el mecanismo se activa.' },
          { h: 'Por qué diez días laborables', p: 'El ciclo de diez días laborables es un equilibrio deliberado entre reflejar el coste con rapidez y evitar perturbaciones constantes. Un ciclo más corto significaría precios en el surtidor cambiando casi a diario, costoso para los operadores y confuso para el público. Uno más largo dejaría los precios desvinculados de la tendencia internacional durante periodos prolongados. Diez días laborables, unas dos semanas, siguen la tendencia sin que los cambios sean frecuentes.' },
          { h: 'Umbrales, techos y suelos', p: 'El mecanismo aplica umbrales explícitos: si la media de la cesta se mueve menos del margen establecido, no se realiza ajuste y la diferencia se traslada a la siguiente ronda. Más importante aún, existen límites superior e inferior. Cuando el crudo internacional supera cierto nivel, los márgenes de refino se comprimen y las subidas se amortiguan o se retienen para proteger a los usuarios finales. Cuando el crudo cae por debajo de un nivel inferior, se suspenden nuevas bajadas: el llamado precio suelo. Ambos están diseñados para que los movimientos extremos no se transmitan directamente a la economía nacional.' },
          { h: 'Por qué los precios varían por provincias', p: 'Lo que publica la autoridad nacional es un precio minorista máximo para cada provincia, no un precio único uniforme. Después cada provincia fija los precios efectivos, y las diferencias provienen de la distancia de transporte hasta refinerías y puertos, los costes regionales de distribución, los impuestos locales y las condiciones de suministro. Las provincias del interior, lejos de la principal base de refino y de las terminales de importación, soportan un flete mayor y suelen ser algo más caras que las costeras.' },
          { h: 'Qué significan realmente 92, 95 y 98', p: 'Estas cifras son el índice de octano research, una medida de la resistencia al picado del motor. Un número más alto conviene a motores con mayor relación de compresión. Lo importante es que el índice describe la resistencia al picado: no significa un combustible más limpio, más puro ni más económico. El enfoque correcto es usar el grado recomendado en el manual del vehículo o en la tapa del depósito; pagar por un grado superior al que el motor necesita rara vez aporta un beneficio real.' },
          { h: 'Al usar los datos de este sitio', p: 'Las cifras que se muestran aquí son precios minoristas máximos de referencia por provincia. Las estaciones ofrecen con frecuencia promociones o descuentos para socios, de modo que lo que paga realmente puede ser algo menor. Los datos se actualizan a diario, por lo que puede haber un breve desfase en torno a un ajuste oficial: durante la ventana de ajuste, fíese del precio publicado en el surtidor.' },
        ],
      },
      fr: {
        title: 'Comment la Chine fixe le prix des carburants : le mécanisme des dix jours ouvrés',
        desc: 'Les prix de détail des carburants en Chine suivent un mécanisme public : un panier de bruts, un cycle de dix jours ouvrés, ainsi que des plafonds et des planchers. Voici comment il fonctionne.',
        body: [
          { h: 'La référence : un panier, pas une seule qualité', p: 'Les prix nationaux des carburants ne sont pas liés à une seule qualité cotée, mais à la moyenne pondérée de plusieurs bruts internationaux. Utiliser un panier plutôt qu\'une référence unique lisse les mouvements brusques d\'une qualité donnée et maintient le prix national plus proche de la structure réelle des coûts d\'importation. Lorsque cette moyenne du panier évolue sensiblement par rapport au tour d\'ajustement précédent, le mécanisme se déclenche.' },
          { h: 'Pourquoi dix jours ouvrés', p: 'Le cycle de dix jours ouvrés est un compromis délibéré entre la réactivité aux coûts et l\'évitement de perturbations constantes. Un cycle plus court signifierait des prix à la pompe changeant presque quotidiennement, coûteux pour les exploitants et déroutant pour le public. Un cycle plus long laisserait les prix durablement déconnectés de la tendance internationale. Dix jours ouvrés, soit environ deux semaines, permettent de suivre la tendance tout en gardant des changements occasionnels.' },
          { h: 'Seuils, plafonds et planchers', p: 'Le mécanisme applique des seuils explicites : si la moyenne du panier bouge moins que la marge fixée, aucun ajustement n\'est effectué et l\'écart est reporté au tour suivant. Plus important encore, il existe des bornes haute et basse. Lorsque le brut international dépasse un certain niveau, les marges de raffinage sont comprimées et les hausses sont amorties ou retenues afin de protéger les utilisateurs en aval. Lorsque le brut descend sous un certain niveau, les nouvelles baisses sont suspendues : c\'est le prix plancher. Ces deux dispositifs visent à empêcher des mouvements extrêmes de se transmettre directement à l\'économie nationale.' },
          { h: 'Pourquoi les prix diffèrent selon les provinces', p: 'Ce que publie l\'autorité nationale est un prix de détail maximal par province, et non un prix unique uniforme. Chaque province fixe ensuite les prix effectifs, et les écarts proviennent de la distance de transport jusqu\'aux raffineries et aux ports, des coûts régionaux de distribution, des taxes locales et des conditions d\'approvisionnement. Les provinces de l\'intérieur, éloignées de la base de raffinage principale et des terminaux d\'importation, supportent un fret plus élevé et sont généralement un peu plus chères que les provinces côtières.' },
          { h: 'Ce que signifient réellement 92, 95 et 98', p: 'Ces chiffres sont l\'indice d\'octane recherche, une mesure de la résistance au cliquetis du moteur. Un chiffre plus élevé convient aux moteurs à plus fort taux de compression. Le point important est que cet indice décrit la résistance au cliquetis : il ne signifie pas un carburant plus propre, plus pur ou plus économique. La bonne approche consiste à utiliser l\'indice recommandé dans le manuel du véhicule ou sur la trappe à carburant ; payer pour un indice supérieur à ce dont le moteur a besoin n\'apporte presque jamais de bénéfice réel.' },
          { h: 'En utilisant les données de ce site', p: 'Les chiffres affichés ici sont des prix de détail maximaux de référence par province. Les stations proposent fréquemment des promotions ou des remises pour adhérents, de sorte que le montant réellement payé peut être légèrement inférieur. Les données sont actualisées quotidiennement : un court décalage peut donc apparaître autour d\'un ajustement officiel. Pendant une fenêtre d\'ajustement, fiez-vous au prix affiché à la pompe.' },
        ],
      },
      de: {
        title: 'Wie China die Kraftstoffpreise festlegt: der Mechanismus der zehn Werktage',
        desc: 'Die chinesischen Einzelhandelspreise für Kraftstoffe folgen einem veröffentlichten Mechanismus: ein Rohölkorb, ein Zyklus von zehn Werktagen sowie Ober- und Untergrenzen. So funktioniert er.',
        body: [
          { h: 'Die Referenz: ein Korb, keine einzelne Sorte', p: 'Die inländischen Kraftstoffpreise sind nicht an eine einzelne notierte Sorte gekoppelt, sondern an den gewichteten Durchschnitt mehrerer internationaler Rohölsorten. Ein Korb statt einer einzelnen Referenz glättet starke Ausschläge einzelner Sorten und hält den Inlandspreis näher an der tatsächlichen Struktur der Importkosten. Bewegt sich dieser Korbschnitt gegenüber der letzten Anpassungsrunde deutlich, wird der Mechanismus ausgelöst.' },
          { h: 'Warum zehn Werktage', p: 'Der Zyklus von zehn Werktagen ist ein bewusster Kompromiss zwischen einer zeitnahen Abbildung der Kosten und der Vermeidung ständiger Störungen. Ein kürzerer Zyklus würde bedeuten, dass die Preise an der Zapfsäule sich fast täglich ändern – teuer für die Betreiber und verwirrend für die Öffentlichkeit. Ein längerer Zyklus würde die Preise über längere Zeit von der internationalen Tendenz abkoppeln. Zehn Werktage, etwa zwei Wochen, folgen der Tendenz und halten Änderungen dennoch selten.' },
          { h: 'Schwellen, Obergrenzen und Untergrenzen', p: 'Der Mechanismus kennt klare Schwellen: Bewegt sich der Korbschnitt um weniger als die festgelegte Marge, erfolgt keine Anpassung und die Differenz wird in die nächste Runde übertragen. Wichtiger noch sind die Ober- und Untergrenzen. Steigt das internationale Rohöl über ein bestimmtes Niveau, werden die Raffineriemargen gestaucht und Erhöhungen gedämpft oder ausgesetzt, um nachgelagerte Verbraucher zu entlasten. Fällt das Rohöl unter ein bestimmtes Niveau, werden weitere Senkungen ausgesetzt – der sogenannte Bodenpreis. Beides soll verhindern, dass extreme Bewegungen direkt auf die nationale Wirtschaft durchschlagen.' },
          { h: 'Warum die Preise je Provinz abweichen', p: 'Was die nationale Behörde veröffentlicht, ist ein maximaler Einzelhandelspreis je Provinz und kein einheitlicher Preis. Die Provinzen legen danach die tatsächlichen Preise fest; die Unterschiede ergeben sich aus der Transportdistanz zu Raffinerien und Häfen, den regionalen Vertriebskosten, lokalen Steuern und der Versorgungslage. Binnenprovinzen liegen weit von der wichtigsten Raffineriebasis und den Importterminals entfernt, haben höhere Frachtkosten und sind meist etwas teurer als die Küstenprovinzen.' },
          { h: 'Was 92, 95 und 98 tatsächlich bedeuten', p: 'Diese Zahlen sind die Research-Oktanzahl, ein Maß für die Klopffestigkeit des Motors. Ein höherer Wert passt zu Motoren mit höherem Verdichtungsverhältnis. Entscheidend ist: Die Zahl beschreibt die Klopffestigkeit – sie bedeutet nicht, dass der Kraftstoff reiner, sauberer oder sparsamer wäre. Der richtige Ansatz ist, die im Handbuch oder am Tankdeckel empfohlene Sorte zu tanken; eine höhere Sorte als vom Motor benötigt bringt selten einen echten Vorteil und kostet nur mehr.' },
          { h: 'Bei der Nutzung der Daten auf dieser Seite', p: 'Die hier gezeigten Werte sind maximale Einzelhandelsrichtpreise je Provinz. Tankstellen bieten häufig Aktionen oder Mitgliederrabatte an, sodass der tatsächlich gezahlte Betrag etwas niedriger sein kann. Die Daten werden täglich aktualisiert, rund um eine offizielle Preisanpassung kann es daher zu einer kurzen Verzögerung kommen. Während eines Anpassungsfensters gilt der an der Zapfsäule ausgehängte Preis.' },
        ],
      },
      pt: {
        title: 'Como a China define os preços dos combustíveis: o mecanismo de dez dias úteis',
        desc: 'Os preços de varejo de combustíveis na China seguem um mecanismo público: uma cesta de brutos, um ciclo de dez dias úteis e tetos e pisos. Veja como funciona.',
        body: [
          { h: 'A referência: uma cesta, não um único tipo', p: 'Os preços domésticos de combustíveis não estão ligados a um único tipo cotado, mas à média ponderada de vários brutos internacionais. Usar uma cesta em vez de uma única referência suaviza movimentos bruscos de qualquer tipo específico e mantém o preço doméstico mais próximo da estrutura real dos custos de importação. Quando essa média da cesta se move de forma relevante contra a rodada anterior de ajuste, o mecanismo é acionado.' },
          { h: 'Por que dez dias úteis', p: 'O ciclo de dez dias úteis é um compromisso deliberado entre refletir o custo com rapidez e evitar perturbações constantes. Um ciclo mais curto significaria preços nas bombas mudando quase diariamente, caro para os operadores e confuso para o público. Um ciclo mais longo deixaria os preços descolados da tendência internacional por longos períodos. Dez dias úteis, cerca de duas semanas, acompanham a tendência mantendo as mudanças ocasionais.' },
          { h: 'Limiares, tetos e pisos', p: 'O mecanismo aplica limiares explícitos: se a média da cesta se move menos do que a margem definida, nenhum ajuste é feito e a diferença é transportada para a próxima rodada. Mais importante ainda, há limites superior e inferior. Quando o bruto internacional sobe acima de certo nível, as margens de refino são comprimidas e os aumentos são amortecidos ou retidos para proteger os usuários a jusante. Quando o bruto cai abaixo de um nível inferior, novas reduções são suspensas — o chamado preço piso. Ambos foram desenhados para impedir que movimentos extremos se transmitam diretamente à economia nacional.' },
          { h: 'Por que os preços diferem por província', p: 'O que a autoridade nacional publica é um preço de varejo máximo por província, não um preço único uniforme. As províncias então definem os preços efetivos, e as diferenças vêm da distância de transporte até refinarias e portos, dos custos regionais de distribuição, dos impostos locais e das condições de oferta. Províncias do interior, distantes da principal base de refino e dos terminais de importação, têm frete mais alto e costumam ser um pouco mais caras que as costeiras.' },
          { h: 'O que 92, 95 e 98 realmente significam', p: 'Esses números são o índice de octanagem research, uma medida da resistência à batida de pino do motor. Um número maior convém a motores com maior taxa de compressão. O ponto importante é que o índice descreve a resistência à detonação: não significa um combustível mais limpo, mais puro ou mais econômico. A abordagem correta é usar o grau recomendado no manual do veículo ou na tampa do tanque; pagar por um grau acima do que o motor precisa raramente traz benefício real.' },
          { h: 'Ao usar os dados deste site', p: 'Os valores exibidos aqui são preços de varejo máximos de referência por província. Postos oferecem com frequência promoções ou descontos para associados, de modo que o valor efetivamente pago pode ser um pouco menor. Os dados são atualizados diariamente, então pode haver um pequeno intervalo em torno de um ajuste oficial: durante a janela de ajuste, confie no preço afixado na bomba.' },
        ],
      },
    },
  },

  /* ================================================================
     4 — FX rate types
     ================================================================ */
  {
    slug: 'mid-market-vs-bank-rate',
    cat: 'fx',
    date: '2026-10-06',
    readMin: 5,
    i18n: {
      zh: {
        title: '中间价、现汇买入价、现钞卖出价有什么区别？',
        desc: '同一个货币对，银行为什么给出四五个不同的汇率？本文解释中间价、买入价、卖出价与现钞现汇的差别，以及换算时该用哪一个。',
        body: [
          { h: '中间价：最公平的那一个', p: '中间价是银行间市场买入价与卖出价的平均数，可以理解为"这一刻这种货币真正值多少"。它不含零售加价，是大多数公开汇率表采用的数字，也是判断汇率走势时最合适的参照。本站的换算器使用的就是中间价，因此结果会略好于你在银行实际能拿到的价格。' },
          { h: '买入价与卖出价：方向很重要', p: '银行的报价永远有两侧。买入价是银行向你买入外币的价格，卖出价是银行把外币卖给你的价格。两者之差就是银行的利润来源，通常称为点差。关键在于方向是站在银行的角度说的：你去换汇时，实际上是在"买"外币，适用的是卖出价——这个价格比中间价差一些。' },
          { h: '现汇与现钞为什么不同', p: '现汇指账户里的电子货币，现钞指实体纸币。银行处理现钞要承担运输、保管、保险和残损回收的成本，所以现钞价通常比现汇价更不利。如果你打算换的是旅行用的现金，应该用现钞价估算；如果只是跨境转账或刷卡消费，参考现汇价更准确。' },
          { h: '刷卡还会再多一层成本', p: '通过银行卡在境外消费，除了汇率本身，还可能叠加两笔费用：一是卡组织（如 Visa、Mastercard）的清算汇率，通常接近中间价但略有加点；二是发卡行收取的货币转换费，常见为交易金额的 1%~1.5%。所以实际到手汇率 = 卡组织汇率 ×（1 + 转换费率）。部分商户提供的"动态货币转换"会把汇率换成你的本国货币结算，往往汇率更差，一般建议选择以当地货币计价。' },
          { h: '为什么不同机构报价不一样', p: '即使是同一时刻，不同银行、不同平台的报价也会有细微差异，原因在于各自的定价时点、加点策略和库存情况不同。这属于正常现象，不代表某一方报错。对于大额换汇，多比较几家是值得的；对于日常小额，差异通常可以忽略。' },
          { h: '本站换算器的定位', p: '本站提供的是基于中间价的快速估算，适合旅行前做预算、看账单大致折合多少、或者判断汇率大致走势。它不能用作记账、结算或报税依据——那些场景必须使用你实际成交时银行给出的确切汇率。' },
        ],
      },
      en: {
        title: 'Mid-Market, Buying and Selling Rates: What Is the Difference?',
        desc: 'Why does a bank quote four or five rates for the same currency pair? A plain guide to mid-market, bid, ask, and cash versus electronic rates.',
        body: [
          { h: 'The mid-market rate: the fairest single number', p: 'The mid-market rate is the midpoint between the bid and ask prices in the interbank market — effectively what a currency is genuinely worth at that moment. It carries no retail markup, which is why most public rate tables use it and why it is the right reference for following a trend. The converter on this site uses the mid-market rate, so its result will be slightly better than what a bank actually gives you.' },
          { h: 'Bid and ask: direction matters', p: 'A bank always quotes two sides. The bid is the price at which the bank buys foreign currency from you; the ask is the price at which it sells foreign currency to you. The gap between them is the bank\'s margin, known as the spread. Crucially, the direction is stated from the bank\'s perspective: when you go to change money, you are buying foreign currency, so the ask applies — and that is worse than the mid-market rate.' },
          { h: 'Why cash differs from electronic', p: 'Electronic rates apply to money held in an account; cash rates apply to physical notes. Handling banknotes carries transport, storage, insurance and redemption costs, so the cash rate is normally less favourable. If you are buying travel money, estimate with the cash rate. If you are making a transfer or paying by card, the electronic rate is the more accurate guide.' },
          { h: 'Cards add another layer', p: 'Spending abroad on a card can involve two costs on top of the rate itself. First, the card network\'s settlement rate — Visa and Mastercard typically price close to mid-market but with a small margin. Second, the issuing bank\'s foreign transaction fee, often 1% to 1.5% of the amount. So the effective rate is the network rate multiplied by one plus the fee. Merchants sometimes offer dynamic currency conversion, billing you in your home currency; that conversion is usually worse, and selecting the local currency is generally the better choice.' },
          { h: 'Why quotes differ between providers', p: 'Even at the same moment, different banks and platforms quote slightly different rates. The causes are mundane: distinct pricing times, different margin policies and varying inventory positions. This is normal and does not mean anyone has published an error. For large transfers, comparing a few providers is worthwhile; for small everyday amounts, the difference rarely matters.' },
          { h: 'What this converter is for', p: 'The converter here gives a quick estimate based on the mid-market rate. It suits budgeting before a trip, working out roughly what a foreign bill costs, or following the general direction of a rate. It is not a basis for accounting, settlement or tax — for those, use the exact rate your bank gives you at the time of the transaction.' },
        ],
      },
      ja: {
        title: '仲値・電信買相場・現金売相場の違いとは',
        desc: '同じ通貨ペアなのに、なぜ銀行は四つも五つもレートを提示するのでしょうか。仲値、買相場、売相場、そして電信と現金の違いと、換算に使うべきレートを解説します。',
        body: [
          { h: '仲値：最も公平な数字', p: '仲値は銀行間市場の買相場と売相場の中間値で、「今この通貨が本当にいくらの価値か」を示すものと考えてください。小売のマージンを含まないため、多くの公表レート表がこの数字を採用し、為替のトレンドを見る際の最適な基準でもあります。当サイトの換算ツールも仲値を使用しているため、銀行で実際に提示されるレートよりやや良い結果になります。' },
          { h: '買相場と売相場：方向が重要', p: '銀行の提示には必ず二つの側があります。買相場（ビッド）は銀行があなたから外貨を買う価格、売相場（アスク）は銀行があなたに外貨を売る価格です。この差が銀行の収益源であり、一般にスプレッドと呼ばれます。重要なのは、方向が銀行側の視点で表現されている点です。あなたが両替に行くとき、実際には外貨を「買う」行為なので適用されるのは売相場、つまり仲値より不利な価格です。' },
          { h: 'なぜ電信と現金で異なるのか', p: '電信（電信送金）は口座内の電子マネー、現金は物理的な紙幣を指します。銀行が紙幣を扱うには輸送、保管、保険、損傷券の回収といったコストがかかるため、現金相場は電信相場より不利になるのが通常です。旅行用の現金を両替するなら現金相場で見積もり、跨境送金やカード決済であれば電信相場を参照するほうが正確です。' },
          { h: 'カードにはもう一層コストが乗る', p: '海外でカードを利用すると、為替レート本体に加えて二つの費用が重なる可能性があります。一つはVisaやMastercardなどの国際ブランドの清算レートで、仲値に近いもののわずかな上乗せがあります。もう一つは発行体が徴収する外国通貨取引手数料で、一般に取引金額の1%〜1.5%です。実効レートは「ブランドレート ×（1 + 手数料率）」となります。加盟店が提案する「ダイナミック通貨変換」で自国通貨建て決済を選ぶと、多くの場合レートが不利になるため、現地通貨建てを選ぶのが一般的に有利です。' },
          { h: 'なぜ金融機関によってレートが違うのか', p: '同じ瞬間でも、銀行やプラットフォームによって提示レートはわずかに異なります。要因は単純で、価格決定のタイミング、上乗せ方針、在庫ポジションがそれぞれ異なるためです。これは正常な現象であり、誰かが誤ったレートを公表しているわけではありません。高額の送金であれば複数を比較する価値がありますが、日常的な少額であれば差は通常無視できます。' },
          { h: '当サイトの換算ツールの位置づけ', p: '当サイトが提供するのは仲値に基づく簡易な見積もりであり、旅行前の予算取り、外国の請求書のおおよその金額把握、為替の大局的な方向性の確認に適しています。記帳、決済、税務の根拠にはできません。それらの場面では、実際に取引した時点で銀行が提示した正確なレートを使用してください。' },
        ],
      },
      es: {
        title: 'Tipo medio, de compra y de venta: ¿cuál es la diferencia?',
        desc: '¿Por qué un banco ofrece cuatro o cinco tipos para el mismo par de divisas? Una guía clara sobre el tipo medio, el bid, el ask y las diferencias entre efectivo y transferencia.',
        body: [
          { h: 'El tipo medio: la cifra más justa', p: 'El tipo medio es el punto intermedio entre los precios de compra y de venta en el mercado interbancario; en la práctica, lo que una divisa vale realmente en ese momento. No lleva recargo minorista, y por eso la mayoría de las tablas públicas de tipos lo utilizan y es la referencia adecuada para seguir una tendencia. El conversor de este sitio usa el tipo medio, de modo que su resultado será ligeramente mejor que el que un banco le dé realmente.' },
          { h: 'Compra y venta: la dirección importa', p: 'Un banco siempre cotiza dos lados. El bid es el precio al que el banco le compra divisa extranjera; el ask es el precio al que se la vende. La diferencia entre ambos es el margen del banco, conocido como spread. Y lo crucial: la dirección se expresa desde la perspectiva del banco. Cuando usted va a cambiar dinero, en realidad está comprando divisa extranjera, así que se aplica el ask, que es peor que el tipo medio.' },
          { h: 'Por qué el efectivo difiere de la transferencia', p: 'El tipo electrónico se aplica al dinero depositado en una cuenta; el tipo de efectivo se aplica a los billetes físicos. Manipular billetes conlleva costes de transporte, custodia, seguro y retirada de billetes deteriorados, de modo que el tipo de efectivo suele ser menos favorable. Si va a comprar dinero para un viaje, calcule con el tipo de efectivo. Si va a hacer una transferencia o a pagar con tarjeta, el tipo electrónico es la guía más precisa.' },
          { h: 'Las tarjetas añaden otra capa', p: 'Gastar en el extranjero con tarjeta puede implicar dos costes además del propio tipo. Primero, el tipo de liquidación de la red de tarjetas: Visa y Mastercard suelen situarse cerca del tipo medio, pero con un pequeño margen. Segundo, la comisión por transacción en divisa extranjera del banco emisor, normalmente entre el 1% y el 1,5% del importe. El tipo efectivo es el tipo de la red multiplicado por uno más la comisión. Algunos comercios ofrecen conversión dinámica de divisa, facturándole en su moneda local; esa conversión suele ser peor, y elegir la divisa local es en general la mejor opción.' },
          { h: 'Por qué las cotizaciones difieren entre proveedores', p: 'Incluso en el mismo instante, distintos bancos y plataformas cotizan tipos ligeramente distintos. Las causas son mundanas: momentos de fijación diferentes, políticas de margen distintas y posiciones de inventario variables. Es normal y no significa que nadie haya publicado un error. Para transferencias grandes conviene comparar varios proveedores; para importes pequeños del día a día, la diferencia rara vez importa.' },
          { h: 'Para qué sirve este conversor', p: 'El conversor de aquí ofrece una estimación rápida basada en el tipo medio. Sirve para presupuestar antes de un viaje, calcular aproximadamente cuánto cuesta una factura extranjera o seguir la dirección general de un tipo. No es una base para contabilidad, liquidación ni fiscalidad: para eso, use el tipo exacto que su banco le dé en el momento de la operación.' },
        ],
      },
      fr: {
        title: 'Taux moyen, achat et vente : quelle est la différence ?',
        desc: 'Pourquoi une banque affiche-t-elle quatre ou cinq taux pour la même paire de devises ? Un guide clair du taux moyen, du bid, de l\'ask et de la différence entre espèces et électronique.',
        body: [
          { h: 'Le taux moyen : le chiffre le plus juste', p: 'Le taux moyen est le point médian entre les cours acheteur et vendeur sur le marché interbancaire : en pratique, ce que la devise vaut réellement à cet instant. Il ne comporte aucune majoration de détail, ce qui explique pourquoi la plupart des tables de taux publiées l\'utilisent et pourquoi il est la bonne référence pour suivre une tendance. Le convertisseur de ce site utilise le taux moyen : son résultat sera donc légèrement meilleur que ce qu\'une banque vous accordera réellement.' },
          { h: 'Achat et vente : le sens compte', p: 'Une banque affiche toujours deux côtés. Le bid est le prix auquel la banque vous achète la devise étrangère ; l\'ask est le prix auquel elle vous la vend. L\'écart entre les deux est la marge de la banque, appelée spread. Et le point crucial : le sens est exprimé du point de vue de la banque. Lorsque vous allez changer de l\'argent, vous êtes en réalité en train d\'acheter de la devise étrangère : c\'est donc l\'ask qui s\'applique, et il est moins favorable que le taux moyen.' },
          { h: 'Pourquoi les espèces diffèrent de l\'électronique', p: 'Le taux électronique s\'applique à l\'argent détenu sur un compte ; le taux espèces s\'applique aux billets physiques. La manipulation des billets entraîne des coûts de transport, de garde, d\'assurance et de retrait des coupures détériorées : le taux espèces est donc normalement moins favorable. Si vous achetez de l\'argent pour un voyage, estimez avec le taux espèces. Si vous effectuez un virement ou payez par carte, le taux électronique est le guide le plus précis.' },
          { h: 'Les cartes ajoutent une couche supplémentaire', p: 'Dépenser à l\'étranger avec une carte peut impliquer deux coûts en plus du taux lui-même. D\'abord, le taux de compensation du réseau de cartes : Visa et Mastercard se situent généralement près du taux moyen, mais avec une petite marge. Ensuite, la commission pour transaction en devise étrangère prélevée par la banque émettrice, souvent de 1 % à 1,5 % du montant. Le taux effectif est donc le taux du réseau multiplié par un plus la commission. Certains commerçants proposent la conversion dynamique de devise, qui vous facture dans votre monnaie nationale ; cette conversion est généralement moins bonne, et choisir la devise locale est en principe préférable.' },
          { h: 'Pourquoi les cotations diffèrent selon les prestataires', p: 'Même au même instant, différentes banques et plateformes affichent des taux légèrement différents. Les causes sont ordinaires : moments de fixation distincts, politiques de marge différentes et positions de stock variées. C\'est normal et ne signifie pas que quelqu\'un a publié une erreur. Pour des transferts importants, comparer quelques prestataires en vaut la peine ; pour de petits montants courants, la différence importe rarement.' },
          { h: 'À quoi sert ce convertisseur', p: 'Le convertisseur présenté ici fournit une estimation rapide fondée sur le taux moyen. Il convient pour établir un budget avant un voyage, évaluer approximativement le coût d\'une facture étrangère ou suivre la direction générale d\'un taux. Il ne constitue pas une base pour la comptabilité, le règlement ou la fiscalité : pour ces usages, utilisez le taux exact que votre banque vous accorde au moment de l\'opération.' },
        ],
      },
      de: {
        title: 'Mittelkurs, Ankaufs- und Verkaufskurs: Wo liegt der Unterschied?',
        desc: 'Warum nennt eine Bank vier oder fünf Kurse für dasselbe Währungspaar? Eine verständliche Erklärung von Mittelkurs, Geld- und Briefkurs sowie von Bargeld- und Buchgeldkursen.',
        body: [
          { h: 'Der Mittelkurs: die fairste einzelne Zahl', p: 'Der Mittelkurs ist der Mittelwert aus Geld- und Briefkurs im Interbankenmarkt – praktisch das, was eine Währung in diesem Moment tatsächlich wert ist. Er enthält keinen Einzelhandelsaufschlag, weshalb ihn die meisten öffentlichen Kurstabellen verwenden und weshalb er die richtige Referenz für die Beobachtung einer Tendenz ist. Der Rechner auf dieser Seite nutzt den Mittelkurs, sein Ergebnis ist daher etwas besser als das, was eine Bank Ihnen tatsächlich gibt.' },
          { h: 'Geld- und Briefkurs: die Richtung zählt', p: 'Eine Bank stellt immer zwei Seiten. Der Geldkurs ist der Preis, zu dem die Bank Fremdwährung von Ihnen kauft; der Briefkurs der Preis, zu dem sie Ihnen Fremdwährung verkauft. Die Differenz ist die Marge der Bank, bekannt als Spanne. Entscheidend ist: Die Richtung wird aus Sicht der Bank angegeben. Wenn Sie Geld wechseln gehen, kaufen Sie tatsächlich Fremdwährung – es gilt also der Briefkurs, und der ist schlechter als der Mittelkurs.' },
          { h: 'Warum Bargeld anders ist als Buchgeld', p: 'Der Buchgeldkurs gilt für Geld auf einem Konto, der Bargeldkurs für physische Scheine. Der Umgang mit Banknoten verursacht Kosten für Transport, Lagerung, Versicherung und den Rücklauf beschädigter Scheine, daher ist der Bargeldkurs meist ungünstiger. Wenn Sie Reisegeld kaufen, kalkulieren Sie mit dem Bargeldkurs. Bei einer Überweisung oder Kartenzahlung ist der Buchgeldkurs die genauere Orientierung.' },
          { h: 'Karten fügen eine weitere Ebene hinzu', p: 'Beim Bezahlen mit Karte im Ausland können zum Kurs selbst zwei Kosten hinzukommen. Erstens der Abrechnungskurs des Kartennetzwerks: Visa und Mastercard liegen meist nah am Mittelkurs, aber mit kleinem Aufschlag. Zweitens die Fremdwährungsgebühr der herausgebenden Bank, oft 1 % bis 1,5 % des Betrags. Der effektive Kurs ist also der Netzwerkkurs multipliziert mit eins plus Gebühr. Manche Händler bieten die dynamische Währungsumrechnung an und rechnen in Ihrer Heimatwährung ab; diese Umrechnung ist meist schlechter, die Wahl der Landeswährung ist daher in der Regel vorteilhafter.' },
          { h: 'Warum die Kurse der Anbieter abweichen', p: 'Selbst im selben Moment notieren verschiedene Banken und Plattformen leicht unterschiedliche Kurse. Die Gründe sind banal: unterschiedliche Preiszeitpunkte, verschiedene Margenpolitiken und variierende Bestandspositionen. Das ist normal und bedeutet nicht, dass jemand einen Fehler veröffentlicht hätte. Bei großen Überweisungen lohnt der Vergleich mehrerer Anbieter; bei kleinen Alltagsbeträgen fällt der Unterschied kaum ins Gewicht.' },
          { h: 'Wofür dieser Rechner gedacht ist', p: 'Der Rechner hier liefert eine schnelle Schätzung auf Basis des Mittelkurses. Er passt für die Urlaubsplanung, um grob zu überschlagen, was eine ausländische Rechnung kostet, oder um die allgemeine Richtung eines Kurses zu verfolgen. Als Grundlage für Buchführung, Abrechnung oder Steuer taugt er nicht – verwenden Sie dort den exakten Kurs, den Ihre Bank Ihnen zum Zeitpunkt der Transaktion nennt.' },
        ],
      },
      pt: {
        title: 'Taxa média, de compra e de venda: qual é a diferença?',
        desc: 'Por que um banco apresenta quatro ou cinco taxas para o mesmo par de moedas? Um guia claro sobre a taxa média, o bid, o ask e a diferença entre dinheiro e eletrônico.',
        body: [
          { h: 'A taxa média: o número mais justo', p: 'A taxa média é o ponto médio entre os preços de compra e de venda no mercado interbancário — na prática, o que uma moeda realmente vale naquele momento. Ela não traz margem de varejo, e é por isso que a maioria das tabelas públicas de taxas a utiliza e por que ela é a referência correta para acompanhar uma tendência. O conversor deste site usa a taxa média, portanto seu resultado será ligeiramente melhor do que o que um banco realmente lhe dá.' },
          { h: 'Compra e venda: a direção importa', p: 'Um banco sempre apresenta dois lados. O bid é o preço pelo qual o banco compra moeda estrangeira de você; o ask é o preço pelo qual ele lhe vende. A diferença entre os dois é a margem do banco, conhecida como spread. E o ponto crucial: a direção é expressa da perspectiva do banco. Quando você vai trocar dinheiro, na verdade está comprando moeda estrangeira, então aplica-se o ask, que é pior que a taxa média.' },
          { h: 'Por que dinheiro difere de eletrônico', p: 'A taxa eletrônica se aplica ao dinheiro mantido em conta; a taxa de dinheiro em espécie se aplica às cédulas físicas. Manusear cédulas acarreta custos de transporte, guarda, seguro e recolhimento de notas danificadas, de modo que a taxa em espécie costuma ser menos favorável. Se você vai comprar dinheiro para uma viagem, estime com a taxa em espécie. Se fará uma transferência ou pagará com cartão, a taxa eletrônica é o guia mais preciso.' },
          { h: 'Cartões acrescentam mais uma camada', p: 'Gastar no exterior com cartão pode envolver dois custos além da própria taxa. Primeiro, a taxa de liquidação da rede de cartões: Visa e Mastercard costumam ficar perto da taxa média, mas com uma pequena margem. Segundo, a taxa de transação em moeda estrangeira cobrada pelo banco emissor, frequentemente de 1% a 1,5% do valor. A taxa efetiva é a taxa da rede multiplicada por um mais a tarifa. Alguns estabelecimentos oferecem conversão dinâmica de moeda, cobrando você em sua moeda local; essa conversão costuma ser pior, e escolher a moeda local é em geral a melhor opção.' },
          { h: 'Por que as cotações diferem entre provedores', p: 'Mesmo no mesmo instante, bancos e plataformas diferentes cotam taxas ligeiramente distintas. As causas são simples: momentos de precificação distintos, políticas de margem diferentes e posições de estoque variadas. Isso é normal e não significa que alguém tenha publicado um erro. Para transferências grandes, vale comparar alguns provedores; para valores pequenos do dia a dia, a diferença raramente importa.' },
          { h: 'Para que serve este conversor', p: 'O conversor aqui oferece uma estimativa rápida com base na taxa média. Serve para orçar antes de uma viagem, calcular aproximadamente quanto custa uma conta estrangeira ou acompanhar a direção geral de uma taxa. Não é base para contabilidade, liquidação ou fins fiscais: para isso, use a taxa exata que seu banco lhe dá no momento da operação.' },
        ],
      },
    },
  },

  /* ================================================================
     5 — Refinery yield
     ================================================================ */
  {
    slug: 'what-one-barrel-produces',
    cat: 'oil',
    date: '2026-10-09',
    readMin: 5,
    i18n: {
      zh: {
        title: '一桶原油能炼出多少汽油？',
        desc: '油价涨跌到底怎样传导到加油站？本文用炼厂产出结构解释一桶原油的去向，以及为什么国际油价下跌时零售油价总是"慢半拍"。',
        body: [
          { h: '一桶有多大', p: '先明确单位：一桶原油等于 42 美加仑，约 159 升。这是石油行业沿用至今的计量标准。不过炼油不是简单的"等量分装"——原油进入常减压装置后按沸点被分离成不同组分，再经过催化裂化、加氢等二次加工，最终产出结构完全取决于原油品质和炼厂配置。' },
          { h: '典型产出结构', p: '以一座配置完整的现代炼厂加工轻质低硫原油为例，一桶原油大致产出的比例是：汽油约 45%，柴油与取暖油约 25%，航空煤油约 8%，液化石油气与其他轻烃约 5%，重质燃料油与沥青等残余物约 10%，其余为石化原料和加工损耗。也就是说，一桶 159 升原油大约能产出 70 升左右的汽油，比很多人直觉认为的"几乎全是汽油"要少不少。' },
          { h: '为什么不是固定数字', p: '这个比例会随三个因素变化。一是原油品质：重质高硫原油的轻质组分少，汽油收率明显更低。二是炼厂配置：拥有深度催化裂化、焦化装置的炼厂能把更多重质组分转化为轻质油品，收率更高。三是季节与市场需求：夏季汽油需求旺盛，炼厂会调整操作提高汽油收率；冬季则偏向柴油和取暖油。所以"一桶出多少汽油"没有唯一答案，只能给典型区间。' },
          { h: '原油成本占油价的多少', p: '在完全市场化的成品油定价体系里，原油成本通常占汽油零售价的 50%~65%，其余是炼制成本、运输配送、税费和加油站利润。其中税费在许多国家占比很高——欧洲部分国家的燃油税占到零售价一半以上。这个结构解释了一个常见困惑：为什么国际油价跌三成，加油站价格只跌一成？因为下跌只作用在原油成本这一部分，税费和下游成本是刚性的。' },
          { h: '"慢半拍"的传导', p: '国际原油价格变化传导到零售端通常有两到四周的滞后，原因是多重的：炼厂采购的是先前订购的原油，库存成本尚未反映最新价格；成品油批发合同有既定周期；在实行调价机制的国家，调价本身就有固定周期。因此看到原油大涨就预期加油站立刻跟涨，或原油大跌就预期立刻跟跌，都不符合实际的传导节奏。' },
          { h: '这对看油价有什么用', p: '理解了产出结构和成本构成，看油价时会更从容：原油价格只是成品油成本的一部分，且有传导滞后；零售价里税费占比往往很大。本站提供的原油与成品油价格可以对照着看——跟踪原油判断趋势，查看各省成品油指导价了解当前实际水平，两者结合比单看一个数字更有参考价值。' },
        ],
      },
      en: {
        title: 'How Much Gasoline Does One Barrel of Crude Produce?',
        desc: 'How does a move in crude actually reach the pump? A look at refinery yields, what a barrel becomes, and why retail fuel prices lag the crude price.',
        body: [
          { h: 'How big a barrel is', p: 'First, the unit: one barrel is 42 US gallons, about 159 litres, a standard the industry has kept ever since. But refining is not a matter of pouring the same liquid into smaller containers. Crude enters the distillation unit and is separated by boiling point into fractions, which then undergo secondary processing such as catalytic cracking and hydrotreating. What comes out depends on both the quality of the crude and the configuration of the refinery.' },
          { h: 'A typical yield', p: 'For a well-equipped modern refinery running light sweet crude, a barrel comes out roughly as follows: about 45% gasoline, around 25% diesel and heating oil, roughly 8% jet fuel, about 5% liquefied petroleum gas and other light ends, around 10% residual fuel oil and bitumen, with the remainder split between petrochemical feedstocks and processing losses. In other words, 159 litres of crude yields somewhere around 70 litres of gasoline — noticeably less than the intuition that a barrel is almost entirely petrol.' },
          { h: 'Why there is no single number', p: 'The split moves with three things. Crude quality: heavy sour crude contains fewer light fractions, so the gasoline yield is materially lower. Refinery configuration: plants with deep catalytic cracking or coking units convert more of the heavy residue into light products and achieve higher yields. Season and demand: in summer, when gasoline demand peaks, refineries tune operations toward more gasoline; in winter they shift toward diesel and heating oil. So there is no fixed answer, only a typical range.' },
          { h: 'How much of the pump price is crude', p: 'In a fully market-based pricing system, crude typically accounts for 50% to 65% of the retail gasoline price. The rest is refining cost, distribution, taxes and the retailer\'s margin. Taxes can be substantial — in some European countries fuel duty makes up more than half the retail price. This structure explains a familiar puzzle: when crude falls by 30%, pump prices often fall by only around 10%, because the decline applies solely to the crude component while taxes and downstream costs stay fixed.' },
          { h: 'Why the pass-through lags', p: 'It usually takes two to four weeks for a change in crude to reach the pump. Refiners are processing crude bought earlier, so inventory costs do not yet reflect the latest price; wholesale contracts run on set cycles; and in countries with an administered mechanism, the adjustment itself happens on a fixed schedule. Expecting the pump to jump the moment crude rises, or fall the moment it drops, does not match how the chain actually works.' },
          { h: 'What this means when you read prices', p: 'Understanding yields and cost structure makes the numbers easier to interpret: crude is only part of the retail cost, and the pass-through lags; taxes often loom large in the final price. The crude and fuel figures here can be read together — follow crude for the trend, and check provincial fuel guidance for the current retail level. Used together they are more informative than either number alone.' },
        ],
      },
      ja: {
        title: '原油1バレルからガソリンはどれだけ取れるか',
        desc: '原油価格の変動はどのように給油所へ伝わるのでしょうか。製油所の製品構成から原油1バレルの行方と、国際価格が下がっても小売価格が「遅れて」動く理由を解説します。',
        body: [
          { h: '1バレルはどれだけの量か', p: 'まず単位の確認です。原油1バレルは42米ガロン、約159リットルで、業界が現在も使い続けている標準です。しかし精製は同じ液体を小分けする作業ではありません。原油は蒸留装置に入ると沸点によって留分に分離され、その後、接触分解や水素化処理といった二次加工を経ます。最終的な製品構成は原油の品質と製油所の設備構成の両方で決まります。' },
          { h: '典型的な製品構成', p: '軽質スイート原油を処理する設備の整った近代的製油所の場合、1バレルのおおよその内訳は次のとおりです。ガソリン約45%、軽油・暖房油約25%、ジェット燃料約8%、LPGその他の軽質留分約5%、重質燃料油やアスファルトなどの残さ約10%、残りが石油化学原料と加工ロスです。つまり原油159リットルから得られるガソリンは70リットル前後であり、「1バレルはほとんどガソリン」という直感的な印象よりかなり少ないのが実態です。' },
          { h: 'なぜ一定の数字にならないのか', p: 'この内訳は三つの要因で変わります。第一に原油の品質です。重質・高硫黄原油は軽質留分が少なく、ガソリン収率は明確に低くなります。第二に製油所の設備です。深度接触分解装置やコーカーを持つ製油所は重質残さをより多く軽質油品に転換でき、収率が高くなります。第三に季節と需要です。夏はガソリン需要が強いため操業をガソリン寄りに調整し、冬は軽油や暖房油に振り向けます。したがって「1バレルからガソリンが何リットル」に唯一の答えはなく、典型的なレンジを示すしかありません。' },
          { h: 'ガソリン価格のうち原油コストはどれくらいか', p: '完全に市場化された成品油価格体系では、原油コストはガソリン小売価格の通常50%〜65%を占めます。残りは精製コスト、輸送・配送、税金、給油所の利益です。税金の比率は国によって高く、欧州の一部では燃料税が小売価格の半分以上を占めます。この構造が「なぜ国際原油価格が3割下落しても給油所価格は1割しか下がらないのか」という疑問に答えます。下落は原油コスト部分にだけ作用し、税金と下流コストは固定的だからです。' },
          { h: '「遅れて」伝わる理由', p: '国際原油価格の変動が小売に波及するまでには、通常2〜4週間の遅れがあります。理由は重層的です。製油所は先に調達した原油を処理しているため、在庫コストに最新価格がまだ反映されていないこと、成品油の卸契約には所定の周期があること、そして価格調整メカニズムを採用している国では調整そのものが一定周期で行われることです。原油が大きく上昇したからといって給油所が即座に追随すると期待するのも、大きく下落したからといって即座に下がると期待するのも、実際の伝達のリズムとは一致しません。' },
          { h: '価格を見るときにどう役立つか', p: '製品構成とコスト構造を理解すると、価格の見方が落ち着いたものになります。原油価格は成品油コストの一部にすぎず、波及には遅れがあること、そして小売価格に占める税金の割合は往々にして大きいことです。当サイトの原油価格と成品油価格は併せて参照できます。トレンドは原油で追い、現在の実際の水準は各省の成品油指導価格で確認する、という二つの使い分けが、どちらか一つを見るより参考になります。' },
        ],
      },
      es: {
        title: '¿Cuánta gasolina se obtiene de un barril de crudo?',
        desc: '¿Cómo llega un movimiento del crudo hasta el surtidor? Un vistazo a los rendimientos de refinería, en qué se convierte un barril y por qué los precios minoristas van por detrás del crudo.',
        body: [
          { h: 'Cuánto mide un barril', p: 'Primero, la unidad: un barril son 42 galones estadounidenses, unos 159 litros, un estándar que la industria ha mantenido desde siempre. Pero refinar no consiste en verter el mismo líquido en envases más pequeños. El crudo entra en la unidad de destilación y se separa por punto de ebullición en fracciones, que después pasan por procesos secundarios como el craqueo catalítico y el hidrotratamiento. Lo que sale depende tanto de la calidad del crudo como de la configuración de la refinería.' },
          { h: 'Un rendimiento típico', p: 'Para una refinería moderna bien equipada que procesa crudo ligero y dulce, un barril se reparte aproximadamente así: en torno al 45% de gasolina, alrededor del 25% de diésel y fuelóleo de calefacción, un 8% de queroseno de aviación, un 5% de GLP y otros ligeros, un 10% de fuelóleo pesado y betún, y el resto repartido entre materias primas petroquímicas y pérdidas de proceso. Es decir, 159 litros de crudo rinden unos 70 litros de gasolina, bastante menos de lo que sugiere la intuición de que un barril es casi todo gasolina.' },
          { h: 'Por qué no hay una cifra única', p: 'El reparto se mueve con tres factores. La calidad del crudo: el crudo pesado y ácido contiene menos fracciones ligeras, así que el rendimiento de gasolina es sensiblemente menor. La configuración de la refinería: las plantas con craqueo catalítico profundo o coquización convierten más residuo pesado en productos ligeros y logran mayores rendimientos. La estación y la demanda: en verano, cuando la demanda de gasolina alcanza su máximo, las refinerías ajustan la operación hacia más gasolina; en invierno se orientan al diésel y al fuelóleo de calefacción. De modo que no hay una única respuesta, solo un rango típico.' },
          { h: 'Cuánto del precio del surtidor es crudo', p: 'En un sistema de precios de carburantes plenamente de mercado, el crudo representa normalmente entre el 50% y el 65% del precio minorista de la gasolina. El resto es coste de refino, distribución, impuestos y margen del minorista. Los impuestos pueden ser muy elevados: en algunos países europeos el impuesto sobre los carburantes supone más de la mitad del precio final. Esta estructura explica un desconcierto habitual: cuando el crudo cae un 30%, los precios en el surtidor suelen caer solo en torno a un 10%, porque la bajada afecta únicamente al componente del crudo, mientras los impuestos y los costes intermedios se mantienen fijos.' },
          { h: 'Por qué el traspaso se retrasa', p: 'Normalmente tardan de dos a cuatro semanas en que un cambio en el crudo llegue al surtidor. Los motivos son varios: las refinerías están procesando crudo comprado antes, de modo que sus costes de inventario aún no reflejan el precio más reciente; los contratos mayoristas de carburantes funcionan con ciclos establecidos; y en los países con un mecanismo administrado, el ajuste mismo ocurre según un calendario fijo. Esperar que el surtidor suba en el momento en que sube el crudo, o baje en el momento en que baja, no concuerda con el funcionamiento real de la cadena.' },
          { h: 'Qué aporta esto al leer los precios', p: 'Entender la estructura de rendimientos y de costes hace que las cifras se interpreten con más calma: el crudo es solo una parte del coste del carburante y el traspaso se retrasa; los impuestos suelen pesar mucho en el precio final. Las cifras de crudo y de carburantes de este sitio pueden leerse en conjunto: siga el crudo para la tendencia y consulte los precios de referencia provinciales para conocer el nivel minorista actual. Usadas juntas, son más informativas que cualquiera de las dos por separado.' },
        ],
      },
      fr: {
        title: 'Combien d\'essence produit-on à partir d\'un baril de brut ?',
        desc: 'Comment une variation du brut atteint-elle la pompe ? Un regard sur les rendements de raffinage, sur ce que devient un baril et sur le décalage des prix de détail.',
        body: [
          { h: 'Quelle est la taille d\'un baril', p: 'D\'abord l\'unité : un baril représente 42 gallons américains, soit environ 159 litres, un standard que l\'industrie a conservé depuis toujours. Mais le raffinage ne consiste pas à verser le même liquide dans des contenants plus petits. Le brut entre dans l\'unité de distillation et est séparé par point d\'ébullition en fractions, qui subissent ensuite des traitements secondaires comme le craquage catalytique et l\'hydrotraitement. Ce qui sort dépend à la fois de la qualité du brut et de la configuration de la raffinerie.' },
          { h: 'Un rendement typique', p: 'Pour une raffinerie moderne bien équipée traitant du brut léger et doux, un baril se répartit approximativement ainsi : environ 45 % d\'essence, autour de 25 % de gazole et de fioul domestique, environ 8 % de kérosène, environ 5 % de GPL et autres produits légers, autour de 10 % de fioul lourd et de bitume, le reste se partageant entre charges pétrochimiques et pertes de procédé. Autrement dit, 159 litres de brut donnent quelque 70 litres d\'essence, nettement moins que l\'intuition selon laquelle un baril serait presque entièrement de l\'essence.' },
          { h: 'Pourquoi il n\'y a pas de chiffre unique', p: 'La répartition varie selon trois facteurs. La qualité du brut : un brut lourd et acide contient moins de fractions légères, le rendement en essence est donc sensiblement plus faible. La configuration de la raffinerie : les installations dotées de craquage catalytique poussé ou de cokéfaction convertissent davantage de résidus lourds en produits légers et atteignent de meilleurs rendements. La saison et la demande : en été, lorsque la demande d\'essence culmine, les raffineurs orientent l\'exploitation vers plus d\'essence ; en hiver, ils privilégient le gazole et le fioul domestique. Il n\'existe donc pas de réponse unique, seulement une fourchette typique.' },
          { h: 'Quelle part du prix à la pompe représente le brut', p: 'Dans un système de prix des carburants pleinement de marché, le brut représente généralement de 50 % à 65 % du prix de détail de l\'essence. Le reste se répartit entre coût de raffinage, distribution, taxes et marge du détaillant. Les taxes peuvent être substantielles : dans certains pays européens, la taxe sur les carburants représente plus de la moitié du prix de vente. Cette structure explique une interrogation courante : lorsque le brut recule de 30 %, les prix à la pompe ne baissent souvent que d\'environ 10 %, parce que la baisse ne s\'applique qu\'à la composante brute, tandis que les taxes et les coûts en aval restent fixes.' },
          { h: 'Pourquoi la transmission tarde', p: 'Il faut généralement deux à quatre semaines pour qu\'une variation du brut atteigne la pompe. Les raisons sont multiples : les raffineurs traitent du brut acheté plus tôt, si bien que leurs coûts de stock ne reflètent pas encore le dernier prix ; les contrats de gros de carburants fonctionnent selon des cycles établis ; et dans les pays dotés d\'un mécanisme administré, l\'ajustement lui-même intervient selon un calendrier fixe. Attendre que la pompe bondisse dès que le brut monte, ou qu\'elle baisse dès qu\'il recule, ne correspond pas au rythme réel de la chaîne.' },
          { h: 'Ce que cela apporte à la lecture des prix', p: 'Comprendre la structure des rendements et des coûts rend les chiffres plus faciles à interpréter : le brut n\'est qu\'une partie du coût du carburant et sa transmission est différée ; les taxes pèsent souvent lourdement dans le prix final. Les chiffres du brut et des carburants présentés ici peuvent être lus ensemble : suivez le brut pour la tendance, et consultez les prix indicatifs provinciaux pour connaître le niveau de détail actuel. Utilisées conjointement, ces deux données sont plus instructives que l\'une ou l\'autre isolément.' },
        ],
      },
      de: {
        title: 'Wie viel Benzin liefert ein Barrel Rohöl?',
        desc: 'Wie erreicht eine Rohölbewegung eigentlich die Zapfsäule? Ein Blick auf Raffinerieausbeuten, woraus ein Barrel wird und warum die Einzelhandelspreise dem Rohöl hinterherhinken.',
        body: [
          { h: 'Wie groß ein Barrel ist', p: 'Zunächst die Einheit: Ein Barrel sind 42 US-Gallonen, etwa 159 Liter – ein Standard, den die Branche bis heute beibehalten hat. Raffinieren bedeutet aber nicht, dieselbe Flüssigkeit in kleinere Behälter umzufüllen. Das Rohöl gelangt in die Destillationsanlage und wird nach Siedepunkt in Fraktionen getrennt, die anschließend sekundäre Verfahren wie katalytisches Cracken und Hydrotreating durchlaufen. Was herauskommt, hängt sowohl von der Rohölqualität als auch von der Konfiguration der Raffinerie ab.' },
          { h: 'Eine typische Ausbeute', p: 'Für eine gut ausgestattete moderne Raffinerie, die leichtes, süßes Rohöl verarbeitet, teilt sich ein Barrel etwa so auf: rund 45 % Benzin, etwa 25 % Diesel und Heizöl, rund 8 % Kerosin, etwa 5 % Flüssiggas und andere Leichtprodukte, rund 10 % schweres Heizöl und Bitumen, der Rest verteilt sich auf petrochemische Einsatzstoffe und Prozessverluste. Mit anderen Worten: Aus 159 Litern Rohöl entstehen irgendwo um 70 Liter Benzin – deutlich weniger, als die Intuition „ein Barrel ist fast nur Benzin“ vermuten lässt.' },
          { h: 'Warum es keine feste Zahl gibt', p: 'Die Aufteilung verschiebt sich mit drei Faktoren. Rohölqualität: Schweres, saures Rohöl enthält weniger leichte Fraktionen, die Benzinausbeute ist deutlich geringer. Raffineriekonfiguration: Anlagen mit tiefem katalytischem Cracken oder Cokern wandeln mehr schweren Rückstand in Leichtprodukte um und erreichen höhere Ausbeuten. Saison und Nachfrage: Im Sommer, wenn die Benzinnachfrage ihren Höhepunkt erreicht, fahren Raffinerien die Anlage auf mehr Benzin; im Winter verschieben sie Richtung Diesel und Heizöl. Es gibt also keine eindeutige Antwort, nur einen typischen Bereich.' },
          { h: 'Wie viel des Zapfsäulenpreises Rohöl ist', p: 'In einem vollständig marktbasierten Kraftstoffpreissystem macht Rohöl typischerweise 50 % bis 65 % des Benzin-Einzelhandelspreises aus. Der Rest sind Raffinationskosten, Vertrieb, Steuern und die Marge des Händlers. Steuern können erheblich sein – in manchen europäischen Ländern macht die Kraftstoffsteuer mehr als die Hälfte des Endpreises aus. Diese Struktur erklärt ein vertrautes Rätsel: Fällt das Rohöl um 30 %, sinken die Zapfsäulenpreise oft nur um rund 10 %, weil der Rückgang ausschließlich auf die Rohölkomponente wirkt, während Steuern und nachgelagerte Kosten fest bleiben.' },
          { h: 'Warum die Weitergabe verzögert ist', p: 'Bis eine Rohöländerung an der Zapfsäule ankommt, vergehen meist zwei bis vier Wochen. Die Gründe sind mehrschichtig: Raffinerien verarbeiten früher gekauftes Rohöl, ihre Bestandskosten spiegeln also noch nicht den neuesten Preis; Großhandelsverträge für Kraftstoffe laufen in festen Zyklen; und in Ländern mit administriertem Mechanismus erfolgt die Anpassung selbst nach einem festen Zeitplan. Zu erwarten, die Zapfsäule springe sofort an, wenn Rohöl steigt, oder falle sofort, wenn es sinkt, entspricht nicht dem tatsächlichen Rhythmus der Kette.' },
          { h: 'Was das beim Lesen der Preise bringt', p: 'Wer Ausbeute- und Kostenstruktur versteht, liest die Zahlen gelassener: Rohöl ist nur ein Teil der Kraftstoffkosten, und die Weitergabe verzögert sich; Steuern machen im Endpreis oft einen großen Anteil aus. Die Rohöl- und Kraftstoffwerte hier lassen sich gemeinsam lesen: Verfolgen Sie das Rohöl für die Tendenz und prüfen Sie die provinziellen Richtpreise für das aktuelle Einzelhandelsniveau. Zusammen genutzt sind sie aussagekräftiger als jede Zahl für sich.' },
        ],
      },
      pt: {
        title: 'Quanta gasolina se produz a partir de um barril de petróleo?',
        desc: 'Como um movimento do petróleo bruto chega até a bomba? Um olhar sobre os rendimentos de refino, no que se transforma um barril e por que os preços de varejo ficam atrás do preço do bruto.',
        body: [
          { h: 'Quanto mede um barril', p: 'Primeiro, a unidade: um barril equivale a 42 galões americanos, cerca de 159 litros, um padrão que a indústria mantém até hoje. Mas refinar não é despejar o mesmo líquido em recipientes menores. O bruto entra na unidade de destilação e é separado por ponto de ebulição em frações, que depois passam por processos secundários como craqueamento catalítico e hidrotratamento. O que sai depende tanto da qualidade do bruto quanto da configuração da refinaria.' },
          { h: 'Um rendimento típico', p: 'Para uma refinaria moderna bem equipada processando bruto leve e doce, um barril se distribui aproximadamente assim: cerca de 45% de gasolina, em torno de 25% de diesel e óleo de aquecimento, cerca de 8% de querosene de aviação, cerca de 5% de GLP e outras correntes leves, em torno de 10% de óleo combustível pesado e betume, com o restante dividido entre matérias-primas petroquímicas e perdas de processo. Em outras palavras, 159 litros de bruto rendem cerca de 70 litros de gasolina, bem menos do que a intuição de que um barril seria quase todo gasolina.' },
          { h: 'Por que não há um número único', p: 'A distribuição se move com três fatores. Qualidade do bruto: o bruto pesado e ácido contém menos frações leves, então o rendimento de gasolina é sensivelmente menor. Configuração da refinaria: plantas com craqueamento catalítico profundo ou coqueificação convertem mais resíduo pesado em produtos leves e alcançam rendimentos maiores. Estação e demanda: no verão, quando a demanda por gasolina atinge o pico, as refinarias ajustam a operação para mais gasolina; no inverno, voltam-se ao diesel e ao óleo de aquecimento. Portanto não há resposta única, apenas uma faixa típica.' },
          { h: 'Quanto do preço na bomba é petróleo bruto', p: 'Em um sistema de preços de combustíveis plenamente de mercado, o bruto costuma representar de 50% a 65% do preço de varejo da gasolina. O restante é custo de refino, distribuição, impostos e margem do revendedor. Os impostos podem ser substanciais: em alguns países europeus, o imposto sobre combustíveis representa mais da metade do preço final. Essa estrutura explica uma dúvida comum: quando o bruto cai 30%, os preços na bomba costumam cair apenas cerca de 10%, porque a queda incide somente no componente do bruto, enquanto impostos e custos a jusante permanecem fixos.' },
          { h: 'Por que a transmissão atrasa', p: 'Costumam ser necessárias de duas a quatro semanas para que uma mudança no bruto chegue à bomba. Os motivos são vários: as refinarias estão processando bruto comprado antes, então seus custos de estoque ainda não refletem o preço mais recente; os contratos de atacado de combustíveis seguem ciclos estabelecidos; e em países com mecanismo administrado, o ajuste em si ocorre em calendário fixo. Esperar que a bomba dispare no momento em que o bruto sobe, ou caia no momento em que ele recua, não corresponde ao ritmo real da cadeia.' },
          { h: 'O que isso traz ao ler os preços', p: 'Entender a estrutura de rendimentos e de custos torna os números mais fáceis de interpretar: o bruto é apenas uma parte do custo do combustível, e a transmissão é retardada; os impostos costumam pesar muito no preço final. Os valores de bruto e de combustíveis aqui podem ser lidos em conjunto: acompanhe o bruto para a tendência e consulte os preços indicativos provinciais para o nível atual de varejo. Usados juntos, são mais informativos do que qualquer um isoladamente.' },
        ],
      },
    },
  },
  {
    slug: 'why-fuel-prices-differ-by-province',
    cat: 'cn',
    date: '2026-10-13',
    readMin: 6,
    i18n: {
      zh: {
        title: '为什么每个省的油价不一样？',
        desc: '国家发改委公布的是各省最高零售限价，不是全国统一价。本文拆解运距、竞争格局、地方税费与海南特殊政策，解释 31 个省份油价差在哪。',
        body: [
          { h: '发改委定的是天花板，不是统一价', p: '最常见的误解是把国内油价理解成全国一个价。实际上发改委公布的是各省（区、市）汽柴油最高零售限价，是一个天花板。加油站可以在这个价格之下自由定价，所以同一条街上的两家加油站差个两三毛很正常。而这个天花板本身就是分省制定的，所以从源头起，31 个省份就不是同一个数字。' },
          { h: '运得越远，油越贵', p: '成品油从炼厂到加油站，最后一程靠油罐车。山东、辽宁、广东这些炼厂密集的地方，油出厂几十公里就进了加油站，运费几乎可以忽略。而西藏、青海、新疆部分地区的加油站，油罐车可能要跑上千公里，中途还要考虑高原路况和冬季封路的风险储备。这部分物流成本最终摊进每升油里，通常能造成几毛钱的差异。' },
          { h: '海南是个特例', p: '海南的油价长期明显偏高，不是因为运输，而是政策。海南全省高速公路不设收费站，1994 年起把道路通行费折算成机动车辆通行附加费，跟着成品油零售价一起征收。所以你在海南加油，油价里已经含了高速公路的钱。这不是定价随意，是收费方式不同。' },
          { h: '竞争密度会压价', p: '加油站多的地方，价格战就激烈。长三角、珠三角的城郊加油站经常每升降个三五毛抢客源，民营站尤其明显。反过来，加油站稀疏的国道、县道沿线，议价空间就小，价格更贴近限价天花板。所以同一个省内，城区和偏远县镇的价格也常常不一样，这跟限价无关，纯粹是市场密度。' },
          { h: '标号、季节、税费这些小变量', p: '还有几个不太起眼的因素。不同标号的调价幅度在个别省份会有细微差别；冬季部分地区供应 -10、-20 号柴油，成本和定价跟 0 号柴油不一样；地方层面的税费和环保要求也有差异。这些变量单个都不大，但叠起来就能解释为什么相邻两省的油价表能对不上几毛钱。' },
          { h: '怎么看这个差价', p: '一般来说，全国 92 号汽油的最高零售限价在各省之间能差出 0.3 到 0.8 元每升，实际零售价含优惠后差距会更大。对普通车主来说，跨省加油省钱只在长途且价差明显时才划算，顺路才是关键。把 31 个省份的指导价放在一起，主要作用是让你一眼看清自己所在地区在全国处在什么位置，以及调价后各省的变动是否同步。' },
        ],
      },
      en: {
        title: 'Why Fuel Prices Differ Between Chinese Provinces',
        desc: 'Beijing publishes a provincial price ceiling, not one national price. Here is what actually separates the numbers in 31 regions.',
        body: [
          { h: 'The ceiling is national, the price is not', p: 'A common assumption is that China sets one fuel price for the whole country. It does not. What the National Development and Reform Commission publishes is a maximum retail price for each province, a ceiling rather than a fixed tariff. Individual stations are free to sell below it, which is why two stations on the same street can differ by twenty or thirty fen per litre. And because that ceiling is itself set province by province, the thirty-one figures are different right from the start.' },
          { h: 'Distance still costs money', p: 'Refined fuel reaches the pump by road tanker. In Shandong, Liaoning and Guangdong, where refineries cluster, the product may travel only a few dozen kilometres from plant to forecourt and freight barely registers. At a station in Tibet, Qinghai or parts of Xinjiang, the same tanker can cover a thousand kilometres or more, with plateau roads and winter closures adding risk and storage cost. That logistics bill ends up spread across every litre, and it typically accounts for a few tenths of a yuan.' },
          { h: 'Hainan is the outlier', p: 'Hainan has long been visibly more expensive, and it is not about freight. The province has no toll booths on its expressway network. Since 1994 the road usage charge has instead been collected as a vehicle circulation surcharge levied together with retail fuel sales. Fill up in Hainan and the money for the motorway is inside the price of the litre. Different collection mechanism, not arbitrary pricing.' },
          { h: 'Where stations are dense, prices fall', p: 'Competition does the rest. In the built-up fringes of the Yangtze and Pearl River deltas, stations routinely shave thirty to fifty fen off the ceiling to pull traffic, and independent operators are the most aggressive. Out on national highways and county roads where stations are sparse, there is less to negotiate about and prices sit closer to the cap. Within a single province, city and remote county prices therefore often differ for reasons that have nothing to do with policy.' },
          { h: 'Grades, seasons and local levies', p: 'Several smaller variables sit underneath. The adjustment applied to different octane grades is not always identical from province to province. In winter, parts of the country supply -10 and -20 diesel, which costs and prices differently from the 0 grade. Local levies and environmental requirements add further variation. None of these is large alone; stacked together they explain why neighbouring provinces can post figures a few tenths of a yuan apart.' },
          { h: 'Reading the spread', p: 'As a rough guide, the maximum retail price of 92-octane petrol varies by somewhere between 0.3 and 0.8 yuan per litre across the provinces, and actual street prices, discounts included, diverge more than that. For a driver, crossing a provincial border to save money only makes sense on a long trip with a clear gap; being on the way matters more than the price itself. What a side-by-side table of all thirty-one provinces is genuinely good for is showing where your own region sits nationally, and whether every province moved together after an adjustment.' },
        ],
      },
    },
  },
  {
    slug: 'gasoline-92-95-98-octane',
    cat: 'cn',
    date: '2026-10-15',
    readMin: 5,
    i18n: {
      zh: {
        title: '92、95、98 号汽油到底差在哪？加错了会怎样',
        desc: '标号不是纯度，而是抗爆性。本文解释辛烷值的真实含义、该按什么标准选油、混加是否有事，以及加高标号到底有没有好处。',
        body: [
          { h: '标号不是纯度，是抗爆性', p: '最大的误解是以为标号代表油品好坏或干净程度。92、95、98 这些数字是研究法辛烷值（RON），衡量的是汽油抵抗爆震的能力，跟纯度、清洁度、能量含量基本无关。98 号汽油并不比 92 号更干净，也不含更多能量，它只是在被压缩时更不容易自己烧起来。' },
          { h: '为什么要抗爆', p: '汽油机工作时，活塞把混合气压缩，火花塞点火，火焰应当从火花塞向外稳定传播。如果压缩得太厉害，混合气会在火花塞点火前自己着起来，这就是爆震——你会听到金属敲击声，长期下来会损伤活塞和气门。压缩比越高的发动机越容易出现这个问题，也就越需要高辛烷值的汽油。所以标号是跟着发动机走的，不是跟着钱包走的。' },
          { h: '该加几号，看油箱盖', p: '最靠谱的依据是车辆说明书或者油箱盖内侧的标注。写"请使用 92 号及以上"的车，加 92 就够，加 95、98 不会让动力变大也不会更省油。写"请使用 95 号及以上"的车，加 92 就可能爆震。现在的电喷发动机有爆震传感器，检测到爆震会自动推迟点火来保护发动机，代价是动力下降、油耗上升——所以加低标号不会立刻坏车，但你会用更高的油耗把省下的钱还回去。' },
          { h: '涡轮车为什么普遍要 95', p: '涡轮增压发动机实际进入气缸的压力远高于同排量自然吸气机型，爆震风险大得多，所以多数涡轮车要求 95 号起步。部分高功率性能车，以及像马自达创驰蓝天这类高压缩比机型，手册会直接写 98。这不是矫情，是设计工况决定的。' },
          { h: '混加有没有事', p: '偶尔把 92 和 95 混着加，问题不大，辛烷值大致按体积加权平均，混出来的是个中间值。真正要避免的是长期给要求 95 的车喂 92。反过来，一直加 98 的车偶尔加一次 95，只要不低于手册下限，也不会伤车。至于加油站常说"加高标号能清积碳"，这个说法没有依据，积碳主要跟机油品质、行驶工况和短途行驶有关。' },
          { h: '省钱的正确姿势', p: '别为了省钱降级，也别为了爱车升级。按手册下限加是性价比最高的选择，把省下的钱用在按时换机油上，对发动机的好处比加高标号大得多。本站把各省 92、95、98 的指导价列在一起，你可以直接算出自己所在地区每升差多少钱，再决定要不要往上升。' },
        ],
      },
      en: {
        title: 'What 92, 95 and 98 Petrol Actually Mean',
        desc: 'The grade is knock resistance, not purity. How to choose the right one, whether mixing is safe, and why premium rarely pays.',
        body: [
          { h: 'The number is knock resistance, not purity', p: 'The most widespread misunderstanding is that the grade reflects quality or cleanliness. The numbers 92, 95 and 98 are research octane numbers, a measure of how well the fuel resists knocking. They say almost nothing about purity, detergency or energy content. 98 is not cleaner than 92 and does not contain more energy; it simply resists self-igniting under compression better.' },
          { h: 'What knocking actually is', p: 'In a petrol engine the piston compresses the mixture, the plug fires, and the flame front should travel outward from the plug in a controlled way. Compress it too far and part of the mixture ignites before the plug fires. That is knock: you hear a metallic rattle, and sustained knock damages pistons and valves. The higher the compression ratio, the more likely it becomes and the more octane the engine needs. The grade follows the engine, not the size of your wallet.' },
          { h: 'Read the filler flap', p: 'The reliable answer is in the handbook or printed inside the fuel flap. If it says 92 or higher, 92 is sufficient, and 95 or 98 will not add power or save fuel. If it says 95 or higher, 92 risks knock. Modern engines carry a knock sensor that retards ignition when it detects knock, protecting the hardware at the cost of output and economy. Running a lower grade will not destroy the engine immediately, but you will hand back the money you saved through higher consumption.' },
          { h: 'Why turbos usually want 95', p: 'A turbocharged engine pushes far more pressure into the cylinder than a naturally aspirated one of the same displacement, so the knock margin is much tighter and most turbo models specify 95 as the floor. High-output performance cars, and high-compression designs such as the Mazda SkyActiv units, sometimes specify 98 outright. That is an engineering requirement, not pretension.' },
          { h: 'Mixing grades', p: 'Mixing 92 with 95 on occasion is not a problem. Octane blends roughly in proportion to volume, so you get something in between. What to avoid is feeding 92 long-term to an engine that specifies 95. The other direction is safer: a car that normally takes 98 will cope with a tank of 95 as long as you stay above the handbook minimum. The claim that a higher grade cleans out carbon deposits has no basis; deposits depend far more on oil quality, driving conditions and short trips.' },
          { h: 'Where the money actually is', p: 'Do not downgrade to save money, and do not upgrade out of affection for your car. Fuelling to the handbook minimum is the best value, and spending what you save on timely oil changes does more for the engine than any premium grade. The provincial tables on this site list 92, 95 and 98 side by side, so you can work out exactly what each step costs per litre where you live before deciding to move up.' },
        ],
      },
    },
  },
  {
    slug: 'gold-investment-vehicles-compared',
    cat: 'gold',
    date: '2026-10-16',
    readMin: 6,
    i18n: {
      zh: {
        title: '现货黄金、期货黄金、纸黄金、黄金TD 到底有什么区别？',
        desc: '看到金价不等于在投资黄金。本文对比现货、期货、纸黄金、TD、金条与 ETF 六种方式的成本结构、杠杆、流动性和适合人群。',
        body: [
          { h: '先分清报价和交易品种', p: '你在财经网站上看到的"国际金价"，绝大多数是现货黄金的报价，也就是 XAU/USD，一盎司多少美元。这是个报价，看着它不等于在投资黄金。真要买，得选一个品种：实物金条、纸黄金、黄金TD、黄金期货、黄金ETF，它们的成本结构、杠杆、流动性和风险完全不是一回事。' },
          { h: '现货黄金（伦敦金）', p: '严格来说现货黄金是场外市场，银行和机构之间双边报价，没有统一的交易所，24 小时连续交易，标准单位通常是 100 盎司一手。散户接触到的"现货黄金"多为经纪商提供的保证金合约，杠杆常见 20 到 100 倍。杠杆是这个品种最大的风险来源：金价波动 1%，20 倍杠杆下本金就动了 20%。' },
          { h: '期货黄金', p: 'COMEX 的黄金期货是交易所标准化合约，一手 100 盎司，有明确的到期月份，到期要平仓或移仓换月。优点是流动性和透明度都极高，报价公开可查；缺点同样来自保证金——交易所要求的初始保证金通常只覆盖合约价值的百分之几，等效杠杆很高，方向错了会被追缴保证金。它适合套保和有经验的交易者，不适合放着不管。' },
          { h: '纸黄金', p: '纸黄金是商业银行的账户黄金，按银行报出的买入卖出价记账，起点很低，不少银行 1 克就能买，但不能提取实物。它赚的是点差——买入价和卖出价之间通常差 0.5 到 1 元每克，买进去立刻就浮亏这部分。没有杠杆，风险可控，但交易时间由银行规定，不是 24 小时，而且不产生利息。适合想跟住金价、又不想碰杠杆和实物交割的人。' },
          { h: '黄金TD', p: 'TD 是上海黄金交易所的延期交割品种，保证金交易，比例一般在 10% 到 20%，可以当天交割也可以无限期递延，递延要付递延费，费用由当天多空双方的持仓量对比决定支付方向。它有明确的交易时段（含夜盘），双向可交易，也能申请提取实物金锭。特点介于期货和纸黄金之间：有杠杆，但比期货温和；有交割机制，但比实物灵活。' },
          { h: '实物金条和 ETF', p: '实物金条的隐藏成本是买卖价差和回购折价——金店卖出价通常比基础金价高出一截，回购时又要在基础价上打折，一来一回可能吃掉几个百分点，还要考虑保管问题。黄金ETF 在证券交易所买卖，一手对应少量黄金，费用是管理费和交易佣金，流动性好、门槛低，是最省事的长期持有方式。选择的核心问题是：你要的是跟住金价，还是拿住金子。如果只是想跟住金价，ETF 和纸黄金的成本远低于实物。' },
        ],
      },
      en: {
        title: 'Spot Gold, Futures, Paper Gold and Gold TD Compared',
        desc: 'Watching the gold price is not the same as owning gold. A comparison of six ways to get exposure, and what each one really costs.',
        body: [
          { h: 'A quote is not a product', p: 'The gold price you see quoted on financial sites is almost always spot gold, XAU/USD, in dollars per ounce. That is a reference price; watching it is not an investment. To actually take a position you have to pick a vehicle: physical bars, paper gold, gold TD, futures or an ETF. Their cost structures, leverage, liquidity and risks are not remotely the same thing.' },
          { h: 'Spot gold', p: 'Spot gold is technically an over-the-counter market, priced bilaterally between banks and institutions with no single exchange and trading continuously around the clock, typically in standard lots of 100 ounces. What retail investors call spot gold is usually a margin contract offered by a broker, with leverage commonly between 20 and 100 times. Leverage is the dominant risk here: a 1 percent move in gold moves a 20-times leveraged position by 20 percent.' },
          { h: 'Gold futures', p: 'COMEX gold futures are standardised exchange contracts of 100 ounces with defined expiry months, which must be closed out or rolled before delivery. The strengths are liquidity and transparency, with publicly available quotes. The weakness comes from the same margin mechanism: initial margin typically covers only a few percent of contract value, so effective leverage is high and an adverse move triggers a margin call. Futures suit hedgers and experienced traders, not a position you leave alone.' },
          { h: 'Paper gold', p: 'Paper gold is an account-based product from commercial banks, recorded at the bank buy and sell prices. Minimums are low, in many banks a single gram, and physical delivery is not available. The cost is the spread, typically 0.5 to 1 yuan per gram between buy and sell, which means a position starts slightly underwater. There is no leverage, so risk is contained, but trading follows the bank hours rather than running 24 hours, and the position pays no interest. It suits someone who wants to track gold without leverage or delivery.' },
          { h: 'Gold TD', p: 'TD is the deferred-delivery contract of the Shanghai Gold Exchange, traded on margin usually between 10 and 20 percent. It can be settled the same day or deferred indefinitely, with a deferral fee whose direction is set by the balance of long and short positions that day. It has defined sessions including a night session, trades both directions, and allows application for physical delivery. It sits between futures and paper gold: leveraged, but more moderately; deliverable, but more flexible than physical.' },
          { h: 'Physical bars and ETFs', p: 'The hidden cost of physical bars is the buy-sell spread and the discount on buyback. Dealers sell above the benchmark and buy back below it, so a round trip can consume several percent, before you consider storage. Gold ETFs trade on a stock exchange in small lots backed by metal, costing a management fee plus commission, with good liquidity and a low entry point, which makes them the least effort over long holds. The real question is whether you want to track the price or hold the metal. If tracking is the goal, an ETF or paper gold costs far less than physical.' },
        ],
      },
    },
  },
];

export default ARTICLES;

// ============================================================
// Blog chrome strings (all 7 UI languages)
// Kept here, next to the articles, so the article module stays
// self-contained: adding a new language means editing this file
// only — pages.js and ui.js need no change.
// Shape matches the site's other copy tables.
// ============================================================
export const BLOG_STRINGS = {
  zh: {
    fallbackNote: '以下文章目前仅提供英文版本。',
    nav:     '文章',
    title: '文章与指南',
    metaTitle: '价格知识文章与指南 | PriceScope',
    metaDesc: '关于布伦特原油、国际黄金、国内成品油与汇率的长文解读，帮助你理解价格背后的机制。',
    lead: '这里收录关于原油、黄金、成品油与汇率的长文解读。每一篇都解释一个具体机制，帮你看懂价格数字背后的逻辑。',
    related: '延伸阅读',
    read: '{n} 分钟阅读',
    published: '发布',
    backToList: '← 返回文章列表',
    backToTop: '↑ 回到顶部',
    catOil: '原油', catGold: '黄金', catCn: '国内油价', catFx: '汇率',
  },
  en: {
    fallbackNote: 'These articles are currently available in English only.',
    nav:     'Articles',
    title: 'Articles & Guides',
    metaTitle: 'Price Explainers & Guides | PriceScope',
    metaDesc: 'Long-form explainers on Brent crude, gold, retail fuel and exchange rates — the mechanics behind the numbers.',
    lead: 'Long-form explainers on crude oil, gold, retail fuel and currency. Each piece unpacks one specific mechanism behind the numbers you see on this site.',
    related: 'Related reading',
    read: '{n} min read',
    published: 'Published',
    backToList: '← Back to articles',
    backToTop: '↑ Back to top',
    catOil: 'Crude oil', catGold: 'Gold', catCn: 'China fuel', catFx: 'Currency',
  },
  ja: {
    fallbackNote: '現在、記事は英語版のみの提供となります。',
    nav:     '記事',
    title: '記事とガイド',
    metaTitle: '価格の仕組みを解説する記事 | PriceScope',
    metaDesc: 'ブレント原油、金、燃料価格、為替について、数字の背景にある仕組みを詳しく解説します。',
    lead: '原油、金、燃料、為替に関する読み物です。それぞれの記事が、価格の裏側にある仕組みを一つずつ掘り下げます。',
    related: '関連記事',
    read: '読了 約{n}分',
    published: '公開',
    backToList: '← 記事一覧へ戻る',
    backToTop: '↑ ページ上部へ',
    catOil: '原油', catGold: '金', catCn: '燃料価格', catFx: '為替',
  },
  es: {
    fallbackNote: 'Por ahora estos artículos solo están disponibles en inglés.',
    nav:     'Artículos',
    title: 'Artículos y guías',
    metaTitle: 'Explicaciones y guías de precios | PriceScope',
    metaDesc: 'Explicaciones detalladas sobre el crudo Brent, el oro, los combustibles y los tipos de cambio.',
    lead: 'Explicaciones en profundidad sobre crudo, oro, combustibles y divisas. Cada artículo desgrana un mecanismo concreto detrás de las cifras.',
    related: 'Para seguir leyendo',
    read: '{n} min de lectura',
    published: 'Publicado',
    backToList: '← Volver a artículos',
    backToTop: '↑ Volver arriba',
    catOil: 'Petróleo', catGold: 'Oro', catCn: 'Combustible', catFx: 'Divisas',
  },
  fr: {
    fallbackNote: 'Ces articles ne sont disponibles qu\'en anglais pour le moment.',
    nav: 'Articles',
    title: 'Articles et guides',
    metaTitle: 'Explications et guides sur les prix | PriceScope',
    metaDesc: 'Explications détaillées sur le Brent, l\'or, les prix des carburants et les taux de change.',
    lead: 'Des explications approfondies sur le pétrole, l\'or, les carburants et les devises. Chaque article détaille un mécanisme précis derrière les chiffres.',
    related: 'Pour aller plus loin',
    read: '{n} min de lecture',
    published: 'Publié',
    backToList: '← Retour aux articles',
    backToTop: '↑ Haut de page',
    catOil: 'Pétrole', catGold: 'Or', catCn: 'Carburant', catFx: 'Devises',
  },
  de: {
    fallbackNote: 'Diese Artikel sind derzeit nur auf Englisch verfügbar.',
    nav:     'Artikel',
    title: 'Artikel & Ratgeber',
    metaTitle: 'Erklärungen und Ratgeber zu Preisen | PriceScope',
    metaDesc: 'Ausführliche Erklärungen zu Brent-Rohöl, Gold, Kraftstoffpreisen und Wechselkursen.',
    lead: 'Ausführliche Beiträge zu Rohöl, Gold, Kraftstoff und Währungen. Jeder Artikel erklärt einen konkreten Mechanismus hinter den Zahlen.',
    related: 'Weiterlesen',
    read: '{n} Min. Lesezeit',
    published: 'Veröffentlicht',
    backToList: '← Zurück zu den Artikeln',
    backToTop: '↑ Nach oben',
    catOil: 'Rohöl', catGold: 'Gold', catCn: 'Kraftstoff', catFx: 'Währungen',
  },
  pt: {
    fallbackNote: 'Estes artigos estão disponíveis apenas em inglês por enquanto.',
    nav:     'Artigos',
    title: 'Artigos e guias',
    metaTitle: 'Explicações e guias de preços | PriceScope',
    metaDesc: 'Explicações detalhadas sobre o Brent, o ouro, os combustíveis e as taxas de câmbio.',
    lead: 'Explicações aprofundadas sobre petróleo, ouro, combustíveis e moedas. Cada artigo desvenda um mecanismo concreto por trás dos números.',
    related: 'Leitura relacionada',
    read: '{n} min de leitura',
    published: 'Publicado',
    backToList: '← Voltar aos artigos',
    backToTop: '↑ Voltar ao topo',
    catOil: 'Petróleo', catGold: 'Ouro', catCn: 'Combustível', catFx: 'Moedas',
  },
};

// Language fallback for blog chrome — never render an untranslated key.
export function blogStr(lang) {
  return BLOG_STRINGS[lang] || BLOG_STRINGS.en;
}

// Articles available in a given language (drives sitemap + index).
export function articlesFor(lang) {
  return ARTICLES.filter(a => a.i18n[lang]);
}

// Related articles for a market page category, in language `lang`.
export function relatedFor(lang, cat, limit = 3) {
  return articlesFor(lang).filter(a => a.cat === cat).slice(0, limit);
}
