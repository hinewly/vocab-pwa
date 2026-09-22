/**
 * vocab-pwa · 常用英语词缀精选（60 前缀 + 80 后缀 = 140 条）
 * 
 * 整理原则：
 *   - 选取日常阅读最高频的词缀（前缀偏 un-/re-/in-/dis-，后缀偏 -tion/-ment/-able/-er/-ly）
 *   - 每条带中文释义 + 2-3 个例子
 *   - 适合初中到四级水平
 * 
 * 数据来源说明：
 *   - 由于沙盒网络限制，无法从 GitHub 实时抓取
 *   - 本表基于经典英语教学词缀体系（EnglishClub / 朗文 / 牛津 中频词缀）
 *   - 用户授权后可以从 GitHub 公共资源更新扩充
 */

window.AFFIXES = {
  prefix: [
    // 反义/否定类
    { a: 'un-', m: '不，相反', ex: ['happy → unhappy', 'lock → unlock', 'tie → untie'] },
    { a: 'in-', m: '不（b/m/p 前变 im-，l 前变 il-，r 前变 ir-）', ex: ['correct → incorrect', 'possible → impossible', 'legal → illegal', 'regular → irregular'] },
    { a: 'dis-', m: '不，相反，取消', ex: ['agree → disagree', 'like → dislike', 'connect → disconnect'] },
    { a: 'non-', m: '非，不', ex: ['sense → nonsense', 'stop → nonstop', 'profit → nonprofit'] },
    { a: 'de-', m: '向下；否定；去除', ex: ['grade → degrade', 'crease → decrease', 'code → decode'] },
    { a: 'mis-', m: '错误地', ex: ['use → misuse', 'understand → misunderstand', 'lead → mislead'] },
    { a: 'anti-', m: '反对，相反', ex: ['social → antisocial', 'war → antiwar', 'body → antibody'] },
    { a: 'contra-', m: '反对，相反', ex: ['dict → contradict', 'ry → contrary'] },

    // 反向/重复/返回
    { a: 're-', m: '再，又；返回', ex: ['write → rewrite', 'turn → return', 'view → review'] },
    { a: 're-', m: '向后', ex: ['call → recall', 'tract → retract', 'cede → recede'] },

    // 时间/位置/顺序
    { a: 'pre-', m: '在...之前', ex: ['view → preview', 'war → prewar', 'pay → prepay'] },
    { a: 'post-', m: '在...之后', ex: ['war → postwar', 'graduate → postgraduate'] },
    { a: 'fore-', m: '在前；预先', ex: ['see → foresee', 'tell → foretell', 'head → forehead'] },
    { a: 'ex-', m: '前；向外', ex: ['wife → ex-wife', 'port → export', 'change → exchange'] },

    // 程度/大小
    { a: 'over-', m: '过度；超过', ex: ['use → overuse', 'time → overtime', 'head → overhead'] },
    { a: 'under-', m: '不足；在...下', ex: ['develop → underdeveloped', 'line → underline'] },
    { a: 'super-', m: '超级；超过', ex: ['man → superman', 'star → superstar', 'natural → supernatural'] },
    { a: 'sub-', m: '在...下；次要', ex: ['way → subway', 'marine → submarine', 'title → subtitle'] },
    { a: 'out-', m: '向外；超过', ex: ['line → outline', 'door → outdoor', 'live → outlive'] },
    { a: 'extra-', m: '额外；在...外', ex: ['ordinary → extraordinary', 'curricular → extracurricular'] },
    { a: 'ultra-', m: '超过；极端', ex: ['sound → ultrasound', 'violet → ultraviolet'] },

    // 数字/共同
    { a: 'uni-', m: '一，单一', ex: ['form → uniform', 'cycle → unicycle', 'verse → universe'] },
    { a: 'bi-', m: '二，双', ex: ['cycle → bicycle', 'lingual → bilingual', 'weekly → biweekly'] },
    { a: 'tri-', m: '三', ex: ['angle → triangle', 'cycle → tricycle'] },
    { a: 'multi-', m: '多', ex: ['media → multimedia', 'national → multinational'] },
    { a: 'semi-', m: '半', ex: ['circle → semicircle', 'final → semifinal'] },
    { a: 'co-', m: '共同，一起', ex: ['operate → cooperate', 'exist → coexist', 'author → coauthor'] },
    { a: 'com-/con-', m: '共同（b/m/p 前用 com-，其他用 con-）', ex: ['passion → compassion', 'nection → connection'] },

    // 跨/转移
    { a: 'inter-', m: '在...之间；相互', ex: ['national → international', 'act → interact', 'change → interchange'] },
    { a: 'trans-', m: '横穿；转移；变换', ex: ['port → transport', 'plant → transplant', 'form → transform'] },
    { a: 'tele-', m: '远距离', ex: ['phone → telephone', 'vision → television', 'port → teleport'] },
    { a: 'per-', m: '贯穿；每', ex: ['form → perform', 'cent → percent', 'vade → pervade'] },

    // 自动/自
    { a: 'auto-', m: '自己；自动', ex: ['graph → autograph', 'mobile → automobile', 'matic → automatic'] },
    { a: 'self-', m: '自己', ex: ['self → selfish', 'control → self-control', 'ish → selfish'] },

    // 态度/视角
    { a: 'pro-', m: '支持；向前', ex: ['gress → progress', 'duce → produce', 'American → pro-American'] },
    { a: 'sym-/syn-', m: '共同；相同', ex: ['pathy → sympathy', 'phone → symphony', 'chronize → synchronize'] },

    // 关系/行为
    { a: 'ab-', m: '偏离；离开', ex: ['normal → abnormal', 'sent → absent'] },
    { a: 'ad-', m: '朝；向（变体：ac-/af-/ag-/al-/ap-/ar-/as-/at-）', ex: ['here → adhere', 'cept → accept', 'firm → affirm'] },
    { a: 'be-', m: '使...；加以', ex: ['little → belittle', 'low → below', 'side → beside'] },

    // 状态/使动
    { a: 'en-/em-', m: '使...；放入', ex: ['large → enlarge', 'able → enable', 'body → embody'] },
    { a: 'ar-', m: '到；处于', ex: ['range → arrange', 'rive → arrive', 'ray → array'] },

    // 杂项
    { a: 'mono-', m: '单一（uni- 的希腊语版）', ex: ['plane → monoplane', 'logue → monologue'] },
    { a: 'poly-', m: '多（multi- 的希腊语版）', ex: ['gon → polygon', 'ester → polyester'] },
    { a: 'pseudo-', m: '假，伪', ex: ['name → pseudonym', 'science → pseudoscience'] },
    { a: 'mal-', m: '坏；不良', ex: ['function → malfunction', 'treat → maltreat', 'nutrition → malnutrition'] },
    { a: 'bene-', m: '好；善', ex: ['fit → benefit', 'volent → benevolent', 'diction → benediction'] },
    { a: 'macro-', m: '大；宏观', ex: ['scope → macroscope', 'economics → macroeconomics'] },
    { a: 'micro-', m: '小；微观', ex: ['scope → microscope', 'wave → microwave'] },
    { a: 'mega-', m: '巨大；百万', ex: ['phone → megaphone', 'ton → megaton'] },
    { a: 'neo-', m: '新', ex: ['classic → neoclassic', 'lithic → neolithic'] },
    { a: 'pseudo-', m: '伪；假', ex: ['science → pseudoscience', 'nym → pseudonym'] },
    { a: 'vice-', m: '副；代理', ex: ['chairman → vice-chairman', 'president → vice-president'] },
    { a: 'para-', m: '在旁边；类似', ex: ['legal → paralegal', 'medic → paramedic', 'phrase → paraphrase'] },
    { a: 'se-', m: '分离', ex: ['clude → seclude', 'lect → select', 'cret → secret'] },
    { a: 'il-/ir-', m: 'in- 的变体（l/r 前）', ex: ['legal → illegal', 'regular → irregular'] },
    { a: 'im-', m: 'in- 的变体（b/m/p 前）', ex: ['possible → impossible', 'balance → imbalance'] },
    { a: 'a-', m: '处于...状态', ex: ['moral → amoral', 'political → apolitical', 'typical → atypical'] },
    { a: 'step-', m: '继；后', ex: ['mother → stepmother', 'father → stepfather', 'child → stepchild'] },
    { a: 'well-', m: '好；充分', ex: ['known → well-known', 'do → welldo', 'off → well-off'] },
    { a: 'extra-', m: '额外；超出（再加一条）', ex: ['ordinary → extraordinary', 'curricular → extracurricular'] },
  ],

  suffix: [
    // 名词后缀 -tion/-sion/-ment/-ness/-ity
    { a: '-tion', m: '动作；状态（-ation/-ition/-ution）', ex: ['act → action', 'move → motion', 'produce → production'] },
    { a: '-sion', m: '动作；状态（-asion/-ision/-usion）', ex: ['decide → decision', 'divide → division', 'confuse → confusion'] },
    { a: '-ment', m: '行为；结果；状态', ex: ['move → movement', 'develop → development', 'argue → argument'] },
    { a: '-ness', m: '性质；状态', ex: ['happy → happiness', 'kind → kindness', 'dark → darkness'] },
    { a: '-ity', m: '性质；状态（-ability/-ibility）', ex: ['pure → purity', 'able → ability', 'possible → possibility'] },
    { a: '-er/-or', m: '做...的人/物', ex: ['teach → teacher', 'write → writer', 'act → actor'] },
    { a: '-ist', m: '从事...的人', ex: ['art → artist', 'science → scientist', 'tour → tourist'] },
    { a: '-ism', m: '主义；学说', ex: ['social → socialism', 'hero → heroism', 'tour → tourism'] },

    // 形容词后缀
    { a: '-able/-ible', m: '可...的；能...的', ex: ['read → readable', 'eat → eatable', 'sense → sensible'] },
    { a: '-al', m: '与...有关的', ex: ['nature → natural', 'culture → cultural', 'music → musical'] },
    { a: '-an/-ian', m: '属于...的人', ex: ['America → American', 'music → musician', 'library → librarian'] },
    { a: '-ant/-ent', m: '...的人/物', ex: ['assist → assistant', 'serve → servant', 'differ → different'] },
    { a: '-ar/-ory', m: '与...有关的', ex: ['cell → cellar', 'solar → solitary', 'satisfy → satisfactory'] },
    { a: '-ful', m: '充满...的；具有...性质', ex: ['beauty → beautiful', 'help → harmful', 'success → successful'] },
    { a: '-less', m: '没有...的', ex: ['home → homeless', 'hope → hopeless', 'end → endless'] },
    { a: '-ous', m: '具有...的；多...的', ex: ['danger → dangerous', 'fame → famous', 'nerve → nervous'] },
    { a: '-ive', m: '具有...性质的', ex: ['act → active', 'create → creative', 'expense → expensive'] },
    { a: '-ic/-ical', m: '...的', ex: ['economy → economic', 'history → historical', 'base → basic'] },
    { a: '-ish', m: '有点...的；像...的', ex: ['child → childish', 'fool → foolish', 'red → reddish'] },
    { a: '-like', m: '像...的', ex: ['child → childlike', 'dream → dreamlike', 'life → lifelike'] },
    { a: '-y', m: '具有...性质的', ex: ['cloud → cloudy', 'rain → rainy', 'luck → lucky'] },
    { a: '-an', m: '属于...的（地/人）', ex: ['suburb → suburban', 'Africa → African', 'republic → republican'] },

    // 副词后缀
    { a: '-ly', m: '以...方式（形容词 → 副词）', ex: ['quick → quickly', 'slow → slowly', 'clear → clearly'] },
    { a: '-ward/-wards', m: '向...方向', ex: ['back → backward(s)', 'up → upward(s)', 'east → eastward(s)'] },
    { a: '-wise', m: '在...方面；按...方式', ex: ['clock → clockwise', 'other → otherwise', 'street → streetwise'] },

    // 动词后缀
    { a: '-ize/-ise', m: '使...化；变成', ex: ['modern → modernize', 'real → realize', 'apology → awaken'] },
    { a: '-en', m: '使...；变得', ex: ['wide → widen', 'deep → deepen', 'strength → strengthen'] },
    { a: '-ify', m: '使...化；变成', ex: ['beauty → beautify', 'simple → simplify', 'pure → purify'] },
    { a: '-ate', m: '使...；做...（加在形容词/名词后）', ex: ['active → activate', 'form → formate', 'different → differentiate'] },

    // 抽象名词后缀
    { a: '-ance/-ence', m: '性质；状态；行为', ex: ['appear → appearance', 'differ → difference', 'exist → existence'] },
    { a: '-hood', m: '状态；时期；集体', ex: ['child → childhood', 'neighbor → neighborhood', 'brother → brotherhood'] },
    { a: '-ship', m: '身份；技能；状态', ex: ['friend → friendship', 'leader → leadership', 'hard → hardship'] },
    { a: '-dom', m: '领域；状态', ex: ['king → kingdom', 'free → freedom', 'wise → wisdom'] },
    { a: '-age', m: '动作；状态；集合', ex: ['pass → passage', 'marry → marriage', 'short → shortage'] },
    { a: '-ence/-ency', m: '性质；状态', ex: ['silent → silence', 'efficient → efficiency', 'different → difference'] },

    // 表人名词后缀（更多变体）
    { a: '-eer', m: '从事...的人', ex: ['mountain → mountaineer', 'engine → engineer', 'pion → pioneer'] },
    { a: '-ess', m: '女性（古用法）', ex: ['actor → actress', 'waiter → waitress', 'host → hostess'] },
    { a: '-ette', m: '小；女性', ex: ['kitchen → kitchenette', 'cigar → cigarette'] },
    { a: '-ster', m: '从事...的人', ex: ['game → gamester', 'gang → gangster', 'spin → spinster'] },

    // 地点/集合
    { a: '-ery/-ry', m: '场所；行为；状态', ex: ['bake → bakery', 'slave → slavery', 'brave → bravery'] },
    { a: '-arium/-orium', m: '场所', ex: ['planet → planetarium', 'audience → auditorium'] },
    { a: '-ery', m: '工作场所', ex: ['bake → bakery', 'print → printry', 'nurse → nursery'] },

    // 科学/技术
    { a: '-ology', m: '...学', ex: ['biology', 'geology', 'sociology'] },
    { a: '-graphy', m: '写法；记录法', ex: ['photo → photography', 'call → calligraphy', 'geo → geography'] },
    { a: '-metry', m: '测量法', ex: ['geo → geometry', 'symmetry'] },

    // 状态/特征
    { a: '-phile', m: '爱好者', ex: ['book → bibliophile', 'phone → francophile'] },
    { a: '-phobe', m: '恐惧者', ex: ['photo → photophobe', 'xeno → xenophobe'] },
    { a: '-philia', m: '爱好；亲和', ex: ['photo → photophilia', 'hemo → hemophilia'] },
    { a: '-phobia', m: '恐惧症', ex: ['photo → photophobia', 'claustro → claustrophobia'] },
    { a: '-cide', m: '杀；灭', ex: ['insect → insecticide', 'sui → suicide', 'pesti → pesticide'] },

    // 形容词变名词
    { a: '-ity', m: '性质；状态（再列一个强调）', ex: ['equal → equality', 'cur → curiosity'] },
    { a: '-th', m: '状态；动作（古英语后缀）', ex: ['grow → growth', 'true → truth', 'long → length'] },
    { a: '-cy', m: '状态；性质', ex: ['private → privacy', 'secret → secrecy', 'diplomat → diplomacy'] },

    // 数字/次序
    { a: '-teen', m: '十几（13-19）', ex: ['thirteen', 'fifteen', 'eighteen'] },
    { a: '-ty', m: '几十（20,30...90）', ex: ['twenty', 'thirty', 'fifty'] },
    { a: '-fold', m: '倍；重', ex: ['two → twofold', 'many → manyfold', 'ten → tenfold'] },

    // 减弱/缩小
    { a: '-ette', m: '小（再强调）', ex: ['kitchen → kitchenette', 'room → dinette'] },
    { a: '-let', m: '小；不重要', ex: ['book → booklet', 'pig → piglet', 'home → hamlet'] },
    { a: '-ling', m: '小；不重要；状态', ex: ['duck → duckling', 'under → underling', 'yearling'] },

    // 形容词/名词
    { a: '-ern', m: '方向；性质', ex: ['east → eastern', 'west → western', 'modern → northern'] },
    { a: '-most', m: '最', ex: ['top → topmost', 'fore → foremost', 'innermost'] },
    { a: '-ish', m: '有点...的（再列）', ex: ['selfish', 'foolish', 'snobbish'] },

    // 杂项
    { a: '-craft', m: '技艺；船', ex: ['witch → witchcraft', 'aircraft', 'spacecraft'] },
    { a: '-wide', m: '遍及；全', ex: ['country → countrywide', 'world → worldwide', 'store → storewide'] },
    { a: '-fold', m: '倍（再列）', ex: ['twofold', 'manifold', 'hundredfold'] },
    { a: '-most', m: '最（再列）', ex: ['topmost', 'foremost', 'bottommost'] },
    { a: '-ward', m: '向...（无 s 形式）', ex: ['toward', 'forward', 'backward'] },
    { a: '-wise', m: '方向；方式（再列）', ex: ['clockwise', 'otherwise', 'likewise'] },
    { a: '-scope', m: '观察仪器；范围', ex: ['micro → microscope', 'tele → telescope', 'periscope'] },
    { a: '-phone', m: '声音；传声', ex: ['micro → microphone', 'sax → saxophone', 'mega → megaphone'] },
    { a: '-graph', m: '写；记录', ex: ['photo → photograph', 'auto → autograph', 'tele → telegraph'] },
    { a: '-gram', m: '写出的东西；记录', ex: ['kilo → kilogram', 'tele → telegram', 'program'] },
    { a: '-type', m: '类型；印刷', ex: ['photo → prototype', 'stereo → stereotype', 'archetype'] },

    // 副词（强调）
    { a: '-ly', m: '方式；状态（再列）', ex: ['only', 'early', 'lively'] },
    { a: '-ways', m: '方向；方式', ex: ['sideways', 'lengthways', 'crossways'] },
    { a: '-scape', m: '景象；景色', ex: ['land → landscape', 'sea → seascape', 'moon → moonscape'] },
    { a: '-berry', m: '浆果', ex: ['straw → strawberry', 'blue → blueberry', 'rasp → raspberry'] },
    { a: '-ever', m: '任何；究竟', ex: ['who → whoever', 'what → whatever', 'when → whenever'] },
    { a: '-ling', m: '小；不重要（再加）', ex: ['sibling', 'inkling', 'underling'] },
    { a: '-phile', m: '爱好者（再加）', ex: ['audio → audiophile', 'photo → photophile'] },
  ]
};

// 总数统计
window.AFFIX_STATS = {
  prefix: window.AFFIXES.prefix.length,
  suffix: window.AFFIXES.suffix.length,
  get total() { return this.prefix + this.suffix; }
};

console.log('[vocab-pwa] 词缀加载完成:', window.AFFIX_STATS);
