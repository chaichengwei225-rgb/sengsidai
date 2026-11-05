// 分类列表
export const CATEGORIES = [
  { id: 'all', name: '全部', icon: '✨' },
  { id: '穿搭', name: '穿搭', icon: '👗' },
  { id: '数码', name: '数码', icon: '💻' },
  { id: '游戏', name: '游戏', icon: '🎮' },
  { id: '运动', name: '运动', icon: '🏃' },
  { id: '美妆', name: '美妆', icon: '💄' },
  { id: '家居', name: '家居', icon: '🛋️' },
  { id: '其他', name: '其他', icon: '📦' },
];

// 性别选项
export const GENDER_OPTIONS = ['男', '女', '其他 / 保密'];

// MBTI 16型人格选项与四大族群
export const MBTI_OPTIONS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

export const MBTI_GROUPS = [
  { label: '全部', types: MBTI_OPTIONS },
  { label: '分析家 (NT)', types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  { label: '外交家 (NF)', types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  { label: '守护者 (SJ)', types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  { label: '探险家 (SP)', types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
];

// 十二星座选项
export const ZODIAC_OPTIONS = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座'
];

// 预计使用时长选项
export const EXPECTED_DURATIONS = [
  '不到1个月',
  '1-3个月',
  '3-6个月',
  '6-12个月',
  '1年以上',
];

// 随机昵称形容词与名词
export const NICKNAME_ADJECTIVES = [
  '清醒的', '极度克制的', '月光急救员', '理性理财', '反消费主义', 
  '冷静观望', '断舍离狂魔', '省钱专家', '清心寡欲', '精打细算',
  '捂紧钱包', '拔草达人', '拒绝内耗', '等等党胜利', '冷静24小时'
];

export const NICKNAME_NOUNS = [
  '打工人', '脆皮大学生', '野生哲学家', '仓鼠党', '存钱罐', 
  '干饭人', '冲浪选手', '理财喵', '冷静汪', '星际旅人'
];

// 扎心但治愈的省钱文案
export const ROAST_MESSAGES = [
  "不买立省 100%！这笔钱拿去吃大餐不香吗？",
  "网友的眼睛是雪亮的，冲动是魔鬼，成功守住钱包！",
  "少买一件吃灰闲置，距离财务自由又近了一步！",
  "冷静期战胜消费主义！你的钱包对你发出了感激的微笑 😊",
  "别让明天的你为今天的冲动买单，省下就是赚到！",
  "恭喜！成功避开智商税，又少打工了三天！",
  "买前生产力，买后爱奇艺。感谢各位网友无情打醒！"
];

// 快捷投票劝退理由
export const QUICK_REASONS = {
  reject: [
    "家里明明有替代品，买回来肯定吃灰！",
    "不买立省100%，这钱留着存起来吃火锅香多了！",
    "消费主义陷阱！别被商家营销话术洗脑了！",
    "溢价太严重了，等两个月闲鱼半价收一个！",
    "买前生产力，买后吃灰，听劝，别买！"
  ],
  approve: [
    "确实是生产力刚需，能带来实际价值，支持冲！",
    "千金难买心头好，价格合理，值得奖励自己！",
    "替代方案成本更高，算过账来这个最划算，准了！",
    "早买早享受，人生苦短，支持合理悦己消费！"
  ],
  spectate: [
    "吃瓜看戏，先看前面的课代表怎么说",
    "价格略微纠结，蹲一个后续体验分享",
    "这题超纲了，把决定权交给更有经验的网友"
  ]
};
