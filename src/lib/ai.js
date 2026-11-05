import { getSupabase } from './supabase';
import { updateApproval } from './cloudStore';

const COOLDOWN_SECONDS = 60;
const LAST_RETRY_PREFIX = 'wallet_wait_ai_retry_';
const CUSTOM_AI_KEY_STORAGE = 'wallet_wait_custom_ai_key';

export function getCustomAiKey() {
  return localStorage.getItem(CUSTOM_AI_KEY_STORAGE) || '';
}

export function setCustomAiKey(key) {
  if (key) {
    localStorage.setItem(CUSTOM_AI_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(CUSTOM_AI_KEY_STORAGE);
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

/**
 * 请求 AI 购买建议点评（优先请求线上服务，无缝智能保底）
 * @param {Object} approval 审批单
 * @param {Array} votes 投票列表
 * @param {boolean} forceRefresh 是否强制重新生成
 * @returns {Promise<{ configured: boolean, verdict: 'buy'|'skip'|'think'|null, reasons: string[] }>}
 */
export async function fetchAiRecommendation(approval, votes = [], forceRefresh = false) {
  if (!approval) return { configured: false, verdict: null, reasons: [] };

  // 1. 如果已有缓存且不要求强制重新生成，直接返回缓存结果
  if (!forceRefresh && approval.ai_verdict && approval.ai_reasons) {
    let reasons = approval.ai_reasons;
    if (typeof reasons === 'string') {
      try {
        reasons = JSON.parse(reasons);
      } catch (e) {
        reasons = [reasons];
      }
    }
    return {
      configured: true,
      verdict: approval.ai_verdict,
      reasons: Array.isArray(reasons) ? reasons : [reasons],
      generated_at: approval.ai_generated_at,
    };
  }

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

  // 3. 尝试调用后端 AI 函数 (优先 /.netlify/functions/ai-recommend，也可降级 /api/ai-recommend)
  try {
    const fnUrl = window.location.hostname.includes('netlify')
      ? '/.netlify/functions/ai-recommend'
      : '/api/ai-recommend';

    const res = await fetch(fnUrl, {
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
    // 忽略并继续使用前端本地引擎
  }

  // 4. 如果后端未启动或请求失败，直接启动前端智能推理引擎保底
  if (!aiResult) {
    aiResult = clientSmartAiEngine(payload);
  }

  // 5. 持久化缓存到云端与 Supabase，确保无论何时刷新均不丢失
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
    verdict: aiResult.verdict,
    reasons: aiResult.reasons || [],
    generated_at: generatedAt,
  };
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
 * 发布时立即生成初始 AI 建议，保证帖子一经发布即带 AI 判定，绝不闪烁丢失
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
