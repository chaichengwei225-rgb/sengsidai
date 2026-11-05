import { getStore } from '@netlify/blobs';

// 初始预置种子审批列表
const DEFAULT_APPROVALS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: '复古腋下法棍包',
    price: 139,
    category: '穿搭',
    reason: '刷小红书被种草了，配秋天的大衣感觉超级复古好看，只要一百多块！',
    alternative: '家里已经有三个黑色腋下包了，只是五金颜色不太一样',
    mode: 'public',
    expected_duration: '6-12个月',
    cooling_hours: 24,
    required_votes: 10,
    max_voters: 10,
    ai_weight: 20,
    ai_verdict: 'skip',
    ai_reasons: [
      '家里有3个同色包还买，典型的同质化冲动消费！',
      '百元假皮背两月容易脱皮吃灰，不买立省100%。'
    ],
    ai_generated_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    status: 'rejected',
    creator_id: 'seed_user_1',
    creator_nickname: '秋天想喝奶茶',
    creator_gender: '女',
    creator_mbti: 'INFP',
    creator_zodiac: '天秤座',
    target_mbtis: ['INTJ', 'ENTJ', 'INFJ'],
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: '二手索尼 A7M3 全画幅微单 (快门2000)',
    price: 8000,
    category: '数码',
    reason: '准备接拍毕业照和客单接单摄影，算过账拍4场就能回本，二手价格比原价省了4000！',
    alternative: '目前用手机拍，弱光和长焦虚化完全达不到商用要求',
    mode: 'public',
    expected_duration: '1年以上',
    cooling_hours: 24,
    required_votes: 15,
    max_voters: 15,
    ai_weight: 20,
    ai_verdict: 'buy',
    ai_reasons: [
      '属于生产力投资而非纯消费，有明确接单回本测算！',
      '二手残值保值率极高，快门2000成色优异，支持搞钱。'
    ],
    ai_generated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'approved',
    creator_id: 'seed_user_2',
    creator_nickname: '快门工匠阿伟',
    creator_gender: '男',
    creator_mbti: 'ISTP',
    creator_zodiac: '狮子座',
    target_mbtis: [],
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: '三模热插拔客制化机械键盘',
    price: 399,
    category: '数码',
    reason: '现在的键盘声音太吵了，这个是静音麻将音，办公室用很舒服，还有RGB旋钮！',
    alternative: '原来的薄膜键盘虽然手感一般，但没坏还能正常用',
    mode: 'public',
    expected_duration: '1年以上',
    cooling_hours: 12,
    required_votes: 8,
    max_voters: 8,
    ai_weight: 20,
    ai_verdict: 'buy',
    ai_reasons: [
      '静音麻将音确实能显著提升每天上班工位打字幸福感，长远实用，AI投支持票。'
    ],
    ai_generated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'pending',
    creator_id: 'seed_user_3',
    creator_nickname: '工位摸鱼冠军',
    creator_gender: '男',
    creator_mbti: 'INTP',
    creator_zodiac: '水瓶座',
    target_mbtis: ['INTJ', 'ENTP'],
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    title: '七分甜超大杯杨枝甘露 (加多份啵啵)',
    price: 15,
    category: '其他',
    reason: '今天周五加班到八点半，心理防线崩溃，极度需要高糖多巴胺救命！！',
    alternative: '喝工位的免费白开水加茶包，但毫无心理慰藉作用',
    mode: 'public',
    expected_duration: '不到1个月',
    cooling_hours: 1,
    required_votes: 5,
    max_voters: 5,
    ai_weight: 20,
    ai_verdict: 'skip',
    ai_reasons: [
      '高糖高热量易发胖，心理慰藉只能维持十分钟，AI坚定投反对票劝退！'
    ],
    ai_generated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    status: 'pending',
    creator_id: 'seed_user_4',
    creator_nickname: '周五只想下班',
    creator_gender: '女',
    creator_mbti: 'ENFP',
    creator_zodiac: '巨蟹座',
    target_mbtis: [],
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  }
];

const DEFAULT_VOTES = [
  {
    id: 'v_seed_1',
    approval_id: '11111111-1111-1111-1111-111111111111',
    voter_id: 'voter_seed_1',
    voter_nickname: '断舍离大师',
    choice: 'skip',
    reason: '同质化太严重了，黑色包有一个就够用三年，快跑！',
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
  },
  {
    id: 'v_seed_2',
    approval_id: '22222222-2222-2222-2222-222222222222',
    voter_id: 'voter_seed_2',
    voter_nickname: '创业老哥',
    choice: 'buy',
    reason: '生产力工具买就完了，算清楚投资回报比就大胆冲！',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  }
];

const DEFAULT_COMMENTS = [
  {
    id: 'c_seed_1',
    approval_id: '33333333-3333-3333-3333-333333333333',
    user_id: 'user_seed_commenter',
    user_nickname: '外设发烧友',
    content: '手感不错，不过如果不急的话可以等等双十一再凑单。',
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  }
];

const DEFAULT_GOOD_ITEMS = [
  {
    id: 'g-001',
    title: '人体工学网布办公椅（带自适应腰托）',
    price: 699,
    reason: '程序员久坐腰酸救星！换了这个椅子之后连续敲代码 4 小时不腰疼，腰托支撑非常到位，千元内无敌！',
    image_url: '/office-chair.jpg',
    creator_id: 'u_seed_good_1',
    creator_nickname: '不腰疼的打工人',
    creator_gender: '男',
    creator_mbti: 'INTJ',
    creator_zodiac: '天秤座',
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
  {
    id: 'g-002',
    title: '手冲咖啡便携保温杯 (450ml)',
    price: 89,
    reason: '保温效果极其强悍，放了一整天下午喝还是烫的。双层陶瓷内胆不串味，天天自己带咖啡，一个月省下600奶茶钱！',
    image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    creator_id: 'u_seed_good_2',
    creator_nickname: '手冲拿铁患者',
    creator_gender: '女',
    creator_mbti: 'ENFP',
    creator_zodiac: '双鱼座',
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: 'g-003',
    title: '真无线骨传导运动耳机',
    price: 329,
    reason: '跑步安全感拉满，完全不堵耳道，流汗也不容易滋生细菌。音质虽然比不上头戴式，但夜跑听歌和听播客完全够用！',
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    creator_id: 'u_seed_good_3',
    creator_nickname: '夜跑阿哲',
    creator_gender: '男',
    creator_mbti: 'ISTP',
    creator_zodiac: '白羊座',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  }
];

// 本地内存回退（在本地开发无 Netlify Blobs 环境下工作）
let memoryState = {
  approvals: [...DEFAULT_APPROVALS],
  votes: [...DEFAULT_VOTES],
  comments: [...DEFAULT_COMMENTS],
  goodItems: [...DEFAULT_GOOD_ITEMS],
  deletedIds: [],
};

// 云端删除墓碑上限，避免 Blob 无限膨胀
const MAX_DELETED_IDS = 500;

/**
 * 归一化历史数据。
 * 早期版本写入的 Blob 可能缺少 goodItems / comments / votes / deletedIds，
 * 若不补全，删除与 ?limit= 分支会对 undefined 调用 find / slice 而返回 500。
 */
function normalizeData(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  return {
    ...safe,
    approvals: Array.isArray(safe.approvals) ? safe.approvals : [...DEFAULT_APPROVALS],
    votes: Array.isArray(safe.votes) ? safe.votes : [...DEFAULT_VOTES],
    comments: Array.isArray(safe.comments) ? safe.comments : [...DEFAULT_COMMENTS],
    goodItems: Array.isArray(safe.goodItems) ? safe.goodItems : [...DEFAULT_GOOD_ITEMS],
    deletedIds: Array.isArray(safe.deletedIds) ? safe.deletedIds : [],
  };
}

function isDeleted(data, id) {
  return Boolean(id) && data.deletedIds.includes(id);
}

function markDeleted(data, id) {
  if (!id) return;
  data.deletedIds = [...data.deletedIds.filter(x => x !== id), id].slice(-MAX_DELETED_IDS);
}

function getBlobStore() {
  try {
    return getStore({ name: 'sengsidai-store', consistency: 'strong' });
  } catch (e) {
    return null;
  }
}

async function loadAllData() {
  const store = getBlobStore();
  if (!store) return normalizeData(memoryState);

  try {
    const raw = await store.get('all_data', { type: 'json' });
    if (raw && typeof raw === 'object' && Array.isArray(raw.approvals)) {
      const data = normalizeData(raw);
      // 自动修复旧的好物图片链接
      data.goodItems = data.goodItems.map(item => {
        if (item.id === 'g-001' || (item.title && item.title.includes('办公椅'))) {
          if (!item.image_url || item.image_url.includes('1580481077197') || item.image_url.includes('unsplash.com')) {
            return { ...item, image_url: '/office-chair.jpg' };
          }
        }
        return item;
      });
      return data;
    }
    // 初次使用，写入初始数据
    const initData = normalizeData({
      approvals: DEFAULT_APPROVALS,
      votes: DEFAULT_VOTES,
      comments: DEFAULT_COMMENTS,
      goodItems: DEFAULT_GOOD_ITEMS,
    });
    await store.setJSON('all_data', initData);
    return initData;
  } catch (err) {
    console.warn('[SyncData] Netlify Blob read error, fallback to memory:', err);
    return normalizeData(memoryState);
  }
}

async function saveAllData(data) {
  memoryState = data;
  const store = getBlobStore();
  if (store) {
    try {
      await store.setJSON('all_data', data);
    } catch (err) {
      console.warn('[SyncData] Netlify Blob save error:', err);
    }
  }
}

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (req.method === 'GET') {
      const data = await loadAllData();

      // 可选参数 ?limit=N：供 Coze 等第三方插件限制响应体大小。
      // 不传时保持全量返回，前端广场 / 战绩 / 详情页行为完全不变。
      let limit = null;
      try {
        const raw = new URL(req.url).searchParams.get('limit');
        if (raw !== null) {
          const n = parseInt(raw, 10);
          if (Number.isFinite(n) && n > 0) limit = Math.min(200, n);
        }
      } catch {
        // req.url 异常时退化为全量，不影响原有调用方
      }

      // deletedIds 是服务端内部墓碑，不暴露给前端 / Coze，避免无谓增大响应体
      const publicData = { ...data };
      delete publicData.deletedIds;

      const payload = limit
        ? {
            approvals: publicData.approvals.slice(0, limit),
            votes: publicData.votes.slice(0, limit * 20),
            comments: publicData.comments.slice(0, limit * 20),
            goodItems: publicData.goodItems.slice(0, limit),
          }
        : publicData;

      return new Response(JSON.stringify({ success: true, data: payload }), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, payload } = body;
      const data = await loadAllData();

      if (action === 'create_approval') {
        // 新增审批帖子
        const newApproval = {
          ...payload,
          id: payload.id || `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: payload.created_at || new Date().toISOString(),
          status: payload.status || 'pending',
        };
        if (isDeleted(data, newApproval.id)) {
          return new Response(JSON.stringify({ success: true, approval: newApproval, skipped: true }), { status: 200, headers });
        }
        data.approvals = [newApproval, ...data.approvals.filter(a => a.id !== newApproval.id)];
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, approval: newApproval }), { status: 200, headers });
      }

      if (action === 'update_approval') {
        data.approvals = data.approvals.map(a => a.id === payload.id ? { ...a, ...payload } : a);
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (action === 'create_vote') {
        const newVote = {
          ...payload,
          id: payload.id || `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: payload.created_at || new Date().toISOString(),
        };
        // 同一人对同一帖子改票，先过滤旧票
        // 已删除的投票、或已删除审批单下迟到的投票，都不再写回
        if (isDeleted(data, newVote.id) || isDeleted(data, newVote.approval_id)) {
          return new Response(JSON.stringify({ success: true, vote: newVote, skipped: true }), { status: 200, headers });
        }
        data.votes = [
          newVote,
          ...data.votes.filter(v => !(v.approval_id === newVote.approval_id && v.voter_id === newVote.voter_id))
        ];
        // 如果投票附带了单子状态更新
        if (payload._settleApproval) {
          data.approvals = data.approvals.map(a => 
            a.id === payload._settleApproval.id ? { ...a, ...payload._settleApproval } : a
          );
        }
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, vote: newVote }), { status: 200, headers });
      }

      if (action === 'create_comment') {
        const newComment = {
          ...payload,
          id: payload.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: payload.created_at || new Date().toISOString(),
        };
        // 已删除的留言、或已删除审批单下迟到的留言，都不再写回
        if (isDeleted(data, newComment.id) || isDeleted(data, newComment.approval_id)) {
          return new Response(JSON.stringify({ success: true, comment: newComment, skipped: true }), { status: 200, headers });
        }
        data.comments = [...data.comments, newComment];
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, comment: newComment }), { status: 200, headers });
      }

      if (action === 'create_good_item') {
        const newGoodItem = {
          ...payload,
          id: payload.id || `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: payload.created_at || new Date().toISOString(),
        };
        if (isDeleted(data, newGoodItem.id)) {
          return new Response(JSON.stringify({ success: true, goodItem: newGoodItem, skipped: true }), { status: 200, headers });
        }
        data.goodItems = [newGoodItem, ...data.goodItems.filter(g => g.id !== newGoodItem.id)];
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, goodItem: newGoodItem }), { status: 200, headers });
      }

      // 删除本人发布的审批单：级联清理该单的投票与讨论，避免留下孤儿数据
      if (action === 'delete_approval') {
        const id = payload?.id;
        const userId = payload?.userId;
        const target = data.approvals.find(a => a.id === id);
        if (!target) {
          // 幂等：云端已无此条（创建请求迟到 / 其他设备已删），仍登记墓碑防止被复活
          markDeleted(data, id);
          await saveAllData(data);
          return new Response(JSON.stringify({ success: true, deleted: id, alreadyGone: true }), { status: 200, headers });
        }
        if (!userId || target.creator_id !== userId) {
          return new Response(JSON.stringify({ success: false, error: '只能删除自己发布的内容' }), { status: 403, headers });
        }
        markDeleted(data, id);
        data.approvals = data.approvals.filter(a => a.id !== id);
        data.votes = data.votes.filter(v => v.approval_id !== id);
        data.comments = data.comments.filter(c => c.approval_id !== id);
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, deleted: id }), { status: 200, headers });
      }

      // 删除本人发布的好物分享
      if (action === 'delete_good_item') {
        const id = payload?.id;
        const userId = payload?.userId;
        const target = data.goodItems.find(g => g.id === id);
        if (!target) {
          markDeleted(data, id);
          await saveAllData(data);
          return new Response(JSON.stringify({ success: true, deleted: id, alreadyGone: true }), { status: 200, headers });
        }
        if (!userId || target.creator_id !== userId) {
          return new Response(JSON.stringify({ success: false, error: '只能删除自己发布的内容' }), { status: 403, headers });
        }
        markDeleted(data, id);
        data.goodItems = data.goodItems.filter(g => g.id !== id);
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, deleted: id }), { status: 200, headers });
      }

      // 删除本人发布的讨论留言
      if (action === 'delete_comment') {
        const id = payload?.id;
        const userId = payload?.userId;
        const target = data.comments.find(c => c.id === id);
        if (!target) {
          markDeleted(data, id);
          await saveAllData(data);
          return new Response(JSON.stringify({ success: true, deleted: id, alreadyGone: true }), { status: 200, headers });
        }
        if (!userId || target.user_id !== userId) {
          return new Response(JSON.stringify({ success: false, error: '只能删除自己发布的留言' }), { status: 403, headers });
        }
        markDeleted(data, id);
        data.comments = data.comments.filter(c => c.id !== id);
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, deleted: id }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    console.error('[SyncData Function Error]', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Server error' }), { status: 500, headers });
  }
};
