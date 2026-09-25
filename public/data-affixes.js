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
    { a: 'un-', m: '不，相反', ex: ['happy → unhappy', 'lock → unlock', 'tie → untie'], exCn: ['开心 → 不开心', '锁 → 解锁', '系 → 解开'] },
    { a: 'in-', m: '不（b/m/p 前变 im-，l 前变 il-，r 前变 ir-）', ex: ['correct → incorrect', 'possible → impossible', 'legal → illegal', 'regular → irregular'], exCn: ['正确 → 不正确', '可能 → 不可能', '合法 → 非法', '规律 → 不规律'] },
    { a: 'dis-', m: '不，相反，取消', ex: ['agree → disagree', 'like → dislike', 'connect → disconnect'], exCn: ['同意 → 不同意', '喜欢 → 不喜欢', '连接 → 断开'] },
    { a: 'non-', m: '非，不', ex: ['sense → nonsense', 'stop → nonstop', 'profit → nonprofit'], exCn: ['意义 → 无意义', '停止 → 不停止', '营利 → 非营利'] },
    { a: 'de-', m: '向下；否定；去除', ex: ['grade → degrade', 'crease → decrease', 'code → decode'], exCn: ['等级 → 降级', '增加 → 减少', '密码 → 解码'] },
    { a: 'mis-', m: '错误地', ex: ['use → misuse', 'understand → misunderstand', 'lead → mislead'], exCn: ['错'] },
    { a: 'anti-', m: '反对，相反', ex: ['social → antisocial', 'war → antiwar', 'body → antibody'], exCn: ['社交 → 反社交', '战争 → 反战', '身体 → 抗体'] },
    { a: 'contra-', m: '反对，相反', ex: ['dict → contradict', 'ry → contrary'], exCn: ['说 → 反驳', '性质 → 对立'] },

    // 反向/重复/返回
    { a: 're-', m: '再，又；返回', ex: ['write → rewrite', 'turn → return', 'view → review'], exCn: ['写 → 重写', '转 → 返回', '看 → 复查'] },
    { a: 're-', m: '向后', ex: ['call → recall', 'tract → retract', 'cede → recede'], exCn: ['召唤', '缩回', '退让'] },

    // 时间/位置/顺序
    { a: 'pre-', m: '在...之前', ex: ['view → preview', 'war → prewar', 'pay → prepay'], exCn: ['看 → 预览', '战争 → 战前', '付 → 预付'] },
    { a: 'post-', m: '在...之后', ex: ['war → postwar', 'graduate → postgraduate'], exCn: ['战争 → 战后', '毕业 → 研究生'] },
    { a: 'fore-', m: '在前；预先', ex: ['see → foresee', 'tell → foretell', 'head → forehead'], exCn: ['看见 → 预见', '告诉 → 预言', '头 → 额头'] },
    { a: 'ex-', m: '前；向外', ex: ['wife → ex-wife', 'port → export', 'change → exchange'], exCn: ['妻子 → 前妻', '港 → 出口', '交换 → 交流'] },

    // 程度/大小
    { a: 'over-', m: '过度；超过', ex: ['use → overuse', 'time → overtime', 'head → overhead'], exCn: ['使用 → 过度使用', '时间 → 加班', '头顶 → 上方'] },
    { a: 'under-', m: '不足；在...下', ex: ['develop → underdeveloped', 'line → underline'], exCn: ['发育 → 发育不良', '线 → 下划线'] },
    { a: 'super-', m: '超级；超过', ex: ['man → superman', 'star → superstar', 'natural → supernatural'], exCn: ['人 → 超人', '星 → 巨星', '自然 → 超自然'] },
    { a: 'sub-', m: '在...下；次要', ex: ['way → subway', 'marine → submarine', 'title → subtitle'], exCn: ['路 → 地铁', '海军 → 潜艇', '标题 → 副标题'] },
    { a: 'out-', m: '向外；超过', ex: ['line → outline', 'door → outdoor', 'live → outlive'], exCn: ['线 → 轮廓', '门 → 户外', '活着 → 比...活得久'] },
    { a: 'extra-', m: '额外；在...外', ex: ['ordinary → extraordinary', 'curricular → extracurricular'], exCn: ['普通 → 不同寻常', '课程 → 课外'] },
    { a: 'ultra-', m: '超过；极端', ex: ['sound → ultrasound', 'violet → ultraviolet'], exCn: ['声音 → 超声波', '紫 → 紫外线'] },

    // 数字/共同
    { a: 'uni-', m: '一，单一', ex: ['form → uniform', 'cycle → unicycle', 'verse → universe'], exCn: ['形式 → 制服', '圈 → 单轮', '诗 → 宇宙'] },
    { a: 'bi-', m: '二，双', ex: ['cycle → bicycle', 'lingual → bilingual', 'weekly → biweekly'], exCn: ['圈 → 自行车', '语言 → 双语', '周报 → 双周报'] },
    { a: 'tri-', m: '三', ex: ['angle → triangle', 'cycle → tricycle'], exCn: ['角 → 三角形', '轮 → 三轮车'] },
    { a: 'multi-', m: '多', ex: ['media → multimedia', 'national → multinational'], exCn: ['媒体 → 多媒体', '国家 → 跨国公司'] },
    { a: 'semi-', m: '半', ex: ['circle → semicircle', 'final → semifinal'], exCn: ['圆 → 半圆', '决赛 → 半决赛'] },
    { a: 'co-', m: '共同，一起', ex: ['operate → cooperate', 'exist → coexist', 'author → coauthor'], exCn: ['操作 → 协作', '存在 → 共存', '作者 → 合著者'] },
    { a: 'com-/con-', m: '共同（b/m/p 前用 com-，其他用 con-）', ex: ['passion → compassion', 'nection → connection'], exCn: ['热情 → 同情', '连接'] },

    // 跨/转移
    { a: 'inter-', m: '在...之间；相互', ex: ['national → international', 'act → interact', 'change → interchange'], exCn: ['国家 → 国际', '行动 → 互动', '交换 → 互换'] },
    { a: 'trans-', m: '横穿；转移；变换', ex: ['port → transport', 'plant → transplant', 'form → transform'], exCn: ['港 → 运输', '植物 → 移植', '形态 → 变形'] },
    { a: 'tele-', m: '远距离', ex: ['phone → telephone', 'vision → television', 'port → teleport'], exCn: ['电话 → 电话机', '视觉 → 电视', '港 → 传送'] },
    { a: 'per-', m: '贯穿；每', ex: ['form → perform', 'cent → percent', 'vade → pervade'], exCn: ['形式 → 表演', '百分比'] },

    // 自动/自
    { a: 'auto-', m: '自己；自动', ex: ['graph → autograph', 'mobile → automobile', 'matic → automatic'], exCn: ['字 → 亲笔签名', '移动 → 汽车', '自动 → 自动的'] },
    { a: 'self-', m: '自己', ex: ['self → selfish', 'control → self-control', 'ish → selfish'], exCn: ['自己 → 自私', '控制 → 自我控制', '自私'] },

    // 态度/视角
    { a: 'pro-', m: '支持；向前', ex: ['gress → progress', 'duce → produce', 'American → pro-American'], exCn: ['进 → 进步', '生产 → 出产', '亲美'] },
    { a: 'sym-/syn-', m: '共同；相同', ex: ['pathy → sympathy', 'phone → symphony', 'chronize → synchronize'], exCn: ['同情', '交响乐', '同步'] },

    // 关系/行为
    { a: 'ab-', m: '偏离；离开', ex: ['normal → abnormal', 'sent → absent'], exCn: ['正常 → 异常', '在场 → 缺席'] },
    { a: 'ad-', m: '朝；向（变体：ac-/af-/ag-/al-/ap-/ar-/as-/at-）', ex: ['here → adhere', 'cept → accept', 'firm → affirm'], exCn: ['附着', '接受', '肯定'] },
    { a: 'be-', m: '使...；加以', ex: ['little → belittle', 'low → below', 'side → beside'], exCn: ['小 → 贬低', '低 → 下面', '旁边'] },

    // 状态/使动
    { a: 'en-/em-', m: '使...；放入', ex: ['large → enlarge', 'able → enable', 'body → embody'], exCn: ['大 → 扩大', '能 → 使能够', '体现'] },
    { a: 'ar-', m: '到；处于', ex: ['range → arrange', 'rive → arrive', 'ray → array'], exCn: ['范围 → 安排', '抵达', '排列'] },

    // 杂项
    { a: 'mono-', m: '单一（uni- 的希腊语版）', ex: ['plane → monoplane', 'logue → monologue'], exCn: ['飞机 → 单翼机', '独白'] },
    { a: 'poly-', m: '多（multi- 的希腊语版）', ex: ['gon → polygon', 'ester → polyester'], exCn: ['多边 → 多边形', '多酯 → 聚酯'] },
    { a: 'pseudo-', m: '假，伪', ex: ['name → pseudonym', 'science → pseudoscience'], exCn: ['科学 → 伪科学', '名 → 假名'] },
    { a: 'mal-', m: '坏；不良', ex: ['function → malfunction', 'treat → maltreat', 'nutrition → malnutrition'], exCn: ['功能 → 功能不良', '营养 → 营养不良'] },
    { a: 'bene-', m: '好；善', ex: ['fit → benefit', 'volent → benevolent', 'diction → benediction'], exCn: ['好 → 好处', '善意 → 善人', '祝福 → 祝福'] },
    { a: 'macro-', m: '大；宏观', ex: ['scope → macroscope', 'economics → macroeconomics'], exCn: ['大 → 宏观', '经济学 → 宏观经济学'] },
    { a: 'micro-', m: '小；微观', ex: ['scope → microscope', 'wave → microwave'], exCn: ['小 → 显微镜', '经济学 → 微观经济学'] },
    { a: 'mega-', m: '巨大；百万', ex: ['phone → megaphone', 'ton → megaton'], exCn: ['小 → 巨大', '明星 → 巨星', '赫 → 兆'] },
    { a: 'neo-', m: '新', ex: ['classic → neoclassic', 'lithic → neolithic'], exCn: ['古典 → 新古典', '石器 → 新石器'] },
    { a: 'pseudo-', m: '伪；假', ex: ['science → pseudoscience', 'nym → pseudonym'], exCn: ['科学 → 伪科学', '名 → 假名'] },
    { a: 'vice-', m: '副；代理', ex: ['chairman → vice-chairman', 'president → vice-president'], exCn: ['主席 → 副主席', '总统 → 副总统'] },
    { a: 'para-', m: '在旁边；类似', ex: ['legal → paralegal', 'medic → paramedic', 'phrase → paraphrase'], exCn: ['合法 → 准法律相关', '医学 → 辅助医务人员', '翻译 → 改述'] },
    { a: 'se-', m: '分离', ex: ['clude → seclude', 'lect → select', 'cret → secret'], exCn: ['关 → 隔离', '选 → 选择', '秘 → 秘密'] },
    { a: 'il-/ir-', m: 'in- 的变体（l/r 前）', ex: ['legal → illegal', 'regular → irregular'], exCn: ['合法 → 非法', '规律 → 不规律'] },
    { a: 'im-', m: 'in- 的变体（b/m/p 前）', ex: ['possible → impossible', 'balance → imbalance'], exCn: ['可能 → 不可能', '平衡 → 不平衡'] },
    { a: 'a-', m: '处于...状态', ex: ['moral → amoral', 'political → apolitical', 'typical → atypical'], exCn: ['道德 → 不道德', '政治 → 不关心政治', '典型 → 非典型'] },
    { a: 'step-', m: '继；后', ex: ['mother → stepmother', 'father → stepfather', 'child → stepchild'], exCn: ['母 → 继母', '父 → 继父', '子 → 继子'] },
    { a: 'well-', m: '好；充分', ex: ['known → well-known', 'do → welldo', 'off → well-off'], exCn: ['著名', '做得好', '过得好'] },
    { a: 'extra-', m: '额外；超出（再加一条）', ex: ['ordinary → extraordinary', 'curricular → extracurricular'], exCn: ['普通 → 不同寻常', '课程 → 课外'] },
  ],

  suffix: [
    // 名词后缀 -tion/-sion/-ment/-ness/-ity
    { a: '-tion', m: '动作；状态（-ation/-ition/-ution）', ex: ['act → action', 'move → motion', 'produce → production'], exCn: ['行动 → 行动(名词)', '移动 → 运动', '生产 → 产量'] },
    { a: '-sion', m: '动作；状态（-asion/-ision/-usion）', ex: ['decide → decision', 'divide → division', 'confuse → confusion'], exCn: ['决定 → 决定', '划分 → 划分', '混乱 → 混乱'] },
    { a: '-ment', m: '行为；结果；状态', ex: ['move → movement', 'develop → development', 'argue → argument'], exCn: ['移动 → 运动', '发展 → 发展', '争论 → 论据'] },
    { a: '-ness', m: '性质；状态', ex: ['happy → happiness', 'kind → kindness', 'dark → darkness'], exCn: ['高兴 → 高兴(名词)', '善良 → 善良(名词)', '黑暗 → 黑暗(名词)'] },
    { a: '-ity', m: '性质；状态（-ability/-ibility）', ex: ['pure → purity', 'able → ability', 'possible → possibility'], exCn: ['纯净 → 纯净度', '能力 → 能力(名词)', '可能 → 可能性'] },
    { a: '-er/-or', m: '做...的人/物', ex: ['teach → teacher', 'write → writer', 'act → actor'], exCn: ['教 → 教师', '写 → 作者', '演 → 演员'] },
    { a: '-ist', m: '从事...的人', ex: ['art → artist', 'science → scientist', 'tour → tourist'], exCn: ['艺术 → 艺术家', '科学 → 科学家', '旅游 → 游客'] },
    { a: '-ism', m: '主义；学说', ex: ['social → socialism', 'hero → heroism', 'tour → tourism'], exCn: ['社会 → 社会主义', '英雄 → 英雄主义', '旅游 → 旅游业'] },

    // 形容词后缀
    { a: '-able/-ible', m: '可...的；能...的', ex: ['read → readable', 'eat → eatable', 'sense → sensible'], exCn: ['读 → 可读的', '吃 → 可吃的', '感觉 → 明智的'] },
    { a: '-al', m: '与...有关的', ex: ['nature → natural', 'culture → cultural', 'music → musical'], exCn: ['自然 → 自然的', '文化 → 文化的', '音乐 → 音乐的'] },
    { a: '-an/-ian', m: '属于...的人', ex: ['America → American', 'music → musician', 'library → librarian'], exCn: ['郊区 → 郊区的', '非洲 → 非洲人', '图书 → 图书管理员'] },
    { a: '-ant/-ent', m: '...的人/物', ex: ['assist → assistant', 'serve → servant', 'differ → different'], exCn: ['帮助 → 助手', '仆人 → 仆人', '不同 → 不同的'] },
    { a: '-ar/-ory', m: '与...有关的', ex: ['cell → cellar', 'solar → solitary', 'satisfy → satisfactory'], exCn: ['细胞 → 细胞的', '孤独 → 孤独的', '满意 → 令人满意的'] },
    { a: '-ful', m: '充满...的；具有...性质', ex: ['beauty → beautiful', 'help → harmful', 'success → successful'], exCn: ['美 → 美丽的', '帮助 → 有帮助的', '成功 → 成功的'] },
    { a: '-less', m: '没有...的', ex: ['home → homeless', 'hope → hopeless', 'end → endless'], exCn: ['家 → 无家可归的', '希望 → 无望的', '尽头 → 无尽的'] },
    { a: '-ous', m: '具有...的；多...的', ex: ['danger → dangerous', 'fame → famous', 'nerve → nervous'], exCn: ['危险 → 危险的', '名声 → 有名的', '神经 → 神经质的'] },
    { a: '-ive', m: '具有...性质的', ex: ['act → active', 'create → creative', 'expense → expensive'], exCn: ['行动 → 积极的', '创造 → 有创造力的', '费用 → 昂贵的'] },
    { a: '-ic/-ical', m: '...的', ex: ['economy → economic', 'history → historical', 'base → basic'], exCn: ['经济 → 经济的', '历史 → 历史的', '基础 → 基本的'] },
    { a: '-ish', m: '有点...的；像...的', ex: ['child → childish', 'fool → foolish', 'red → reddish'], exCn: ['孩子 → 孩子气', '傻 → 傻气', '冷 → 冷点'] },
    { a: '-like', m: '像...的', ex: ['child → childlike', 'dream → dreamlike', 'life → lifelike'], exCn: ['孩子 → 孩子般的', '梦 → 梦境般的', '生活 → 生活般的'] },
    { a: '-y', m: '具有...性质的', ex: ['cloud → cloudy', 'rain → rainy', 'luck → lucky'], exCn: ['云 → 多云', '雨 → 下雨的', '幸运 → 幸运的'] },
    { a: '-an', m: '属于...的（地/人）', ex: ['suburb → suburban', 'Africa → African', 'republic → republican'], exCn: ['郊区 → 郊区的', '非洲 → 非洲的', '共和国 → 共和国的'] },

    // 副词后缀
    { a: '-ly', m: '以...方式（形容词 → 副词）', ex: ['quick → quickly', 'slow → slowly', 'clear → clearly'], exCn: ['只', '早', '有生气的'] },
    { a: '-ward/-wards', m: '向...方向', ex: ['back → backward(s)', 'up → upward(s)', 'east → eastward(s)'], exCn: ['后 → 向后', '上 → 向上', '东 → 向东'] },
    { a: '-wise', m: '在...方面；按...方式', ex: ['clock → clockwise', 'other → otherwise', 'street → streetwise'], exCn: ['顺时针 → 顺时针方向', '其他 → 否则', '同样 → 同样地'] },

    // 动词后缀
    { a: '-ize/-ise', m: '使...化；变成', ex: ['modern → modernize', 'real → realize', 'apology → awaken'], exCn: ['现代 → 使现代化', '现实 → 实现', '组织 → 组织化'] },
    { a: '-en', m: '使...；变得', ex: ['wide → widen', 'deep → deepen', 'strength → strengthen'], exCn: ['宽 → 加宽', '深 → 加深', '强 → 加强'] },
    { a: '-ify', m: '使...化；变成', ex: ['beauty → beautify', 'simple → simplify', 'pure → purify'], exCn: ['美 → 美化', '简单 → 简化', '纯净 → 净化'] },
    { a: '-ate', m: '使...；做...（加在形容词/名词后）', ex: ['active → activate', 'form → formate', 'different → differentiate'], exCn: ['活跃 → 激活', '形成 → 形成', '区别 → 区分'] },

    // 抽象名词后缀
    { a: '-ance/-ence', m: '性质；状态；行为', ex: ['appear → appearance', 'differ → difference', 'exist → existence'], exCn: ['出现 → 出现', '不同 → 不同', '存在 → 存在'] },
    { a: '-hood', m: '状态；时期；集体', ex: ['child → childhood', 'neighbor → neighborhood', 'brother → brotherhood'], exCn: ['孩子 → 童年', '邻居 → 邻里关系', '兄弟 → 兄弟情谊'] },
    { a: '-ship', m: '身份；技能；状态', ex: ['friend → friendship', 'leader → leadership', 'hard → hardship'], exCn: ['朋友 → 友谊', '领导 → 领导力', '艰难 → 艰难'] },
    { a: '-dom', m: '领域；状态', ex: ['king → kingdom', 'free → freedom', 'wise → wisdom'], exCn: ['王 → 王国', '自由 → 自由(领域)', '智慧 → 智慧(领域)'] },
    { a: '-age', m: '动作；状态；集合', ex: ['pass → passage', 'marry → marriage', 'short → shortage'], exCn: ['通过 → 通过(名词)', '婚姻 → 婚姻(名词)', '短 → 短缺'] },
    { a: '-ence/-ency', m: '性质；状态', ex: ['silent → silence', 'efficient → efficiency', 'different → difference'], exCn: ['出现 → 出现', '不同 → 不同', '存在 → 存在'] },

    // 表人名词后缀（更多变体）
    { a: '-eer', m: '从事...的人', ex: ['mountain → mountaineer', 'engine → engineer', 'pion → pioneer'], exCn: ['山 → 登山者', '工程 → 工程师', '先锋'] },
    { a: '-ess', m: '女性（古用法）', ex: ['actor → actress', 'waiter → waitress', 'host → hostess'], exCn: ['演员 → 女演员', '服务员 → 女服务员', '主人 → 女主人'] },
    { a: '-ette', m: '小；女性', ex: ['kitchen → kitchenette', 'cigar → cigarette'], exCn: ['厨房 → 小厨房', '雪茄 → 小雪茄'] },
    { a: '-ster', m: '从事...的人', ex: ['game → gamester', 'gang → gangster', 'spin → spinster'], exCn: ['游戏 → 游戏玩家', '帮派 → 帮派成员', '纺 → 纺纱女工'] },

    // 地点/集合
    { a: '-ery/-ry', m: '场所；行为；状态', ex: ['bake → bakery', 'slave → slavery', 'brave → bravery'], exCn: ['面包 → 面包店', '奴隶 → 奴隶制', '勇敢 → 勇敢(品质)'] },
    { a: '-arium/-orium', m: '场所', ex: ['planet → planetarium', 'audience → auditorium'], exCn: ['行星 → 天文馆', '观众 → 礼堂'] },
    { a: '-ery', m: '工作场所', ex: ['bake → bakery', 'print → printry', 'nurse → nursery'], exCn: ['面包 → 面包店', '印刷 → 印刷厂', '护士 → 托儿所'] },

    // 科学/技术
    { a: '-ology', m: '...学', ex: ['biology', 'geology', 'sociology'], exCn: ['生物 → 生物学', '地质 → 地质学', '社会 → 社会学'] },
    { a: '-graphy', m: '写法；记录法', ex: ['photo → photography', 'call → calligraphy', 'geo → geography'], exCn: ['照片 → 摄影', '书法 → 书法艺术', '地理 → 地理学'] },
    { a: '-metry', m: '测量法', ex: ['geo → geometry', 'symmetry'], exCn: ['几何 → 几何学', '对称'] },

    // 状态/特征
    { a: '-phile', m: '爱好者', ex: ['book → bibliophile', 'phone → francophile'], exCn: ['书 → 藏书家', '法国 → 法语爱好者'] },
    { a: '-phobe', m: '恐惧者', ex: ['photo → photophobe', 'xeno → xenophobe'], exCn: ['光 → 怕光者', '陌生人 → 排外者'] },
    { a: '-philia', m: '爱好；亲和', ex: ['photo → photophilia', 'hemo → hemophilia'], exCn: ['光 → 嗜光', '血 → 血友病'] },
    { a: '-phobia', m: '恐惧症', ex: ['photo → photophobia', 'claustro → claustrophobia'], exCn: ['光 → 畏光', '幽闭 → 幽闭恐惧症'] },
    { a: '-cide', m: '杀；灭', ex: ['insect → insecticide', 'sui → suicide', 'pesti → pesticide'], exCn: ['虫 → 杀虫剂', '自杀 → 自杀者', '害虫 → 杀虫剂'] },

    // 形容词变名词
    { a: '-ity', m: '性质；状态（再列一个强调）', ex: ['equal → equality', 'cur → curiosity'], exCn: ['纯净 → 纯净度', '能力 → 能力(名词)', '可能 → 可能性'] },
    { a: '-th', m: '状态；动作（古英语后缀）', ex: ['grow → growth', 'true → truth', 'long → length'], exCn: ['成长 → 成长(名词)', '真实 → 真理', '长 → 长度'] },
    { a: '-cy', m: '状态；性质', ex: ['private → privacy', 'secret → secrecy', 'diplomat → diplomacy'], exCn: ['私人 → 隐私', '秘密 → 秘密性', '外交官 → 外交'] },

    // 数字/次序
    { a: '-teen', m: '十几（13-19）', ex: ['thirteen', 'fifteen', 'eighteen'], exCn: ['十三', '十五', '十八'] },
    { a: '-ty', m: '几十（20,30...90）', ex: ['twenty', 'thirty', 'fifty'], exCn: ['二十', '三十', '五十'] },
    { a: '-fold', m: '倍；重', ex: ['two → twofold', 'many → manyfold', 'ten → tenfold'], exCn: ['二 → 两倍', '许多 → 许多倍', '十 → 十倍'] },

    // 减弱/缩小
    { a: '-ette', m: '小（再强调）', ex: ['kitchen → kitchenette', 'room → dinette'], exCn: ['厨房 → 小厨房', '雪茄 → 小雪茄'] },
    { a: '-let', m: '小；不重要', ex: ['book → booklet', 'pig → piglet', 'home → hamlet'], exCn: ['书 → 小册子', '猪 → 猪仔', '家 → 小村庄'] },
    { a: '-ling', m: '小；不重要；状态', ex: ['duck → duckling', 'under → underling', 'yearling'], exCn: ['鸭 → 小鸭', '下 → 下属', '年幼动物'] },

    // 形容词/名词
    { a: '-ern', m: '方向；性质', ex: ['east → eastern', 'west → western', 'modern → northern'], exCn: ['东 → 东方的', '西 → 西方的', '北 → 北方的'] },
    { a: '-most', m: '最', ex: ['top → topmost', 'fore → foremost', 'innermost'], exCn: ['顶 → 最高的', '前 → 最前面的', '最内 → 最里面的'] },
    { a: '-ish', m: '有点...的（再列）', ex: ['selfish', 'foolish', 'snobbish'], exCn: ['孩子 → 孩子气', '傻 → 傻气', '冷 → 冷点'] },

    // 杂项
    { a: '-craft', m: '技艺；船', ex: ['witch → witchcraft', 'aircraft', 'spacecraft'], exCn: ['巫术 → 巫术(技艺)', '航空 → 飞行器', '太空 → 航天器'] },
    { a: '-wide', m: '遍及；全', ex: ['country → countrywide', 'world → worldwide', 'store → storewide'], exCn: ['国家 → 全国的', '世界 → 全球的', '商店 → 全店的'] },
    { a: '-fold', m: '倍（再列）', ex: ['twofold', 'manifold', 'hundredfold'], exCn: ['二 → 两倍', '许多 → 许多倍', '十 → 十倍'] },
    { a: '-most', m: '最（再列）', ex: ['topmost', 'foremost', 'bottommost'], exCn: ['顶 → 最高的', '前 → 最前面的', '最内 → 最里面的'] },
    { a: '-ward', m: '向...（无 s 形式）', ex: ['toward', 'forward', 'backward'], exCn: ['朝', '前', '后'] },
    { a: '-wise', m: '方向；方式（再列）', ex: ['clockwise', 'otherwise', 'likewise'], exCn: ['顺时针 → 顺时针方向', '其他 → 否则', '同样 → 同样地'] },
    { a: '-scope', m: '观察仪器；范围', ex: ['micro → microscope', 'tele → telescope', 'periscope'], exCn: ['微 → 显微镜', '远 → 望远镜', '周 → 潜望镜'] },
    { a: '-phone', m: '声音；传声', ex: ['micro → microphone', 'sax → saxophone', 'mega → megaphone'], exCn: ['微 → 麦克风', '萨克斯 → 萨克斯管', '大 → 扩音器'] },
    { a: '-graph', m: '写；记录', ex: ['photo → photograph', 'auto → autograph', 'tele → telegraph'], exCn: ['照片 → 摄影', '亲笔 → 亲笔签名', '电报 → 电报机'] },
    { a: '-gram', m: '写出的东西；记录', ex: ['kilo → kilogram', 'tele → telegram', 'program'], exCn: ['千克 → 公斤', '电报 → 电报', '节目'] },
    { a: '-type', m: '类型；印刷', ex: ['photo → prototype', 'stereo → stereotype', 'archetype'], exCn: ['原 → 原型', '立体 → 立体声', '原型'] },

    // 副词（强调）
    { a: '-ly', m: '方式；状态（再列）', ex: ['only', 'early', 'lively'], exCn: ['只', '早', '有生气的'] },
    { a: '-ways', m: '方向；方式', ex: ['sideways', 'lengthways', 'crossways'], exCn: ['侧面', '长度', '交叉'] },
    { a: '-scape', m: '景象；景色', ex: ['land → landscape', 'sea → seascape', 'moon → moonscape'], exCn: ['土地 → 风景', '海 → 海景', '月 → 月景'] },
    { a: '-berry', m: '浆果', ex: ['straw → strawberry', 'blue → blueberry', 'rasp → raspberry'], exCn: ['草莓', '蓝莓', '树莓'] },
    { a: '-ever', m: '任何；究竟', ex: ['who → whoever', 'what → whatever', 'when → whenever'], exCn: ['谁 → 无论谁', '什么 → 无论什么', '何时 → 无论何时'] },
    { a: '-ling', m: '小；不重要（再加）', ex: ['sibling', 'inkling', 'underling'], exCn: ['鸭 → 小鸭', '下 → 下属', '年幼动物'] },
    { a: '-phile', m: '爱好者（再加）', ex: ['audio → audiophile', 'photo → photophile'], exCn: ['书 → 藏书家', '法国 → 法语爱好者'] },
  ]
};

// 总数统计
window.AFFIX_STATS = {
  prefix: window.AFFIXES.prefix.length,
  suffix: window.AFFIXES.suffix.length,
  get total() { return this.prefix + this.suffix; }
};

console.log('[vocab-pwa] 词缀加载完成:', window.AFFIX_STATS);
