import { getSupabase } from './supabase';
import { updateApproval } from './cloudStore';

const COOLDOWN_SECONDS = 60;
const LAST_RETRY_PREFIX = 'wallet_wait_ai_retry_';
const CUSTOM_AI_KEY_STORAGE = 'wallet_wait_custom_ai_key';
const AI_SOURCE_PREFIX = 'wallet_wait_ai_source_';
const AI_GLM_DONE_PREFIX = 'wallet_wait_ai_glm_done_';
const AI_AUTO_PREFIX = 'wallet_wait_ai_auto_';

// 统一走 /api/*：线上由 netlify.toml 重定向到 Function，本地由 vite.config.js 代理。
// 旧版按 hostname 判断并改走 /.netlify/functions/*，导致本地 dev 永远拿不到后端结果。
const AI_ENDPOINT = '/api/ai-recommend';

// 同一个审批单的并发请求去重，避免详情页 6 秒轮询把 GLM 打爆
const inflight = new Map();

export function getCustomAiKey() {
  return localStorage.getItem(CUSTOM_AI_KEY_STORAGE) || '';
}

export function setCustomAiKey(key) {
  if (key) {
    localStorage.setItem(CUSTOM_AI_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(CUSTOM_AI_KEY_STORAGE);
  }
  // 换了 Key 之后，本会话内已经判过「没接上」的审批单应当允许重新自动尝试
  resetAiAutoFlag();
}

/** 读取该审批单当前展示的 AI 结果来源：'glm' | 'fallback' | 'local' | '' */
export function getAiSource(approvalId) {
  if (!approvalId) return '';
  try {
    return localStorage.getItem(`${AI_SOURCE_PREFIX}${approvalId}`) || '';
  } catch (e) {
    return '';
  }
}

function setAiSource(approvalId, source) {
  if (!approvalId) return;
  try {
    localStorage.setItem(`${AI_SOURCE_PREFIX}${approvalId}`, source || '');
  } catch (e) {
    // 隐私模式下 localStorage 可能不可写，忽略即可
  }
}

/** 该审批单是否已经成功拿到过一次真实 GLM 结果 */
export function hasRealGlmResult(approvalId) {
  if (!approvalId) return false;
  try {
    return localStorage.getItem(`${AI_GLM_DONE_PREFIX}${approvalId}`) === '1';
  } catch (e) {
    return false;
  }
}

function markRealGlmResult(approvalId) {
  try {
    localStorage.setItem(`${AI_GLM_DONE_PREFIX}${approvalId}`, '1');
  } catch (e) {
    // ignore
  }
}

/** 本会话是否已经自动尝试过补刷（用 sessionStorage，配好 Key 后刷新页面即可重试） */
export function hasAutoTriedGlm(approvalId) {
  if (hasRealGlmResult(approvalId)) return true;
  try {
    return sessionStorage.getItem(`${AI_AUTO_PREFIX}${approvalId}`) === '1';
  } catch (e) {
    return false;
  }
}

export function markAutoTriedGlm(approvalId) {
  try {
    sessionStorage.setItem(`${AI_AUTO_PREFIX}${approvalId}`, '1');
  } catch (e) {
    // ignore
  }
}

/** 清除所有「本次会话已自动尝试」标记，供用户重新配置 Key 后立即生效 */
export function resetAiAutoFlag() {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(AI_AUTO_PREFIX)) keys.push(k);
    }
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {
    // ignore
  }
}

/**
 * 检查当前用户是否处于重试冷却中
 * @param {string} approvalId 
 * @returns {{ inCooldown: boolean, remainingSeconds: number }}
 */
export function getAiRetryCooldown(approvalId) {
  try {
    const key = `${LAST_RETRY_PREFIX}${approvalId}`;
    const timestampStr = localStorage.getItem(key);
    if (!timestampStr) return { inCooldown: false, remainingSeconds: 0 };

    const lastTime = parseInt(timestampStr, 10);
    const elapsed = Math.floor((Date.now() - lastTime) / 1000);
    if (elapsed < COOLDOWN_SECONDS) {
      return { inCooldown: true, remainingSeconds: COOLDOWN_SECONDS - elapsed };
    }
  } catch (e) {
    // ignore
  }
  return { inCooldown: false, remainingSeconds: 0 };
}

/**
 * 记录用户触发重新调用的时间戳
 */
export function recordAiRetryTimestamp(approvalId) {
  try {
    localStorage.setItem(`${LAST_RETRY_PREFIX}${approvalId}`, String(Date.now()));
  } catch (e) {
    // ignore
  }
}

function normalizeReasons(reasons) {
  if (Array.isArray(reasons)) return reasons;
  if (typeof reasons === 'string') {
    try {
      const parsed = JSON.parse(reasons);
      return Array.isArray(parsed) ? parsed : [reasons];
    } catch (e) {
      return [reasons];
    }
  }
  return [];
}

/**
 * 请求 AI 购买建议点评（优先真实 GLM，失败无损回退规则引擎）
 *
 * 修复要点：旧版只要 approval.ai_verdict 有值就直接返回缓存，而 CreatePage 在发布时
 * 用前端规则引擎把这个字段写死了 —— 结果详情页永远不请求后端，GLM 形同虚设。
 * 现在只有「已经是真 GLM 结果」或「本会话已自动尝试过」才走缓存。
 *
 * @param {Object} approval 审批单
 * @param {Array} votes 投票列表
 * @param {boolean} forceRefresh 是否强制重新生成（手动「换个角度再评一次」）
 * @returns {Promise<{ configured: boolean, source: string, verdict: 'buy'|'skip'|null, reasons: string[], fallback_reason?: string }>}
 */
export async function fetchAiRecommendation(approval, votes = [], forceRefresh = false) {
  if (!approval) return { configured: false, source: 'local', verdict: null, reasons: [] };

  const cachedSource = getAiSource(approval.id);
  const reasonsFromCache = normalizeReasons(approval.ai_reasons);

  // 缓存短路：必须是真 GLM 结果、或本会话已经自动补刷过一次，才允许直接返回
  if (!forceRefresh && approval.ai_verdict && reasonsFromCache.length &&
      (cachedSource === 'glm' || hasAutoTriedGlm(approval.id))) {
    return {
      configured: true,
      source: cachedSource || 'unknown',
      verdict: approval.ai_verdict,
      reasons: reasonsFromCache,
      generated_at: approval.ai_generated_at,
    };
  }

  // 6 秒轮询可能并发触发，合并成同一个请求
  if (inflight.has(approval.id)) return inflight.get(approval.id);

  const task = (async () => {
    // 2. 统计当前投票与“已拥有”比例
    const approveCount = votes.filter(v => v.type === 'approve').length;
    const rejectCount = votes.filter(v => v.type === 'reject').length;
    const spectateCount = votes.filter(v => v.type === 'spectate').length;

    const totalAnsweredOwns = votes.filter(v => v.owns_item !== undefined && v.owns_item !== null).length;
    const ownedCount = votes.filter(v => v.owns_item === true || v.owns_item === 'owned').length;
    const ownedRatio = totalAnsweredOwns > 0 ? (ownedCount / totalAnsweredOwns) : 0;

    const payload = {
      approval_id: approval.id,
      title: approval.title,
      price: approval.price,
      category: approval.category,
      reason: approval.reason,
      alternative: approval.alternative,
      creator_mbti: approval.creator_mbti || '',
      target_mbtis: approval.target_mbtis || [],
      approve_count: approveCount,
      reject_count: rejectCount,
      spectate_count: spectateCount,
      owned_ratio: ownedRatio,
      custom_api_key: getCustomAiKey(),
    };

    let aiResult = null;

    // 3. 请求后端 AI 函数（线上经 netlify.toml redirect，本地经 vite proxy）
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.verdict) {
          aiResult = data;
        }
      }
    } catch (netErr) {
      console.warn('[ai] 后端 AI 函数不可达，使用本地规则引擎：', netErr);
    }

    // 4. 后端不可用时，前端内置引擎保底
    if (!aiResult) {
      aiResult = clientSmartAiEngine(payload);
      aiResult.source = 'local';
      aiResult.fallback_reason = '后端 AI 函数不可达（本地开发请确认 /api 代理已配置）';
    }

    const source = aiResult.source || (aiResult.configured ? 'fallback' : 'local');
    if (source === 'glm') {
      markRealGlmResult(approval.id);
    } else if (!forceRefresh) {
      markAutoTriedGlm(approval.id);
    }
    setAiSource(approval.id, source);

    // 5. 持久化缓存：只写数据库已有的 4 个字段，不引入新列以免 Supabase update 报未知字段
    const generatedAt = aiResult.generated_at || new Date().toISOString();
    if (approval.id) {
      try {
        updateApproval({
          id: approval.id,
          ai_verdict: aiResult.verdict,
          ai_reasons: aiResult.reasons,
          ai_generated_at: generatedAt,
        });
      } catch (e) {
        console.warn('Failed to sync AI verdict to cloud store:', e);
      }
    }

    const client = getSupabase();
    if (client && approval.id) {
      try {
        await client
          .from('approvals')
          .update({
            ai_verdict: aiResult.verdict,
            ai_reasons: aiResult.reasons,
            ai_generated_at: generatedAt,
          })
          .eq('id', approval.id);
      } catch (dbErr) {
        console.warn('Failed to cache AI verdict to DB:', dbErr);
      }
    }

    return {
      configured: true,
      source,
      model: aiResult.model || '',
      fallback_reason: aiResult.fallback_reason || '',
      verdict: aiResult.verdict,
      reasons: aiResult.reasons || [],
      generated_at: generatedAt,
    };
  })();

  inflight.set(approval.id, task);
  try {
    return await task;
  } finally {
    inflight.delete(approval.id);
  }
}

/**
 * 配置弹窗用：直接打一次后端，判断 GLM 是否真的接通
 * 不写任何审批单数据，也不读缓存。
 */
export async function testGlmConnection() {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'GLM 连通性测试',
        price: 1,
        category: '其他',
        reason: '接口自检',
        alternative: '',
        custom_api_key: getCustomAiKey(),
      }),
    });
    if (!res.ok) {
      return { ok: false, source: 'local', reason: `后端返回 HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: data.source === 'glm',
      source: data.source || 'unknown',
      model: data.model || data.diagnostics?.model || '',
      reason: data.fallback_reason || '',
      diagnostics: data.diagnostics || null,
    };
  } catch (e) {
    return { ok: false, source: 'local', reason: `无法连接后端：${e?.message || e}` };
  }
}

/**
 * 客户端内置智能决策引擎（立场鲜明，必须明确投出支持票 buy 或反对票 skip）
 */
export function clientSmartAiEngine({ title, price, reason, alternative, approve_count = 0, reject_count = 0, owned_ratio = 0 }) {
  const numPrice = Number(price) || 0;
  const reasonText = (reason || '').toLowerCase();
  const altText = (alternative || '').toLowerCase();

  const isImpulse = /冲动|头脑一热|上头|好看|刷到|被种草|颜值|限量|降价|秒杀|打折/.test(reasonText);
  const isEmotional = /心情不好|压力大|犒劳|解压|郁闷|加班|好累|奖励自己/.test(reasonText);
  const isUtility = /生产力|效率|工作|学习|考研|降噪|运动|健康|颈椎|腰酸|刚需|坏了/.test(reasonText);
  const hasAlternative = altText.length > 3 && !/没有|暂无|无|买不起|借不到/.test(altText);

  let verdict = 'skip';
  const reasons = [];

  // 1. 劝退反对逻辑 (skip)
  if ((isImpulse || isEmotional) && !isUtility && numPrice > 100) {
    verdict = 'skip';
    reasons.push(`典型的情绪补偿型消费。当前价格 ¥${numPrice} 不低，情绪褪去后大概率沦为闲置吃灰。`);
    if (hasAlternative) {
      reasons.push(`既然已有现有替代品（${alternative}），先物尽其用，不要为了短暂的新鲜感重复添置。`);
    } else {
      reasons.push(`不如先放进冷静期满 24 小时，这笔钱留着吃几顿大餐或存起来更有确定感。`);
    }
    if (reject_count > approve_count) {
      reasons.push(`现场网友劝退率偏高，群众的眼睛是雪亮的，AI投反对票带头劝退！`);
    }
  } 
  // 2. 支持放行逻辑 (buy)：明确生产力、高频刚需，且替代品不足
  else if (isUtility && (!hasAlternative || numPrice < 300)) {
    verdict = 'buy';
    reasons.push(`属于能提升日常效率或身心健康的实用型投入，对日常生活的正面改善明确。`);
    if (numPrice <= 300) {
      reasons.push(`预算在合理区间内，只要能坚持使用哪怕三个月，折算单次使用成本也微乎其微。`);
    } else {
      reasons.push(`核心痛点明确，只要确认购买后能立即投入日常主力使用，AI投支持票！`);
    }
    if (approve_count >= reject_count) {
      reasons.push(`网友多数也认为值得一试，理智放行，买完记得物尽其用别闲置！`);
    }
  } 
  // 3. 其他非刚需场景一律投反对票（AI省思袋的核心职责就是防冲动劝退）
  else {
    verdict = 'skip';
    if (hasAlternative) {
      reasons.push(`现有替代方案尚能应对，升级带来的边际体验提升可能远小于 ¥${numPrice} 的实际支出。`);
    } else {
      reasons.push(`这件物品的新鲜感期通常较短，AI坚定投反对票劝退，省下就是赚到。`);
    }
    reasons.push(`建议至少等到设定的冷静期倒计时走完，如果那时仍觉得非它不可再买也不迟。`);
  }

  const finalReasons = reasons.slice(0, 3);
  if (finalReasons.length < 2) {
    finalReasons.push('冷静期内多听听同频网友的真实避坑体验，让理性跑赢冲动！');
  }

  return {
    verdict,
    reasons: finalReasons,
    generated_at: new Date().toISOString(),
  };
}

/**
 * 发布时立即生成初始 AI 建议，保证帖子一经发布即带 AI 判定，绝不闪烁丢失。
 * 注意：这里用的是本地规则引擎（离线秒出、不依赖网络），详情页首次打开时
 * AiVerdictCard 会自动向后端补刷一次真实 GLM 结果并覆盖。
 */
export function generateInitialAiAdvice(approval) {
  return clientSmartAiEngine({
    title: approval.title,
    price: approval.price,
    reason: approval.reason,
    alternative: approval.alternative,
    creator_mbti: approval.creator_mbti,
  });
}
