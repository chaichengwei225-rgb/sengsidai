import { getSupabase, isSupabaseConfigured } from './supabase';
import { INITIAL_SEED_APPROVALS, INITIAL_SEED_VOTES } from './seedFallback';
import { INITIAL_GOOD_ITEMS } from './goodItemsFallback';

const STORAGE_KEYS = {
  APPROVALS: 'sengsidai_cloud_approvals',
  VOTES: 'sengsidai_cloud_votes',
  COMMENTS: 'sengsidai_cloud_comments',
  GOOD_ITEMS: 'sengsidai_cloud_good_items',
};

const DELETED_KEY = 'sengsidai_deleted_ids';

// 删除墓碑：云端同步偶尔失败时，防止已删内容被下一次全量拉取「复活」
function getDeletedIds() {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'));
  } catch (e) {
    return new Set();
  }
}

function markDeleted(id) {
  try {
    if (typeof localStorage === 'undefined' || !id) return;
    const ids = getDeletedIds();
    ids.add(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify([...ids].slice(-500)));
  } catch (e) {
    console.warn('[CloudStore] mark deleted failed:', e);
  }
}

function filterDeleted(list, deleted, parentKey) {
  if (!Array.isArray(list)) return list;
  return list.filter(item =>
    !deleted.has(item.id) && (!parentKey || !deleted.has(item[parentKey]))
  );
}

// 内存单例缓存
let localCache = {
  approvals: null,
  votes: null,
  comments: null,
  goodItems: null,
};

function getLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[CloudStore] parse local failed:', e);
  }
  return fallback;
}

function setLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[CloudStore] set local failed:', e);
  }
}

// 初始化本地缓存
function initCache() {
  if (!localCache.approvals) {
    localCache.approvals = getLocal(STORAGE_KEYS.APPROVALS, INITIAL_SEED_APPROVALS);
  }
  if (!localCache.votes) {
    localCache.votes = getLocal(STORAGE_KEYS.VOTES, INITIAL_SEED_VOTES);
  }
  if (!localCache.comments) {
    localCache.comments = getLocal(STORAGE_KEYS.COMMENTS, []);
  }
  if (!localCache.goodItems) {
    localCache.goodItems = getLocal(STORAGE_KEYS.GOOD_ITEMS, INITIAL_GOOD_ITEMS);
  }
}

// 分发数据变动事件通知页面重绘
function notifyUpdate() {
  window.dispatchEvent(new CustomEvent('sengsidai_data_updated', {
    detail: { ...localCache }
  }));
}

/**
 * 从云端拉取最新数据（全网同步）
 */
export async function syncFromCloud() {
  initCache();
  const deleted = getDeletedIds();

  // 如果配置了 Supabase，走 Supabase 流程
  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        const [{ data: apps }, { data: vts }, { data: cmts }, { data: gds }] = await Promise.all([
          client.from('approvals').select('*').order('created_at', { ascending: false }),
          client.from('votes').select('*'),
          client.from('comments').select('*').order('created_at', { ascending: true }),
          client.from('good_items').select('*').order('created_at', { ascending: false }),
        ]);
        if (apps) {
          localCache.approvals = filterDeleted(apps, deleted);
          setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
        }
        if (vts) {
          localCache.votes = filterDeleted(vts, deleted, 'approval_id');
          setLocal(STORAGE_KEYS.VOTES, localCache.votes);
        }
        if (cmts) {
          localCache.comments = filterDeleted(cmts, deleted, 'approval_id');
          setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
        }
        if (gds && gds.length > 0) {
          localCache.goodItems = filterDeleted(gds, deleted);
          setLocal(STORAGE_KEYS.GOOD_ITEMS, localCache.goodItems);
        }
        notifyUpdate();
        return localCache;
      } catch (e) {
        console.warn('[CloudStore] Supabase fetch error, fallback to cloud API:', e);
      }
    }
  }

  // 走无需配置的云端共享数据池 (/api/sync-data)
  try {
    const res = await fetch('/api/sync-data', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const result = await res.json();
      if (result && result.success && result.data) {
        const { approvals, votes, comments, goodItems } = result.data;
        if (Array.isArray(approvals)) {
          localCache.approvals = filterDeleted(approvals, deleted);
          setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
        }
        if (Array.isArray(votes)) {
          localCache.votes = filterDeleted(votes, deleted, 'approval_id');
          setLocal(STORAGE_KEYS.VOTES, localCache.votes);
        }
        if (Array.isArray(comments)) {
          localCache.comments = filterDeleted(comments, deleted, 'approval_id');
          setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
        }
        if (Array.isArray(goodItems)) {
          localCache.goodItems = filterDeleted(goodItems, deleted);
          setLocal(STORAGE_KEYS.GOOD_ITEMS, localCache.goodItems);
        }
        notifyUpdate();
        return localCache;
      }
    }
  } catch (err) {
    console.warn('[CloudStore] fetch /api/sync-data failed, using local cache:', err);
  }

  return localCache;
}

/**
 * 创建新审批
 */
export async function createApproval(approvalData) {
  initCache();
  const newApp = {
    ...approvalData,
    id: approvalData.id || `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: approvalData.created_at || new Date().toISOString(),
    status: approvalData.status || 'pending',
  };

  // 立即写入本地缓存，确保当前用户体验极速顺畅
  localCache.approvals = [newApp, ...localCache.approvals.filter(a => a.id !== newApp.id)];
  setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
  notifyUpdate();

  // 尝试同步到 Supabase
  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        const { data, error } = await client.from('approvals').insert([newApp]).select().single();
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn('[CloudStore] Supabase insert failed, fallback to cloud API:', e);
      }
    }
  }

  // 同步到公共云端共享存储 (/api/sync-data)
  try {
    const res = await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_approval', payload: newApp })
    });
    if (res.ok) {
      const resJson = await res.json();
      if (resJson && resJson.approval) {
        return resJson.approval;
      }
    }
  } catch (err) {
    console.warn('[CloudStore] Sync to /api/sync-data error:', err);
  }

  return newApp;
}

/**
 * 更新审批状态
 */
export async function updateApproval(approvalData) {
  initCache();
  localCache.approvals = localCache.approvals.map(a => a.id === approvalData.id ? { ...a, ...approvalData } : a);
  setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('approvals').update(approvalData).eq('id', approvalData.id);
      } catch (e) {
        console.warn('[CloudStore] Supabase update failed:', e);
      }
    }
  }

  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_approval', payload: approvalData })
    });
  } catch (e) {
    console.warn('[CloudStore] Sync update failed:', e);
  }
}

/**
 * 提交投票
 */
export async function submitVote(voteData, settleApproval = null) {
  initCache();
  const newVote = {
    ...voteData,
    id: voteData.id || `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: voteData.created_at || new Date().toISOString(),
  };

  localCache.votes = [
    newVote,
    ...localCache.votes.filter(v => !(v.approval_id === newVote.approval_id && v.voter_id === newVote.voter_id))
  ];
  setLocal(STORAGE_KEYS.VOTES, localCache.votes);

  if (settleApproval) {
    localCache.approvals = localCache.approvals.map(a => a.id === settleApproval.id ? { ...a, ...settleApproval } : a);
    setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
  }
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('votes').upsert([newVote]);
        if (settleApproval) {
          await client.from('approvals').update(settleApproval).eq('id', settleApproval.id);
        }
      } catch (e) {
        console.warn('[CloudStore] Supabase vote upsert failed:', e);
      }
    }
  }

  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_vote', payload: { ...newVote, _settleApproval: settleApproval } })
    });
  } catch (e) {
    console.warn('[CloudStore] Sync vote error:', e);
  }

  return newVote;
}

/**
 * 提交评论
 */
export async function submitComment(commentData) {
  initCache();
  const newComment = {
    ...commentData,
    id: commentData.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: commentData.created_at || new Date().toISOString(),
  };

  localCache.comments = [...localCache.comments, newComment];
  setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('comments').insert([newComment]);
      } catch (e) {
        console.warn('[CloudStore] Supabase comment insert failed:', e);
      }
    }
  }

  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_comment', payload: newComment })
    });
  } catch (e) {
    console.warn('[CloudStore] Sync comment error:', e);
  }

  return newComment;
}

/**
 * 创建好物分享
 */
export async function createGoodItem(itemData) {
  initCache();
  const newItem = {
    ...itemData,
    id: itemData.id || `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: itemData.created_at || new Date().toISOString(),
  };

  localCache.goodItems = [newItem, ...localCache.goodItems.filter(g => g.id !== newItem.id)];
  setLocal(STORAGE_KEYS.GOOD_ITEMS, localCache.goodItems);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('good_items').insert([newItem]);
      } catch (e) {
        console.warn('[CloudStore] Supabase good_item insert failed:', e);
      }
    }
  }

  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_good_item', payload: newItem })
    });
  } catch (e) {
    console.warn('[CloudStore] Sync good item error:', e);
  }

  return newItem;
}

/**
 * 同步获取当前缓存（供组件初始渲染）
 */
export function getCachedApprovals() {
  initCache();
  return localCache.approvals;
}

export function getCachedVotes() {
  initCache();
  return localCache.votes;
}

export function getCachedComments(approvalId) {
  initCache();
  if (!approvalId) return localCache.comments;
  return localCache.comments.filter(c => c.approval_id === approvalId);
}

export function getCachedGoodItems() {
  initCache();
  return localCache.goodItems;
}

/**
 * 向云端共享池发起删除请求，区分「成功 / 后端拒绝 / 网络失败」三种结果。
 * 只看 res.ok 会把 403 无权限误报成网络故障，所以解析响应体里的 error。
 */
async function postDelete(action, payload) {
  try {
    const res = await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      // 非 JSON 响应（代理错误页等）按 HTTP 状态兜底
    }
    if (res.ok && body?.success !== false) {
      return { cloudSynced: true, warning: '' };
    }
    return {
      cloudSynced: false,
      warning: body?.error
        ? `本机已删除，但云端拒绝了该请求：${body.error}。其他设备可能仍能看到，请稍后重试。`
        : `本机已删除，但云端同步未生效（HTTP ${res.status}），其他设备可能仍能看到，请稍后重试。`,
    };
  } catch (e) {
    console.warn('[CloudStore] Sync delete error:', e);
    return {
      cloudSynced: false,
      warning: '本机已删除，但云端同步暂时失败，其他设备可能仍能看到，请稍后重试。',
    };
  }
}

/**
 * 删除本人发布的审批单（级联清理该单的投票与讨论）
 * 三层同步删除：本地缓存 + Supabase（若配置）+ 云端共享 Blob
 */
export async function deleteApproval(approvalId, userId) {
  initCache();
  const target = localCache.approvals.find(a => a.id === approvalId);
  if (!target) return { success: false, error: '内容不存在或已被删除' };
  if (!userId || target.creator_id !== userId) {
    return { success: false, error: '只能删除自己发布的内容' };
  }

  markDeleted(approvalId);
  localCache.approvals = localCache.approvals.filter(a => a.id !== approvalId);
  localCache.votes = localCache.votes.filter(v => v.approval_id !== approvalId);
  localCache.comments = localCache.comments.filter(c => c.approval_id !== approvalId);
  setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
  setLocal(STORAGE_KEYS.VOTES, localCache.votes);
  setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        // votes / comments 由数据库外键 ON DELETE CASCADE 自动级联清理
        await client.from('approvals').delete().eq('id', approvalId).eq('creator_id', userId);
      } catch (e) {
        console.warn('[CloudStore] Supabase delete approval failed:', e);
      }
    }
  }

  const { cloudSynced, warning } = await postDelete('delete_approval', { id: approvalId, userId });
  return { success: true, cloudSynced, warning };
}

/**
 * 删除本人发布的好物分享
 */
export async function deleteGoodItem(itemId, userId) {
  initCache();
  const target = localCache.goodItems.find(g => g.id === itemId);
  if (!target) return { success: false, error: '内容不存在或已被删除' };
  if (!userId || target.creator_id !== userId) {
    return { success: false, error: '只能删除自己发布的内容' };
  }

  markDeleted(itemId);
  localCache.goodItems = localCache.goodItems.filter(g => g.id !== itemId);
  setLocal(STORAGE_KEYS.GOOD_ITEMS, localCache.goodItems);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('good_items').delete().eq('id', itemId).eq('creator_id', userId);
      } catch (e) {
        console.warn('[CloudStore] Supabase delete good item failed:', e);
      }
    }
  }

  const { cloudSynced, warning } = await postDelete('delete_good_item', { id: itemId, userId });
  return { success: true, cloudSynced, warning };
}

/**
 * 删除本人发布的讨论留言
 */
export async function deleteComment(commentId, userId) {
  initCache();
  const target = localCache.comments.find(c => c.id === commentId);
  if (!target) return { success: false, error: '留言不存在或已被删除' };
  if (!userId || target.user_id !== userId) {
    return { success: false, error: '只能删除自己发布的留言' };
  }

  markDeleted(commentId);
  localCache.comments = localCache.comments.filter(c => c.id !== commentId);
  setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('comments').delete().eq('id', commentId).eq('user_id', userId);
      } catch (e) {
        console.warn('[CloudStore] Supabase delete comment failed:', e);
      }
    }
  }

  const { cloudSynced, warning } = await postDelete('delete_comment', { id: commentId, userId });
  return { success: true, cloudSynced, warning };
}
